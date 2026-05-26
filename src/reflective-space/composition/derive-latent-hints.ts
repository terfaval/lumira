import type { LatentSuggestion } from "@/src/domain/latent/types";

export interface ReflectiveLatentHint {
  suggestionId: string;
  phrasing: string;
  confidenceBand: "low" | "tentative" | "moderate";
}

const FORBIDDEN_MARKERS = ["means", "reveals", "proves", "indicates your subconscious", "you should"];

function sanitizePhrasing(phrasing: string): string {
  const lower = phrasing.toLowerCase();
  if (FORBIDDEN_MARKERS.some((marker) => lower.includes(marker))) {
    return "This may relate to nearby reflective continuity.";
  }
  return phrasing;
}

export function deriveLatentHints(suggestions: LatentSuggestion[]): ReflectiveLatentHint[] {
  return suggestions
    .filter((suggestion) => suggestion.visibility === "reflective_space_optional")
    .map((suggestion) => ({
      suggestionId: suggestion.id,
      phrasing: sanitizePhrasing(suggestion.phrasing),
      confidenceBand: suggestion.confidenceBand,
    }));
}
