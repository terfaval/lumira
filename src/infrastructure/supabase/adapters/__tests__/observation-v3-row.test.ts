import { describe, expect, it } from "vitest";

import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import {
  fromObservationV3AuthorityRow,
  toObservationV3AuthorityInsertRow,
  type ObservationV3AuthorityRow,
} from "@/src/infrastructure/supabase/adapters/observation-v3-row";

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
      localities: [
        {
          canonicalLocalityId: "locality-1",
          derivedFromLocalityIds: ["derived-locality-1"],
          order: 0,
          label: "stairs",
          sourceStart: 0,
          sourceEnd: 42,
          boundaryUncertainty: null,
          evidenceRefs: [
            {
              evidenceId: "evidence-1",
              sourceHash: "source-hash-1",
              snippet: "I was climbing the stairs.",
              spanStart: 0,
              spanEnd: 26,
              contextLabel: "locality",
            },
          ],
        },
      ],
      descriptiveUnits: [
        {
          canonicalUnitId: "unit-1",
          derivedFromUnitIds: ["derived-unit-1"],
          localityId: "locality-1",
          order: 0,
          statement: "I was climbing the stairs.",
          evidenceRefs: [
            {
              evidenceId: "evidence-1",
              sourceHash: "source-hash-1",
              snippet: "I was climbing the stairs.",
              spanStart: 0,
              spanEnd: 26,
              contextLabel: "unit",
            },
          ],
          uncertainty: null,
        },
      ],
      transitions: [],
      unresolvedAlternatives: [],
      uncertaintyRecords: [
        {
          canonicalUncertaintyId: "uncertainty-1",
          subjectType: "unit",
          subjectId: "unit-1",
          uncertaintyType: "statement_uncertainty",
          note: "The actor may be implied rather than explicit.",
        },
      ],
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
        adequacy: "adequate_with_observations",
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
          lateSectionSentenceUnits: 2,
          lateSectionObservationCount: 1,
          status: "thin",
        },
        endingRetention: {
          endingStart: 490,
          retained: true,
          status: "retained",
        },
        structuralAssessment: {
          sceneOrLocalityCount: 1,
          observationCount: 1,
          overmergeCueGroups: 0,
          repeatedSpanRealizationCount: 0,
          outOfOrderLocalityCount: 0,
          outOfOrderUnitCount: 0,
          weaknessSignals: ["thin_late_retention"],
        },
        recoveryRecommendation: {
          disposition: "not_required",
          targetedPhysicalGapIds: [],
          eligibility: "eligible",
          advisoryClass: "advisory",
          reasons: [],
        },
        metricDiscrepancies: [],
        diagnosticReasons: ["late_section_thin_trace"],
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
    governanceObservations: [
      {
        signalId: "gov-obs-1",
        note: "tail retained with bounded uncertainty",
        evidenceRef: "tail-evidence",
      },
    ],
    admissionDecision: {
      disposition: "admitted_with_observations",
      authorityIdentity: {
        authorityId: "authority-1",
        sourceId: "source-1",
        canonicalCandidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
        policyFingerprint: "policy-fingerprint-1",
        shadowStatus: "inactive_non_authoritative",
      },
      decisionReasons: ["admission_with_observations"],
      blockingFindings: [],
      nonBlockingObservations: [
        {
          sourceSubsystem: "authority_admission",
          signalId: "obs-1",
          governanceRole: "admission_relevant_non_blocking",
          severity: "minor",
          blocking: false,
          reasonCode: "diagnostic_signal_attached",
          evidenceRef: "tail-evidence",
          policyRuleId: "rule-1",
        },
      ],
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

describe("observation v3 row adapters", () => {
  it("maps a native v3 authority record into a persistence row", () => {
    const record = createObservationV3AuthorityRecord();

    const row = toObservationV3AuthorityInsertRow(record);

    expect(row.authority_id).toBe("authority-1");
    expect(row.canonical_candidate_id).toBe("canonical-1");
    expect(row.canonical_hash).toBe("canonical-hash-1");
    expect(row.source_id).toBe("source-1");
    expect(row.source_hash).toBe("source-hash-1");
    expect(row.admission_disposition).toBe("admitted_with_observations");
    expect(row.canonical_candidate).toEqual(record.canonicalCandidate);
    expect(row.admission_decision).toEqual(record.admissionDecision);
  });

  it("rehydrates a native v3 authority record from a persistence row", () => {
    const record = createObservationV3AuthorityRecord();
    const row: ObservationV3AuthorityRow = {
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
    };

    const rehydrated = fromObservationV3AuthorityRow(row);

    expect(rehydrated.authorityId).toBe("authority-1");
    expect(rehydrated.canonicalCandidate.canonicalHash).toBe("canonical-hash-1");
    expect(rehydrated.provenanceManifest.provenanceId).toBe("provenance-1");
    expect(rehydrated.admissionDecision.authorityIdentity?.authorityId).toBe("authority-1");
    expect(rehydrated.governanceObservations).toEqual(record.governanceObservations);
  });
});
