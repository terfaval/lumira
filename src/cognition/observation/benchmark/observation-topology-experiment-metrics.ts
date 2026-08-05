import type {
  ExperimentalCompletenessMetadata,
  ExperimentalObservationBundle,
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { ObservationV2Bundle, ObservationV2EvidenceRef } from "@/src/domain/observation/v2-runtime";

function collectEvidenceSpansFromObservationBundle(bundle: ObservationV2Bundle): ObservationV2EvidenceRef[] {
  return bundle.scenes.flatMap((scene) => [
    scene.evidenceContext,
    ...scene.observations.flatMap((observation) => observation.evidence),
  ]);
}

function collectEvidenceSpansFromLayeredBundle(bundle: ExperimentalObservationBundle) {
  return [
    ...bundle.regions.flatMap((region) => region.evidence),
    ...bundle.observations.flatMap((observation) => observation.evidence),
    ...bundle.transitions.flatMap((transition) => transition.evidence),
  ];
}

function readLargestCoveredSpanEnd(
  spans: Array<{ spanEnd: number | null }>,
): number | null {
  const numeric = spans
    .map((span) => span.spanEnd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numeric.length === 0) {
    return null;
  }

  return Math.max(...numeric);
}

function readCoverageRatio(spans: Array<{ spanEnd: number | null }>, dreamText: string): number | null {
  if (dreamText.length === 0) {
    return null;
  }

  const largestCoveredSpanEnd = readLargestCoveredSpanEnd(spans);
  if (largestCoveredSpanEnd === null) {
    return null;
  }

  return largestCoveredSpanEnd / dreamText.length;
}

function readLateSectionStart(dreamText: string): number {
  return Math.floor(dreamText.length * 0.75);
}

function hasEndingRetention(
  spans: Array<{ spanEnd: number | null }>,
  dreamText: string,
): boolean {
  const endingThreshold = Math.max(dreamText.length - 250, Math.floor(dreamText.length * 0.9));
  return spans.some((span) => typeof span.spanEnd === "number" && span.spanEnd >= endingThreshold);
}

function countLateSectionUnits(
  spans: Array<{ spanEnd: number | null }>,
  dreamText: string,
): number {
  const lateSectionStart = readLateSectionStart(dreamText);
  return spans.filter((span) => typeof span.spanEnd === "number" && span.spanEnd >= lateSectionStart).length;
}

export function buildCompletenessFromObservationBundle(input: {
  bundle: ObservationV2Bundle;
  dreamText: string;
}): ExperimentalCompletenessMetadata {
  const spans = collectEvidenceSpansFromObservationBundle(input.bundle);
  const lateSectionStart = readLateSectionStart(input.dreamText);
  const lateSectionUnits = countLateSectionUnits(spans, input.dreamText);

  return {
    sourceCoverageRatio: readCoverageRatio(spans, input.dreamText),
    lateSectionRetention: {
      observed: lateSectionUnits,
      thresholdStart: lateSectionStart,
      retained: lateSectionUnits > 0,
    },
    endingRetention: hasEndingRetention(spans, input.dreamText),
    transitionCoverage: {
      total: 0,
      withEvidence: 0,
    },
    regionCoverage: {
      total: input.bundle.scenes.length,
      covered: input.bundle.scenes.filter((scene) => scene.observations.length > 0).length,
    },
    uncertaintyPreserved: input.bundle.scenes.some((scene) =>
      scene.observations.some((observation) => Boolean(observation.uncertaintyNote)),
    ),
    knownIncompleteRegions: [],
    structuralCompleteness: lateSectionUnits > 0 ? "complete" : "partial",
  };
}

function countCoveredRegions(regions: ExperimentalRegion[], observations: ExperimentalObservationUnit[]): number {
  const covered = new Set(observations.map((observation) => observation.regionId));
  return regions.filter((region) => covered.has(region.regionId)).length;
}

export function buildCompletenessFromLayeredBundle(input: {
  bundle: ExperimentalObservationBundle;
  dreamText: string;
}): ExperimentalCompletenessMetadata {
  const spans = collectEvidenceSpansFromLayeredBundle(input.bundle);
  const lateSectionStart = readLateSectionStart(input.dreamText);
  const lateSectionUnits = countLateSectionUnits(spans, input.dreamText);
  const transitionsWithEvidence = input.bundle.transitions.filter((transition) => transition.evidence.length > 0).length;
  const knownIncompleteRegions = input.bundle.regions
    .filter((region) => !input.bundle.observations.some((observation) => observation.regionId === region.regionId))
    .map((region) => region.regionId);

  return {
    sourceCoverageRatio: readCoverageRatio(spans, input.dreamText),
    lateSectionRetention: {
      observed: lateSectionUnits,
      thresholdStart: lateSectionStart,
      retained: lateSectionUnits > 0,
    },
    endingRetention: hasEndingRetention(spans, input.dreamText),
    transitionCoverage: {
      total: input.bundle.transitions.length,
      withEvidence: transitionsWithEvidence,
    },
    regionCoverage: {
      total: input.bundle.regions.length,
      covered: countCoveredRegions(input.bundle.regions, input.bundle.observations),
    },
    uncertaintyPreserved:
      input.bundle.uncertainty.length > 0 ||
      input.bundle.observations.some((observation) => Boolean(observation.uncertainty)) ||
      input.bundle.regions.some((region) => Boolean(region.uncertainty)) ||
      input.bundle.transitions.some((transition) => Boolean(transition.uncertainty)),
    knownIncompleteRegions,
    structuralCompleteness: knownIncompleteRegions.length === 0 ? "complete" : "partial",
  };
}

export function countEvidenceSpansForRepresentation(
  representation: ObservationV2Bundle | ExperimentalObservationBundle,
): number {
  if ("scenes" in representation) {
    return collectEvidenceSpansFromObservationBundle(representation).length;
  }

  return collectEvidenceSpansFromLayeredBundle(representation).length;
}
