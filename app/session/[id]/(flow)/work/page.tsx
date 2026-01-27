"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Card } from "@/components/Card";
import { WorkCard } from "@/components/WorkCard";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";
import { isDirectionCardContent, type Json, type DirectionCardContent, type WorkBlock } from "@/src/lib/types";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import type { DirectionCatalogItemDTO } from "@/src/domain/catalog/catalogTypes";
import { CatalogService } from "@/src/services/CatalogService";

type DirectionWorkBlock = WorkBlock & { content: DirectionCardContent };
type WorkAnswerRow = { work_id: string | null; content: string; created_at: string };

type NextPayload = {
  session_id: string;
  direction_slug?: string | null;
  seed?: { kind: "frame" | "work"; text: string } | null;
  prefs?: { blocked_group_tags?: string[] } | null;
  client_request_id?: string | null;
};

type NextResponse = {
  request_id: string;
  status: "ok" | "stop";
  work_block?: {
    id: string;
    direction_slug: string | null;
    group_tags: string[];
    lead_in: string;
    prompt: string;
    mode: "normal" | "gentle";
    trace: unknown;
  };
  stop_signal?: {
    suggest_stop: true;
    reason_code: "low_novelty" | "prefs_block_all" | "safety_limit" | "model_failure";
    message: string;
    suggested_actions: Array<"switch_direction" | "continue_later" | "free_journal">;
    trace: unknown;
  };
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

function buildClientRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `work_${Date.now()}_${Math.random().toString(16).slice(2)}`;
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
  const [closureBlock, setClosureBlock] = useState<NextResponse["stop_signal"] | null>(null);
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
    if (latestWorkVersionId) {
      const latest = directionBlocks.find((b) => b.id === latestWorkVersionId);
      if (latest) return latest;
    }
    const sorted = [...directionBlocks].sort((a, b) => (a.content.sequence ?? 0) - (b.content.sequence ?? 0));
    return sorted[sorted.length - 1];
  }, [directionBlocks, latestWorkVersionId]);

  const showBlocker = !currentBlock;
  const blockerTitle = loaded ? "Kártya generálása..." : "Betöltés...";

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
      setErr("Nem sikerült betölteni a kártyákat.");
    } else {
      // 2) dream_answers
      let answersQuery = supabase.from("dream_answers").select("work_id, content, created_at").eq("session_id", sessionId);
      if (userId) answersQuery = answersQuery.eq("user_id", userId);

      const { data: answers } = await answersQuery;
      const answersByWorkId = buildAnswersByWorkId((answers ?? []) as WorkAnswerRow[]);

      const mapped = (versions ?? [])
        .map((row: any) => toWorkBlock(row, answersByWorkId))
        .filter((b): b is WorkBlock => Boolean(b));

      setBlocks(mapped);
    }

    // 3) work_latest
    let latestQuery = supabase.from("work_latest").select("work_version_id").eq("session_id", sessionId);
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

      if (next.status === "stop" && next.stop_signal) {
        setClosureBlock(next.stop_signal);
        setPendingNextPayload(payload);
        return true;
      }

      if (next.status !== "ok" || !next.work_block) {
        setNextErr("Nem sikerült lekérni a következő kérdést.");
        return false;
      }

      const maxSeq = directionBlocks.reduce((max, block) => Math.max(max, block.content.sequence ?? 0), 0);

      const resolvedSlug = next.work_block.direction_slug ?? directionSlug;
      const trace = (next.work_block.trace ?? {}) as unknown as Json;
      const traceMaterialId =
        trace && typeof (trace as any)?.selection?.material_id === "string" ? String((trace as any).selection.material_id) : null;

      const content: DirectionCardContent = {
        kind: "direction_card",
        direction_slug: resolvedSlug,
        sequence: maxSeq + 1,
        state: "open",
        group_tags: next.work_block.group_tags ?? [],
        material_id: traceMaterialId,
        mode: next.work_block.mode,
        ai: { context: next.work_block.lead_in, prompt: next.work_block.prompt },
        user: { answer: null, answered_at: null },
        trace,
        request_id: next.request_id ?? null,
        client_request_id: payload.client_request_id ?? null,
      };

      const now = new Date().toISOString();
      const inserted: WorkBlock = {
        id: next.work_block.id,
        session_id: sessionId,
        user_id: "",
        block_type: "dream_analysis",
        content,
        created_at: now,
        updated_at: now,
      };

      setLatestWorkVersionId(next.work_block.id ?? null);
      setBlocks((prev) => [...prev, inserted]);
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

    const payload: NextPayload = {
      session_id: sessionId,
      direction_slug: directionSlug,
      client_request_id: buildClientRequestId(),
    };

    setPendingNextPayload(payload);
    await processNextPayload(payload);
  }, [directionSlug, processNextPayload, rawLoading, sessionId]);

  useEffect(() => {
    if (!directionSlug || loading || busy || ensuredInitial || !loaded) return;
    if (rawLoading) return;

    if (directionBlocks.length === 0) void ensureInitialBlock();
    setEnsuredInitial(true);
  }, [busy, directionBlocks.length, directionSlug, ensuredInitial, ensureInitialBlock, loaded, loading, rawLoading]);

  // v0: index-session should read dream_entries; do NOT send dream_text
  useEffect(() => {
  if (!sessionId) return;
  if (indexAttemptedRef.current) return;
  if (!loaded) return;
  if (rawLoading) return;

  indexAttemptedRef.current = true;

  void fetchWithAuth("/api/session/ensure", {
    method: "POST",
    json: {
      session_id: sessionId,
      run: { observe: true, anchors: true, session_index: true, latent: false, frame: false },
    },
  }).catch(() => {});
}, [sessionId, loaded, rawLoading]);


  const saveAnswer = useCallback(
    async (block: DirectionWorkBlock, answer: string) => {
      if (!directionSlug) {
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

        const payload: NextPayload = {
          session_id: sessionId,
          direction_slug: directionSlug,
          client_request_id: buildClientRequestId(),
        };

        setPendingNextPayload(payload);
        await processNextPayload(payload);
      } catch {
        setErr("Nem sikerült menteni a választ.");
      } finally {
        setBusy(false);
      }
    },
    [directionSlug, processNextPayload, sessionId]
  );

  if (loading) {
    return <FullScreenLoadingOverlay open title="Betöltés…" />;
  }

  if (!directionSlug) {
    return (
      <p style={{ color: "var(--text-muted)" }}>
        Válassz egy irányt az <Link href={`/session/${sessionId}/direction`}>irányválasztó</Link> oldalon, majd térj vissza ide.
      </p>
    );
  }

  if (closureBlock) {
    return <ClosureCard signal={closureBlock} sessionId={sessionId} />;
  }

  return (
    <div className="work-center">
      <FullScreenLoadingOverlay open={showBlocker} title={blockerTitle} />

      <div className="work-inner">
        <div className="stack work-stack">
          {currentBlock ? (
            <div className="stack" style={{ gap: 14 }}>
              <WorkCard
                mode="edit"
                block={currentBlock}
                directionMeta={directionConfig}
                busy={busy}
                sessionId={sessionId}
                onSave={(answer) => saveAnswer(currentBlock, answer)}
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
          ) : null}

          {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
        </div>
      </div>

      <style jsx>{`
        .work-center {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: var(--space-2);
        }

        .work-inner {
          width: min(720px, 100%);
          margin-inline: auto;
        }

        .work-stack {
          padding-inline: var(--space-2);
        }

        @media (max-width: 680px) {
          .work-center {
            padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom, 0px));
          }

          .work-stack {
            padding-inline: 0;
          }
        }
      `}</style>
    </div>
  );
}

function ClosureCard({ signal, sessionId }: { signal: NextResponse["stop_signal"]; sessionId: string }) {
  const suggested = new Set(signal?.suggested_actions ?? []);
  return (
    <Card>
      <div className="stack-tight">
        <div style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)" }}>{signal?.message ?? ""}</div>
        <div style={{ fontWeight: 800 }}>Szeretnél irányt váltani, vagy most pihenni?</div>

        <div className="closure-actions">
          {suggested.has("switch_direction") ? (
            <Link href={`/session/${sessionId}/direction`} style={{ textDecoration: "none" }}>
              <PrimaryButton variant="secondary">További irányok</PrimaryButton>
            </Link>
          ) : null}

          {suggested.has("continue_later") ? (
            <Link href={`/archive`} style={{ textDecoration: "none" }}>
              <PrimaryButton variant="secondary">Később folytatom</PrimaryButton>
            </Link>
          ) : null}

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

        <p style={{ color: "var(--text-muted)", margin: 0 }}>Ha szeretnéd, később bármikor visszatérhetsz ugyanebbe a sessionbe.</p>
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
      prompt: content.ai?.prompt ?? null,
      question: content.ai?.question ?? null,
    },
  };
}

