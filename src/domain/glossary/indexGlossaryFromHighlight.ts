// src/domain/glossary/indexGlossaryFromHighlight.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import {
  bumpTermCandidates,
  fetchGlossaryTermsByCanonicalKeys,
  upsertGlossaryOccurrences,
} from "@/src/db/repositories/glossaryRepo";
import { isPlausibleTerm } from "./normalizeTerm";

type SupabaseLike = any;

export async function indexGlossaryFromHighlight(params: {
  supabase: SupabaseLike;
  userId: string;
  sessionId: string;
  label: string;
  source?: "user_note" | "import" | "observation";
}) {
  const label = (params.label ?? "").replace(/\s+/g, " ").trim();
  if (!label || !isPlausibleTerm(label)) return { indexed: 0, occurred: 0 };

  const canonicalKey = matchKeyFromLabel(label) || anchorKey(label);
  if (!canonicalKey) return { indexed: 0, occurred: 0 };

  const source = params.source ?? "user_note";

  // ---- 1) term_candidates: increment counts (best-effort)
  try {
    await bumpTermCandidates(params.supabase, {
      user_id: params.userId,
      terms: [canonicalKey],
      displayLabels: { [canonicalKey]: label },
    });
  } catch (err: any) {
    console.warn("[indexGlossaryFromHighlight] term_candidates upsert failed", err?.message ?? String(err));
  }

  // ---- 2) glossary_occurrences: only for already-fixed glossary terms
  let occurred = 0;
  const matchKeys = Array.from(new Set([canonicalKey, anchorKey(label)].filter(Boolean)));

  try {
    const matchedTerms = await fetchGlossaryTermsByCanonicalKeys(params.supabase, {
      user_id: params.userId,
      canonical_keys: matchKeys,
    });

    if (matchedTerms.length > 0) {
      await upsertGlossaryOccurrences(params.supabase, {
        user_id: params.userId,
        session_id: params.sessionId,
        rows: matchedTerms.map((t) => ({ term_id: t.id, source })),
      });
      occurred = matchedTerms.length;
    }
  } catch (err: any) {
    console.warn("[indexGlossaryFromHighlight] glossary_occurrences upsert failed", err?.message ?? String(err));
  }

  return { indexed: 1, occurred };
}
