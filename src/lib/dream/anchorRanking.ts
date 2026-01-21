// Anchor ranking utilities for the álomnapló project.
//
// This module centralises the logic for collecting, deduplicating and
// ranking anchors (kulcspontok) extracted from the latent analysis and
// synthesizer outputs.  It also cross‑references anchors against the
// user's dream glossary and counts previous occurrences in the dream text.
//
// Each anchor is returned with a score and optional meta‑information so
// that downstream routes (frame, work) can pick the most relevant
// anchors for titles, framings or next questions.

import { supabaseServerAuthed } from '@/src/lib/supabase/serverAuthed';  /**
   * Approximate count of how many times this anchor appears in the raw
   * dream text.  Used as an additional signal for relevance.
   */
  occurrences: number;
  /**
   * Set to true if the anchor appears in the question_seed.target_anchor
   * field of the latent analysis.  This adds extra weight.
   */
  isTarget: boolean;
}

/**
 * Helper to normalise Hungarian text for deduplication.  Converts to lower
 * case and trims whitespace.  Does not remove diacritics to preserve
 * user‑specific names; adjust if necessary.
 */
function normaliseKey(s: string): string {
  return (s || '').toLowerCase().trim();
}

/**
 * Collect raw anchor candidates from latent analysis and synth outputs.
 * Returns a map keyed by normalised string with first occurrence and
 * category.  Duplicate strings (case‑insensitive) will keep the first
 * occurrence.
 */
function collectAnchors(latent: any, synth: any) {
  const map = new Map<string, { name: string; category: AnchorCategory }>();
  const add = (arr: any, category: AnchorCategory) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const key = normaliseKey(item);
      if (!key) continue;
      if (!map.has(key)) map.set(key, { name: item, category });
    }
  };
  if (latent && typeof latent === 'object' && latent.anchors) {
    add(latent.anchors.characters, 'character');
    add(latent.anchors.places, 'place');
    add(latent.anchors.objects, 'object');
    add(latent.anchors.beats, 'beat');
    add(latent.anchors.felt_words, 'felt_word');
  }
  if (synth && typeof synth === 'object' && synth.anchors) {
    add(synth.anchors.characters, 'character');
    add(synth.anchors.places, 'place');
    add(synth.anchors.objects, 'object');
    add(synth.anchors.beats, 'beat');
    add(synth.anchors.felt_words, 'felt_word');
  }
  return map;
}

/**
 * Compute a relevance score for a given anchor.  Category weights can be
 * tuned based on empirical data: beats > characters > places > objects >
 * felt words.  Additional weight is added if the anchor matches the
 * question_seed.target_anchor or appears in the latent candidate_directions.
 */
function scoreAnchor(params: {
  category: AnchorCategory;
  occurrences: number;
  isTarget: boolean;
}): number {
  const baseWeights: Record<AnchorCategory, number> = {
    beat: 5,
    character: 4,
    place: 3,
    object: 2,
    felt_word: 1,
  };
  let score = baseWeights[params.category] || 1;
  score += params.occurrences * 0.5;
  if (params.isTarget) score += 3;
  return score;
}

/**
 * Count approximate occurrences of an anchor in the dream text.  A simple
 * case‑insensitive substring count is used; this can be replaced with
 * morphological matching if needed.
 */
function countOccurrences(name: string, dreamText: string): number {
  if (!name || !dreamText) return 0;
  const key = normaliseKey(name);
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
 * Determine whether an anchor is considered "used" based on a list of
 * previous questions.  All words of the anchor must appear in a question
 * (case‑insensitive).  This replicates the existing work route logic.
 */
export function anchorUsed(anchor: string, prevQuestions: string[]): boolean {
  const parts = (anchor || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;
  return prevQuestions.some((q) => {
    const t = (q || '').toLowerCase();
    return parts.every((p) => t.includes(p));
  });
}

/**
 * Rank anchors for a given user and dream.  This function collects
 * anchors from latent/synth, queries the user's glossary for matching
 * entries, counts occurrences in the dream text, applies a scoring
 * function and returns a sorted list of AnchorInfo objects.  Anchors
 * already used in previous questions can optionally be filtered out.
 *
 * @param supabase An authenticated supabase client (server‑side) to query the glossary.
 * @param userId The authenticated user's ID.
 * @param dreamText The raw dream text.
 * @param latent The latent analysis object (may be null).
 * @param synth The synthesizer output (may be null).
 * @param prevQuestions Previous questions asked in this direction (used to filter used anchors).
 * @param includeUsed If false, anchors found in prevQuestions are excluded.
 * @param maxCount Optional maximum number of anchors to return.
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
  const maxCount = params.maxCount ?? undefined;

  // Collect anchors and their base categories.
  const map = collectAnchors(latent, synth);
  const anchors: AnchorInfo[] = [];

  // Identify target anchor from latent analysis if present.
  let targetAnchorKey: string | null = null;
  if (latent && typeof latent === 'object' && latent.question_seed && typeof latent.question_seed === 'object') {
    const t = latent.question_seed.target_anchor;
    if (typeof t === 'string') targetAnchorKey = normaliseKey(t);
  }

  // Preload glossary items matching any anchor names for this user.
  const names = Array.from(map.values()).map((v) => v.name);
  let glossaryMatches: Record<string, { note: string | null }> = {};
  if (names.length > 0) {
    const { data: terms, error } = await supabase
      .from("glossary_terms")
      .select("id, canonical")
      .eq("user_id", userId)
      .in("canonical", names);
    if (!error && Array.isArray(terms)) {
      const termIds = terms.map((t: any) => t.id);
      const notesByTerm = new Map<string, string>();
      if (termIds.length > 0) {
        const { data: notes } = await supabase
          .from("glossary_notes")
          .select("term_id, content, created_at")
          .in("term_id", termIds)
          .order("created_at", { ascending: false });
        if (Array.isArray(notes)) {
          for (const row of notes as any[]) {
            if (!notesByTerm.has(row.term_id)) {
              notesByTerm.set(row.term_id, row.content ?? null);
            }
          }
        }
      }
      for (const term of terms as any[]) {
        const key = normaliseKey(term.canonical);
        glossaryMatches[key] = {
          note: notesByTerm.get(term.id) ?? null,
        };
      }
    }
  }

  // Build AnchorInfo objects with scores.

  for (const [key, { name, category }] of map.entries()) {
    // Skip if already used and we don't include used ones.
    if (!includeUsed && anchorUsed(name, prevQs)) continue;
    const occurrences = countOccurrences(name, dreamText);
    const isTarget = key === targetAnchorKey;
    const baseScore = scoreAnchor({ category, occurrences, isTarget });
    const glossary = glossaryMatches[key];
    const info: AnchorInfo = {
      name,
      category,
      score: baseScore,
      inGlossary: Boolean(glossary),
      glossaryNotes: glossary ? glossary.note : null,
      occurrences,
      isTarget,
    };
    anchors.push(info);
  }
  // Sort anchors descending by score, then alphabetically to stabilise ordering.
  anchors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  return typeof maxCount === 'number' && maxCount > 0 ? anchors.slice(0, maxCount) : anchors;
}