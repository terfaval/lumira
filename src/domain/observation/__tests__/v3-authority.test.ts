import { describe, expect, it } from "vitest";

import {
  assertObservationV3AuthorityRecordCanPersist,
  type ObservationV3AuthorityRecord,
} from "@/src/domain/observation/v3-authority";

function createAuthorityRecord(): ObservationV3AuthorityRecord {
  return {
    authorityId: "authority-1",
    userId: "user-1",
    reflectiveObjectId: "object-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 123,
    },
    canonicalCandidate: {
      canonicalCandidateId: "canonical-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 123,
      },
      composedCandidateIdentity: {
        composedCandidateId: "composed-1",
        composedCandidateHash: "composed-hash-1",
      },
      localities: [],
      descriptiveUnits: [],
      transitions: [],
      unresolvedAlternatives: [],
      uncertaintyRecords: [],
      provenance: {
        provenanceId: "provenance-1",
        sourceIdentity: {
          sourceId: "source-1",
          sourceHash: "source-hash-1",
          sourceLength: 123,
        },
        primaryRealizationRefs: [],
        supplementalRealizationPackageRefs: [],
        compositionResultRef: "composition-1",
        composedCandidateId: "composed-1",
        realizationPolicyVersion: "memory-realization-shadow-v1",
        realizationPolicyFingerprint: "memory-realization-shadow-v1",
      },
      canonicalHash: "canonical-hash-1",
    },
    provenanceManifest: {
      provenanceId: "provenance-1",
      status: "available",
      derivationKind: "adapter_derived",
      sourceBoundaryVersion: "memory-realization-shadow-v1",
      provenanceTier: "system_extract",
      dreamLanguage: null,
      evidenceRef: "canonical-provenance",
    },
    completeness: {
      status: "unavailable",
      reportId: null,
      reason: "completeness_input_unavailable",
      evidenceRef: "completeness-report.json",
    },
    memoryRealizationValidation: {
      validationId: "validation-1",
      status: "pass",
      candidateHashStable: true,
      stableOrdering: true,
      unitIdentitiesAvailable: true,
      evidenceReferencesAvailable: true,
      structuralConflicts: [],
      observations: [],
      evidenceRef: "validation",
    },
    evidenceIntegrity: {
      assessmentId: "integrity-1",
      status: "pass",
      malformedSpanCount: 0,
      missingSpanCount: 0,
      outOfBoundsSpanCount: 0,
      totalEvidenceSpanCount: 1,
      evidenceRef: "evidence",
      observations: [],
    },
    uncertaintyPreservation: {
      assessmentId: "uncertainty-1",
      status: "acceptable",
      evidenceRef: "uncertainty",
      observations: [],
    },
    admissionIdentityInputComparison: {
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 123,
      },
      parentIdentity: {
        candidateId: "composed-1",
        candidateHash: "composed-hash-1",
      },
      nativeIdentity: {
        candidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
      },
      compatibilityIdentity: null,
      legacyIdentity: null,
      subsystemFingerprint: "memory-realization-contract-v1",
      policyFingerprint: "memory-realization-shadow-v1",
      lineageRefs: ["composed-1", "provenance-1"],
      substantiveEquality: true,
      classification: "comparison_unavailable",
      reasonCode: "legacy_identity_unavailable",
      artifactRefs: ["canonical-memory-candidate"],
    },
    governanceObservations: [],
    admissionDecision: {
      disposition: "admitted",
      authorityIdentity: {
        authorityId: "authority-1",
        sourceId: "source-1",
        canonicalCandidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
        policyFingerprint: "admission-policy-fingerprint-v1",
        shadowStatus: "inactive_non_authoritative",
      },
      decisionReasons: ["admitted_core_governance_passed"],
      blockingFindings: [],
      nonBlockingObservations: [],
      requiredNextAction: "none",
      persistenceEligibility: "authoritative",
      downstreamEligibility: "authoritative",
      reusableCandidate: true,
      audit: {
        sourceHash: "source-hash-1",
        candidateHash: "canonical-hash-1",
        completenessReportId: null,
        provenanceId: "provenance-1",
        realizationValidationId: "validation-1",
        evidenceIntegrityId: "integrity-1",
        uncertaintyAssessmentId: "uncertainty-1",
      },
      policyFingerprint: "admission-policy-fingerprint-v1",
      contractFingerprint: "shadow-authority-admission-contract-v1",
    },
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  };
}

describe("assertObservationV3AuthorityRecordCanPersist", () => {
  it("accepts authoritative records when admission policy and realization-comparison fingerprints differ", () => {
    expect(() => assertObservationV3AuthorityRecordCanPersist(createAuthorityRecord())).not.toThrow();
  });
});
