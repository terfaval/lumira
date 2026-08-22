import type {
  AdmissionDecision,
  AdmissionIdentityInputComparison,
  AdmissionRequest,
  EvidenceIntegrityAssessment,
  GovernanceObservation,
  MemoryRealizationValidationResult,
  ObservationProvenanceManifest,
  SourceIdentity,
  UncertaintyPreservationAssessment,
} from "@/src/cognition/observation-v3/authority-admission";
import type { CanonicalMemoryCandidate } from "@/src/cognition/observation-v3/memory-realization";
import type { ReflectiveObjectId, UserId, VersionedTimestamps } from "@/src/shared/types";

export interface ObservationV3AuthorityRecord extends VersionedTimestamps {
  authorityId: string;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  sourceIdentity: SourceIdentity;
  canonicalCandidate: CanonicalMemoryCandidate;
  provenanceManifest: ObservationProvenanceManifest;
  completeness: AdmissionRequest["completeness"];
  memoryRealizationValidation: MemoryRealizationValidationResult;
  evidenceIntegrity: EvidenceIntegrityAssessment;
  uncertaintyPreservation: UncertaintyPreservationAssessment;
  admissionIdentityInputComparison: AdmissionIdentityInputComparison;
  governanceObservations: readonly GovernanceObservation[];
  admissionDecision: AdmissionDecision;
}

function isAuthoritativeDisposition(disposition: AdmissionDecision["disposition"]): boolean {
  return disposition === "admitted" || disposition === "admitted_with_observations";
}

export function assertObservationV3AuthorityRecordCanPersist(record: ObservationV3AuthorityRecord): void {
  const { admissionDecision, canonicalCandidate, sourceIdentity } = record;
  const authorityIdentity = admissionDecision.authorityIdentity;

  if (
    !isAuthoritativeDisposition(admissionDecision.disposition)
    || !authorityIdentity
    || admissionDecision.persistenceEligibility !== "authoritative"
  ) {
    throw new Error("Observation V3 persistence accepts only authoritative admission decisions.");
  }

  if (record.authorityId !== authorityIdentity.authorityId) {
    throw new Error("Observation V3 persistence requires a stable authority identity.");
  }

  if (sourceIdentity.sourceId !== authorityIdentity.sourceId) {
    throw new Error("Observation V3 persistence requires authority/source identity alignment.");
  }

  if (canonicalCandidate.canonicalCandidateId !== authorityIdentity.canonicalCandidateId) {
    throw new Error("Observation V3 persistence requires canonical identity alignment.");
  }

  if (canonicalCandidate.canonicalHash !== authorityIdentity.candidateHash) {
    throw new Error("Observation V3 persistence requires canonical hash alignment.");
  }

  if (canonicalCandidate.sourceIdentity.sourceId !== sourceIdentity.sourceId
    || canonicalCandidate.sourceIdentity.sourceHash !== sourceIdentity.sourceHash
    || canonicalCandidate.sourceIdentity.sourceLength !== sourceIdentity.sourceLength) {
    throw new Error("Observation V3 persistence requires canonical/source provenance alignment.");
  }

  if (canonicalCandidate.provenance.provenanceId !== record.provenanceManifest.provenanceId) {
    throw new Error("Observation V3 persistence requires provenance identity alignment.");
  }

  if (record.admissionIdentityInputComparison.sourceIdentity.sourceId !== sourceIdentity.sourceId
    || record.admissionIdentityInputComparison.sourceIdentity.sourceHash !== sourceIdentity.sourceHash
    || record.admissionIdentityInputComparison.sourceIdentity.sourceLength !== sourceIdentity.sourceLength) {
    throw new Error("Observation V3 persistence requires admission/source identity alignment.");
  }

  if (record.admissionIdentityInputComparison.nativeIdentity.candidateId !== canonicalCandidate.canonicalCandidateId
    || record.admissionIdentityInputComparison.nativeIdentity.candidateHash !== canonicalCandidate.canonicalHash) {
    throw new Error("Observation V3 persistence requires admission/native identity alignment.");
  }

  if (admissionDecision.audit.sourceHash !== sourceIdentity.sourceHash
    || admissionDecision.audit.candidateHash !== canonicalCandidate.canonicalHash) {
    throw new Error("Observation V3 persistence requires audit hash alignment.");
  }

  if (admissionDecision.audit.provenanceId !== record.provenanceManifest.provenanceId) {
    throw new Error("Observation V3 persistence requires audit/provenance alignment.");
  }

  if (admissionDecision.audit.realizationValidationId !== record.memoryRealizationValidation.validationId) {
    throw new Error("Observation V3 persistence requires realization validation alignment.");
  }

  if (admissionDecision.audit.evidenceIntegrityId !== record.evidenceIntegrity.assessmentId) {
    throw new Error("Observation V3 persistence requires evidence integrity alignment.");
  }

  if (admissionDecision.audit.uncertaintyAssessmentId !== record.uncertaintyPreservation.assessmentId) {
    throw new Error("Observation V3 persistence requires uncertainty assessment alignment.");
  }

  if (record.completeness.status === "available" && admissionDecision.audit.completenessReportId !== record.completeness.reportId) {
    throw new Error("Observation V3 persistence requires completeness audit alignment.");
  }

  if (record.completeness.status !== "available" && admissionDecision.audit.completenessReportId !== record.completeness.reportId) {
    throw new Error("Observation V3 persistence requires completeness identifier alignment.");
  }

  if (admissionDecision.policyFingerprint !== authorityIdentity.policyFingerprint) {
    throw new Error("Observation V3 persistence requires policy fingerprint alignment.");
  }

  if (record.admissionIdentityInputComparison.policyFingerprint !== canonicalCandidate.provenance.realizationPolicyFingerprint) {
    throw new Error("Observation V3 persistence requires realization policy fingerprint alignment.");
  }
}
