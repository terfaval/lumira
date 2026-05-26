import type { Observation } from "@/src/domain/observation/types";
import type { ReflectiveGlossaryCue } from "@/src/reflective-space/types";

const CUE_CATEGORIES = new Set(["actor", "location", "object", "emotion", "recurrence_candidate"] as const);
type GlossaryCueCategory = "actor" | "location" | "object" | "emotion" | "recurrence_candidate";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
