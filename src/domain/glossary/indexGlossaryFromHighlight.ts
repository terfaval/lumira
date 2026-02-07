// src/domain/glossary/indexGlossaryFromHighlight.ts
import { anchorKey, stripDiacritics } from "@/src/lib/dream/anchorKey";
import { isSoftTokenMatch, matchKeyFromLabel, tokenizeForMatch } from "@/src/lib/dream/huMatch";
import {
  bumpTermCandidates,
  fetchGlossaryTermsByCanonicalKeys,
  upsertGlossaryOccurrences,
} from "@/src/db/repositories/glossaryRepo";
import { isGlossaryCandidateAllowed } from "./glossaryCandidateRules";

type SupabaseLike = any;

export async function indexGlossaryFromHighlight(params: {
  supabase: SupabaseLike;
  userId: string;
  sessionId: string;
  label: string;
  source?: "user_note" | "import" | "observation";
  rawText?: string | null;
  glossaryTermId?: string | null;
  allowCreate?: boolean;
}): Promise<{ indexed: number; occurred: number; matched_term_id?: string; matched_canonical_key?: string; occurrence_count?: number }> {
  const label = (params.label ?? "").replace(/\s+/g, " ").trim();
  if (!label) return { indexed: 0, occurred: 0 };

  const canonicalKey = matchKeyFromLabel(label) || anchorKey(label);
  if (!canonicalKey) return { indexed: 0, occurred: 0 };
  if (!isGlossaryCandidateAllowed(label, canonicalKey)) return { indexed: 0, occurred: 0 };

  const source = params.source ?? "user_note";
  const allowCreate = params.allowCreate === true;
  const occurrenceCount = countOccurrencesInText(params.rawText ?? null, label);

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
  let matched_term_id: string | undefined;
  let matched_canonical_key: string | undefined;
  const matchKeys = Array.from(new Set([canonicalKey, anchorKey(label)].filter(Boolean)));

  try {
    if (params.glossaryTermId) {
      matched_term_id = params.glossaryTermId;
      matched_canonical_key = canonicalKey;
      await upsertGlossaryOccurrences(params.supabase, {
        user_id: params.userId,
        session_id: params.sessionId,
        rows: [{ term_id: matched_term_id, source, count: occurrenceCount }],
      });
      occurred = 1;
    } else {
      const matchedTerms = await fetchGlossaryTermsByCanonicalKeys(params.supabase, {
        user_id: params.userId,
        canonical_keys: matchKeys,
      });

      if (matchedTerms.length > 0) {
        const sorted = matchedTerms
          .filter((t) => t?.id && t?.canonical_key)
          .slice()
          .sort((a, b) => String(a.canonical_key ?? "").localeCompare(String(b.canonical_key ?? "")));
        const best = sorted[0];
        if (best?.id) {
          matched_term_id = best.id;
          matched_canonical_key = String(best.canonical_key ?? "").trim() || undefined;
        }

        await upsertGlossaryOccurrences(params.supabase, {
          user_id: params.userId,
          session_id: params.sessionId,
          rows: matchedTerms.map((t) => ({ term_id: t.id, source, count: occurrenceCount })),
        });
        occurred = matchedTerms.length;
      } else if (allowCreate) {
        const insertRes = await params.supabase
          .from("glossary_terms")
          .insert({ user_id: params.userId, canonical: label, canonical_key: canonicalKey })
          .select("id, canonical_key")
          .maybeSingle();

        if (insertRes.error) {
          const retry = await fetchGlossaryTermsByCanonicalKeys(params.supabase, {
            user_id: params.userId,
            canonical_keys: [canonicalKey],
          });
          const fallback = retry[0];
          if (fallback?.id) {
            matched_term_id = fallback.id;
            matched_canonical_key = String(fallback.canonical_key ?? "").trim() || undefined;
          }
        } else if (insertRes.data?.id) {
          matched_term_id = insertRes.data.id;
          matched_canonical_key = String(insertRes.data.canonical_key ?? "").trim() || undefined;
        }

        if (matched_term_id) {
          await upsertGlossaryOccurrences(params.supabase, {
            user_id: params.userId,
            session_id: params.sessionId,
            rows: [{ term_id: matched_term_id, source, count: occurrenceCount }],
          });
          occurred = 1;
          await params.supabase
            .from("term_candidates")
            .delete()
            .eq("user_id", params.userId)
            .eq("term", canonicalKey);
        }
      }
    }
  } catch (err: any) {
    console.warn("[indexGlossaryFromHighlight] glossary_occurrences upsert failed", err?.message ?? String(err));
  }

  return { indexed: 1, occurred, matched_term_id, matched_canonical_key, occurrence_count: occurrenceCount };
}

export function countOccurrencesInText(rawText: string | null, label: string): number {
  if (!rawText) return 1;
  const needleTokens = tokenizeForMatch(label);
  if (needleTokens.length === 0) return 1;

  const textTokens = tokenizeForMatch(rawText);
  if (textTokens.length === 0) return 1;

  let count = 0;
  const len = needleTokens.length;
  for (let i = 0; i <= textTokens.length - len; i++) {
    let ok = true;
    for (let j = 0; j < len; j++) {
      if (!isSoftTokenMatch(stripDiacritics(textTokens[i + j]), stripDiacritics(needleTokens[j]))) {
        ok = false;
        break;
      }
    }
    if (ok) count++;
  }

  return Math.max(1, count);
}
