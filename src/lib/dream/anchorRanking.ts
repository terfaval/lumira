// src/lib/dream/anchorRanking.ts
//
// v0 Anchor ranking utilities
// - collects candidates primarily from observation payload (rich, stable)
// - optionally augments/boosts from latent payload (open_loops, hypothesis_slots, etc.)
// - cross-references glossary_terms + glossary_notes
// - counts approximate occurrences in dream text
//
// NOTE: This module is deliberately tolerant to payload shape drift.
// It never assumes a single rigid schema for observation/latent.

import { anchorKey } from "@/src/lib/dream/anchorKey";

export type AnchorCategory = "character" | "place" | "object" | "beat" | "felt_word";

export type AnchorInfo = {
  name: string;
  category: AnchorCategory;
  score: number;

  inGlossary: boolean;
  glossaryNotes: string | null;

  occurrences: number;
  isTarget: boolean;

  // Optional debug/meta hooks (safe to ignore in UI)
  sources?: string[];
};

function normaliseKey(s: string): string {
  return (s || "").toLowerCase().trim();
}

function uniqByKey(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const k = normaliseKey(raw);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(raw.trim());
  }
  return out;
}

function pushIfString(out: string[], x: unknown) {
  if (typeof x === "string") {
    const t = x.trim();
    if (t) out.push(t);
  }
}

function pushArrayStrings(out: string[], x: unknown) {
  if (!Array.isArray(x)) return;
  for (const it of x) pushIfString(out, it);
}

function safeParseJSONMaybeString(payload: any): any {
  // observation_versions.payload in your sample is a JSON string.
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return payload ?? null;
}

/**
 * Pull anchor candidates from observation payload.
 * Supports:
 * - observation.entities.{people,places,objects,themes_words}
 * - observation.scenes[].{characters,setting,objects,actions,mood_words,sensations}
 * - observation.raw_facts (as beats)
 */
function collectFromObservation(observationRaw: any): Array<{ name: string; category: AnchorCategory; source: string }> {
  const obs = safeParseJSONMaybeString(observationRaw);
  if (!obs || typeof obs !== "object") return [];

  const out: Array<{ name: string; category: AnchorCategory; source: string }> = [];

  const entities = (obs as any).entities;
  if (entities && typeof entities === "object") {
    const people: string[] = [];
    const places: string[] = [];
    const objects: string[] = [];
    const themes: string[] = [];

    pushArrayStrings(people, (entities as any).people);
    pushArrayStrings(places, (entities as any).places);
    pushArrayStrings(objects, (entities as any).objects);
    pushArrayStrings(themes, (entities as any).themes_words);

    for (const s of uniqByKey(people)) out.push({ name: s, category: "character", source: "observation.entities.people" });
    for (const s of uniqByKey(places)) out.push({ name: s, category: "place", source: "observation.entities.places" });
    for (const s of uniqByKey(objects)) out.push({ name: s, category: "object", source: "observation.entities.objects" });
    for (const s of uniqByKey(themes)) out.push({ name: s, category: "felt_word", source: "observation.entities.themes_words" });
  }

  const scenes = (obs as any).scenes;
  if (Array.isArray(scenes)) {
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      if (!sc || typeof sc !== "object") continue;

      const chars: string[] = [];
      const objs: string[] = [];
      const acts: string[] = [];
      const moods: string[] = [];
      const sens: string[] = [];

      pushArrayStrings(chars, (sc as any).characters);
      pushArrayStrings(objs, (sc as any).objects);
      pushArrayStrings(acts, (sc as any).actions);
      pushArrayStrings(moods, (sc as any).mood_words);
      pushArrayStrings(sens, (sc as any).sensations);

      // setting is a string (sometimes long) — keep it, but it will likely score lower due to occurrences
      const setting = (sc as any).setting;
      if (typeof setting === "string" && setting.trim()) {
        out.push({ name: setting.trim(), category: "place", source: `observation.scenes[${i}].setting` });
      }

      for (const s of uniqByKey(chars)) out.push({ name: s, category: "character", source: `observation.scenes[${i}].characters` });
      for (const s of uniqByKey(objs)) out.push({ name: s, category: "object", source: `observation.scenes[${i}].objects` });
      for (const s of uniqByKey(acts)) out.push({ name: s, category: "beat", source: `observation.scenes[${i}].actions` });
      for (const s of uniqByKey(moods)) out.push({ name: s, category: "felt_word", source: `observation.scenes[${i}].mood_words` });
      for (const s of uniqByKey(sens)) out.push({ name: s, category: "felt_word", source: `observation.scenes[${i}].sensations` });
    }
  }

  const rawFacts = (obs as any).raw_facts;
  if (Array.isArray(rawFacts)) {
    for (const s of uniqByKey(rawFacts.filter((x: any) => typeof x === "string"))) {
      out.push({ name: s, category: "beat", source: "observation.raw_facts" });
    }
  }

  return out;
}

/**
 * Pull extra candidates / boosts from latent payload.
 * Supports:
 * - open_loops[].slot
 * - hypothesis_slots[].slot
 * - question_candidates[].text (as beat), and maybe target (as felt_word, low weight)
 */
function collectFromLatent(latentRaw: any): Array<{ name: string; category: AnchorCategory; source: string; boost?: number }> {
  const lat = latentRaw ?? null;
  if (!lat || typeof lat !== "object") return [];

  const out: Array<{ name: string; category: AnchorCategory; source: string; boost?: number }> = [];

  const openLoops = (lat as any).open_loops;
  if (Array.isArray(openLoops)) {
    for (const row of openLoops) {
      const slot = row?.slot;
      if (typeof slot === "string" && slot.trim()) {
        out.push({ name: slot.trim(), category: "beat", source: "latent.open_loops.slot", boost: 1.0 });
      }
    }
  }

  const hyp = (lat as any).hypothesis_slots;
  if (Array.isArray(hyp)) {
    for (const row of hyp) {
      const slot = row?.slot;
      if (typeof slot === "string" && slot.trim()) {
        out.push({ name: slot.trim(), category: "felt_word", source: "latent.hypothesis_slots.slot", boost: 0.6 });
      }
    }
  }

  const qc = (lat as any).question_candidates;
  if (Array.isArray(qc)) {
    for (const row of qc) {
      const text = row?.text;
      if (typeof text === "string" && text.trim()) {
        out.push({ name: text.trim(), category: "beat", source: "latent.question_candidates.text", boost: 0.4 });
      }
      const target = row?.target;
      if (typeof target === "string" && target.trim()) {
        // targets like "self_boundary" are not user-facing HU anchors, so keep low-weight.
        out.push({ name: target.trim(), category: "felt_word", source: "latent.question_candidates.target", boost: 0.1 });
      }
    }
  }

  return out;
}

function scoreAnchor(params: { category: AnchorCategory; occurrences: number; isTarget: boolean; inGlossary: boolean }): number {
  // Core weights: beats > characters > places > objects > felt_words
  const baseWeights: Record<AnchorCategory, number> = {
    beat: 5,
    character: 4,
    place: 3,
    object: 2,
    felt_word: 1,
  };

  let score = baseWeights[params.category] ?? 1;

  // occurrences: mild signal
  score += params.occurrences * 0.5;

  // glossary: small bump (user-pinned memory)
  if (params.inGlossary) score += 1.5;

  // explicit target: bigger bump (if ever used)
  if (params.isTarget) score += 3;

  return score;
}

function countOccurrences(name: string, dreamText: string): number {
  if (!name || !dreamText) return 0;

  const needle = normaliseKey(name);
  if (!needle) return 0;

  const hay = dreamText.toLowerCase();
  let count = 0;
  let idx = hay.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = hay.indexOf(needle, idx + needle.length);
  }
  return count;
}

export function anchorUsed(anchor: string, prevQuestions: string[]): boolean {
  const parts = (anchor || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return false;

  return (prevQuestions || []).some((q) => {
    const t = (q || "").toLowerCase();
    return parts.every((p) => t.includes(p));
  });
}

export async function rankAnchors(params: {
  supabase: any;
  userId: string;
  dreamText: string;
  observation: any | null;
  latent: any | null;
  synth?: any | null; // kept for compatibility, but not required
  prevQuestions?: string[];
  includeUsed?: boolean;
  maxCount?: number;
}): Promise<AnchorInfo[]> {
  const { supabase, userId, dreamText, observation, latent } = params;
  const prevQs = Array.isArray(params.prevQuestions) ? params.prevQuestions : [];
  const includeUsed = params.includeUsed ?? false;
  const maxCount = typeof params.maxCount === "number" ? params.maxCount : undefined;

  // 1) Collect candidates from observation (primary)
  const obsCandidates = collectFromObservation(observation);

  // 2) Collect from latent (secondary)
  const latentCandidates = collectFromLatent(latent);

  // 3) Merge by canonical “key”
  // Use anchorKey() so HU diacritics + stopwords normalize well for dedupe.
  const merged = new Map<
    string,
    {
      name: string;
      category: AnchorCategory;
      sources: string[];
      latentBoost: number;
    }
  >();

  const add = (name: string, category: AnchorCategory, source: string, boost = 0) => {
    const k = anchorKey(name) || normaliseKey(name);
    if (!k) return;

    const existing = merged.get(k);
    if (!existing) {
      merged.set(k, { name, category, sources: [source], latentBoost: boost });
      return;
    }

    // Prefer “stronger” categories if conflict (beat > character > place > object > felt_word)
    const rank: Record<AnchorCategory, number> = { beat: 5, character: 4, place: 3, object: 2, felt_word: 1 };
    const bestCat = rank[category] > rank[existing.category] ? category : existing.category;

    merged.set(k, {
      name: existing.name || name,
      category: bestCat,
      sources: existing.sources.includes(source) ? existing.sources : [...existing.sources, source],
      latentBoost: existing.latentBoost + boost,
    });
  };

  for (const c of obsCandidates) add(c.name, c.category, c.source, 0);
  for (const c of latentCandidates) add(c.name, c.category, c.source, c.boost ?? 0);

  const keys = Array.from(merged.keys());

  // 4) Glossary match (best-effort)
  // We try exact match on canonical; if you later add canonical_key column,
  // we can make this robust using anchorKey at DB-level too.
  const names = uniqByKey(Array.from(merged.values()).map((v) => v.name));
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
            if (notesByTerm.has(row.term_id)) continue; // keep latest
            notesByTerm.set(row.term_id, (row.content ?? null) as any);
          }
        }
      }

      for (const term of terms as any[]) {
        const k = anchorKey(term.canonical) || normaliseKey(term.canonical);
        glossaryMatches[k] = { note: notesByTerm.get(term.id) ?? null };
      }
    }
  }

  // 5) Target anchor (optional; not present in your latent sample, but keep hook)
  let targetAnchorK: string | null = null;
  const seed = latent && typeof latent === "object" ? (latent as any).question_seed : null;
  if (seed && typeof seed === "object" && typeof (seed as any).target_anchor === "string") {
    targetAnchorK = anchorKey((seed as any).target_anchor) || normaliseKey((seed as any).target_anchor);
  }

  // 6) Build AnchorInfo list
  const anchors: AnchorInfo[] = [];
  for (const k of keys) {
    const v = merged.get(k)!;

    if (!includeUsed && anchorUsed(v.name, prevQs)) continue;

    const occurrences = countOccurrences(v.name, dreamText);
    const glossary = glossaryMatches[k];
    const isTarget = Boolean(targetAnchorK && k === targetAnchorK);

    const base = scoreAnchor({
      category: v.category,
      occurrences,
      isTarget,
      inGlossary: Boolean(glossary),
    });

    anchors.push({
      name: v.name,
      category: v.category,
      score: base + (v.latentBoost || 0),
      inGlossary: Boolean(glossary),
      glossaryNotes: glossary ? glossary.note : null,
      occurrences,
      isTarget,
      sources: v.sources,
    });
  }

  anchors.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name, "hu");
  });

  if (typeof maxCount === "number" && maxCount > 0) return anchors.slice(0, maxCount);
  return anchors;
}
