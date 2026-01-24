// src/domain/glossary/indexGlossaryFromObservation.ts
import { extractGlossaryCandidatesFromObservation } from "./glossaryCandidateExtractor";
import { bumpTermCandidates } from "@/src/db/repositories/glossaryRepo";

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

  const candidates = extractGlossaryCandidatesFromObservation(observationPayload);
  if (candidates.length === 0) return { indexed: 0, occurred: 0 };

  const terms = candidates.map((c) => c.canonical_key);

  // ---- 1) term_candidates: increment counts (best-effort, batched)
  const displayLabels: Record<string, string> = {};
  for (const c of candidates) {
    if (!c?.canonical_key) continue;
    const label = typeof c.display_label === "string" ? c.display_label.trim() : "";
    if (label) displayLabels[c.canonical_key] = label;
  }

  try {
    await bumpTermCandidates(supabase, {
      user_id: userId,
      terms,
      displayLabels,
    });
  } catch (err: any) {
    console.warn("[indexGlossaryFromObservation] term_candidates upsert failed", err?.message ?? String(err));
  }

  // ---- 2) glossary_occurrences: only for already-fixed glossary terms
  let occurred = 0;

  if (terms.length > 0) {
    const { data: matchedTerms, error: matchErr } = await supabase
      .from("glossary_terms")
      .select("id, canonical_key")
      .eq("user_id", userId)
      .in("canonical_key", terms);

    if (!matchErr && Array.isArray(matchedTerms) && matchedTerms.length > 0) {
      const occRows = matchedTerms.map((t: any) => ({
        term_id: t.id,
        session_id: sessionId,
        user_id: userId,
        source,
      }));

      const { error: occErr } = await supabase
        .from("glossary_occurrences")
        .upsert(occRows, { onConflict: "user_id,term_id,session_id" });

      if (!occErr) occurred = occRows.length;
      else console.warn("[indexGlossaryFromObservation] glossary_occurrences upsert failed", occErr.message);
    }
  }

  return { indexed: terms.length, occurred };
}
