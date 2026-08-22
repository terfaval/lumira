export const COMPLETENESS_ANALYSIS_SCHEMA_VERSION = "1";
export const COMPLETENESS_ANALYZER_VERSION = "1";

export interface SourceIdentity {
  sourceHash: string;
  sourceLength: number;
}

export interface CandidateIdentity {
  candidateHash: string;
  candidateKind: "primary_extraction" | "supplemental_realization" | "composed_candidate" | "unknown";
  candidateVersionLabel?: string;
}

export type CompletenessStatus =
  | "available"
  | "source_unavailable"
  | "candidate_unavailable"
  | "evidence_spans_unavailable"
  | "malformed_candidate"
  | "analyzer_failed";

export type CompletenessAdequacy =
  | "adequate"
  | "adequate_with_observations"
  | "inadequate_recoverable"
  | "inadequate_non_recoverable"
  | "indeterminate";

export interface MeasurementRange {
  start: number;
  end: number;
}

export type MeasurementAvailability = "full" | "partial" | "unavailable";

export type GapConfidence = "high" | "medium" | "low" | "indeterminate";

export type PhysicalGapReason =
  | "coverage_prefix_loss_detected"
  | "coverage_internal_gap_detected"
  | "coverage_tail_loss_detected"
  | "late_section_missing"
  | "late_section_thin_trace"
  | "ending_not_retained"
  | "transition_gap"
  | "structural_gap_signal";

export interface NeighborEvidence {
  precedingObservationId: string | null;
  followingObservationId: string | null;
}

export interface PhysicalGap {
  id: string;
  sourceStart: number;
  sourceEnd: number;
  kind: "prefix" | "internal" | "tail";
  reasons: PhysicalGapReason[];
  confidence: GapConfidence;
  neighboringEvidence?: NeighborEvidence;
}

export interface PhysicalGapSet {
  gaps: PhysicalGap[];
  canonicalGapCount: number;
}

export interface CoverageAssessment {
  largestCoveredSpanEnd: number | null;
  coverageRatio: number | null;
  uncoveredPrefix: MeasurementRange | null;
  uncoveredTail: MeasurementRange | null;
  internalUncoveredRegions: MeasurementRange[];
  measurementAvailability: MeasurementAvailability;
}

export interface LateRetentionAssessment {
  lateSectionStart: number | null;
  lateSectionSentenceUnits: number | null;
  lateSectionObservationCount: number | null;
  status: "retained" | "thin" | "missing" | "not_applicable" | "indeterminate";
}

export interface EndingRetentionAssessment {
  endingStart: number | null;
  retained: boolean | null;
  status: "retained" | "not_retained" | "indeterminate" | "not_applicable";
}

export type StructuralWeaknessSignal =
  | "single_scene_overmerge_risk"
  | "repeated_span_realization"
  | "out_of_order_localities"
  | "out_of_order_units"
  | "thin_late_retention"
  | "ending_not_retained";

export interface StructuralCompletenessAssessment {
  sceneOrLocalityCount: number | null;
  observationCount: number | null;
  overmergeCueGroups: number | null;
  repeatedSpanRealizationCount: number | null;
  outOfOrderLocalityCount: number | null;
  outOfOrderUnitCount: number | null;
  weaknessSignals: StructuralWeaknessSignal[];
}

export type MaterialGapClassification =
  | "material_missing"
  | "already_represented"
  | "non_material"
  | "unresolved";

export type MaterialGapReason =
  | "prefix_gap_presumed_material"
  | "late_or_ending_loss_presumed_material"
  | "duplicate_source_text_already_covered"
  | "non_lexical_gap_text"
  | "reflective_tail_commentary"
  | "terminal_state_already_represented"
  | "connective_only_gap_text"
  | "multi_sentence_internal_gap"
  | "tail_gap_not_proven_material"
  | "internal_gap_not_deterministically_classified";

export interface MaterialGapRecord {
  gapId: string;
  classification: MaterialGapClassification;
  admissionRelevant: boolean;
  reasons: MaterialGapReason[];
}

export interface MaterialGapAssessment {
  gaps: MaterialGapRecord[];
  targetedGapIds: string[];
}

export type RecoveryRecommendationReason =
  | "physical_gap_detected"
  | "late_section_missing"
  | "ending_not_retained"
  | "structural_weakness_detected"
  | "candidate_not_recoverable"
  | "measurement_indeterminate";

export interface RecoveryRecommendation {
  disposition:
    | "not_required"
    | "recommended"
    | "required_before_admission"
    | "not_recoverable"
    | "indeterminate";
  targetedPhysicalGapIds: string[];
  eligibility: "eligible" | "not_eligible" | "unknown";
  advisoryClass: "advisory" | "admission_relevant";
  reasons: RecoveryRecommendationReason[];
}

export type MetricDiscrepancyCode =
  | "coverage_ratio_vs_uncovered_range"
  | "late_retention_vs_tail_gap"
  | "ending_metric_false_negative"
  | "contradictory_measurements"
  | "insufficient_evidence_span_support";

export interface MetricDiscrepancyRecord {
  code: MetricDiscrepancyCode;
  severity: "low" | "medium" | "high";
  description: string;
}

export type CompletenessReason =
  | "coverage_tail_loss_detected"
  | "coverage_prefix_loss_detected"
  | "coverage_internal_gap_detected"
  | "coverage_endpoint_only_measurement"
  | "late_section_missing"
  | "late_section_thin_trace"
  | "ending_not_retained"
  | "ending_retention_indeterminate"
  | "single_scene_overmerge_risk"
  | "duplicate_span_reuse_detected"
  | "out_of_order_locality_signal"
  | "out_of_order_unit_signal"
  | "recovery_advisable"
  | "recovery_required_for_admission"
  | "not_recoverable_from_available_candidate"
  | "evidence_spans_missing"
  | "contradictory_measurements_detected";

export interface CompletenessFailure {
  code:
    | "source_unavailable"
    | "candidate_unavailable"
    | "evidence_spans_unavailable"
    | "malformed_candidate"
    | "contradictory_measurements"
    | "analyzer_failed";
  message: string;
}

export interface CompletenessReport {
  schemaVersion: typeof COMPLETENESS_ANALYSIS_SCHEMA_VERSION;
  analyzerVersion: typeof COMPLETENESS_ANALYZER_VERSION;
  sourceIdentity: SourceIdentity;
  candidateIdentity: CandidateIdentity;
  status: CompletenessStatus;
  adequacy: CompletenessAdequacy;
  coverage: CoverageAssessment;
  gaps: PhysicalGapSet;
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
  structuralAssessment: StructuralCompletenessAssessment;
  materialGapAssessment?: MaterialGapAssessment;
  recoveryRecommendation: RecoveryRecommendation;
  metricDiscrepancies: MetricDiscrepancyRecord[];
  diagnosticReasons: CompletenessReason[];
  failure?: CompletenessFailure;
}

export type CompletenessEquivalenceClassification =
  | "equivalent"
  | "equivalent_with_representation_difference"
  | "v3_stricter"
  | "v3_more_permissive"
  | "semantically_incomparable"
  | "comparison_unavailable";
