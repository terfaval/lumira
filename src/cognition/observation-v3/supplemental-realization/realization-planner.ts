import { createHash } from "node:crypto";

import type { ExperimentalObservationUnit } from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type {
  CompletenessReport,
  PhysicalGap,
} from "@/src/cognition/observation-v3/completeness-analysis";
import type {
  PlannedSupplementalGap,
  PlannedSupplementalRealization,
  SupplementalBaselineCandidate,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function hasReason(gap: PhysicalGap, reason: string): boolean {
  return gap.reasons.includes(reason as PhysicalGap["reasons"][number]);
}

function shouldUseEndingBiasedWindow(input: {
  gap: PhysicalGap;
  completeness: CompletenessReport;
  contextPadding: number;
  maximumWindowLength: number;
}): boolean {
  if (input.gap.kind !== "tail" || input.gap.confidence !== "high") {
    return false;
  }

  const hasTailCoverageLoss = hasReason(input.gap, "coverage_tail_loss_detected");
  const hasTerminalOmission =
    input.completeness.lateRetention.status === "missing"
    || input.completeness.endingRetention.status === "not_retained"
    || hasReason(input.gap, "late_section_missing")
    || hasReason(input.gap, "ending_not_retained");
  if (!hasTailCoverageLoss || !hasTerminalOmission) {
    return false;
  }

  const gapLength = input.gap.sourceEnd - input.gap.sourceStart;
  const minimumTerminalGapLength = Math.max(
    Math.floor(input.maximumWindowLength * 0.4),
    input.contextPadding * 3,
  );

  return gapLength > minimumTerminalGapLength;
}

function buildContextWindow(input: {
  sourceLength: number;
  gap: PhysicalGap;
  completeness: CompletenessReport;
  contextPadding: number;
  maximumWindowLength: number;
}): { contextStart: number; contextEnd: number } {
  if (shouldUseEndingBiasedWindow(input)) {
    const terminalAnchors = [
      input.completeness.lateRetention.status === "missing"
      || input.completeness.lateRetention.status === "thin"
        ? input.completeness.lateRetention.lateSectionStart
        : null,
      input.completeness.endingRetention.status === "not_retained"
        ? input.completeness.endingRetention.endingStart
        : null,
    ].filter((value): value is number => typeof value === "number");
    const prioritizedGapStart = Math.max(
      input.gap.sourceStart,
      terminalAnchors.length > 0 ? Math.min(...terminalAnchors) : input.gap.sourceStart,
    );
    let contextStart = Math.max(0, prioritizedGapStart - input.contextPadding);
    const contextEnd = input.gap.sourceEnd;

    if (contextEnd - contextStart > input.maximumWindowLength) {
      contextStart = Math.max(0, contextEnd - input.maximumWindowLength);
    }

    return {
      contextStart,
      contextEnd,
    };
  }

  let contextStart = Math.max(0, input.gap.sourceStart - input.contextPadding);
  let contextEnd = Math.min(input.sourceLength, input.gap.sourceEnd + input.contextPadding);

  if (contextEnd - contextStart > input.maximumWindowLength) {
    if (input.gap.kind === "tail") {
      contextEnd = input.gap.sourceEnd;
      contextStart = Math.max(0, contextEnd - input.maximumWindowLength);
    } else if (input.gap.kind === "prefix") {
      contextStart = 0;
      contextEnd = Math.min(input.sourceLength, input.maximumWindowLength);
    } else {
      const midpoint = Math.floor((input.gap.sourceStart + input.gap.sourceEnd) / 2);
      const half = Math.floor(input.maximumWindowLength / 2);
      contextStart = Math.max(0, midpoint - half);
      contextEnd = Math.min(input.sourceLength, contextStart + input.maximumWindowLength);
    }
  }

  return {
    contextStart,
    contextEnd,
  };
}

export function findRelevantBaselineObservationText(input: {
  baselineUnits: ExperimentalObservationUnit[];
  contextStart: number;
  contextEnd: number;
}): string {
  return input.baselineUnits
    .filter((unit) => unit.evidence.some((evidence) =>
      typeof evidence.spanStart === "number" &&
      typeof evidence.spanEnd === "number" &&
      evidence.spanEnd >= input.contextStart &&
      evidence.spanStart <= input.contextEnd,
    ))
    .map((unit) => unit.statement)
    .join("\n");
}

export function planSupplementalRealization(input: {
  sourceText: string;
  completeness: CompletenessReport;
  baseline: SupplementalBaselineCandidate;
  contextPadding: number;
  maximumWindowLength: number;
}): PlannedSupplementalRealization {
  const recoveryRequired = input.completeness.recoveryRecommendation.disposition === "required_before_admission";
  const selectedGaps = (recoveryRequired ? [...input.completeness.gaps.gaps] : [])
    .filter((gap) => gap.sourceStart >= 0 && gap.sourceEnd > gap.sourceStart && gap.sourceEnd <= input.sourceText.length)
    .sort((left, right) => left.sourceStart - right.sourceStart || left.sourceEnd - right.sourceEnd || left.id.localeCompare(right.id))
    .map((gap, index): PlannedSupplementalGap => {
      const { contextStart, contextEnd } = buildContextWindow({
        sourceLength: input.sourceText.length,
        gap,
        completeness: input.completeness,
        contextPadding: input.contextPadding,
        maximumWindowLength: input.maximumWindowLength,
      });
      return {
        targetId: `target-${index + 1}-${gap.id}`,
        physicalGapId: gap.id,
        kind: gap.kind,
        sourceStart: gap.sourceStart,
        sourceEnd: gap.sourceEnd,
        contextStart,
        contextEnd,
        includesEnding: gap.kind === "tail",
        neighboringEvidence: gap.neighboringEvidence,
        reasons: [...gap.reasons].sort((left, right) => left.localeCompare(right)),
        confidence: gap.confidence,
        wholeSourceForbidden: true,
      };
    });

  const sourceHash = input.completeness.sourceIdentity.sourceHash || sha256Hex(input.sourceText);
  const request = {
    requestId: `supplemental-${input.baseline.candidateHash.slice(0, 12)}-${selectedGaps.length}`,
    sourceHash,
    primaryCandidateId: input.baseline.candidateId,
    primaryCandidateHash: input.baseline.candidateHash,
    completenessReportId: `completeness-${input.completeness.candidateIdentity.candidateHash.slice(0, 12)}`,
    policyVersion: "shadow-v1",
    policyFingerprint: sha256Hex(JSON.stringify({
      contextPadding: input.contextPadding,
      maximumWindowLength: input.maximumWindowLength,
      selectedGaps: selectedGaps.map((gap) => ({
        physicalGapId: gap.physicalGapId,
        contextStart: gap.contextStart,
        contextEnd: gap.contextEnd,
      })),
    })),
    selectedGaps,
  };

  return {
    request,
    selectedGaps,
    realizationContext: selectedGaps,
  };
}
