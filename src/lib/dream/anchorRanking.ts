// src/lib/dream/anchorRanking.ts
//
// v0 Anchor ranking utilities
// - collects candidates primarily from observation payload (rich, stable)
// - optionally augments/boosts from latent payload
// - cross-references glossary_terms + glossary_notes
// - counts approximate occurrences in dream text
//
// NOTE: tolerant to payload shape drift. No hard schema assumptions.

import { isSoftTokenMatch, matchKeyFromLabel, tokenizeForMatch } from "@/src/lib/dream/huMatch";

export type AnchorCategory = "character" | "place" | "object" | "beat" | "felt_word";

export type AnchorInfo = {
  name: string;
  category: AnchorCategory;
  score: number;

  inGlossary: boolean;
  glossaryNotes: string | null;

  occurrences: number;
  isTarget: boolean;

  // optional debug/meta
  sources?: string[];
};

function normaliseKey(s: string): string {
  return (s || "").toLowerCase().trim();
}

function matchKey(raw: string): string {
  return matchKeyFromLabel(raw) || normaliseKey(raw);
}

function uniqByKey(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const t = typeof raw === "string" ? raw.trim() : "";
    if (!t) continue;
    const k = normaliseKey(t);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function pushIfString(out: string[], x: unknown) {
  if (typeof x !== "string") return;
  const t = x.trim();
  if (t) out.push(t);
}

function pushArrayStrings(out: string[], x: unknown) {
  if (!Array.isArray(x)) return;
  for (const it of x) pushIfString(out, it);
}

function safeParseJSONMaybeString(payload: any): any {
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
 * Supports shapes like your sample:
 * - obs.entities.{people,places,objects,themes_words}
 * - obs.scenes[].{characters,setting,objects,actions,mood_words,sensations}
 * - obs.raw_facts (beats)
 */
function collectFromObservation(
  observationRaw: any
): Array<{ name: string; category: AnchorCategory; source: string }> {
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
    const facts = rawFacts.filter((x: any) => typeof x === "string");
    for (const s of uniqByKey(facts)) {
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
 * - question_candidates[].text (beat), question_candidates[].target (low weight)
 */
function collectFromLatent(
  latentRaw: any
): Array<{ name: string; category: AnchorCategory; source: string; boost?: number }> {
  const lat = safeParseJSONMaybeString(latentRaw);
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
        out.push({ name: target.trim(), category: "felt_word", source: "latent.question_candidates.target", boost: 0.1 });
      }
    }
  }

  return out;
}

function countOccurrences(name: string, dreamText: string): number {
  if (!name || !dreamText) return 0;
  const nameTokens = tokenizeForMatch(name);
  const textTokens = tokenizeForMatch(dreamText);
  if (nameTokens.length === 0 || textTokens.length === 0) return 0;

  if (nameTokens.length === 1) {
    const needle = nameTokens[0];
    let count = 0;
    for (const t of textTokens) if (isSoftTokenMatch(t, needle)) count++;
    return count;
  }

  let count = 0;
  for (let i = 0; i <= textTokens.length - nameTokens.length; i++) {
    let match = true;
    for (let j = 0; j < nameTokens.length; j++) {
      if (!isSoftTokenMatch(textTokens[i + j], nameTokens[j])) {
        match = false;
        break;
      }
    }
    if (match) count++;
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

function scoreAnchor(params: {
  category: AnchorCategory;
  occurrences: number;
  isTarget: boolean;
  inGlossary: boolean;
}): number {
  const baseWeights: Record<AnchorCategory, number> = {
    beat: 5,
    character: 4,
    place: 3,
    object: 2,
    felt_word: 1,
  };

  let score = baseWeights[params.category] ?? 1;
  score += params.occurrences * 0.5;

  if (params.inGlossary) score += 1.5;
  if (params.isTarget) score += 3;

  return score;
}

export async function rankAnchors(params: {
  supabase: any;
  userId: string;
  dreamText: string;

  observation: any | null;
  latent: any | null;

  prevQuestions?: string[];
  usedAnchorKeys?: string[];
  includeUsed?: boolean;
  maxCount?: number;
}): Promise<AnchorInfo[]> {
  const { supabase, userId, dreamText, observation, latent } = params;
  const prevQs = Array.isArray(params.prevQuestions) ? params.prevQuestions : [];
  const usedAnchorKeys = Array.isArray(params.usedAnchorKeys) ? params.usedAnchorKeys : [];
  const includeUsed = params.includeUsed ?? false;
  const maxCount = typeof params.maxCount === "number" ? params.maxCount : undefined;

  // 1) candidates
  const obsCandidates = collectFromObservation(observation);
  const latentCandidates = collectFromLatent(latent);
  const obsCountByKey = new Map<string, number>();
  for (const c of obsCandidates) {
    const k = matchKey(c.name);
    if (!k) continue;
    obsCountByKey.set(k, (obsCountByKey.get(k) ?? 0) + 1);
  }

  // 2) merge by anchorKey() (HU-safe)
  const merged = new Map<
    string,
    { name: string; category: AnchorCategory; sources: string[]; latentBoost: number }
  >();

  const add = (name: string, category: AnchorCategory, source: string, boost = 0) => {
    const k = matchKey(name);
    if (!k) return;

    const existing = merged.get(k);
    if (!existing) {
      merged.set(k, { name, category, sources: [source], latentBoost: boost });
      return;
    }

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

  // 3) glossary matches (best-effort exact canonical; keying by anchorKey)
  const candidateKeys = Array.from(merged.keys());
  const glossaryMatches: Record<string, { note: string | null }> = {};

  if (candidateKeys.length > 0) {
    const { data: terms, error } = await supabase
      .from("glossary_terms")
      .select("id, canonical_key")
      .eq("user_id", userId)
      .in("canonical_key", candidateKeys);

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
            if (notesByTerm.has(row.term_id)) continue; // latest first
            notesByTerm.set(row.term_id, (row.content ?? null) as any);
          }
        }
      }

      for (const term of terms as any[]) {
        const k = matchKey(term.canonical_key);
        if (!k) continue;
        glossaryMatches[k] = { note: notesByTerm.get(term.id) ?? null };
      }
    }
  }

  // 4) optional target anchor hook
  let targetAnchorK: string | null = null;
  const seed = latent && typeof latent === "object" ? (latent as any).question_seed : null;
  if (seed && typeof seed === "object" && typeof (seed as any).target_anchor === "string") {
    targetAnchorK = matchKey((seed as any).target_anchor);
  }

  // 5) build list
  const anchors: AnchorInfo[] = [];
  const usedKeySet = new Set(usedAnchorKeys.map((k) => matchKey(k)).filter(Boolean));
  for (const [k, v] of merged.entries()) {
    const isUsedByKey = usedKeySet.has(matchKey(k));
    if (!includeUsed && (isUsedByKey || anchorUsed(v.name, prevQs))) continue;

    const occurrences = countOccurrences(v.name, dreamText);
    const glossary = glossaryMatches[k];
    const isTarget = Boolean(targetAnchorK && k === targetAnchorK);

    const base = scoreAnchor({
      category: v.category,
      occurrences,
      isTarget,
      inGlossary: Boolean(glossary),
    });

    const obsOcc = obsCountByKey.get(k) ?? 0;
    const hasSceneSource = (v.sources || []).some((s) => s.startsWith("observation.scenes["));
    const obsWeight = obsOcc * 0.6 + (hasSceneSource ? 0.5 : 0);

    anchors.push({
      name: v.name,
      category: v.category,
      score: base + (v.latentBoost || 0) + obsWeight + (includeUsed && isUsedByKey ? -2 : 0),
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

  return typeof maxCount === "number" && maxCount > 0 ? anchors.slice(0, maxCount) : anchors;
}

export type AnchorRankingPayload = {
  anchors: AnchorInfo[];
  top_keys: string[];
  meta: {
    algorithm_version: "v1";
    input_hash: string;
    anchor_count: number;
    top_count: number;
    used_count: number;
    has_observation: boolean;
    has_latent: boolean;
  };
};

export function buildAnchorRankingPayload(params: {
  anchors: AnchorInfo[];
  input_hash: string;
  topCount: number;
  usedAnchorKeys?: string[];
  hasObservation: boolean;
  hasLatent: boolean;
}): AnchorRankingPayload {
  const usedAnchorKeys = Array.isArray(params.usedAnchorKeys) ? params.usedAnchorKeys : [];
  const top_keys: string[] = [];
  const seen = new Set<string>();
  for (const item of params.anchors) {
    const k = matchKey(item.name);
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    top_keys.push(k);
    if (top_keys.length >= params.topCount) break;
  }
  return {
    anchors: params.anchors,
    top_keys,
    meta: {
      algorithm_version: "v1",
      input_hash: params.input_hash,
      anchor_count: params.anchors.length,
      top_count: top_keys.length,
      used_count: usedAnchorKeys.length,
      has_observation: params.hasObservation,
      has_latent: params.hasLatent,
    },
  };
}
