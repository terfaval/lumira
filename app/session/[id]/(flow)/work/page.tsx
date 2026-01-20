"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { LumiraLoader } from "@/components/LumiraLoader/LumiraLoader";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { isDirectionCardContent, type DirectionCardContent, type WorkBlock } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { CatalogService } from "@/src/services/CatalogService";

type DirectionWorkBlock = WorkBlock & { content: DirectionCardContent };
type HistoryItem = { question: string; answer: string | null };
type WorkAnswerRow = { work_id: string | null; content: string; created_at: string };

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

async function fetchLatestRawDreamText(sessionId: string): Promise<string> {
  const uid = await requireUserId();
  const { data, error } = await supabase
    .from("dream_entries")
    .select("content, created_at")
    .eq("session_id", sessionId)
    .eq("user_id", uid)
    .eq("kind", "raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.content ? String(data.content) : "";
}

function buildClientRequestId(
  sessionId: string,
  directionSlug: string,
  sequence: number,
  question: string
) {
  const compactQuestion = question.trim().replace(/\s+/g, " ").slice(0, 120);
  return `work:${sessionId}:${directionSlug}:${sequence}:${compactQuestion}`;
}

export default function WorkPage() {
  const { id: sessionId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { loading } = useRequireAuth();

  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [latestWorkVersionId, setLatestWorkVersionId] = useState<string | null>(null);
  const [directionConfig, setDirectionConfig] = useState<DirectionCatalogItemDTO | null>(null);

  const [rawDreamText, setRawDreamText] = useState<string>("");
  const [rawLoading, setRawLoading] = useState(false);

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
        .filter(
          (b): b is DirectionWorkBlock =>
            !!b && (!directionSlug || b.content.direction_slug === directionSlug)
        ),
    [blocks, directionSlug]
  );

  const currentBlock = useMemo(() => {
    if (directionBlocks.length === 0) return null;
    if (latestWorkVersionId) {
      const latest = directionBlocks.find((b) => b.id === latestWorkVersionId);
      if (latest) return latest;
    }
    const sorted = [...directionBlocks].sort(
      (a, b) => (a.content.sequence ?? 0) - (b.content.sequence ?? 0)
    );
    return sorted[sorted.length - 1];
  }, [directionBlocks, latestWorkVersionId]);

  const load = useCallback(async () => {
    setErr(null);
    setLoaded(false);

    const userId = await requireUserId().catch(() => null);

    // 1) work_versions
    let versionsQuery = supabase
      .from("work_versions")
      .select("id, session_id, user_id, payload, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (userId) versionsQuery = versionsQuery.eq("user_id", userId);

    const { data: versions, error } = await versionsQuery;

    if (error) {
      setErr("Nem sikerult betolteni a kartyakat.");
    } else {
      // 2) dream_answers
      let answersQuery = supabase
        .from("dream_answers")
        .select("work_id, content, created_at")
        .eq("session_id", sessionId);
      if (userId) answersQuery = answersQuery.eq("user_id", userId);

      const { data: answers } = await answersQuery;
      const answersByWorkId = buildAnswersByWorkId((answers ?? []) as WorkAnswerRow[]);

      const mapped = (versions ?? [])
        .map((row: any) => toWorkBlock(row, answersByWorkId))
        .filter((b): b is WorkBlock => Boolean(b));

      setBlocks(mapped);
    }

    // 3) work_latest
    let latestQuery = supabase
      .from("work_latest")
      .select("work_version_id")
      .eq("session_id", sessionId);

    if (userId) latestQuery = latestQuery.eq("user_id", userId);

    const { data: latestRow } = await latestQuery.maybeSingle();
    setLatestWorkVersionId((latestRow as any)?.work_version_id ?? null);

    setLoaded(true);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // direction config (catalog is allowed legacy)
  useEffect(() => {
    let cancelled = false;
    if (!directionSlug) return;

    (async () => {
      try {
        const data = await CatalogService.getDirectionBySlug(supabase, directionSlug);
        if (cancelled) return;
        if (!data) setErr("Nem sikerült betölteni az irányt.");
        else setDirectionConfig(data);
      } catch {
        if (cancelled) return;
        setErr("Nem sikerült betölteni az irányt.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [directionSlug]);

  // v0 raw dream text (dream_entries)
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) return;

    (async () => {
      setRawLoading(true);
      try {
        const t = await fetchLatestRawDreamText(sessionId);
        if (cancelled) return;
        setRawDreamText(t);
      } catch {
        if (cancelled) return;
        setErr("Nem sikerült betölteni az álmot.");
      } finally {
        if (!cancelled) setRawLoading(false);
      }
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

  const fetchNextWorkBlock = useCallback(
    async (payload: NextPayload): Promise<NextResponse | null> => {
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

      const maxSeq = directionBlocks.reduce((max, block) => Math.max(max, block.content.sequence ?? 0), 0);

      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: directionSlug,
        sequence: maxSeq + 1,
        state: "open",
        ai: { context: next.work_block.lead_in, question: next.work_block.question },
        user: { answer: null, answered_at: null },
      };

      const clientRequestId = buildClientRequestId(
        sessionId,
        directionSlug,
        maxSeq + 1,
        content.ai?.question ?? ""
      );

      const persistRes = await fetchWithAuth("/api/work/persist", {
        method: "POST",
        json: {
          session_id: sessionId,
          payload: content,
          client_request_id: clientRequestId,
        },
      });

      if (!persistRes.ok) {
        setNextErr("Nem sikerult menteni a kovetkezo kerdest.");
        return false;
      }

      const persisted = (await persistRes.json().catch(() => null)) as { work_version?: any } | null;
      const inserted = persisted?.work_version;

      if (!inserted?.id) {
        setNextErr("Nem sikerult menteni a kovetkezo kerdest.");
        return false;
      }

      setLatestWorkVersionId(inserted?.id ?? null);
      setBlocks((prev) => [...prev, toWorkBlock(inserted, new Map())].filter(Boolean) as WorkBlock[]);
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
    if (!directionSlug) return;
    if (rawLoading) return;

    if (!rawDreamText || rawDreamText.trim().length < 1) {
      setErr("Nincs nyers álomszöveg (raw) ehhez a sessionhöz.");
      return;
    }

    const direction = directionConfig ?? { slug: directionSlug };

    const payload: NextPayload = {
      session_id: sessionId,
      dream_text: rawDreamText,
      direction,
      history: [],
      catalog: directionConfig ? [directionConfig] : [],
      allowed_slugs: directionSlug ? [directionSlug] : [],
    };

    setPendingNextPayload(payload);
    await processNextPayload(payload);
  }, [directionConfig, directionSlug, processNextPayload, rawDreamText, rawLoading, sessionId]);

  useEffect(() => {
    if (!directionSlug || loading || busy || ensuredInitial || !loaded) return;
    if (rawLoading) return;

    if (directionBlocks.length === 0) void ensureInitialBlock();
    setEnsuredInitial(true);
  }, [busy, directionBlocks.length, directionSlug, ensuredInitial, ensureInitialBlock, loaded, loading, rawLoading]);

  // v0: index-session should read dream_entries; do NOT send dream_text
  useEffect(() => {
    if (!rawDreamText) return;
    if (indexAttemptedRef.current) return;
    indexAttemptedRef.current = true;

    void fetchWithAuth("/api/index-session", {
      method: "POST",
      json: { session_id: sessionId },
    }).catch(() => {});
  }, [rawDreamText, sessionId]);

  const saveAnswer = useCallback(
    async (block: DirectionWorkBlock, answer: string) => {
      if (!rawDreamText || !directionSlug) {
        setErr("Hiányzó adatok: frissítsd az oldalt.");
        return;
      }

      const trimmed = answer.trim();
      setBusy(true);
      setErr(null);
      setNextErr(null);

      try {
        const existingContent = normalizeContent(block.content);
        const answeredAt = trimmed ? new Date().toISOString() : null;
        const updatedContent: DirectionCardContent = {
          ...existingContent,
          state: trimmed ? "answered" : "open",
          user: { ...(existingContent.user ?? {}), answer: trimmed, answered_at: answeredAt },
        };

        if (trimmed) {
          const res = await fetchWithAuth("/api/work/answer", {
            method: "POST",
            json: {
              session_id: sessionId,
              direction_slug: directionSlug,
              work_block_id: block.id,
              answer_text: trimmed,
            },
          });
          if (!res.ok) throw new Error("answer_failed");
        }

        setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content: updatedContent } : b)));

        const updatedDirectionBlocks = directionBlocks.map((b) =>
          b.id === block.id ? { ...b, content: updatedContent } : b
        );
        const updatedHistory = buildHistory(updatedDirectionBlocks);

        const payload: NextPayload = {
          session_id: sessionId,
          dream_text: rawDreamText,
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
    [directionBlocks, directionSlug, processNextPayload, rawDreamText, directionConfig, sessionId]
  );

  if (loading) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        <LumiraLoader size={18} spinSeconds={8} tone="light" />
        <span style={{ color: "var(--text-muted)" }}>Betöltés…</span>
      </div>
    );
  }

  if (!directionSlug) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        Válassz egy irányt az{" "}
        <Link href={`/session/${sessionId}/direction`}>irányválasztó</Link> oldalon, majd térj vissza ide.
      </p>
    );
  }

  if (closureBlock) {
    return <ClosureCard block={closureBlock} sessionId={sessionId} />;
  }

  return (
    <div
      className="work-center"
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingBlock: 8,
      }}
    >
      <div className="stack">
        {!currentBlock ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <LumiraLoader size={18} spinSeconds={8} tone="light" />
            <span style={{ color: "var(--text-muted)" }}>
              {loaded ? "Kártya generálása..." : "Betöltés..."}
            </span>
          </div>
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
          <div
            style={{
              whiteSpace: "pre-wrap",
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            {block.content.ai.context}
          </div>
        )}

        <div style={{ fontWeight: 850, fontSize: 18, letterSpacing: "-0.01em" }}>
          {block.content.ai?.question ?? ""}
        </div>

        <textarea
          className="work-answer"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          placeholder="Fejtsd ki szabadon"
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
              gap: var(--space-2);
              justify-content: flex-end;
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
              gap: var(--space-2);
              justify-content: flex-end;
              flex-wrap: wrap;
              align-items: center;
              margin-top: var(--space-2);
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

function buildAnswersByWorkId(rows: WorkAnswerRow[]): Map<string, WorkAnswerRow> {
  const map = new Map<string, WorkAnswerRow>();
  for (const row of rows) {
    if (!row?.work_id) continue;
    const existing = map.get(row.work_id);
    if (!existing) {
      map.set(row.work_id, row);
      continue;
    }
    const existingTs = Date.parse(existing.created_at ?? "");
    const nextTs = Date.parse(row.created_at ?? "");
    if (Number.isFinite(nextTs) && (!Number.isFinite(existingTs) || nextTs >= existingTs)) {
      map.set(row.work_id, row);
    }
  }
  return map;
}

function toWorkBlock(row: any, answersByWorkId: Map<string, WorkAnswerRow>): WorkBlock | null {
  if (!row || typeof row !== "object") return null;
  const rawContent = (row as any).payload ?? null;
  if (!rawContent || typeof rawContent !== "object") return null;

  let content = rawContent as DirectionCardContent;
  if (isDirectionCardContent(rawContent)) {
    const answer = answersByWorkId.get((row as any).id ?? "");
    content = applyAnswerToContent(rawContent as DirectionCardContent, answer ?? null);
  }

  return {
    id: (row as any).id,
    session_id: (row as any).session_id,
    user_id: (row as any).user_id,
    block_type: "dream_analysis",
    content,
    created_at: (row as any).created_at,
    updated_at: (row as any).created_at,
  } as WorkBlock;
}

function applyAnswerToContent(content: DirectionCardContent, answer: WorkAnswerRow | null): DirectionCardContent {
  const normalized = normalizeContent(content);
  if (!answer?.content) return normalized;
  return {
    ...normalized,
    state: "answered",
    user: {
      ...normalized.user,
      answer: answer.content,
      answered_at: answer.created_at ?? null,
    },
  };
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
