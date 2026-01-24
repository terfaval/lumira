// src/domain/glossary/glossaryCandidateExtractor.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";

type GlossaryCandidate = {
  canonical_key: string;
  display_label: string;
  source_types?: Array<"entities" | "actions" | "raw_facts">;
};

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

function addCandidate(
  map: Map<string, GlossaryCandidate>,
  raw: unknown,
  source: GlossaryCandidate["source_types"][number]
) {
  const label = normalizeLabel(raw);
  if (!label) return;
  const canonical_key = anchorKey(label);
  if (!canonical_key) return;

  const existing = map.get(canonical_key);
  if (!existing) {
    map.set(canonical_key, { canonical_key, display_label: label, source_types: [source] });
    return;
  }

  if (existing.source_types && !existing.source_types.includes(source)) {
    existing.source_types = [...existing.source_types, source];
  }
}

function pushArray(map: Map<string, GlossaryCandidate>, raw: unknown, source: GlossaryCandidate["source_types"][number]) {
  if (!Array.isArray(raw)) return;
  for (const it of raw) addCandidate(map, it, source);
}

export function extractGlossaryCandidatesFromObservation(observationRaw: any): GlossaryCandidate[] {
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

      pushArray(out, (sc as any).actions, "actions");
    }
  }

  pushArray(out, (obs as any).raw_facts, "raw_facts");

  return Array.from(out.values());
}
