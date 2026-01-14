// src/lib/dream/anchorsFromObservation.ts

export type SynthAnchors = {
  characters: string[];
  places: string[];
  objects: string[];
  beats: string[];
  felt_words: string[];
};

function uniqStrings(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    const v = (s ?? "").trim();
    if (!v) continue;
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/**
 * Takes the extracted observation object (obs JSON) and maps it to the
 * anchor structure expected by synth/rankAnchors.
 *
 * Observation shape assumed (your current extract):
 *  - entities.characters/places/objects/other: [{label, evidence[]}]
 *  - tone: [{label, evidence[]}]
 *  - body: [{label, evidence[]}]
 *  - structure: [{label, evidence[]}] (optional)
 */
export function anchorsFromObservation(observation: any | null | undefined): SynthAnchors {
  const obs = observation && typeof observation === "object" ? observation : {};

  const ent = obs.entities && typeof obs.entities === "object" ? obs.entities : {};
  const arrLabels = (arr: any): string[] =>
    Array.isArray(arr) ? arr.map((x) => (x?.label ?? "")).filter((s) => typeof s === "string") : [];

  const characters = arrLabels(ent.characters);
  const places = arrLabels(ent.places);

  // Objects: keep "objects" + "other" together (e.g. tetoválások is "other" in your extract)
  const objects = [...arrLabels(ent.objects), ...arrLabels(ent.other)];

  // Beats: body labels + optional structure labels
  const beats = [...arrLabels(obs.body), ...arrLabels(obs.structure)];

  // Felt words: tone labels
  const felt_words = arrLabels(obs.tone);

  return {
    characters: uniqStrings(characters),
    places: uniqStrings(places),
    objects: uniqStrings(objects),
    beats: uniqStrings(beats),
    felt_words: uniqStrings(felt_words),
  };
}
