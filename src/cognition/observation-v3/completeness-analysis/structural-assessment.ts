import {
  COMPLETENESS_ANALYSIS_RULES,
} from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import type { AdaptedObservationCandidate } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type {
  StructuralCompletenessAssessment,
  StructuralWeaknessSignal,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

const OVERMERGE_CUE_GROUPS = [
  /\b(then|later|after that|afterwards|at the end|suddenly|eventually|meanwhile|aztan|utana|kesobb|vegul|ekkor)\b/giu,
  /\b(mock(?:ed|ing)?|pressure|threat(?:en(?:ed|ing)?)?|argu(?:e|ing|ed)|guid(?:e|ing|ed)|help(?:er|ing)?|unwanted|conflict|ignored|included)\b/giu,
  /\b(trying to|search(?:ing)?|find(?:ing)?|leave|left|escape|escaping|hide|hiding|follow(?:ing)?|resist(?:ing)?|wander(?:ing|ed)?|moved? toward)\b/giu,
  /\b(lucid|reali[sz](?:e|es|ed|ing)|dream(?:ing)?|unstable|impossible|transformed|changed|world rules|mirror|abyss|distorted|maze)\b/giu,
] as const;

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase();
}

function countCueMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

export function analyzeStructuralAssessment(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
  lateRetentionStatus: "retained" | "thin" | "missing" | "not_applicable" | "indeterminate";
  endingRetentionStatus: "retained" | "not_retained" | "indeterminate" | "not_applicable";
}): StructuralCompletenessAssessment {
  const weaknessSignals = new Set<StructuralWeaknessSignal>();
  const sceneOrLocalityCount = input.candidate.scenes.length;
  const observationCount = input.candidate.observations.length;

  let overmergeCueGroups = 0;
  let totalCueMatches = 0;
  if (sceneOrLocalityCount === 1) {
    const sceneText = normalizeText([
      input.candidate.scenes[0]?.summary ?? "",
      ...input.candidate.observations.map((observation) => observation.text),
    ].join(" "));

    for (const pattern of OVERMERGE_CUE_GROUPS) {
      const count = countCueMatches(sceneText, pattern);
      if (count > 0) {
        overmergeCueGroups += 1;
        totalCueMatches += count;
      }
    }

    if (
      input.dreamText.length >= COMPLETENESS_ANALYSIS_RULES.longDreamTextThreshold &&
      observationCount >= COMPLETENESS_ANALYSIS_RULES.overmergeMinObservations &&
      overmergeCueGroups >= COMPLETENESS_ANALYSIS_RULES.overmergeMinMatchedCueGroups &&
      totalCueMatches >= COMPLETENESS_ANALYSIS_RULES.overmergeMinTotalCueMatches
    ) {
      weaknessSignals.add("single_scene_overmerge_risk");
    }
  }

  const exactRangeCounts = new Map<string, number>();
  for (const observation of input.candidate.observations) {
    for (const evidence of observation.evidence) {
      const key = `${evidence.spanStart ?? "null"}:${evidence.spanEnd ?? "null"}`;
      exactRangeCounts.set(key, (exactRangeCounts.get(key) ?? 0) + 1);
    }
  }

  const repeatedSpanRealizationCount = [...exactRangeCounts.values()]
    .reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  if (repeatedSpanRealizationCount > 0) {
    weaknessSignals.add("repeated_span_realization");
  }

  let outOfOrderLocalityCount = 0;
  let latestSceneStart = -1;
  for (const scene of [...input.candidate.scenes].sort((left, right) => left.position - right.position)) {
    const sceneStart = scene.sceneRange.spanStart ?? latestSceneStart;
    if (sceneStart < latestSceneStart) {
      outOfOrderLocalityCount += 1;
    }
    latestSceneStart = Math.max(latestSceneStart, sceneStart);
  }
  if (outOfOrderLocalityCount > 0) {
    weaknessSignals.add("out_of_order_localities");
  }

  let outOfOrderUnitCount = 0;
  let latestObservationStart = -1;
  for (const observation of [...input.candidate.observations].sort((left, right) => {
    if (left.scenePosition !== right.scenePosition) {
      return left.scenePosition - right.scenePosition;
    }
    return left.position - right.position;
  })) {
    const observationStart = observation.evidence
      .map((entry) => entry.spanStart)
      .find((value): value is number => typeof value === "number") ?? latestObservationStart;
    if (observationStart < latestObservationStart) {
      outOfOrderUnitCount += 1;
    }
    latestObservationStart = Math.max(latestObservationStart, observationStart);
  }
  if (outOfOrderUnitCount > 0) {
    weaknessSignals.add("out_of_order_units");
  }

  if (input.lateRetentionStatus === "thin") {
    weaknessSignals.add("thin_late_retention");
  }
  if (input.endingRetentionStatus === "not_retained") {
    weaknessSignals.add("ending_not_retained");
  }

  return {
    sceneOrLocalityCount,
    observationCount,
    overmergeCueGroups,
    repeatedSpanRealizationCount,
    outOfOrderLocalityCount,
    outOfOrderUnitCount,
    weaknessSignals: [...weaknessSignals].sort((left, right) => left.localeCompare(right)),
  };
}
