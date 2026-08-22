import type { Observation } from "@/src/domain/observation/types";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import {
  getObservationV2DerivedItemDisplayLabel,
  type ObservationV2Bundle,
  type ObservationV2DerivedItem,
} from "@/src/domain/observation/v2-runtime";
import type { ReflectiveGlossaryCue } from "@/src/reflective-space/types";

const CUE_CATEGORIES = new Set(["actor", "location", "object", "emotion", "recurrence_candidate"] as const);
type GlossaryCueCategory = "actor" | "location" | "object" | "emotion" | "recurrence_candidate";
const INTERPRETIVE_MARKERS = ["means", "symbolizes", "represents", "reveals", "proves", "must be"];
const RECURRENCE_MARKERS = ["again", "repeated", "recurring", "similar", "previously", "before", "same pattern", "same "];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLabel(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 120);
}

function containsInterpretiveLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return INTERPRETIVE_MARKERS.some((marker) => lower.includes(marker));
}

function containsRecurrenceLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return RECURRENCE_MARKERS.some((marker) => lower.includes(marker));
}

export function deriveGlossaryCuesFromObservations(observations: Observation[]): ReflectiveGlossaryCue[] {
  const counts = new Map<string, ReflectiveGlossaryCue>();

  for (const observation of observations) {
    for (const fragment of observation.fragments) {
      if (!CUE_CATEGORIES.has(fragment.category as GlossaryCueCategory)) {
        continue;
      }

      const label = fragment.fragmentText.trim().slice(0, 120);
      const normalizedLabel = normalize(label);
      const key = `${fragment.category}::${normalizedLabel}`;

      if (!label || normalizedLabel.length === 0) {
        continue;
      }

      const existing = counts.get(key);
      if (existing) {
        existing.recurrenceCount += 1;
        existing.phrasing = existing.recurrenceCount > 1 ? "appears repeatedly" : "has been seen before";
      } else {
        counts.set(key, {
          label,
          category: fragment.category as GlossaryCueCategory,
          recurrenceCount: 1,
          phrasing: "has been seen before",
        });
      }
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.recurrenceCount - a.recurrenceCount)
    .slice(0, 6);
}

function addCue(
  counts: Map<string, ReflectiveGlossaryCue>,
  category: GlossaryCueCategory,
  rawLabel: string,
  recurrenceCount: number,
): void {
  const label = cleanLabel(rawLabel);
  const normalizedLabel = normalize(label);

  if (!label || normalizedLabel.length === 0 || containsInterpretiveLanguage(label)) {
    return;
  }

  const key = `${category}::${normalizedLabel}`;
  const existing = counts.get(key);

  if (existing) {
    existing.recurrenceCount += recurrenceCount;
    existing.phrasing = existing.recurrenceCount > 1 ? "appears repeatedly" : "has been seen before";
    return;
  }

  counts.set(key, {
    label,
    category,
    recurrenceCount,
    phrasing: recurrenceCount > 1 ? "appears repeatedly" : "has been seen before",
  });
}

function addDerivedItemCues(
  counts: Map<string, ReflectiveGlossaryCue>,
  items: ObservationV2DerivedItem[],
  category: Exclude<GlossaryCueCategory, "recurrence_candidate">,
): void {
  for (const item of items) {
    addCue(counts, category, getObservationV2DerivedItemDisplayLabel(item), Math.max(1, new Set(item.observationIds).size));
  }
}

export function deriveGlossaryCuesFromObservationV2Bundle(bundle: ObservationV2Bundle): ReflectiveGlossaryCue[] {
  const counts = new Map<string, ReflectiveGlossaryCue>();

  for (const scene of bundle.scenes) {
    addDerivedItemCues(counts, scene.derived.actors, "actor");
    addDerivedItemCues(counts, scene.derived.locations, "location");
    addDerivedItemCues(counts, scene.derived.objects, "object");
    addDerivedItemCues(counts, scene.derived.affect, "emotion");

    for (const observation of scene.observations) {
      if (!containsRecurrenceLanguage(observation.text)) {
        continue;
      }

      addCue(counts, "recurrence_candidate", observation.text, 1);
    }
  }

  return Array.from(counts.values())
    .sort((a, b) => b.recurrenceCount - a.recurrenceCount)
    .slice(0, 6);
}

export function deriveGlossaryCuesFromObservationV3Authority(
  authority: ObservationV3AuthorityRecord,
): ReflectiveGlossaryCue[] {
  const counts = new Map<string, ReflectiveGlossaryCue>();

  for (const locality of authority.canonicalCandidate.localities) {
    if (!locality.label) {
      continue;
    }

    addCue(counts, "location", locality.label, Math.max(1, locality.evidenceRefs.length));
  }

  for (const unit of authority.canonicalCandidate.descriptiveUnits) {
    if (!containsRecurrenceLanguage(unit.statement)) {
      continue;
    }

    addCue(counts, "recurrence_candidate", unit.statement, Math.max(1, unit.evidenceRefs.length));
  }

  return Array.from(counts.values())
    .sort((a, b) => b.recurrenceCount - a.recurrenceCount)
    .slice(0, 6);
}
