// src/domain/glossary/indexObservationIntoGlossary.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { extractCandidateTermsFromObservation } from "./extractCandidateTermsFromObservation";
import { normalizeTerm } from "./normalizeTerm";
import { bumpTermCandidates, fetchGlossaryTermsByCanonicalKeys, upsertGlossaryOccurrences } from "@/src/db/repositories/glossaryRepo";

/**
 * D1 use-case: “source checking” / grounding.
 * - We DO NOT interpret.
 * - We only index appearances and candidate frequency.
 *
 * Behavior:
 * - Extract candidate terms from observation payload
 * - Normalize -> canonicalize (anchorKey)
 * - Update term_candidates (frequency + last_seen)
 * - If user already has glossary_terms for a canonical_key, upsert an occurrence row for this session
 */
export async function indexObservationIntoGlossary(args: {
  supabase: SupabaseClient;
  user_id: string;
  session_id: string;
  observation_payload: unknown;
}): Promise<{
  candidates_indexed: number;
  occurrences_upserted: number;
}> {
  const { supabase, user_id, session_id, observation_payload } = args;

  const rawTerms = extractCandidateTermsFromObservation(observation_payload);

  // canonical_key = anchorKey(normalized)
  const canonicalKeys = Array.from(
    new Set(
      rawTerms
        .map((t) => normalizeTerm(t))
        .filter(Boolean)
        .map((t) => anchorKey(t))
        .filter(Boolean)
    )
  );

  // 1) bump candidates
  await bumpTermCandidates(supabase, { user_id, terms: canonicalKeys });

  // 2) occurrences only for already-accepted glossary terms
  const existingTerms = await fetchGlossaryTermsByCanonicalKeys(supabase, { user_id, canonical_keys: canonicalKeys });

  await upsertGlossaryOccurrences(supabase, {
    user_id,
    session_id,
    rows: existingTerms.map((t) => ({ term_id: t.id, source: "observation" })),
  });

  return { candidates_indexed: canonicalKeys.length, occurrences_upserted: existingTerms.length };
}
