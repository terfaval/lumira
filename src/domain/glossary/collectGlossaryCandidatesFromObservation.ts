// src/domain/glossary/collectGlossaryCandidatesFromObservation.ts

import { stripDiacritics } from "@/src/lib/dream/anchorKey";

function push(out: string[], x: unknown) {
  if (typeof x === "string") {
    const t = x.trim();
    if (t) out.push(t);
  }
}

function pushMany(out: string[], x: unknown) {
  if (!Array.isArray(x)) return;
  for (const it of x) push(out, it);
}

export function collectGlossaryCandidatesFromObservation(observation: any): string[] {
  if (!observation || typeof observation !== "object") return [];

  const out: string[] = [];
  const obs = observation;

  // entities.*
  if (obs.entities) {
    pushMany(out, obs.entities.people);
    pushMany(out, obs.entities.places);
    pushMany(out, obs.entities.objects);
    pushMany(out, obs.entities.themes_words);
  }

  // scenes.*
  if (Array.isArray(obs.scenes)) {
    for (const sc of obs.scenes) {
      pushMany(out, sc.characters);
      pushMany(out, sc.objects);
      pushMany(out, sc.actions);
      pushMany(out, sc.mood_words);
      pushMany(out, sc.sensations);
      push(out, sc.setting);
    }
  }

  // raw_facts → beat-like
  pushMany(out, obs.raw_facts);

  // normalize + uniq (HU-safe-ish)
  const seen = new Set<string>();
  const uniq: string[] = [];

  for (const raw of out) {
    const k = stripDiacritics(raw.toLowerCase());
    if (!k || seen.has(k)) continue;
    seen.add(k);
    uniq.push(raw);
  }

  return uniq;
}
