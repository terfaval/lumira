import { describe, expect, it, vi } from "vitest";

import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import { SupabaseObservationV3Repository } from "@/src/infrastructure/supabase/repositories/observation-v3-supabase-repository";

function createObservationV3AuthorityRecord(): ObservationV3AuthorityRecord {
  return {
    authorityId: "authority-1",
    userId: "11111111-1111-1111-1111-111111111111",
    reflectiveObjectId: "22222222-2222-2222-2222-222222222222",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 512,
    },
    canonicalCandidate: {
      canonicalCandidateId: "canonical-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 512,
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
          sourceLength: 512,
        },
        primaryRealizationRefs: ["primary-1"],
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
      status: "available",
      reportId: "completeness-1",
      report: {
        schemaVersion: "1",
        analyzerVersion: "1",
        sourceIdentity: {
          sourceHash: "source-hash-1",
          sourceLength: 512,
        },
        candidateIdentity: {
          candidateKind: "composed_candidate",
          candidateHash: "canonical-hash-1",
        },
        status: "available",
        adequacy: "adequate",
        coverage: {
          largestCoveredSpanEnd: 512,
          coverageRatio: 1,
          uncoveredPrefix: null,
          uncoveredTail: null,
          internalUncoveredRegions: [],
          measurementAvailability: "full",
        },
        gaps: {
          gaps: [],
          canonicalGapCount: 0,
        },
        lateRetention: {
          lateSectionStart: 420,
          lateSectionSentenceUnits: 1,
          lateSectionObservationCount: 0,
          status: "not_applicable",
        },
        endingRetention: {
          endingStart: 500,
          retained: true,
          status: "retained",
        },
        structuralAssessment: {
          sceneOrLocalityCount: 0,
          observationCount: 0,
          overmergeCueGroups: 0,
          repeatedSpanRealizationCount: 0,
          outOfOrderLocalityCount: 0,
          outOfOrderUnitCount: 0,
          weaknessSignals: [],
        },
        recoveryRecommendation: {
          disposition: "not_required",
          targetedPhysicalGapIds: [],
          eligibility: "eligible",
          advisoryClass: "advisory",
          reasons: [],
        },
        metricDiscrepancies: [],
        diagnosticReasons: [],
      },
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
      evidenceRef: "validation-evidence",
    },
    evidenceIntegrity: {
      assessmentId: "evidence-integrity-1",
      status: "pass",
      malformedSpanCount: 0,
      missingSpanCount: 0,
      outOfBoundsSpanCount: 0,
      totalEvidenceSpanCount: 1,
      evidenceRef: "canonicalCandidate.evidence",
      observations: [],
    },
    uncertaintyPreservation: {
      assessmentId: "uncertainty-1",
      status: "acceptable",
      evidenceRef: "canonicalCandidate.uncertaintyRecords",
      observations: [],
    },
    admissionIdentityInputComparison: {
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 512,
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
      subsystemFingerprint: "subsystem-fingerprint-1",
      policyFingerprint: "policy-fingerprint-1",
      lineageRefs: ["composed-1", "provenance-1"],
      substantiveEquality: true,
      classification: "comparison_unavailable",
      reasonCode: "native_v3_authority",
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
        policyFingerprint: "policy-fingerprint-1",
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
        completenessReportId: "completeness-1",
        provenanceId: "provenance-1",
        realizationValidationId: "validation-1",
        evidenceIntegrityId: "evidence-integrity-1",
        uncertaintyAssessmentId: "uncertainty-1",
      },
      policyFingerprint: "policy-fingerprint-1",
      contractFingerprint: "contract-fingerprint-1",
    },
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  };
}

describe("SupabaseObservationV3Repository", () => {
  it("writes an admitted native v3 authority record and rehydrates it", async () => {
    const record = createObservationV3AuthorityRecord();
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
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
            created_at: record.createdAt,
            updated_at: record.updatedAt,
          },
          error: null,
        }),
      }),
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
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
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      },
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table !== "observation_v3_authorities") {
        return {};
      }

      return {
        insert,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle,
            }),
          }),
        }),
      };
    });

    const repository = new SupabaseObservationV3Repository({ from } as never);
    const stored = await repository.create(record);

    expect(insert).toHaveBeenCalled();
    expect(stored.authorityId).toBe("authority-1");
    expect(stored.canonicalCandidate.canonicalCandidateId).toBe("canonical-1");
  });

  it("loads a native v3 authority record by reflective object id", async () => {
    const record = createObservationV3AuthorityRecord();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
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
        created_at: record.createdAt,
        updated_at: record.updatedAt,
      },
      error: null,
    });

    const from = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle,
          }),
        }),
      }),
    }));

    const repository = new SupabaseObservationV3Repository({ from } as never);
    const loaded = await repository.getByReflectiveObjectId(record.reflectiveObjectId, record.userId);

    expect(loaded?.authorityId).toBe("authority-1");
    expect(loaded?.reflectiveObjectId).toBe(record.reflectiveObjectId);
  });

  it("rejects non-authoritative admission decisions before persistence", async () => {
    const record = createObservationV3AuthorityRecord();
    const from = vi.fn();
    const repository = new SupabaseObservationV3Repository({ from } as never);

    await expect(
      repository.create({
        ...record,
        admissionDecision: {
          ...record.admissionDecision,
          disposition: "deferred_for_supplemental_realization",
          authorityIdentity: null,
          persistenceEligibility: "provisional_non_authoritative",
          downstreamEligibility: "non_authoritative_internal_only",
          requiredNextAction: "request_supplemental_realization",
        },
      }),
    ).rejects.toThrow("Observation V3 persistence accepts only authoritative admission decisions.");

    expect(from).not.toHaveBeenCalled();
  });
});
