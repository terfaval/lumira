import { COMPLETENESS_ANALYSIS_RULES } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import type { AdaptedObservationCandidate } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type { EndingRetentionAssessment } from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

export function readEndingStart(sourceLength: number): number {
  return Math.max(
    Math.max(0, sourceLength - COMPLETENESS_ANALYSIS_RULES.endingSectionMinChars),
    Math.floor(sourceLength * COMPLETENESS_ANALYSIS_RULES.endingSectionStartRatio),
  );
}

export function analyzeEndingRetention(input: {
  sourceLength: number;
  candidate: AdaptedObservationCandidate;
}): EndingRetentionAssessment {
  if (input.sourceLength === 0) {
    return {
      endingStart: 0,
      retained: null,
      status: "not_applicable",
    };
  }

  const endingStart = readEndingStart(input.sourceLength);
  const hasEndingEvidence = input.candidate.observations.some((observation) =>
    observation.evidence.some((entry) => typeof entry.spanEnd === "number" && entry.spanEnd >= endingStart)
  ) || input.candidate.scenes.some((scene) => typeof scene.sceneRange.spanEnd === "number" && scene.sceneRange.spanEnd >= endingStart);

  return {
    endingStart,
    retained: hasEndingEvidence,
    status: hasEndingEvidence ? "retained" : "not_retained",
  };
}
