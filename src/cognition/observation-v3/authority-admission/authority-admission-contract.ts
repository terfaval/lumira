import type { CompletenessReport } from "@/src/cognition/observation-v3/completeness-analysis";
import type { CanonicalMemoryCandidate } from "@/src/cognition/observation-v3/memory-realization";
import type {
  IdentityComparisonClassification,
  IdentitySnapshot,
} from "@/src/cognition/observation-v3/identity-comparison";

export const AUTHORITY_ADMISSION_SCHEMA_VERSION = "1";
export const AUTHORITY_ADMISSION_EVALUATOR_VERSION = "1";

export type AdmissionDisposition =
  | "admitted"
  | "admitted_with_observations"
  | "deferred_for_supplemental_realization"
  | "rejected_candidate_failure"
  | "rejected_governance_failure"
  | "indeterminate";

export type AdmissionGovernanceRole =
  | "admission_blocking_candidate"
  | "admission_relevant_non_blocking"
  | "recovery_relevant_only"
  | "diagnostic_only"
  | "unresolved";

export type AdmissionFindingSeverity =
  | "critical"
  | "major"
  | "moderate"
  | "minor"
  | "info";

export type AdmissionReasonCode =
  | "admitted_core_governance_passed"
  | "admission_with_observations"
  | "candidate_prefix_loss_detected"
  | "candidate_recoverable_inadequacy_deferred"
  | "candidate_recoverable_inadequacy_without_route"
  | "candidate_non_recoverable"
  | "completeness_contradictory_measurements"
  | "completeness_input_failed"
  | "completeness_input_unavailable"
  | "completeness_required_before_admission"
  | "completeness_structural_weakness_observed"
  | "decision_evaluator_failed"
  | "diagnostic_signal_attached"
  | "evidence_integrity_failed"
  | "evidence_integrity_unavailable"
  | "policy_unavailable"
  | "provenance_unavailable"
  | "realization_validation_failed"
  | "realization_validation_unavailable"
  | "recovery_route_available"
  | "recovery_route_unavailable"
  | "uncertainty_preservation_failed"
  | "uncertainty_preservation_indeterminate_non_blocking";

export interface SourceIdentity {
  sourceId: string;
  sourceHash: string;
  sourceLength: number;
}

export interface AdmissionIdentityInputComparison {
  sourceIdentity: SourceIdentity;
  parentIdentity: IdentitySnapshot;
  nativeIdentity: IdentitySnapshot;
  legacyIdentity: IdentitySnapshot | null;
  subsystemFingerprint: string;
  policyFingerprint: string;
  lineageRefs: string[];
  substantiveEquality: boolean;
  classification: IdentityComparisonClassification;
  reasonCode: string;
  artifactRefs: string[];
}

export interface ObservationProvenanceManifest {
  provenanceId: string;
  status: "available" | "unavailable";
  derivationKind: "direct_runtime" | "adapter_derived" | "unavailable";
  sourceBoundaryVersion: string | null;
  provenanceTier: string | null;
  dreamLanguage: string | null;
  evidenceRef: string;
}

export interface MemoryRealizationValidationResult {
  validationId: string;
  status: "pass" | "failed" | "unavailable";
  candidateHashStable: boolean;
  stableOrdering: boolean;
  unitIdentitiesAvailable: boolean;
  evidenceReferencesAvailable: boolean;
  structuralConflicts: string[];
  observations: string[];
  evidenceRef: string;
}

export interface EvidenceIntegrityAssessment {
  assessmentId: string;
  status: "pass" | "failed" | "unavailable";
  malformedSpanCount: number;
  missingSpanCount: number;
  outOfBoundsSpanCount: number;
  totalEvidenceSpanCount: number;
  evidenceRef: string;
  observations: string[];
}

export interface UncertaintyPreservationAssessment {
  assessmentId: string;
  status: "acceptable" | "indeterminate" | "failed" | "unavailable";
  evidenceRef: string;
  observations: string[];
}

export interface GovernanceObservation {
  signalId: string;
  note: string;
  evidenceRef: string;
}

export interface AdmissionPolicy {
  policyVersion: string;
  policyFingerprint: string;
  evaluatorVersion: string;
  admittedDispositions: readonly AdmissionDisposition[];
  failClosedOnMissingCompleteness: boolean;
  failClosedOnMissingProvenance: boolean;
  failClosedOnEvidenceIntegrityFailure: boolean;
  failClosedOnRealizationFailure: boolean;
  allowObservedAdmission: boolean;
  allowIndeterminateUncertainty: boolean;
  allowRecoveryDeferral: boolean;
  observationalTailCharThreshold: number;
  materialTailCharThreshold: number;
  materialTailCoverageRatioThreshold: number;
  shortSourceCriticalEndingCharThreshold: number;
}

export interface AdmissionRequest {
  sourceIdentity: SourceIdentity;
  canonicalCandidate: CanonicalMemoryCandidate;
  provenanceManifest: ObservationProvenanceManifest;
  completeness:
    | { status: "available"; reportId: string; report: CompletenessReport }
    | { status: "unavailable"; reportId: string | null; reason: AdmissionReasonCode; evidenceRef: string }
    | { status: "failed"; reportId: string | null; reason: AdmissionReasonCode; evidenceRef: string };
  memoryRealizationValidation: MemoryRealizationValidationResult;
  evidenceIntegrity: EvidenceIntegrityAssessment;
  uncertaintyPreservation: UncertaintyPreservationAssessment;
  admissionIdentityInputComparison: AdmissionIdentityInputComparison;
  governanceObservations: readonly GovernanceObservation[];
  contractFingerprint: string;
}

export interface AdmissionFinding {
  sourceSubsystem:
    | "memory_realization"
    | "completeness_analysis"
    | "provenance"
    | "evidence_integrity"
    | "uncertainty_preservation"
    | "authority_admission";
  signalId: string;
  governanceRole: AdmissionGovernanceRole;
  severity: AdmissionFindingSeverity;
  blocking: boolean;
  reasonCode: AdmissionReasonCode;
  evidenceRef: string;
  policyRuleId: string;
}

export interface AuthorityIdentity {
  authorityId: string;
  sourceId: string;
  canonicalCandidateId: string;
  candidateHash: string;
  policyFingerprint: string;
  shadowStatus: "inactive_non_authoritative";
}

export interface AdmissionAuditEnvelope {
  sourceHash: string;
  candidateHash: string;
  completenessReportId: string | null;
  provenanceId: string;
  realizationValidationId: string;
  evidenceIntegrityId: string;
  uncertaintyAssessmentId: string;
}

export interface AdmissionDecision {
  disposition: AdmissionDisposition;
  authorityIdentity: AuthorityIdentity | null;
  decisionReasons: readonly AdmissionReasonCode[];
  blockingFindings: readonly AdmissionFinding[];
  nonBlockingObservations: readonly AdmissionFinding[];
  requiredNextAction:
    | "none"
    | "persist_diagnostic_only"
    | "persist_provisional_only"
    | "request_supplemental_realization"
    | "stop_fail_closed"
    | "manual_review";
  persistenceEligibility:
    | "none"
    | "diagnostic_only"
    | "provisional_non_authoritative"
    | "authoritative";
  downstreamEligibility:
    | "none"
    | "non_authoritative_internal_only"
    | "authoritative";
  reusableCandidate: boolean;
  audit: AdmissionAuditEnvelope;
  policyFingerprint: string;
  contractFingerprint: string;
}

export type V2AuthorityOutcome =
  | "accepted_and_persisted"
  | "rejected"
  | "fallback"
  | "unavailable";

export type AdmissionComparisonClassification =
  | "equivalent_authority_outcome"
  | "v3_blocks_v2_accepts"
  | "v3_admits_v2_rejects"
  | "v3_defers_v2_accepts"
  | "semantically_incomparable"
  | "comparison_unavailable";

export interface AdmissionComparison {
  classification: AdmissionComparisonClassification;
  reasons: string[];
  candidateComparable: boolean;
}
