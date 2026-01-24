// src/domain/glossary/indexObservationIntoGlossary.ts

/**
 * Deprecated / DO NOT USE:
 * - Uses raw term storage in term_candidates.term (drifts from canonical anchorKey storage)
 * - Not wired into the current pipeline
 * Keep only for historical reference until removed.
 */


import { SupabaseClient } from "@supabase/supabase-js";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { collectGlossaryCandidatesFromObservation } from "./collectGlossaryCandidatesFromObservation";

type Args = {
  supabase: SupabaseClient;
  user_id: string;
  session_id: string;
  observation_payload: any;
};

function uniqStrings(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const t = (x ?? "").trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export async function indexObservationIntoGlossary(args: Args): Promise<void> {
  const { supabase, user_id, session_id, observation_payload } = args;

  const candidates = collectGlossaryCandidatesFromObservation(observation_payload);
  if (candidates.length === 0) return;

  const canonicalKeys = uniqStrings(
    candidates
      .map((c) => anchorKey(c))
      .filter(Boolean) as string[]
  );

  if (canonicalKeys.length === 0) return;

  // 1) term_candidates: increment counts (best-effort, batched)
  try {
    const { data: existing, error: existingErr } = await supabase
      .from("term_candidates")
      .select("term, count")
      .eq("user_id", user_id)
      .in("term", canonicalKeys);

    if (existingErr) {
      // swallow, but still try "count=1" insert-only approach
      // (however insert-only can't be expressed with upsert easily)
      // We'll still proceed with counts map = 0.
    }

    const counts = new Map<string, number>();
    for (const row of (existing ?? []) as any[]) {
      if (!row?.term) continue;
      counts.set(row.term, row.count ?? 0);
    }

    const nowIso = new Date().toISOString();
    const nextRows = canonicalKeys.map((term) => ({
      user_id,
      term,
      count: (counts.get(term) ?? 0) + 1,
      last_seen_at: nowIso,
    }));

    const { error: upsertErr } = await supabase
      .from("term_candidates")
      .upsert(nextRows, { onConflict: "user_id,term" });

    // ignore failures (best-effort)
    if (upsertErr) {
      // console.warn("[indexObservationIntoGlossary] term_candidates upsert failed", upsertErr.message);
    }
  } catch {
    // swallow
  }

  // 2) glossary_terms lookup (ONLY existing terms)
  const { data: terms } = await supabase
    .from("glossary_terms")
    .select("id, canonical_key")
    .eq("user_id", user_id)
    .in("canonical_key", canonicalKeys);

  if (!terms || terms.length === 0) return;

  const termIdByKey = new Map<string, string>();
  for (const t of terms as any[]) {
    if (t.canonical_key && t.id) {
      termIdByKey.set(t.canonical_key, t.id);
    }
  }

  // 3) glossary_occurrences upsert (idempotent per session)
  // (batched is better, but keeping your simple loop is OK)
  for (const key of canonicalKeys) {
    const term_id = termIdByKey.get(key);
    if (!term_id) continue;

    await supabase
      .from("glossary_occurrences")
      .upsert(
        {
          term_id,
          session_id,
          user_id,
          source: "observation",
        },
        { onConflict: "term_id,session_id" }
      )
      .select();
  }
}
