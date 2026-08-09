import {
  adaptObservationBundle,
  adaptComposedCandidate,
  type AdaptedObservationCandidate,
} from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type {
  CandidateIdentity,
  CompletenessAdequacy,
  CompletenessReason,
  CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import {
  COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
  COMPLETENESS_ANALYZER_VERSION,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import type {
  EndingRetentionAssessment,
  LateRetentionAssessment,
  MeasurementRange,
  PhysicalGapSet,
  StructuralWeaknessSignal,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import { analyzeEndingRetention } from "@/src/cognition/observation-v3/completeness-analysis/ending-retention-analysis";
import { analyzeEvidenceRanges } from "@/src/cognition/observation-v3/completeness-analysis/evidence-range-analysis";
import { COMPLETENESS_ANALYSIS_RULES } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import { hashStableValue } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import { analyzeLateRetention } from "@/src/cognition/observation-v3/completeness-analysis/late-retention-analysis";
import { analyzePhysicalGaps } from "@/src/cognition/observation-v3/completeness-analysis/physical-gap-analysis";
import { buildRecoveryRecommendation } from "@/src/cognition/observation-v3/completeness-analysis/recovery-recommendation";
import { analyzeStructuralAssessment } from "@/src/cognition/observation-v3/completeness-analysis/structural-assessment";
import type { ComposedProvisionalMemoryCandidate } from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

function buildIndeterminateReport(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
  candidateIdentity: CandidateIdentity;
  sourceIdentity?: {
    sourceHash: string;
    sourceLength: number;
  };
  code: "candidate_unavailable" | "evidence_spans_unavailable";
  message: string;
  reasons: CompletenessReason[];
}): CompletenessReport {
  const sourceHash = hashStableValue(input.dreamText);

  return {
    schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
    sourceIdentity: input.sourceIdentity ?? {
      sourceHash,
      sourceLength: input.dreamText.length,
    },
    candidateIdentity: input.candidateIdentity,
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
      sceneOrLocalityCount: input.candidate.scenes.length,
      observationCount: input.candidate.observations.length,
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

function countSentenceUnits(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function hasOnlyLowConfidenceInternalGaps(gaps: PhysicalGapSet): boolean {
  return gaps.gaps.length > 0 && gaps.gaps.every((gap) => gap.kind === "internal" && gap.confidence === "low");
}

function isReflectiveTailObservation(input: {
  dreamText: string;
  uncoveredTail: MeasurementRange | null;
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
}): boolean {
  if (!input.uncoveredTail) {
    return false;
  }

  if (
    (input.lateRetention.status !== "missing" && input.lateRetention.status !== "not_applicable")
    || input.endingRetention.status !== "not_retained"
  ) {
    return false;
  }

  const tailText = input.dreamText.slice(input.uncoveredTail.start, input.uncoveredTail.end).trim().toLowerCase();
  if (!tailText || tailText.length > COMPLETENESS_ANALYSIS_RULES.reflectiveTailMaxChars) {
    return false;
  }

  if (countSentenceUnits(tailText) > COMPLETENESS_ANALYSIS_RULES.reflectiveTailMaxSentenceUnits) {
    return false;
  }

  return COMPLETENESS_ANALYSIS_RULES.reflectiveTailMarkers.some((marker) => tailText.startsWith(marker));
}

function hasExplicitTerminalCue(observationTexts: string[]): boolean {
  return observationTexts.some((text) => {
    const normalized = text.trim().toLowerCase();
    return normalized.includes("wake up")
      || normalized.includes("woke up")
      || normalized.includes("felébredek")
      || normalized.includes("felébred")
      || normalized.includes("rájövök, hogy ez csak egy álom");
  });
}

function isShortCoherentTailObservation(input: {
  dreamText: string;
  uncoveredTail: MeasurementRange | null;
  lateRetention: LateRetentionAssessment;
}): boolean {
  if (!input.uncoveredTail || input.lateRetention.status !== "not_applicable") {
    return false;
  }

  return input.dreamText.length <= COMPLETENESS_ANALYSIS_RULES.shortSourceTailObservationSourceMaxChars
    && (input.uncoveredTail.end - input.uncoveredTail.start) <= COMPLETENESS_ANALYSIS_RULES.shortSourceTailObservationMaxChars;
}

function isBoundedTerminalCueObservation(input: {
  dreamText: string;
  uncoveredTail: MeasurementRange | null;
  explicitTerminalCuePresent: boolean;
}): boolean {
  if (!input.uncoveredTail || !input.explicitTerminalCuePresent) {
    return false;
  }

  return input.dreamText.length <= COMPLETENESS_ANALYSIS_RULES.boundedTerminalCueSourceMaxChars
    && (input.uncoveredTail.end - input.uncoveredTail.start) <= COMPLETENESS_ANALYSIS_RULES.boundedTerminalCueTailMaxChars;
}

function determineAdequacy(input: {
  dreamText: string;
  hasUnavailableEvidence: boolean;
  uncoveredTail: MeasurementRange | null;
  gaps: PhysicalGapSet;
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
  weaknessSignals: StructuralWeaknessSignal[];
  explicitTerminalCuePresent: boolean;
}): CompletenessAdequacy {
  if (input.hasUnavailableEvidence) {
    return "indeterminate";
  }

  if (input.weaknessSignals.includes("single_scene_overmerge_risk")) {
    return "inadequate_non_recoverable";
  }

  const hasPrefixGap = input.gaps.gaps.some((gap) => gap.kind === "prefix");
  const hasTailGap = input.gaps.gaps.some((gap) => gap.kind === "tail");
  const reflectiveTailObservation = isReflectiveTailObservation({
    dreamText: input.dreamText,
    uncoveredTail: input.uncoveredTail,
    lateRetention: input.lateRetention,
    endingRetention: input.endingRetention,
  });
  const shortCoherentTailObservation = isShortCoherentTailObservation({
    dreamText: input.dreamText,
    uncoveredTail: input.uncoveredTail,
    lateRetention: input.lateRetention,
  });
  const boundedTerminalCueObservation = isBoundedTerminalCueObservation({
    dreamText: input.dreamText,
    uncoveredTail: input.uncoveredTail,
    explicitTerminalCuePresent: input.explicitTerminalCuePresent,
  });

  if (hasPrefixGap) {
    return "inadequate_recoverable";
  }

  if (hasTailGap) {
    if (reflectiveTailObservation || shortCoherentTailObservation) {
      return "adequate_with_observations";
    }

    if (boundedTerminalCueObservation) {
      return "adequate_with_observations";
    }

    if (input.lateRetention.status === "missing" || input.endingRetention.status === "not_retained") {
      return "inadequate_recoverable";
    }

    return "adequate_with_observations";
  }

  if (hasOnlyLowConfidenceInternalGaps(input.gaps)) {
    return "adequate_with_observations";
  }

  if (
    input.lateRetention.status === "thin"
    || input.lateRetention.status === "missing"
    || input.endingRetention.status === "not_retained"
    || input.endingRetention.status === "indeterminate"
  ) {
    return "adequate_with_observations";
  }

  if (input.weaknessSignals.length > 0) {
    return "adequate_with_observations";
  }

  return "adequate";
}

export function analyzeObservationCompleteness(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
}): CompletenessReport {
  const candidateIdentity: CandidateIdentity = {
    candidateHash: hashStableValue(input.bundle),
    candidateKind: "primary_extraction",
  };

  return analyzeObservationCandidateCompleteness({
    dreamText: input.dreamText,
    candidate: adaptObservationBundle(input.bundle),
    candidateIdentity,
  });
}

export function analyzeObservationCandidateCompleteness(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
  candidateIdentity: CandidateIdentity;
  sourceIdentity?: {
    sourceHash: string;
    sourceLength: number;
  };
}): CompletenessReport {
  const candidate = input.candidate;
  if (candidate.observations.length === 0) {
    return buildIndeterminateReport({
      dreamText: input.dreamText,
      candidate,
      candidateIdentity: input.candidateIdentity,
      sourceIdentity: input.sourceIdentity,
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
      candidate,
      candidateIdentity: input.candidateIdentity,
      sourceIdentity: input.sourceIdentity,
      code: "evidence_spans_unavailable",
      message: "candidate_contains_no_valid_evidence_ranges",
      reasons: ["evidence_spans_missing"],
    });
  }
  if (evidenceRanges.measurementAvailability === "unavailable") {
    return buildIndeterminateReport({
      dreamText: input.dreamText,
      candidate,
      candidateIdentity: input.candidateIdentity,
      sourceIdentity: input.sourceIdentity,
      code: "evidence_spans_unavailable",
      message: "candidate_contains_no_valid_observation_evidence_ranges",
      reasons: ["evidence_spans_missing"],
    });
  }

  const lateRetention = analyzeLateRetention({
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
  const explicitTerminalCuePresent = hasExplicitTerminalCue(candidate.observations.map((observation) => observation.text));
  const gaps = analyzePhysicalGaps({
    uncoveredPrefix: evidenceRanges.uncoveredPrefix,
    uncoveredTail: evidenceRanges.uncoveredTail,
    internalUncoveredRegions: evidenceRanges.internalUncoveredRegions,
    lateRetention,
    endingRetention,
  });

  const adequacy = determineAdequacy({
    dreamText: input.dreamText,
    hasUnavailableEvidence: false,
    uncoveredTail: evidenceRanges.uncoveredTail,
    gaps,
    lateRetention,
    endingRetention,
    weaknessSignals: structuralAssessment.weaknessSignals,
    explicitTerminalCuePresent,
  });
  const recoveryRecommendation = buildRecoveryRecommendation({
    adequacy,
    gaps,
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

  const metricDiscrepancies = [...evidenceRanges.discrepancyRecords];
  if (endingRetention.status === "not_retained" && explicitTerminalCuePresent) {
    metricDiscrepancies.push({
      code: "ending_metric_false_negative",
      severity: "medium",
      description: "Ending metric missed an explicit terminal cue already present in the candidate observations.",
    });
  }

  return {
    schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
    sourceIdentity: input.sourceIdentity ?? {
      sourceHash: hashStableValue(input.dreamText),
      sourceLength: input.dreamText.length,
    },
    candidateIdentity: input.candidateIdentity,
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
    metricDiscrepancies,
    diagnosticReasons: [...diagnosticReasons].sort((left, right) => left.localeCompare(right)),
  };
}

export function analyzeComposedCandidateCompleteness(input: {
  dreamText: string;
  composedCandidate: ComposedProvisionalMemoryCandidate;
  composedCandidateHash: string;
  sourceIdentity?: {
    sourceHash: string;
    sourceLength: number;
  };
}): CompletenessReport {
  return analyzeObservationCandidateCompleteness({
    dreamText: input.dreamText,
    candidate: adaptComposedCandidate(input.composedCandidate),
    candidateIdentity: {
      candidateHash: input.composedCandidateHash,
      candidateKind: "composed_candidate",
      candidateVersionLabel: "post_composition",
    },
    sourceIdentity: input.sourceIdentity,
  });
}
