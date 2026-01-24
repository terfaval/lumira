// src/domain/glossary/backfillGlossaryOccurrences.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { extractGlossaryCandidatesFromObservation } from "./glossaryCandidateExtractor";

type BackfillResult = {
  scanned: number;
  matched: number;
  upserted: number;
};

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function backfillGlossaryOccurrencesForTerm(params: {
  supabase: SupabaseClient;
  userId: string;
  termId: string;
  canonicalKey: string;
  maxSessions?: number;
}): Promise<BackfillResult> {
  const { supabase, userId, termId, canonicalKey } = params;
  const maxSessions = Math.max(1, params.maxSessions ?? 500);
  const targetKey = (canonicalKey ?? "").trim();
  if (!targetKey) return { scanned: 0, matched: 0, upserted: 0 };

  const latestRes = await supabase
    .from("observation_latest")
    .select("session_id, observation_version_id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(maxSessions);

  if (latestRes.error) throw latestRes.error;

  const latestRows = (latestRes.data ?? []) as Array<{
    session_id: string;
    observation_version_id: string;
  }>;

  if (latestRows.length === 0) return { scanned: 0, matched: 0, upserted: 0 };

  const versionIds = Array.from(
    new Set(latestRows.map((row) => row.observation_version_id).filter(Boolean))
  );

  const payloadById = new Map<string, any>();
  for (const batch of chunk(versionIds, 200)) {
    const { data, error } = await supabase
      .from("observation_versions")
      .select("id,payload")
      .eq("user_id", userId)
      .in("id", batch);
    if (error) throw error;
    for (const row of data ?? []) {
      payloadById.set((row as any).id, (row as any).payload);
    }
  }

  const occurrenceRows: Array<{ user_id: string; term_id: string; session_id: string; source: "observation" }> = [];

  for (const row of latestRows) {
    const payload = payloadById.get(row.observation_version_id);
    if (!payload) continue;

    const candidates = extractGlossaryCandidatesFromObservation(payload);
    if (candidates.length === 0) continue;

    const keys = new Set(candidates.map((c) => c.canonical_key).filter(Boolean));
    if (!keys.has(targetKey)) continue;

    occurrenceRows.push({
      user_id: userId,
      term_id: termId,
      session_id: row.session_id,
      source: "observation",
    });
  }

  let upserted = 0;
  for (const batch of chunk(occurrenceRows, 200)) {
    const { error } = await supabase
      .from("glossary_occurrences")
      .upsert(batch, { onConflict: "user_id,term_id,session_id" });
    if (error) throw error;
    upserted += batch.length;
  }

  return { scanned: latestRows.length, matched: occurrenceRows.length, upserted };
}
