// src/domain/glossary/glossaryCandidateExtractor.ts
import { anchorKey } from "@/src/lib/dream/anchorKey";

function safeParseJSONMaybeString(payload: any): any {
  if (typeof payload === "string") {
    try { return JSON.parse(payload); } catch { return null; }
  }
  return payload ?? null;
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

function uniqByKey(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const t = (raw ?? "").trim();
    if (!t) continue;
    const k = anchorKey(t) || t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function extractGlossaryCandidatesFromObservation(observationRaw: any): string[] {
  const obs = safeParseJSONMaybeString(observationRaw);
  if (!obs || typeof obs !== "object") return [];

  const out: string[] = [];

  // entities
  const entities = (obs as any).entities;
  if (entities && typeof entities === "object") {
    pushArrayStrings(out, (entities as any).people);
    pushArrayStrings(out, (entities as any).places);
    pushArrayStrings(out, (entities as any).objects);
    pushArrayStrings(out, (entities as any).themes_words);
  }

  // scenes
  const scenes = (obs as any).scenes;
  if (Array.isArray(scenes)) {
    for (const sc of scenes) {
      if (!sc || typeof sc !== "object") continue;

      // setting (place-ish)
      const setting = (sc as any).setting;
      if (typeof setting === "string" && setting.trim()) out.push(setting.trim());

      pushArrayStrings(out, (sc as any).characters);
      pushArrayStrings(out, (sc as any).objects);
      pushArrayStrings(out, (sc as any).mood_words);
      pushArrayStrings(out, (sc as any).sensations);
    }
  }

  return uniqByKey(out);
}
