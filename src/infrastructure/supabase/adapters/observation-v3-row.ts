import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";

export interface ObservationV3AuthorityRow {
  authority_id: string;
  user_id: string;
  reflective_object_id: string;
  canonical_candidate_id: string;
  canonical_hash: string;
  source_id: string;
  source_hash: string;
  source_length: number;
  admission_disposition: ObservationV3AuthorityRecord["admissionDecision"]["disposition"];
  policy_fingerprint: string;
  admission_contract_fingerprint: string;
  canonical_candidate: unknown;
  provenance_manifest: unknown;
  completeness_payload: unknown;
  memory_realization_validation: unknown;
  evidence_integrity: unknown;
  uncertainty_preservation: unknown;
  admission_identity_input_comparison: unknown;
  governance_observations: unknown;
  admission_decision: unknown;
  created_at: string;
  updated_at: string;
}

export interface ObservationV3AuthorityInsertRow {
  authority_id: string;
  user_id: string;
  reflective_object_id: string;
  canonical_candidate_id: string;
  canonical_hash: string;
  source_id: string;
  source_hash: string;
  source_length: number;
  admission_disposition: ObservationV3AuthorityRecord["admissionDecision"]["disposition"];
  policy_fingerprint: string;
  admission_contract_fingerprint: string;
  canonical_candidate: ObservationV3AuthorityRecord["canonicalCandidate"];
  provenance_manifest: ObservationV3AuthorityRecord["provenanceManifest"];
  completeness_payload: ObservationV3AuthorityRecord["completeness"];
  memory_realization_validation: ObservationV3AuthorityRecord["memoryRealizationValidation"];
  evidence_integrity: ObservationV3AuthorityRecord["evidenceIntegrity"];
  uncertainty_preservation: ObservationV3AuthorityRecord["uncertaintyPreservation"];
  admission_identity_input_comparison: ObservationV3AuthorityRecord["admissionIdentityInputComparison"];
  governance_observations: ObservationV3AuthorityRecord["governanceObservations"];
  admission_decision: ObservationV3AuthorityRecord["admissionDecision"];
}

export function toObservationV3AuthorityInsertRow(
  record: ObservationV3AuthorityRecord,
): ObservationV3AuthorityInsertRow {
  return {
    authority_id: record.authorityId,
    user_id: record.userId,
    reflective_object_id: record.reflectiveObjectId,
    canonical_candidate_id: record.canonicalCandidate.canonicalCandidateId,
    canonical_hash: record.canonicalCandidate.canonicalHash,
    source_id: record.sourceIdentity.sourceId,
    source_hash: record.sourceIdentity.sourceHash,
    source_length: record.sourceIdentity.sourceLength,
    admission_disposition: record.admissionDecision.disposition,
    policy_fingerprint: record.admissionDecision.policyFingerprint,
    admission_contract_fingerprint: record.admissionDecision.contractFingerprint,
    canonical_candidate: record.canonicalCandidate,
    provenance_manifest: record.provenanceManifest,
    completeness_payload: record.completeness,
    memory_realization_validation: record.memoryRealizationValidation,
    evidence_integrity: record.evidenceIntegrity,
    uncertainty_preservation: record.uncertaintyPreservation,
    admission_identity_input_comparison: record.admissionIdentityInputComparison,
    governance_observations: record.governanceObservations,
    admission_decision: record.admissionDecision,
  };
}

export function fromObservationV3AuthorityRow(row: ObservationV3AuthorityRow): ObservationV3AuthorityRecord {
  return {
    authorityId: row.authority_id,
    userId: row.user_id,
    reflectiveObjectId: row.reflective_object_id,
    sourceIdentity: {
      sourceId: row.source_id,
      sourceHash: row.source_hash,
      sourceLength: row.source_length,
    },
    canonicalCandidate: row.canonical_candidate as ObservationV3AuthorityRecord["canonicalCandidate"],
    provenanceManifest: row.provenance_manifest as ObservationV3AuthorityRecord["provenanceManifest"],
    completeness: row.completeness_payload as ObservationV3AuthorityRecord["completeness"],
    memoryRealizationValidation: row.memory_realization_validation as ObservationV3AuthorityRecord["memoryRealizationValidation"],
    evidenceIntegrity: row.evidence_integrity as ObservationV3AuthorityRecord["evidenceIntegrity"],
    uncertaintyPreservation: row.uncertainty_preservation as ObservationV3AuthorityRecord["uncertaintyPreservation"],
    admissionIdentityInputComparison:
      row.admission_identity_input_comparison as ObservationV3AuthorityRecord["admissionIdentityInputComparison"],
    governanceObservations: row.governance_observations as ObservationV3AuthorityRecord["governanceObservations"],
    admissionDecision: row.admission_decision as ObservationV3AuthorityRecord["admissionDecision"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
