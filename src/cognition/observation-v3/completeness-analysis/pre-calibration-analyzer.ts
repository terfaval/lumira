import { adaptObservationBundle } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type {
  CompletenessAdequacy,
  CompletenessReason,
  CompletenessReport,
  LateRetentionAssessment,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import {
  COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
  COMPLETENESS_ANALYZER_VERSION,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import { analyzeEndingRetention } from "@/src/cognition/observation-v3/completeness-analysis/ending-retention-analysis";
import { analyzeEvidenceRanges } from "@/src/cognition/observation-v3/completeness-analysis/evidence-range-analysis";
import { COMPLETENESS_ANALYSIS_RULES, hashStableValue } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import { analyzePhysicalGaps } from "@/src/cognition/observation-v3/completeness-analysis/physical-gap-analysis";
import { buildRecoveryRecommendation } from "@/src/cognition/observation-v3/completeness-analysis/recovery-recommendation";
import { analyzeStructuralAssessment } from "@/src/cognition/observation-v3/completeness-analysis/structural-assessment";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

function countSentenceUnits(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function buildIndeterminateReport(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
  code: "candidate_unavailable" | "evidence_spans_unavailable";
  message: string;
  reasons: CompletenessReason[];
}): CompletenessReport {
  const sourceHash = hashStableValue(input.dreamText);
  const candidateHash = hashStableValue(input.bundle);

  return {
    schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
    sourceIdentity: {
      sourceHash,
      sourceLength: input.dreamText.length,
    },
    candidateIdentity: {
      candidateHash,
      candidateKind: "primary_extraction",
    },
    status: input.code,
    adequacy: "indeterminate",
    coverage: {
      largestCoveredSpanEnd: null,
      coverageRatio: null,
      uncoveredPrefix: null,
      uncoveredTail: null,
      internalUncoveredRegions: [],
      measurementAvailability: "unavailable",
    },
    gaps: {
      gaps: [],
      canonicalGapCount: 0,
    },
    lateRetention: {
      lateSectionStart: null,
      lateSectionSentenceUnits: null,
      lateSectionObservationCount: null,
      status: "indeterminate",
    },
    endingRetention: {
      endingStart: null,
      retained: null,
      status: "indeterminate",
    },
    structuralAssessment: {
      sceneOrLocalityCount: input.bundle.scenes.length,
      observationCount: input.bundle.scenes.reduce((count, scene) => count + scene.observations.length, 0),
      overmergeCueGroups: null,
      repeatedSpanRealizationCount: null,
      outOfOrderLocalityCount: null,
      outOfOrderUnitCount: null,
      weaknessSignals: [],
    },
    recoveryRecommendation: {
      disposition: "indeterminate",
      targetedPhysicalGapIds: [],
      eligibility: "unknown",
      advisoryClass: "advisory",
      reasons: ["measurement_indeterminate"],
    },
    metricDiscrepancies: [],
    diagnosticReasons: input.reasons,
    failure: {
      code: input.code,
      message: input.message,
    },
  };
}

function analyzeLegacyLateRetention(input: {
  dreamText: string;
  candidate: ReturnType<typeof adaptObservationBundle>;
  largestCoveredSpanEnd: number | null;
  uncoveredTailPresent: boolean;
}): LateRetentionAssessment {
  const lateSectionStart = Math.floor(input.dreamText.length * COMPLETENESS_ANALYSIS_RULES.lateSectionStartRatio);
  const lateSectionText = input.dreamText.slice(lateSectionStart).trim();
  const lateSectionSentenceUnits = countSentenceUnits(lateSectionText);

  if (lateSectionSentenceUnits === 0) {
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

function determineLegacyAdequacy(input: {
  hasUnavailableEvidence: boolean;
  gapCount: number;
  lateStatus: "retained" | "thin" | "missing" | "not_applicable" | "indeterminate";
  endingStatus: "retained" | "not_retained" | "indeterminate" | "not_applicable";
  weaknessSignals: string[];
}): CompletenessAdequacy {
  if (input.hasUnavailableEvidence) {
    return "indeterminate";
  }

  if (input.weaknessSignals.includes("single_scene_overmerge_risk")) {
    return "inadequate_non_recoverable";
  }

  if (
    input.gapCount > 0
    || input.lateStatus === "thin"
    || input.lateStatus === "missing"
    || input.endingStatus === "not_retained"
  ) {
    return "inadequate_recoverable";
  }

  if (input.weaknessSignals.length > 0) {
    return "adequate_with_observations";
  }

  return "adequate";
}

export function analyzeObservationCompletenessPreCalibration(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
}): CompletenessReport {
  const candidate = adaptObservationBundle(input.bundle);
  if (candidate.observations.length === 0) {
    return buildIndeterminateReport({
      dreamText: input.dreamText,
      bundle: input.bundle,
      code: "candidate_unavailable",
      message: "candidate_contains_no_observations",
      reasons: ["evidence_spans_missing"],
    });
  }

  const evidenceRanges = analyzeEvidenceRanges({
    sourceLength: input.dreamText.length,
    candidate,
  });
  if (evidenceRanges.normalizedRanges.length === 0) {
    return buildIndeterminateReport({
      dreamText: input.dreamText,
      bundle: input.bundle,
      code: "evidence_spans_unavailable",
      message: "candidate_contains_no_valid_evidence_ranges",
      reasons: ["evidence_spans_missing"],
    });
  }
  if (evidenceRanges.measurementAvailability === "unavailable") {
    return buildIndeterminateReport({
      dreamText: input.dreamText,
      bundle: input.bundle,
      code: "evidence_spans_unavailable",
      message: "candidate_contains_no_valid_observation_evidence_ranges",
      reasons: ["evidence_spans_missing"],
    });
  }

  const lateRetention = analyzeLegacyLateRetention({
    dreamText: input.dreamText,
    candidate,
    largestCoveredSpanEnd: evidenceRanges.largestCoveredSpanEnd,
    uncoveredTailPresent: evidenceRanges.uncoveredTail !== null,
  });
  const endingRetention = analyzeEndingRetention({
    sourceLength: input.dreamText.length,
    candidate,
  });
  const structuralAssessment = analyzeStructuralAssessment({
    dreamText: input.dreamText,
    candidate,
    lateRetentionStatus: lateRetention.status,
    endingRetentionStatus: endingRetention.status,
  });
  const gaps = analyzePhysicalGaps({
    uncoveredPrefix: evidenceRanges.uncoveredPrefix,
    uncoveredTail: evidenceRanges.uncoveredTail,
    internalUncoveredRegions: evidenceRanges.internalUncoveredRegions,
    lateRetention,
    endingRetention,
  });

  const adequacy = determineLegacyAdequacy({
    hasUnavailableEvidence: false,
    gapCount: gaps.gaps.length,
    lateStatus: lateRetention.status,
    endingStatus: endingRetention.status,
    weaknessSignals: structuralAssessment.weaknessSignals,
  });
  const recoveryRecommendation = buildRecoveryRecommendation({
    adequacy,
    materialGapAssessment: {
      gaps: gaps.gaps.map((gap) => ({
        gapId: gap.id,
        classification: "material_missing" as const,
        admissionRelevant: true,
        reasons: ["prefix_gap_presumed_material"],
      })),
      targetedGapIds: gaps.gaps.map((gap) => gap.id),
    },
    lateRetentionStatus: lateRetention.status,
    endingRetentionStatus: endingRetention.status,
  });

  const diagnosticReasons = new Set<CompletenessReason>();
  if (evidenceRanges.uncoveredPrefix) {
    diagnosticReasons.add("coverage_prefix_loss_detected");
  }
  if (evidenceRanges.uncoveredTail) {
    diagnosticReasons.add("coverage_tail_loss_detected");
  }
  if (evidenceRanges.internalUncoveredRegions.length > 0) {
    diagnosticReasons.add("coverage_internal_gap_detected");
  }
  if (evidenceRanges.coverageRatio === 1 && (evidenceRanges.uncoveredPrefix || evidenceRanges.internalUncoveredRegions.length > 0)) {
    diagnosticReasons.add("coverage_endpoint_only_measurement");
  }
  if (lateRetention.status === "missing") {
    diagnosticReasons.add("late_section_missing");
  }
  if (lateRetention.status === "thin") {
    diagnosticReasons.add("late_section_thin_trace");
  }
  if (endingRetention.status === "not_retained") {
    diagnosticReasons.add("ending_not_retained");
  }
  if (structuralAssessment.weaknessSignals.includes("single_scene_overmerge_risk")) {
    diagnosticReasons.add("single_scene_overmerge_risk");
  }
  if (structuralAssessment.weaknessSignals.includes("repeated_span_realization")) {
    diagnosticReasons.add("duplicate_span_reuse_detected");
  }
  if (structuralAssessment.weaknessSignals.includes("out_of_order_localities")) {
    diagnosticReasons.add("out_of_order_locality_signal");
  }
  if (structuralAssessment.weaknessSignals.includes("out_of_order_units")) {
    diagnosticReasons.add("out_of_order_unit_signal");
  }
  if (adequacy === "inadequate_recoverable") {
    diagnosticReasons.add(recoveryRecommendation.advisoryClass === "admission_relevant"
      ? "recovery_required_for_admission"
      : "recovery_advisable");
  }
  if (adequacy === "inadequate_non_recoverable") {
    diagnosticReasons.add("not_recoverable_from_available_candidate");
  }

  return {
    schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
    sourceIdentity: {
      sourceHash: hashStableValue(input.dreamText),
      sourceLength: input.dreamText.length,
    },
    candidateIdentity: {
      candidateHash: hashStableValue(input.bundle),
      candidateKind: "primary_extraction",
    },
    status: "available",
    adequacy,
    coverage: {
      largestCoveredSpanEnd: evidenceRanges.largestCoveredSpanEnd,
      coverageRatio: evidenceRanges.coverageRatio,
      uncoveredPrefix: evidenceRanges.uncoveredPrefix,
      uncoveredTail: evidenceRanges.uncoveredTail,
      internalUncoveredRegions: evidenceRanges.internalUncoveredRegions,
      measurementAvailability: evidenceRanges.measurementAvailability,
    },
    gaps,
    lateRetention,
    endingRetention,
    structuralAssessment,
    recoveryRecommendation,
    metricDiscrepancies: evidenceRanges.discrepancyRecords,
    diagnosticReasons: [...diagnosticReasons].sort((left, right) => left.localeCompare(right)),
  };
}
