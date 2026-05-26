import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { OpeningCandidate, OpeningTone, OpeningType } from "@/src/domain/openings/types";

const FORBIDDEN_AUTHORITY_MARKERS = [
  "means",
  "reveals",
  "proves",
  "you need to",
  "you should",
  "important next step",
  "unresolved issue",
];

function hasForbiddenAuthorityLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_AUTHORITY_MARKERS.some((marker) => lower.includes(marker));
}

function toOpeningType(suggestionType: string): OpeningType {
  switch (suggestionType) {
    case "possible_recurrence":
      return "continuity_noticing";
    case "possible_resurfacing":
      return "reflective_recall";
    case "possible_opening":
      return "reflective_question";
    default:
      return "atmospheric_reflection";
  }
}

function toTone(confidenceBand: "low" | "tentative" | "moderate"): OpeningTone {
  if (confidenceBand === "low") {
    return "spacious";
  }

  if (confidenceBand === "moderate") {
    return "curious";
  }

  return "gentle";
}

function toSafeUtterance(phrasing: string): string {
  if (!hasForbiddenAuthorityLanguage(phrasing)) {
    return phrasing;
  }

  return "This may connect with nearby reflective continuity.";
}

export function deriveOpeningCandidatesFromLatent(snapshot: LatentSnapshot): OpeningCandidate[] {
  return snapshot.suggestions
    .filter((suggestion) => suggestion.visibility === "reflective_space_optional")
    .slice(0, 3)
    .map((suggestion) => ({
      userId: snapshot.userId,
      openingType: toOpeningType(suggestion.suggestionType),
      tone: toTone(suggestion.confidenceBand),
      utterance: toSafeUtterance(suggestion.phrasing),
      visibility: "invitation_surface",
      provenance: {
        sourceObjects: suggestion.provenance.sourceReflectiveObjects,
        sourceObservations: suggestion.provenance.sourceObservations,
        sourceGlossaryTerms: suggestion.provenance.sourceGlossaryTerms,
        sourceThreads: suggestion.provenance.sourceThreads,
        sourceResponses: suggestion.provenance.sourceResponses,
        latentSnapshotReference: snapshot.id,
        confidenceBand: suggestion.confidenceBand,
        openingGenerationContext: "phase7_opening_scaffold",
      },
    }));
}
