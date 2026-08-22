export {
  COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
  COMPLETENESS_ANALYZER_VERSION,
  type CompletenessReport,
  type CandidateIdentity,
  type CompletenessEquivalenceClassification,
  type CompletenessAdequacy,
  type CompletenessFailure,
  type CompletenessReason,
  type CompletenessStatus,
  type CoverageAssessment,
  type EndingRetentionAssessment,
  type GapConfidence,
  type LateRetentionAssessment,
  type MeasurementAvailability,
  type MeasurementRange,
  type MetricDiscrepancyCode,
  type MetricDiscrepancyRecord,
  type NeighborEvidence,
  type PhysicalGap,
  type PhysicalGapReason,
  type PhysicalGapSet,
  type RecoveryRecommendation,
  type RecoveryRecommendationReason,
  type SourceIdentity,
  type StructuralCompletenessAssessment,
  type StructuralWeaknessSignal,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
export {
  analyzeComposedCandidateCompleteness,
  analyzeNativeC0Completeness,
  analyzeObservationCompleteness,
  analyzeObservationCandidateCompleteness,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analyzer";
export {
  adaptComposedCandidate,
  adaptNativeC0Candidate,
  adaptObservationBundle,
  type AdaptedCandidateObservation,
  type AdaptedCandidateScene,
  type AdaptedObservationCandidate,
} from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
export {
  analyzeObservationCompletenessPreCalibration,
} from "@/src/cognition/observation-v3/completeness-analysis/pre-calibration-analyzer";
export {
  compareCompletenessWithV2Diagnostics,
  type CompletenessEquivalenceResult,
  type V2AttemptDiagnosticsReference,
} from "@/src/cognition/observation-v3/completeness-analysis/v2-equivalence";
export {
  analyzeMaterialGapAssessment,
} from "@/src/cognition/observation-v3/completeness-analysis/material-gap-assessment";
export {
  fingerprintCompletenessAnalysis,
  type CompletenessFingerprintSet,
} from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
export {
  runShadowCompletenessAnalysis,
  type CompletenessAnalysisShadowResult,
} from "@/src/cognition/observation-v3/completeness-analysis/shadow-completeness-analysis";
