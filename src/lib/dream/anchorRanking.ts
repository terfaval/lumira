// src/lib/dream/anchorRanking.ts
// Anchor ranking utilities for the álomnapló project.
//
// This module centralises the logic for collecting, deduplicating and
// ranking anchors (kulcspontok) extracted from latent/synth outputs.
// It can cross-reference anchors against the user's dream glossary
// and counts approximate occurrences in the dream text.
//
// Each anchor is returned with a score and optional meta-information so
// that downstream routes (frame, work) can pick the most relevant anchors.

export type AnchorCategory = "character" | "place" | "object" | "beat" | "felt_word";

export type AnchorInfo = {
  name: string;
  category: AnchorCategory;
  score: number;

  inGlossary: boolean;
  glossaryNotes: string | null;

  /**
   * Approximate count of how many times this anchor appears in the raw dream text.
   * Used as an additional signal for relevance.
   */
  occurrences: number;

  /**
   * Set to true if the anchor matches latent.question_seed.target_anchor (if present).
   * This adds extra weight.
   */
  isTarget: boolean;
};

/**
 * Helper to normalise Hungarian text for deduplication.
 * Converts to lower case and trims whitespace.
 * Does not remove diacritics to preserve user-specific names.
 */
function normaliseKey(s: string): string {
  return (s || "").toLowerCase().trim();
}

function uniqStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const k = normaliseKey(s);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/**
 * Collect raw anchor candidates from latent analysis and synth outputs.
 * Returns a map keyed by normalised string with first occurrence and category.
 * Duplicate strings (case-insensitive) will keep the first occurrence.
 */
function collectAnchors(latent: any, synth: any) {
  const map = new Map<string, { name: string; category: AnchorCategory }>();

  const add = (arr: any, category: AnchorCategory) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item !== "string") continue;
      const key = normaliseKey(item);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { name: item, category });
    }
  };

  // Support both { anchors: { ... } } and direct shapes if needed later.
  const latAnch = latent && typeof latent === "object" ? latent.anchors : null;
  const synAnch = synth && typeof synth === "object" ? synth.anchors : null;

  if (latAnch && typeof latAnch === "object") {
    add(latAnch.characters, "character");
    add(latAnch.places, "place");
    add(latAnch.objects, "object");
    add(latAnch.beats, "beat");
    add(latAnch.felt_words, "felt_word");
  }

  if (synAnch && typeof synAnch === "object") {
    add(synAnch.characters, "character");
    add(synAnch.places, "place");
    add(synAnch.objects, "object");
    add(synAnch.beats, "beat");
    add(synAnch.felt_words, "felt_word");
  }

  return map;
}

/**
 * Compute a relevance score for a given anchor.
 * Category weights can be tuned based on empirical data:
 * beats > characters > places > objects > felt words.
 */
function scoreAnchor(params: { category: AnchorCategory; occurrences: number; isTarget: boolean }): number {
  const baseWeights: Record<AnchorCategory, number> = {
    beat: 5,
    character: 4,
    place: 3,
    object: 2,
    felt_word: 1,
  };

  let score = baseWeights[params.category] ?? 1;
  score += params.occurrences * 0.5;
  if (params.isTarget) score += 3;
  return score;
}

/**
 * Count approximate occurrences of an anchor in the dream text.
 * A simple case-insensitive substring count is used.
 */
function countOccurrences(name: string, dreamText: string): number {
  if (!name || !dreamText) return 0;
  const key = normaliseKey(name);
  if (!key) return 0;

  const text = dreamText.toLowerCase();
  let count = 0;
  let idx = text.indexOf(key);

  while (idx !== -1) {
    count++;
    idx = text.indexOf(key, idx + key.length);
  }

  return count;
}

/**
 * Determine whether an anchor is considered "used" based on a list of previous questions.
 * All words of the anchor must appear in a question (case-insensitive).
 * This replicates the existing work route logic.
 */
export function anchorUsed(anchor: string, prevQuestions: string[]): boolean {
  const parts = (anchor || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;

  return (prevQuestions || []).some((q) => {
    const t = (q || "").toLowerCase();
    return parts.every((p) => t.includes(p));
  });
}

/**
 * Rank anchors for a given user and dream.
 *
 * Collects anchors from latent/synth, queries the user's glossary for matching entries,
 * counts occurrences in dream text, applies scoring and returns a sorted list.
 */
export async function rankAnchors(params: {
  supabase: any;
  userId: string;
  dreamText: string;
  latent: any | null;
  synth: any | null;
  prevQuestions?: string[];
  includeUsed?: boolean;
  maxCount?: number;
}): Promise<AnchorInfo[]> {
  const { supabase, userId, dreamText, latent, synth } = params;
  const prevQs = Array.isArray(params.prevQuestions) ? params.prevQuestions : [];
  const includeUsed = params.includeUsed ?? false;
  const maxCount = typeof params.maxCount === "number" ? params.maxCount : undefined;

  // Collect anchors and their base categories.
  const map = collectAnchors(latent, synth);
  const anchors: AnchorInfo[] = [];

  // Identify target anchor from latent analysis if present.
  let targetAnchorKey: string | null = null;
  const seed = latent && typeof latent === "object" ? (latent as any).question_seed : null;
  if (seed && typeof seed === "object" && typeof (seed as any).target_anchor === "string") {
    targetAnchorKey = normaliseKey((seed as any).target_anchor);
  }

  // Preload glossary items matching any anchor names for this user.
  // NOTE: This is exact-match on canonical; if you later want fuzzy/normalised,
  // do it in SQL with a normalised column or in an RPC.
  const names = uniqStrings(Array.from(map.values()).map((v) => v.name));
  const glossaryMatches: Record<string, { note: string | null }> = {};

  if (names.length > 0) {
    const { data: terms, error } = await supabase
      .from("glossary_terms")
      .select("id, canonical")
      .eq("user_id", userId)
      .in("canonical", names);

    if (!error && Array.isArray(terms) && terms.length > 0) {
      const termIds = terms.map((t: any) => t.id).filter(Boolean);
      const notesByTerm = new Map<string, string | null>();

      if (termIds.length > 0) {
        const { data: notes, error: notesErr } = await supabase
          .from("glossary_notes")
          .select("term_id, content, created_at")
          .in("term_id", termIds)
          .order("created_at", { ascending: false });

        if (!notesErr && Array.isArray(notes)) {
          for (const row of notes as any[]) {
            if (!row?.term_id) continue;
            if (notesByTerm.has(row.term_id)) continue; // keep latest (ordered desc)
            notesByTerm.set(row.term_id, (row.content ?? null) as any);
          }
        }
      }

      for (const term of terms as any[]) {
        const key = normaliseKey(term.canonical);
        glossaryMatches[key] = { note: notesByTerm.get(term.id) ?? null };
      }
    }
  }

  // Build AnchorInfo objects with scores.
  for (const [key, { name, category }] of map.entries()) {
    if (!includeUsed && anchorUsed(name, prevQs)) continue;

    const occurrences = countOccurrences(name, dreamText);
    const isTarget = Boolean(targetAnchorKey && key === targetAnchorKey);
    const baseScore = scoreAnchor({ category, occurrences, isTarget });

    const glossary = glossaryMatches[key];
    anchors.push({
      name,
      category,
      score: baseScore,
      inGlossary: Boolean(glossary),
      glossaryNotes: glossary ? glossary.note : null,
      occurrences,
      isTarget,
    });
  }

  // Sort anchors descending by score, then alphabetically to stabilise ordering.
  anchors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  if (typeof maxCount === "number" && maxCount > 0) return anchors.slice(0, maxCount);
  return anchors;
}
