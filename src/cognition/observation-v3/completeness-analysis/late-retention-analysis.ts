import { COMPLETENESS_ANALYSIS_RULES } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import type { AdaptedObservationCandidate } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type { LateRetentionAssessment } from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

function countSentenceUnits(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

export function analyzeLateRetention(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
  largestCoveredSpanEnd: number | null;
  uncoveredTailPresent: boolean;
}): LateRetentionAssessment {
  const lateSectionStart = Math.floor(input.dreamText.length * COMPLETENESS_ANALYSIS_RULES.lateSectionStartRatio);
  const lateSectionText = input.dreamText.slice(lateSectionStart).trim();
  const lateSectionSentenceUnits = countSentenceUnits(lateSectionText);

  if (lateSectionSentenceUnits < COMPLETENESS_ANALYSIS_RULES.lateSectionMinSentenceUnits) {
    return {
      lateSectionStart,
      lateSectionSentenceUnits,
      lateSectionObservationCount: 0,
      status: "not_applicable",
    };
  }

  const lateSectionObservationCount = input.candidate.observations.filter((observation) =>
    observation.evidence.some((entry) => typeof entry.spanEnd === "number" && entry.spanEnd >= lateSectionStart)
  ).length;

  if (lateSectionObservationCount === 0) {
    return {
      lateSectionStart,
      lateSectionSentenceUnits,
      lateSectionObservationCount,
      status: "missing",
    };
  }

  if (
    lateSectionObservationCount === 1
    && !input.uncoveredTailPresent
    && input.largestCoveredSpanEnd === input.dreamText.length
  ) {
    return {
      lateSectionStart,
      lateSectionSentenceUnits,
      lateSectionObservationCount,
      status: "retained",
    };
  }

  if (lateSectionObservationCount <= COMPLETENESS_ANALYSIS_RULES.lateSectionThinObservationThreshold) {
    return {
      lateSectionStart,
      lateSectionSentenceUnits,
      lateSectionObservationCount,
      status: "thin",
    };
  }

  return {
    lateSectionStart,
    lateSectionSentenceUnits,
    lateSectionObservationCount,
    status: "retained",
  };
}
