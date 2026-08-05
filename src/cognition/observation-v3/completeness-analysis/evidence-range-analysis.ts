import { COMPLETENESS_ANALYSIS_RULES } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import type { AdaptedObservationCandidate } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type {
  MeasurementAvailability,
  MeasurementRange,
  MetricDiscrepancyRecord,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

export interface NormalizedEvidenceRange {
  sourceStart: number;
  sourceEnd: number;
  sourceKind: "scene" | "observation";
  sceneId: string;
  observationId: string | null;
  scenePosition: number;
  observationPosition: number | null;
}

export interface EvidenceRangeAnalysis {
  normalizedRanges: NormalizedEvidenceRange[];
  mergedRanges: MeasurementRange[];
  largestCoveredSpanEnd: number | null;
  earliestCoveredPosition: number | null;
  coverageRatio: number | null;
  uncoveredPrefix: MeasurementRange | null;
  uncoveredTail: MeasurementRange | null;
  internalUncoveredRegions: MeasurementRange[];
  measurementAvailability: MeasurementAvailability;
  invalidRangeCount: number;
  missingRangeCount: number;
  discrepancyRecords: MetricDiscrepancyRecord[];
}

function normalizeRange(input: {
  spanStart: number | null;
  spanEnd: number | null;
  sourceLength: number;
}): MeasurementRange | null {
  if (typeof input.spanStart !== "number" || typeof input.spanEnd !== "number") {
    return null;
  }

  if (!Number.isFinite(input.spanStart) || !Number.isFinite(input.spanEnd)) {
    return null;
  }

  const clampedStart = Math.max(0, Math.min(input.sourceLength, input.spanStart));
  const clampedEnd = Math.max(0, Math.min(input.sourceLength, input.spanEnd));
  if (clampedEnd <= clampedStart) {
    return null;
  }

  return {
    start: clampedStart,
    end: clampedEnd,
  };
}

function mergeRanges(ranges: MeasurementRange[]): MeasurementRange[] {
  if (ranges.length === 0) {
    return [];
  }

  const ordered = [...ranges].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }

    return left.end - right.end;
  });

  const merged: MeasurementRange[] = [ordered[0]!];
  for (const range of ordered.slice(1)) {
    const previous = merged.at(-1)!;
    if (range.start <= previous.end) {
      previous.end = Math.max(previous.end, range.end);
      continue;
    }

    merged.push({ ...range });
  }

  return merged;
}

function readInternalGapThreshold(sourceLength: number): number {
  return Math.max(
    COMPLETENESS_ANALYSIS_RULES.internalGapMinCharsFloor,
    Math.floor(sourceLength * COMPLETENESS_ANALYSIS_RULES.internalGapRelativeThresholdRatio),
  );
}

function readBoundaryGapThreshold(sourceLength: number): number {
  return Math.max(
    COMPLETENESS_ANALYSIS_RULES.significantBoundaryGapFloor,
    Math.floor(sourceLength * COMPLETENESS_ANALYSIS_RULES.significantBoundaryGapRatio),
  );
}

export function analyzeEvidenceRanges(input: {
  sourceLength: number;
  candidate: AdaptedObservationCandidate;
}): EvidenceRangeAnalysis {
  const normalizedSceneRanges: NormalizedEvidenceRange[] = [];
  const normalizedObservationRanges: NormalizedEvidenceRange[] = [];
  let invalidRangeCount = 0;
  let missingRangeCount = 0;

  for (const scene of input.candidate.scenes) {
    const normalizedSceneRange = normalizeRange({
      spanStart: scene.sceneRange.spanStart,
      spanEnd: scene.sceneRange.spanEnd,
      sourceLength: input.sourceLength,
    });
    if (normalizedSceneRange) {
      normalizedSceneRanges.push({
        sourceStart: normalizedSceneRange.start,
        sourceEnd: normalizedSceneRange.end,
        sourceKind: "scene",
        sceneId: scene.sceneId,
        observationId: null,
        scenePosition: scene.position,
        observationPosition: null,
      });
    } else if (scene.sceneRange.spanStart === null || scene.sceneRange.spanEnd === null) {
      missingRangeCount += 1;
    } else {
      invalidRangeCount += 1;
    }
  }

  for (const observation of input.candidate.observations) {
    for (const evidence of observation.evidence) {
      const normalizedObservationRange = normalizeRange({
        spanStart: evidence.spanStart,
        spanEnd: evidence.spanEnd,
        sourceLength: input.sourceLength,
      });
      if (normalizedObservationRange) {
        normalizedObservationRanges.push({
          sourceStart: normalizedObservationRange.start,
          sourceEnd: normalizedObservationRange.end,
          sourceKind: "observation",
          sceneId: observation.sceneId,
          observationId: observation.observationId,
          scenePosition: observation.scenePosition,
          observationPosition: observation.position,
        });
      } else if (evidence.spanStart === null || evidence.spanEnd === null) {
        missingRangeCount += 1;
      } else {
        invalidRangeCount += 1;
      }
    }
  }

  const coverageRanges = normalizedObservationRanges.length > 0
    ? normalizedObservationRanges
    : normalizedSceneRanges;
  const normalizedRanges = [...normalizedSceneRanges, ...normalizedObservationRanges];

  const mergedRanges = mergeRanges(
    coverageRanges.map((range) => ({
      start: range.sourceStart,
      end: range.sourceEnd,
    })),
  );

  const earliestCoveredPosition = mergedRanges[0]?.start ?? null;
  const largestCoveredSpanEnd = coverageRanges.reduce<number | null>((largest, range) => {
    if (largest === null) {
      return range.sourceEnd;
    }
    return Math.max(largest, range.sourceEnd);
  }, null);

  const coverageRatio = largestCoveredSpanEnd === null || input.sourceLength === 0
    ? null
    : largestCoveredSpanEnd / input.sourceLength;
  const boundaryGapThreshold = readBoundaryGapThreshold(input.sourceLength);
  const uncoveredPrefix = earliestCoveredPosition !== null && earliestCoveredPosition >= boundaryGapThreshold
    ? { start: 0, end: earliestCoveredPosition }
    : null;
  const uncoveredTail = largestCoveredSpanEnd !== null && (input.sourceLength - largestCoveredSpanEnd) >= boundaryGapThreshold
    ? { start: largestCoveredSpanEnd, end: input.sourceLength }
    : null;

  const internalGapThreshold = readInternalGapThreshold(input.sourceLength);
  const internalUncoveredRegions: MeasurementRange[] = [];
  for (let index = 0; index < mergedRanges.length - 1; index += 1) {
    const current = mergedRanges[index]!;
    const next = mergedRanges[index + 1]!;
    if ((next.start - current.end) >= internalGapThreshold) {
      internalUncoveredRegions.push({
        start: current.end,
        end: next.start,
      });
    }
  }

  const discrepancyRecords: MetricDiscrepancyRecord[] = [];
  if (coverageRatio === 1 && (uncoveredPrefix !== null || internalUncoveredRegions.length > 0)) {
    discrepancyRecords.push({
      code: "coverage_ratio_vs_uncovered_range",
      severity: "medium",
      description: "Endpoint-derived coverage reached 1.0 while prefix or internal uncovered ranges remain.",
    });
  }

  return {
    normalizedRanges,
    mergedRanges,
    largestCoveredSpanEnd,
    earliestCoveredPosition,
    coverageRatio,
    uncoveredPrefix,
    uncoveredTail,
    internalUncoveredRegions,
    measurementAvailability: normalizedObservationRanges.length === 0
      ? "unavailable"
      : (invalidRangeCount > 0 || missingRangeCount > 0 ? "partial" : "full"),
    invalidRangeCount,
    missingRangeCount,
    discrepancyRecords,
  };
}
