import type { DreamObservation } from "@/src/lib/dream/observation";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";

type LabelItem = { label?: unknown } | string | null | undefined;

function labelsFrom(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  const out: string[] = [];
  for (const item of items as LabelItem[]) {
    if (typeof item === "string") {
      out.push(item);
      continue;
    }
    if (item && typeof item === "object" && typeof (item as any).label === "string") {
      out.push((item as any).label);
    }
  }
  return out;
}

function uniqStrings(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    const text = String(raw ?? "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function adaptDreamObservationToV0(dreamObs: DreamObservation | null | undefined): ObservationPayloadV0 {
  const obs = dreamObs ?? ({} as DreamObservation);
  const entities = (obs as any).entities ?? {};

  const characters = labelsFrom(entities.characters);
  const other = labelsFrom(entities.other);
  const places = labelsFrom(entities.places);
  const objects = labelsFrom(entities.objects);

  const motifs = labelsFrom((obs as any).motifs);
  const tone = labelsFrom((obs as any).tone);
  const structure = labelsFrom((obs as any).structure);
  const body = labelsFrom((obs as any).body);
  const beats = labelsFrom((obs as any).beats);

  const themesWords = uniqStrings([...motifs, ...tone, ...structure, ...body]).slice(0, 12);

  let rawFacts = uniqStrings(beats).slice(0, 10);
  if (rawFacts.length === 0) {
    rawFacts = uniqStrings([...motifs, ...tone]).slice(0, 10);
  }

  return {
    summary: "",
    scenes: [],
    entities: {
      people: uniqStrings([...characters, ...other]),
      places: uniqStrings(places),
      objects: uniqStrings(objects),
      themes_words: themesWords,
    },
    raw_facts: rawFacts,
  };
}
