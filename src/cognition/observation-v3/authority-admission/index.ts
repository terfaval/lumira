export {
  AUTHORITY_ADMISSION_EVALUATOR_VERSION,
  AUTHORITY_ADMISSION_SCHEMA_VERSION,
  type AdmissionComparison,
  type AdmissionComparisonClassification,
  type AdmissionDecision,
  type AdmissionDisposition,
  type AdmissionFinding,
  type AdmissionFindingSeverity,
  type AdmissionGovernanceRole,
  type AdmissionPolicy,
  type AdmissionReasonCode,
  type AdmissionRequest,
  type AdmissionIdentityInputComparison,
  type AuthorityIdentity,
  type EvidenceIntegrityAssessment,
  type GovernanceObservation,
  type MemoryRealizationValidationResult,
  type ObservationProvenanceManifest,
  type SourceIdentity,
  type UncertaintyPreservationAssessment,
  type V2AuthorityOutcome,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
export {
  DEFAULT_AUTHORITY_ADMISSION_POLICY,
  FROZEN_SHADOW_V1_AUTHORITY_ADMISSION_POLICY,
} from "@/src/cognition/observation-v3/authority-admission/admission-policy";
export { assessAdmissionMateriality } from "@/src/cognition/observation-v3/authority-admission/admission-materiality";
export { evaluateAdmissionRequest } from "@/src/cognition/observation-v3/authority-admission/admission-evaluator";
export { compareAuthorityAdmissionWithV2 } from "@/src/cognition/observation-v3/authority-admission/admission-equivalence";
export {
  fingerprintAuthorityAdmission,
  type AuthorityAdmissionFingerprintSet,
} from "@/src/cognition/observation-v3/authority-admission/admission-fingerprint";
export {
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_OUTPUT_ROOT,
  buildCanonicalEquivalentCandidate,
  buildShadowAdmissionRequest,
  loadAuthorityAdmissionAttemptCandidates,
  runAuthorityAdmissionShadowReview,
  runShadowAuthorityAdmission,
} from "@/src/cognition/observation-v3/authority-admission/shadow-authority-admission";
export {
  buildNativeAdmissionRequest,
  buildNativeShadowAdmissionRequest,
} from "@/src/cognition/observation-v3/authority-admission/admission-request";
export {
  DEFAULT_AUTHORITY_ADMISSION_CALIBRATION_OUTPUT_ROOT,
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT,
  runAuthorityAdmissionCalibrationReview,
} from "@/src/cognition/observation-v3/authority-admission/calibration-review";
