import type {
  AdmissionFinding,
  AdmissionPolicy,
  AdmissionRequest,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";

export type AdmissionMaterialityClass =
  | "material_blocking"
  | "material_recoverable"
  | "non_blocking_observation"
  | "indeterminate";

export interface AdmissionMaterialityAssessment {
  classification: AdmissionMaterialityClass;
  reasons: string[];
}

function readTailLength(request: AdmissionRequest): number {
  if (request.completeness.status !== "available") {
    return 0;
  }

  const tail = request.completeness.report.coverage.uncoveredTail;
  return tail ? tail.end - tail.start : 0;
}

function readSourceLength(request: AdmissionRequest): number {
  return request.completeness.status === "available"
    ? request.completeness.report.sourceIdentity.sourceLength
    : request.sourceIdentity.sourceLength;
}

export function assessAdmissionMateriality(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy;
  blockingFindings: readonly AdmissionFinding[];
}): AdmissionMaterialityAssessment {
  if (input.request.completeness.status !== "available") {
    return {
      classification: "indeterminate",
      reasons: ["completeness_unavailable"],
    };
  }

  const report = input.request.completeness.report;
  const gapKinds = report.gaps.gaps.map((gap) => gap.kind);
  const gapReasons = new Set(report.gaps.gaps.flatMap((gap) => gap.reasons));
  const hasPrefixGap = gapKinds.includes("prefix")
    || input.blockingFindings.some((finding) => finding.signalId === "coverage.uncovered_prefix");
  if (hasPrefixGap) {
    return {
      classification: "material_blocking",
      reasons: ["uncovered_prefix_loss"],
    };
  }

  const hasTailGap = gapKinds.includes("tail") || report.coverage.uncoveredTail !== null;
  const hasInternalGapOnly = gapKinds.length > 0 && gapKinds.every((kind) => kind === "internal");
  const hasLateMissing = report.lateRetention.status === "missing";
  const hasLateThinTrace = report.lateRetention.status === "thin";
  const endingNotRetained = report.endingRetention.status === "not_retained";
  const tailLength = readTailLength(input.request);
  const sourceLength = Math.max(readSourceLength(input.request), 1);
  const tailRatio = tailLength / sourceLength;

  if (hasInternalGapOnly) {
    return {
      classification: "non_blocking_observation",
      reasons: ["internal_gap_only"],
    };
  }

  if (!hasTailGap && hasLateThinTrace) {
    return {
      classification: "non_blocking_observation",
      reasons: ["thin_late_trace_only"],
    };
  }

  const shortSourceCriticalEnding =
    sourceLength <= input.policy.shortSourceCriticalEndingCharThreshold
    && hasTailGap
    && endingNotRetained;
  if (shortSourceCriticalEnding) {
    return {
      classification: "material_recoverable",
      reasons: ["short_source_ending_loss"],
    };
  }

  const materialTailBySize = tailLength >= input.policy.materialTailCharThreshold;
  const materialTailByRatio = tailRatio >= input.policy.materialTailCoverageRatioThreshold;
  if (hasTailGap && hasLateMissing && (materialTailBySize || materialTailByRatio)) {
    return {
      classification: "material_recoverable",
      reasons: ["late_missing_material_tail"],
    };
  }

  if (hasTailGap && endingNotRetained && materialTailBySize) {
    return {
      classification: "material_recoverable",
      reasons: ["ending_loss_material_tail"],
    };
  }

  if (
    hasTailGap
    && tailLength <= input.policy.observationalTailCharThreshold
    && !hasLateMissing
    && !endingNotRetained
  ) {
    return {
      classification: "non_blocking_observation",
      reasons: ["bounded_tail_observation"],
    };
  }

  if (
    !hasTailGap
    && !hasLateMissing
    && !endingNotRetained
    && (
      hasLateThinTrace
      || report.coverage.internalUncoveredRegions.length > 0
      || report.structuralAssessment.weaknessSignals.includes("single_scene_overmerge_risk")
      || gapReasons.has("coverage_internal_gap_detected")
    )
  ) {
    return {
      classification: "non_blocking_observation",
      reasons: ["structural_weakness_only"],
    };
  }

  return {
    classification: "indeterminate",
    reasons: ["materiality_not_proven"],
  };
}
