// src/domain/glossary/indexGlossaryFromObservation.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { extractGlossaryCandidatesFromObservation } from "./glossaryCandidateExtractor";

type SupabaseLike = any;

export async function indexGlossaryFromObservation(params: {
  supabase: SupabaseLike;
  userId: string;
  sessionId: string;
  observationPayload: any;
  source?: "observation" | "import";
}) {
  const { supabase, userId, sessionId, observationPayload } = params;
  const source = params.source ?? "observation";

  const terms = extractGlossaryCandidatesFromObservation(observationPayload);
  if (terms.length === 0) return { indexed: 0, occurred: 0 };

  // ---- 1) term_candidates: increment counts (best-effort, batched)
  const { data: existing, error: existingErr } = await supabase
    .from("term_candidates")
    .select("term, count")
    .eq("user_id", userId)
    .in("term", terms);

  if (existingErr) {
    // don't fail the whole pipeline
    console.warn("[indexGlossaryFromObservation] term_candidates select failed", existingErr.message);
  }

  const counts = new Map<string, number>();
  for (const row of (existing ?? [])) counts.set(row.term, row.count ?? 0);

  const nowIso = new Date().toISOString();
  const nextRows = terms.map((t) => ({
    user_id: userId,
    term: t,
    count: (counts.get(t) ?? 0) + 1,
    last_seen_at: nowIso,
  }));

  const { error: upsertErr } = await supabase
    .from("term_candidates")
    .upsert(nextRows, { onConflict: "user_id,term" });

  if (upsertErr) {
    console.warn("[indexGlossaryFromObservation] term_candidates upsert failed", upsertErr.message);
  }

  // ---- 2) glossary_occurrences: only for already-fixed glossary terms
  const keys = terms
    .map((t) => anchorKey(t))
    .filter(Boolean);

  let occurred = 0;

  if (keys.length > 0) {
    const { data: matchedTerms, error: matchErr } = await supabase
      .from("glossary_terms")
      .select("id, canonical_key")
      .eq("user_id", userId)
      .in("canonical_key", keys);

    if (!matchErr && Array.isArray(matchedTerms) && matchedTerms.length > 0) {
      const occRows = matchedTerms.map((t: any) => ({
        term_id: t.id,
        session_id: sessionId,
        user_id: userId,
        source,
      }));

      const { error: occErr } = await supabase
        .from("glossary_occurrences")
        .upsert(occRows, { onConflict: "term_id,session_id" });

      if (!occErr) occurred = occRows.length;
      else console.warn("[indexGlossaryFromObservation] glossary_occurrences upsert failed", occErr.message);
    }
  }

  return { indexed: terms.length, occurred };
}
