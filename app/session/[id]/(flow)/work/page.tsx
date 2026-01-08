"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import {
  isDirectionCardContent,
  type DirectionCardContent,
  type DirectionCatalogItem,
  type WorkBlock,
} from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";

type DirectionWorkBlock = WorkBlock & { content: DirectionCardContent };
type HistoryItem = { question: string; answer: string | null };

type NextPayload = {
  session_id: string;
  dream_text: string;
  direction: unknown;
  history: HistoryItem[];
  synth?: { flags?: { safety?: string; too_short?: boolean } };
  prior_echoes?: unknown;
  catalog?: unknown;
  allowed_slugs?: string[];
};

type NextResponse = {
  work_block: { lead_in: string; question: string; cta: string | null };
  stop_signal: { suggest_stop: boolean; reason: string | null };
};

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { loading } = useRequireAuth();

  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [directionConfig, setDirectionConfig] = useState<DirectionCatalogItem | null>(null);
  const [session, setSession] = useState<{ raw_dream_text: string } | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [nextErr, setNextErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [ensuredInitial, setEnsuredInitial] = useState(false);
  const [closureBlock, setClosureBlock] = useState<NextResponse["work_block"] | null>(null);
  const [pendingNextPayload, setPendingNextPayload] = useState<NextPayload | null>(null);

  const directionSlug = searchParams?.get("direction") ?? "";
  const indexAttemptedRef = useRef(false);

  const directionBlocks = useMemo(
    () =>
      blocks
        .map((block) =>
          isDirectionCardContent(block.content)
            ? ({ ...block, content: normalizeContent(block.content) } as DirectionWorkBlock)
            : null
        )
        .filter((b): b is DirectionWorkBlock => !!b && (!directionSlug || b.content.direction_slug === directionSlug)),
    [blocks, directionSlug]
  );

  const currentBlock = useMemo(() => {
    if (directionBlocks.length === 0) return null;
    const sorted = [...directionBlocks].sort((a, b) => (a.content.sequence ?? 0) - (b.content.sequence ?? 0));
    return sorted[sorted.length - 1];
  }, [directionBlocks]);

  const load = useCallback(async () => {
    setErr(null);
    setLoaded(false);

    const { data, error } = await supabase
      .from("work_blocks")
      .select("id, session_id, user_id, block_type, content, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("block_type", "dream_analysis")
      .order("created_at", { ascending: true });

    if (error) setErr("Nem sikerült betölteni a kártyákat.");
    else setBlocks((data ?? []) as WorkBlock[]);

    setLoaded(true);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!directionSlug) return;

    (async () => {
      const { data, error } = await supabase
        .from("direction_catalog")
        .select("slug, title, description, content")
        .eq("slug", directionSlug)
        .single();

      if (cancelled) return;

      if (error) setErr("Nem sikerült betölteni az irányt.");
      else setDirectionConfig(data as DirectionCatalogItem);
    })();

    return () => {
      cancelled = true;
    };
  }, [directionSlug]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.from("dream_sessions").select("raw_dream_text").eq("id", sessionId).single();
      if (cancelled) return;
      if (error) setErr("Nem sikerült betölteni az álmot.");
      else setSession({ raw_dream_text: (data as any)?.raw_dream_text ?? "" });
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    setEnsuredInitial(false);
    setClosureBlock(null);
    setPendingNextPayload(null);
    setNextErr(null);
    setErr(null);
  }, [directionSlug]);

  const fetchNextWorkBlock = useCallback(async (payload: NextPayload): Promise<NextResponse | null> => {
    setNextErr(null);
    try {
      const res = await fetchWithAuth("/api/work-block/next", { method: "POST", json: payload });
      if (!res.ok) {
        setNextErr("Hiba történt a következő kérésénél.");
        return null;
      }
      return (await res.json()) as NextResponse;
    } catch {
      setNextErr("Nem sikerült lekérni a következő kérdést.");
      return null;
    }
  }, []);

  const processNextPayload = useCallback(
    async (payload: NextPayload) => {
      if (!directionSlug) {
        setNextErr("Hiányzik az irány, frissítsd az oldalt.");
        return false;
      }

      const next = await fetchNextWorkBlock(payload);
      if (!next) return false;

      if (next.stop_signal.suggest_stop) {
        setClosureBlock(next.work_block);
        setPendingNextPayload(payload);
        return true;
      }

      const userId = await requireUserId();
      const maxSeq = directionBlocks.reduce((max, block) => Math.max(max, block.content.sequence ?? 0), 0);

      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: directionSlug,
        sequence: maxSeq + 1,
        state: "open",
        ai: { context: next.work_block.lead_in, question: next.work_block.question },
        user: { answer: null, answered_at: null },
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("work_blocks")
        .insert({ session_id: sessionId, user_id: userId, block_type: "dream_analysis", content })
        .select("id, session_id, user_id, block_type, content, created_at, updated_at")
        .single();

      if (insertErr) throw insertErr;

      setBlocks((prev) => [...prev, inserted as WorkBlock]);
      setClosureBlock(null);
      setPendingNextPayload(null);
      setNextErr(null);
      return true;
    },
    [directionBlocks, directionSlug, fetchNextWorkBlock, sessionId]
  );

  const handleRetryNext = useCallback(async () => {
    if (!pendingNextPayload) return;
    setBusy(true);
    try {
      await processNextPayload(pendingNextPayload);
    } catch {
      setErr("Nem sikerült újrapróbálni.");
    } finally {
      setBusy(false);
    }
  }, [pendingNextPayload, processNextPayload]);

  const ensureInitialBlock = useCallback(async () => {
    if (!directionSlug || !session) return;

    const direction = directionConfig ?? { slug: directionSlug };
    const payload: NextPayload = {
      session_id: sessionId,
      dream_text: session.raw_dream_text,
      direction,
      history: [],
      catalog: directionConfig ? [directionConfig] : [],
      allowed_slugs: directionSlug ? [directionSlug] : [],
    };

    setPendingNextPayload(payload);
    await processNextPayload(payload);
  }, [directionConfig, directionSlug, processNextPayload, session, sessionId]);

  useEffect(() => {
    if (!directionSlug || loading || busy || ensuredInitial || !loaded) return;
    if (!session) return;

    if (directionBlocks.length === 0) void ensureInitialBlock();
    setEnsuredInitial(true);
  }, [busy, directionBlocks.length, directionSlug, ensuredInitial, ensureInitialBlock, loaded, loading, session]);

  useEffect(() => {
    if (!session?.raw_dream_text) return;
    if (indexAttemptedRef.current) return;
    indexAttemptedRef.current = true;

    void fetchWithAuth("/api/index-session", {
      method: "POST",
      json: { session_id: sessionId, dream_text: session.raw_dream_text },
    }).catch(() => {});
  }, [session?.raw_dream_text, sessionId]);

  const saveAnswer = useCallback(
    async (block: DirectionWorkBlock, answer: string) => {
      if (!session || !directionSlug) {
        setErr("Hiányzó adatok: frissítsd az oldalt.");
        return;
      }

      const trimmed = answer.trim();
      setBusy(true);
      setErr(null);
      setNextErr(null);

      try {
        const existingContent = normalizeContent(block.content);
        const updatedContent: DirectionCardContent = {
          ...existingContent,
          state: trimmed ? "answered" : "open",
          user: { ...(existingContent.user ?? {}), answer: trimmed, answered_at: trimmed ? new Date().toISOString() : null },
        };

        const { error } = await supabase.from("work_blocks").update({ content: updatedContent }).eq("id", block.id);
        if (error) throw error;

        setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content: updatedContent } : b)));

        const updatedDirectionBlocks = directionBlocks.map((b) => (b.id === block.id ? { ...b, content: updatedContent } : b));
        const updatedHistory = buildHistory(updatedDirectionBlocks);

        const payload: NextPayload = {
          session_id: sessionId,
          dream_text: session.raw_dream_text,
          direction: directionConfig ?? { slug: directionSlug },
          history: updatedHistory,
          catalog: directionConfig ? [directionConfig] : [],
          allowed_slugs: directionSlug ? [directionSlug] : [],
        };

        setPendingNextPayload(payload);
        await processNextPayload(payload);
      } catch {
        setErr("Nem sikerült menteni a választ.");
      } finally {
        setBusy(false);
      }
    },
    [directionBlocks, directionSlug, processNextPayload, session, directionConfig, sessionId]
  );

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Betöltés…</p>;

  if (!directionSlug) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        Válassz egy irányt az <Link href={`/session/${sessionId}/direction`}>irányválasztó</Link> oldalon, majd térj vissza ide.
      </p>
    );
  }

  if (closureBlock) {
    return <ClosureCard block={closureBlock} sessionId={sessionId} />;
  }

  return (
    <div className="work-center">
    <div className="stack">
      {!currentBlock ? (
        <p style={{ color: "var(--text-muted)" }}>{loaded ? "Kártya generálása..." : "Betöltés..."}</p>
      ) : (
        <div className="stack">
          <BlockCard
            key={`${currentBlock.id}-${currentBlock.content.user?.answered_at ?? ""}-${currentBlock.content.user?.answer ?? ""}`}
            block={currentBlock}
            onSave={saveAnswer}
            busy={busy}
          />

          {nextErr ? (
            <Card>
              <div className="stack-tight">
                <p style={{ color: "crimson" }}>Nem sikerült lekérni a következő kérdést.</p>
                <PrimaryButton onClick={handleRetryNext} disabled={busy}>
                  Újra próbálom
                </PrimaryButton>
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}

      <style jsx>{`
      .work-center {
        min-height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding-block: 8px;
      }
    `}</style>
    </div>
    </div>
  );
}

function BlockCard({
  block,
  onSave,
  busy,
}: {
  block: DirectionWorkBlock;
  onSave: (block: DirectionWorkBlock, answer: string) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(block.content.user?.answer ?? "");

  useEffect(() => {
    setDraft(block.content.user?.answer ?? "");
  }, [block.content.user?.answer, block.id]);

  return (
    <Card>
      <div className="stack-tight">
        {!!block.content.ai?.context && (
          <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
            {block.content.ai.context}
          </div>
        )}

        <div style={{ fontWeight: 800 }}>{block.content.ai?.question ?? ""}</div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Rögzítés (opcionális)"
        />

        <div className="work-actions">
          <Link href="/archive" style={{ textDecoration: "none" }}>
            <PrimaryButton variant="secondary" disabled={busy}>
              Később folytatom
            </PrimaryButton>
          </Link>

          <PrimaryButton onClick={() => onSave(block, draft)} disabled={busy}>
            Rögzítés
          </PrimaryButton>

          <style jsx>{`
            .work-actions {
              display: flex;
              gap: 10px;
              justify-content: flex-end; /* ✅ jobbra zár */
              flex-wrap: wrap;
              align-items: center;
            }
          `}</style>
        </div>
      </div>
    </Card>
  );
}

function ClosureCard({ block, sessionId }: { block: NextResponse["work_block"]; sessionId: string }) {
  return (
    <Card>
      <div className="stack-tight">
        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{block.lead_in}</div>
        <div style={{ fontWeight: 800 }}>{block.question}</div>

        <div className="closure-actions">
          <Link href={`/session/${sessionId}/direction`} style={{ textDecoration: "none" }}>
            <PrimaryButton variant="secondary">További irányok</PrimaryButton>
          </Link>

          <Link href={`/archive`} style={{ textDecoration: "none" }}>
            <PrimaryButton variant="secondary">Később folytatom</PrimaryButton>
          </Link>

          <style jsx>{`
            .closure-actions {
              display: flex;
              gap: 10px;
              justify-content: flex-end; /* ✅ jobbra zár */
              flex-wrap: wrap;
              align-items: center;
              margin-top: 8px;
            }
          `}</style>
        </div>

        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Ha szeretnéd, később bármikor visszatérhetsz ugyanebbe a sessionbe.
        </p>
      </div>
    </Card>
  );
}

function normalizeContent(content: DirectionCardContent): DirectionCardContent {
  return {
    ...content,
    user: {
      ...content.user,
      answer: content.user?.answer ?? null,
      answered_at: content.user?.answered_at ?? null,
    },
    sequence: content.sequence ?? 0,
    state: content.state ?? "open",
    ai: {
      ...content.ai,
      context: content.ai?.context ?? null,
      question: content.ai?.question ?? null,
    },
  };
}

function buildHistory(blocks: DirectionWorkBlock[]): HistoryItem[] {
  return [...blocks]
    .sort((a, b) => (a.content.sequence ?? 0) - (b.content.sequence ?? 0))
    .map((b) => ({
      question: (b.content.ai?.question ?? "").trim(),
      answer: b.content.user?.answer ? String(b.content.user.answer) : null,
    }))
    .filter((h) => h.question)
    .slice(-8);
}
