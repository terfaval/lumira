"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { SplitLayout } from "@/components/SplitLayout";
import { DreamRawPanel } from "@/components/DreamRawPanel";
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
  dream_text: string;
  direction: unknown;
  history: HistoryItem[];
  synth?: { flags?: { safety?: string; too_short?: boolean } };
  prior_echoes?: unknown;
};
type NextResponse = {
  work_block: { lead_in: string; question: string; cta: string | null };
  stop_signal: { suggest_stop: boolean; reason: string | null };
};

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
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
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    if (!directionSlug) return;

    const loadDirection = async () => {
      const { data, error } = await supabase
        .from("direction_catalog")
        .select("slug, title, description, content")
        .eq("slug", directionSlug)
        .single();

      if (cancelled) return;

      if (error) {
        console.error(error);
        setErr("Nem sikerült betölteni az irányt.");
      } else {
        setDirectionConfig(data as DirectionCatalogItem);
      }
    };

    void loadDirection();

    return () => {
      cancelled = true;
    };
  }, [directionSlug]);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      const { data, error } = await supabase
        .from("dream_sessions")
        .select("raw_dream_text")
        .eq("id", sessionId)
        .single();

      if (cancelled) return;
      if (error) {
        console.error(error);
        setErr("Nem sikerült betölteni az álmot.");
      } else {
        setSession({ raw_dream_text: (data as any)?.raw_dream_text ?? "" });
      }
    };

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    setEnsuredInitial(false);
  }, [directionSlug]);

  const nextSequence = useMemo(
    () => directionBlocks.reduce((max, block) => Math.max(max, block.content.sequence ?? 0), 0) + 1,
    [directionBlocks]
  );

  const fetchNextWorkBlock = useCallback(
    async (payload: NextPayload): Promise<NextResponse | null> => {
      setNextErr(null);
      try {
        const res = await fetch("/api/work-block/next", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Next block error", res.status, text);
          setNextErr("Hiba történt a következő kérésénél.");
          return null;
        }

        const json = (await res.json()) as NextResponse;
        return json;
      } catch (e) {
        console.error(e);
        setNextErr("Nem sikerült lekérni a következő kérdést.");
        return null;
      }
    },
    []
  );

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
      const sequence = directionBlocks.reduce(
        (max, block) => Math.max(max, block.content.sequence ?? 0),
        0
      );

      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: directionSlug,
        sequence: sequence + 1,
        state: "open",
        ai: {
          context: next.work_block.lead_in,
          question: next.work_block.question,
        },
        user: { answer: null, answered_at: null },
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("work_blocks")
        .insert({
          session_id: sessionId,
          user_id: userId,
          block_type: "dream_analysis",
          content,
        })
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
    } catch (e) {
      console.error(e);
      setErr("Nem sikerült újrapróbálni.");
    } finally {
      setBusy(false);
    }
  }, [pendingNextPayload, processNextPayload]);

  const generateDirectionBlock = useCallback(async () => {
    if (!directionSlug) {
      setErr("Előbb válassz irányt.");
      return;
    }
    setBusy(true);
    setErr(null);
    setNextErr(null);
    try {
      const userId = await requireUserId();
      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: directionSlug,
        sequence: nextSequence,
        state: "open",
        ai: {
          context: "Most csak egy apró pontot nézünk meg ebből az álomból.",
          question: "Mi az a részlet, ami most a leginkább megmaradt benned?",
        },
        user: { answer: null, answered_at: null },
      };

      const { error } = await supabase.from("work_blocks").insert({
        session_id: sessionId,
        user_id: userId,
        block_type: "dream_analysis",
        content,
      });

      if (error) throw error;
      await load();
    } catch {
      setErr("Nem sikerült új kártyát létrehozni.");
    } finally {
      setBusy(false);
    }
  }, [directionSlug, load, nextSequence, sessionId]);

  useEffect(() => {
    if (!directionSlug || loading || busy || ensuredInitial || !loaded) return;
    if (directionBlocks.length === 0) {
      void generateDirectionBlock();
    }
    setEnsuredInitial(true);
  }, [busy, directionBlocks.length, directionSlug, ensuredInitial, generateDirectionBlock, loaded, loading]);

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
          user: {
            ...(existingContent.user ?? {}),
            answer: trimmed,
            answered_at: trimmed ? new Date().toISOString() : null,
          },
        };
        const { error } = await supabase
          .from("work_blocks")
          .update({ content: updatedContent })
          .eq("id", block.id);
        if (error) throw error;

        setBlocks((prev) =>
          prev.map((b) => (b.id === block.id ? { ...b, content: updatedContent } : b))
        );

        const updatedDirectionBlocks = directionBlocks.map((b) =>
          b.id === block.id ? { ...b, content: updatedContent } : b
        );

        const updatedHistory = buildHistory(updatedDirectionBlocks);

        const payload: NextPayload = {
          dream_text: session.raw_dream_text,
          direction: directionConfig ?? { slug: directionSlug },
          history: updatedHistory,
        };

        setPendingNextPayload(payload);
        await processNextPayload(payload);
      } catch (e: unknown) {
        console.error(e);
        setErr("Nem sikerült menteni a választ.");
      } finally {
        setBusy(false);
      }
    },
    [directionBlocks, directionSlug, processNextPayload, session, directionConfig]
  );

  const Spinner = (
    <>
      <div
        aria-label="Betöltés"
        className="spinner"
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          border: "2px solid var(--border)",
          borderTopColor: "var(--text-muted)",
          animation: "spin 0.9s linear infinite",
          marginTop: 8,
        }}
      />
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );

  return (
    <Shell title="Kártyás feldolgozás" space="dream">
      {loading ? (
        Spinner
      ) : (
        <SplitLayout
          leftTitle="Nyers álom"
          left={<DreamRawPanel sessionId={sessionId} />}
          rightTitle="Feldolgozás"
          right={
            !directionSlug ? (
              <p style={{ color: "var(--text-muted)" }}>
                Válassz egy irányt az <Link href={`/session/${sessionId}/direction`}>irányválasztó</Link> oldalon, majd térj vissza ide.
              </p>
            ) : (
              <div className="stack">
                {directionBlocks.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>Még nincs kártya ehhez az irányhoz.</p>
                ) : (
                  <div className="stack">
                    {directionBlocks.map((b) => (
                      <BlockCard
                        key={`${b.id}-${b.content.user?.answered_at ?? ""}-${b.content.user?.answer ?? ""}`}
                        block={b}
                        onSave={saveAnswer}
                        busy={busy || Boolean(closureBlock)}
                      />
                    ))}
                    {closureBlock ? <ClosureCard block={closureBlock} /> : null}
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
                {process.env.NODE_ENV === "development" && pendingNextPayload && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>következő kérésre várakozik…</p>
                )}
              </div>
            )
          }
        />
      )}
    </Shell>
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
  const stateLabel = block.content.state ?? "open";
  const answeredAt = block.content.user?.answered_at;

  return (
    <Card>
      <div className="stack-tight">
        <div className="meta-block">
          <span className="badge-muted">#{block.content.sequence}</span>
          <span className="badge-muted">Állapot: {stateLabel}</span>
          {answeredAt && <span className="badge-muted">Válaszolva: {new Date(answeredAt).toLocaleString("hu-HU")}</span>}
        </div>

        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
          {block.content.ai?.context ?? "Most csak egy apró pontot nézünk meg ebből az álomból."}
        </div>

        <div style={{ fontWeight: 700 }}>
          {block.content.ai?.question ?? "Mi az a részlet, ami most a leginkább megmaradt benned?"}
        </div>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="Rögzítés (opcionális)"
        />

        <div style={{ display: "flex", gap: 10 }}>
          <PrimaryButton onClick={() => onSave(block, draft)} disabled={busy}>
            Rögzítés
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

function ClosureCard({ block }: { block: NextResponse["work_block"] }) {
  return (
    <Card>
      <div className="stack-tight">
        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>
          {block.lead_in}
        </div>
        <div style={{ fontWeight: 700 }}>{block.question}</div>
        <p style={{ color: "var(--text-muted)", margin: 0 }}>
          Ha szeretnéd, itt megpihenhetünk. Bármikor visszatérhetsz a munkához.
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
    .slice(-4);
}