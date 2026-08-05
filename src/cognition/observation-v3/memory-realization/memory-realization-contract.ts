export const MEMORY_REALIZATION_SCHEMA_VERSION = "1";
export const MEMORY_REALIZATION_IMPLEMENTATION_VERSION = "1";
export const MEMORY_REALIZATION_CONTRACT_VERSION = MEMORY_REALIZATION_IMPLEMENTATION_VERSION;
import type {
  ComposedProvisionalMemoryCandidate,
  ComposedProvisionalMemoryCandidateIdentity,
  CompositionAlternative,
  EvidenceReference,
  SourceIdentity,
} from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";
export type {
  ComposedDescriptiveUnit,
  ComposedLocalityRecord,
  ComposedProvisionalMemoryCandidate,
  ComposedProvisionalMemoryCandidateIdentity,
  ComposedTransitionRecord,
  CompositionAlternative,
  EvidenceReference,
  MemoryCompositionProvenance,
  SourceIdentity,
} from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";

export interface MemoryRealizationRequest {
  requestId: string;
  sourceIdentity: SourceIdentity;
  composedCandidateIdentity: ComposedProvisionalMemoryCandidateIdentity;
  composedCandidate: ComposedProvisionalMemoryCandidate;
  compositionResultRef: string;
  realizationPolicyVersion: string;
  realizationPolicyFingerprint: string;
}

export interface CanonicalEvidenceReference extends EvidenceReference {
  evidenceId: string;
  sourceHash: string;
}

export interface CanonicalLocality {
  canonicalLocalityId: string;
  derivedFromLocalityIds: readonly string[];
  order: number;
  label: string | null;
  sourceStart: number | null;
  sourceEnd: number | null;
  boundaryUncertainty: string | null;
  evidenceRefs: readonly CanonicalEvidenceReference[];
}

export interface CanonicalDescriptiveUnit {
  canonicalUnitId: string;
  derivedFromUnitIds: readonly string[];
  localityId: string | null;
  order: number;
  statement: string;
  evidenceRefs: readonly CanonicalEvidenceReference[];
  uncertainty: string | null;
}

export interface CanonicalTransition {
  canonicalTransitionId: string;
  derivedFromTransitionIds: readonly string[];
  fromLocalityId: string | null;
  toLocalityId: string | null;
  order: number;
  statement: string | null;
  evidenceRefs: readonly CanonicalEvidenceReference[];
  uncertainty: string | null;
}

export interface CanonicalAlternative {
  canonicalAlternativeId: string;
  competingCanonicalUnitIds: readonly string[];
  reasonCode: CompositionAlternative["reasonCode"];
  evidenceRefs: readonly CanonicalEvidenceReference[];
}

export interface CanonicalUncertaintyRecord {
  canonicalUncertaintyId: string;
  subjectType: "bundle" | "locality" | "unit" | "transition" | "alternative";
  subjectId: string | null;
  uncertaintyType:
    | "statement_uncertainty"
    | "boundary_uncertainty"
    | "identity_uncertainty"
    | "transition_uncertainty"
    | "alternative_preserved"
    | "certainty_assessment_unavailable";
  note: string | null;
}

export interface CanonicalMemoryProvenance {
  provenanceId: string;
  sourceIdentity: SourceIdentity;
  primaryRealizationRefs: readonly string[];
  supplementalRealizationPackageRefs: readonly string[];
  compositionResultRef: string;
  composedCandidateId: string;
  realizationPolicyVersion: string;
  realizationPolicyFingerprint: string;
}

export interface CanonicalMemoryCandidate {
  canonicalCandidateId: string;
  sourceIdentity: SourceIdentity;
  composedCandidateIdentity: ComposedProvisionalMemoryCandidateIdentity;
  localities: readonly CanonicalLocality[];
  descriptiveUnits: readonly CanonicalDescriptiveUnit[];
  transitions: readonly CanonicalTransition[];
  unresolvedAlternatives: readonly CanonicalAlternative[];
  uncertaintyRecords: readonly CanonicalUncertaintyRecord[];
  provenance: CanonicalMemoryProvenance;
  canonicalHash: string;
}

export type ValidationDimensionStatus =
  | "pass"
  | "pass_with_observations"
  | "failed_candidate"
  | "failed_governance"
  | "indeterminate";

export interface ValidationDimension {
  status: ValidationDimensionStatus;
  evidenceRef: string;
  observations: readonly string[];
}

export interface MemoryRealizationFinding {
  dimension:
    | "schema"
    | "identity"
    | "ordering"
    | "evidence"
    | "provenance"
    | "uncertainty"
    | "alternatives";
  signalId: string;
  severity: "critical" | "major" | "moderate" | "minor" | "info";
  blocking: boolean;
  reasonCode: string;
  evidenceRef: string;
}

export type MemoryRealizationValidationStatus =
  | "valid"
  | "valid_with_observations"
  | "invalid_candidate"
  | "invalid_governance"
  | "indeterminate";

export interface MemoryRealizationValidation {
  validationId: string;
  status: MemoryRealizationValidationStatus;
  schemaValidation: ValidationDimension;
  identityValidation: ValidationDimension;
  orderingValidation: ValidationDimension;
  evidenceValidation: ValidationDimension;
  provenanceValidation: ValidationDimension;
  uncertaintyValidation: ValidationDimension;
  alternativeValidation: ValidationDimension;
  canonicalHashStable: boolean;
  candidateHashStable: boolean;
  stableOrdering: boolean;
  unitIdentitiesAvailable: boolean;
  evidenceReferencesAvailable: boolean;
  structuralConflicts: string[];
  observations: string[];
  evidenceRef: string;
  blockingFindings: readonly MemoryRealizationFinding[];
  nonBlockingObservations: readonly MemoryRealizationFinding[];
}

export interface MemoryRealizationDiagnostics {
  localityCount: number;
  unitCount: number;
  transitionCount: number;
  alternativeCount: number;
  uncertaintyCount: number;
  evidenceRefCount: number;
  normalizedOrderingApplied: boolean;
}

export interface MemoryRealizationFailure {
  code:
    | "candidate_unavailable"
    | "candidate_structurally_invalid"
    | "provenance_unavailable"
    | "evidence_invalid"
    | "identity_collision"
    | "policy_unavailable"
    | "hash_unavailable"
    | "realization_failed";
  message: string;
  evidenceRef: string | null;
}

export type MemoryRealizationDisposition =
  | "realized"
  | "realized_with_observations"
  | "aborted_candidate_failure"
  | "aborted_governance_failure"
  | "indeterminate";

export interface MemoryRealizationResult {
  disposition: MemoryRealizationDisposition;
  canonicalCandidate: CanonicalMemoryCandidate | null;
  validation: MemoryRealizationValidation;
  findings: readonly MemoryRealizationFinding[];
  diagnostics: MemoryRealizationDiagnostics;
  failures: readonly MemoryRealizationFailure[];
  realizationPolicyVersion: string;
  realizationPolicyFingerprint: string;
  contractFingerprint: string;
}

export type MemoryRealizationLegacyComparisonClassification =
  | "equivalent_canonical_candidate"
  | "representational_only"
  | "governance_information_gain"
  | "native_stricter"
  | "native_more_permissive"
  | "semantic_incompatibility"
  | "comparison_unavailable";

export interface MemoryRealizationLegacyComparison {
  classification: MemoryRealizationLegacyComparisonClassification;
  reasons: string[];
}
