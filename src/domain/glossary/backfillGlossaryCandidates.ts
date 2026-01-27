// src/domain/glossary/backfillGlossaryCandidates.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { extractGlossaryCandidatesFromObservation } from "./glossaryCandidateExtractor";

export const DEFAULT_MAX_SESSIONS = 500;
export const MAX_SESSIONS_HARD_LIMIT = 2000;
export const BATCH_SIZE = 200;

type BackfillCandidatesResult = {
  scanned: number;
  candidates: number;
  terms: number;
  upserted: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function backfillGlossaryCandidatesForUser(params: {
  supabase: SupabaseClient;
  userId: string;
  maxSessions?: number;
  logProgress?: boolean;
}): Promise<BackfillCandidatesResult> {
  const { supabase, userId } = params;
  const requested = params.maxSessions ?? DEFAULT_MAX_SESSIONS;
  const maxSessions = Math.min(Math.max(1, requested), MAX_SESSIONS_HARD_LIMIT);

  if (params.logProgress) {
    console.info("[glossary candidates backfill] start", { userId, maxSessions });
  }

  const latestRes = await supabase
    .from("observation_latest")
    .select("session_id, latest_v0_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(maxSessions);

  if (latestRes.error) throw toError(latestRes.error);

  const latestRows = (latestRes.data ?? []) as Array<{
    session_id: string;
    latest_v0_id: string | null;
  }>;

  if (latestRows.length === 0) return { scanned: 0, candidates: 0, terms: 0, upserted: 0 };

  const versionIds = Array.from(
    new Set(latestRows.map((row) => row.latest_v0_id).filter((id): id is string => typeof id === "string"))
  );

  const payloadById = new Map<string, any>();
  for (const batch of chunk(versionIds, BATCH_SIZE)) {
    const { data, error } = await supabase
      .from("observation_versions")
      .select("id,payload")
      .eq("user_id", userId)
      .in("id", batch);
    if (error) throw toError(error);
    for (const row of data ?? []) {
      payloadById.set((row as any).id, (row as any).payload);
    }
  }

  const counts = new Map<string, number>();
  const displayLabels = new Map<string, string>();

  for (const row of latestRows) {
    if (!row.latest_v0_id) continue;
    const payload = payloadById.get(row.latest_v0_id);
    if (!payload) continue;

    const candidates = extractGlossaryCandidatesFromObservation(payload);
    if (candidates.length === 0) continue;

    for (const candidate of candidates) {
      if (!candidate?.canonical_key) continue;
      counts.set(candidate.canonical_key, (counts.get(candidate.canonical_key) ?? 0) + 1);
      if (!displayLabels.has(candidate.canonical_key) && candidate.display_label) {
        displayLabels.set(candidate.canonical_key, candidate.display_label);
      }
    }
  }

  const terms = Array.from(counts.keys());
  if (terms.length === 0) return { scanned: latestRows.length, candidates: 0, terms: 0, upserted: 0 };

  const existingMap = new Map<string, number>();
  const existingLabels = new Map<string, string>();
  for (const batch of chunk(terms, BATCH_SIZE)) {
    const existingRes = await supabase
      .from("term_candidates")
      .select("term,count,display_label")
      .eq("user_id", userId)
      .in("term", batch);
    if (existingRes.error) throw toError(existingRes.error);
    for (const row of existingRes.data ?? []) {
      const term = (row as any).term;
      if (!term) continue;
      existingMap.set(term, Number((row as any).count ?? 0));
      const label = typeof (row as any).display_label === "string" ? (row as any).display_label.trim() : "";
      if (label) existingLabels.set(term, label);
    }
  }

  const nowISO = new Date().toISOString();
  const upserts = terms.map((term) => ({
    user_id: userId,
    term,
    display_label: existingLabels.get(term) ?? displayLabels.get(term) ?? term,
    count: (existingMap.get(term) ?? 0) + (counts.get(term) ?? 0),
    last_seen_at: nowISO,
  }));

  let upserted = 0;
  for (const batch of chunk(upserts, BATCH_SIZE)) {
    const upsertRes = await supabase
      .from("term_candidates")
      .upsert(batch, { onConflict: "user_id,term" });
    if (upsertRes.error) throw toError(upsertRes.error);
    upserted += batch.length;
  }

  const totalCandidates = Array.from(counts.values()).reduce((sum, n) => sum + n, 0);
  const result = { scanned: latestRows.length, candidates: totalCandidates, terms: terms.length, upserted };

  if (params.logProgress) {
    console.info("[glossary candidates backfill] done", result);
  }

  return result;
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object") {
    const anyErr = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [
      typeof anyErr.message === "string" ? anyErr.message : "",
      typeof anyErr.details === "string" ? anyErr.details : "",
      typeof anyErr.hint === "string" ? anyErr.hint : "",
      typeof anyErr.code === "string" ? `code=${anyErr.code}` : "",
    ].filter(Boolean);
    return new Error(parts.join(" | ") || "Unknown error");
  }
  return new Error(String(err));
}
