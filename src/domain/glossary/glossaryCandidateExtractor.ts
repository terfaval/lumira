// src/domain/glossary/glossaryCandidateExtractor.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";
import { matchKeyFromLabel } from "@/src/lib/dream/huMatch";
import { isGlossaryCandidateAllowed } from "./glossaryCandidateRules";

type GlossarySourceType = "entities" | "actions" | "raw_facts";

type GlossaryCandidate = {
  canonical_key: string;
  display_label: string;
  source_types?: GlossarySourceType[];
};

const OBSERVATION_MAX_WORDS = 2;
const OBSERVATION_MAX_CHARS = 40;

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

function normalizeLabel(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
}

function isObservationCandidate(label: string): boolean {
  if (!isGlossaryCandidateAllowed(label)) return false;
  if (label.length > OBSERVATION_MAX_CHARS) return false;
  if (/[,:;()]/.test(label)) return false;
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length > OBSERVATION_MAX_WORDS) return false;
  return true;
}

function addCandidate(
  map: Map<string, GlossaryCandidate>,
  raw: unknown,
  source: GlossarySourceType
) {
  const label = normalizeLabel(raw);
  if (!label) return;
  if (!isObservationCandidate(label)) return;

  const canonical_key = matchKeyFromLabel(label) || anchorKey(label);
  if (!canonical_key) return;

  const existing = map.get(canonical_key);
  if (!existing) {
    map.set(canonical_key, {
      canonical_key,
      display_label: label,
      source_types: [source],
    });
    return;
  }

  // ha valaha kerülne be olyan elem, aminek nincs source_types-a, akkor is stabil
  const current = existing.source_types ?? [];
  if (!current.includes(source)) {
    existing.source_types = [...current, source];
  }
}

function pushArray(
  map: Map<string, GlossaryCandidate>,
  raw: unknown,
  source: GlossarySourceType
) {
  if (!Array.isArray(raw)) return;
  for (const it of raw) addCandidate(map, it, source);
}

export function extractGlossaryCandidatesFromObservation(
  observationRaw: any
): GlossaryCandidate[] {
  const obs = safeParseJSONMaybeString(observationRaw);
  if (!obs || typeof obs !== "object") return [];

  const out = new Map<string, GlossaryCandidate>();

  const entities = (obs as any).entities;
  if (entities && typeof entities === "object") {
    pushArray(out, (entities as any).people, "entities");
    pushArray(out, (entities as any).places, "entities");
    pushArray(out, (entities as any).objects, "entities");
    pushArray(out, (entities as any).themes_words, "entities");
  }

  const scenes = (obs as any).scenes;
  if (Array.isArray(scenes)) {
    for (const sc of scenes) {
      if (!sc || typeof sc !== "object") continue;

      const setting = normalizeLabel((sc as any).setting);
      if (setting) addCandidate(out, setting, "entities");

      pushArray(out, (sc as any).characters, "entities");
      pushArray(out, (sc as any).objects, "entities");
      pushArray(out, (sc as any).mood_words, "entities");
      pushArray(out, (sc as any).sensations, "entities");
    }
  }

  return Array.from(out.values());
}
