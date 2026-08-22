import { describe, expect, it, vi } from "vitest";

import type {
  ObservationV2Repository,
  ObservationV3AuthorityRepository,
} from "@/src/domain/observation/contracts";
import type {
  NativeObservationReadResult,
  ObservationNativeReadRepository,
} from "@/src/domain/observation/native-read";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";

function createObservationV2Bundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "obj-1",
    userId: "user-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    scenes: [],
  };
}

function createObservationV3AuthorityRecord(): ObservationV3AuthorityRecord {
  return {
    authorityId: "authority-1",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 100,
    },
    canonicalCandidate: {
      canonicalCandidateId: "canonical-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 100,
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
          sourceLength: 100,
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
      evidenceRef: "provenance",
    },
    completeness: {
      status: "unavailable",
      reportId: null,
      reason: "completeness_input_unavailable",
      evidenceRef: "completeness",
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
      totalEvidenceSpanCount: 0,
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
        sourceLength: 100,
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
      subsystemFingerprint: "subsystem-1",
      policyFingerprint: "policy-1",
      lineageRefs: ["composed-1"],
      substantiveEquality: true,
      classification: "comparison_unavailable",
      reasonCode: "native_authority",
      artifactRefs: [],
    },
    governanceObservations: [],
    admissionDecision: {
      disposition: "admitted",
      authorityIdentity: {
        authorityId: "authority-1",
        sourceId: "source-1",
        canonicalCandidateId: "canonical-1",
        candidateHash: "canonical-hash-1",
        policyFingerprint: "policy-1",
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
      policyFingerprint: "policy-1",
      contractFingerprint: "contract-1",
    },
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  };
}

function createV2RepositoryMock(bundle: ObservationV2Bundle | null): ObservationV2Repository {
  return {
    create: vi.fn(),
    getByBundleId: vi.fn(),
    getByReflectiveObjectId: vi.fn().mockResolvedValue(bundle),
    archive: vi.fn(),
  };
}

function createV3RepositoryMock(record: ObservationV3AuthorityRecord | null): ObservationV3AuthorityRepository {
  return {
    create: vi.fn(),
    getByAuthorityId: vi.fn(),
    getByReflectiveObjectId: vi.fn().mockResolvedValue(record),
  };
}

describe("ObservationNativeReadStore", () => {
  it("resolves active V3 authority by default when both native families exist", async () => {
    const v2Repository = createV2RepositoryMock(createObservationV2Bundle());
    const v3Repository = createV3RepositoryMock(createObservationV3AuthorityRecord());
    const store = createObservationNativeReadStore({
      observationV2Repository: v2Repository,
      observationV3Repository: v3Repository,
    });

    const result = await store.getByReflectiveObjectId({
      reflectiveObjectId: "obj-1",
      userId: "user-1",
    });

    expect(result).toEqual<NativeObservationReadResult>({
      family: "v3",
      native: createObservationV3AuthorityRecord(),
    });
    expect(v3Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-1", "user-1");
    expect(v2Repository.getByReflectiveObjectId).not.toHaveBeenCalled();
  });

  it("falls back to V2 compatibility reads only when active V3 authority is unavailable", async () => {
    const v2Bundle = createObservationV2Bundle();
    const v2Repository = createV2RepositoryMock(v2Bundle);
    const v3Repository = createV3RepositoryMock(null);
    const store = createObservationNativeReadStore({
      observationV2Repository: v2Repository,
      observationV3Repository: v3Repository,
    });

    const result = await store.getByReflectiveObjectId({
      reflectiveObjectId: "obj-1",
      userId: "user-1",
    });

    expect(result).toEqual<NativeObservationReadResult>({
      family: "v2",
      native: v2Bundle,
    });
    expect(v3Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-1", "user-1");
    expect(v2Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-1", "user-1");
  });

  it("resolves native v3 explicitly without converting it into v2", async () => {
    const v2Repository = createV2RepositoryMock(createObservationV2Bundle());
    const v3Record = createObservationV3AuthorityRecord();
    const v3Repository = createV3RepositoryMock(v3Record);
    const store = createObservationNativeReadStore({
      observationV2Repository: v2Repository,
      observationV3Repository: v3Repository,
    });

    const result = await store.getByReflectiveObjectId({
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      resolution: "explicit_v3",
    });

    expect(result).toEqual<NativeObservationReadResult>({
      family: "v3",
      native: v3Record,
    });
    expect(v3Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-1", "user-1");
    expect(v2Repository.getByReflectiveObjectId).not.toHaveBeenCalled();
  });

  it("keeps ownership resolution scoped to the requested user", async () => {
    const v2Repository = createV2RepositoryMock(null);
    const v3Repository = createV3RepositoryMock(null);
    const store = createObservationNativeReadStore({
      observationV2Repository: v2Repository,
      observationV3Repository: v3Repository,
    });

    await store.getByReflectiveObjectId({
      reflectiveObjectId: "obj-2",
      userId: "user-2",
      resolution: "explicit_v3",
    });

    expect(v3Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-2", "user-2");
    expect(v2Repository.getByReflectiveObjectId).not.toHaveBeenCalled();
  });

  it("does not fall back to v2 when explicit v3 resolution returns null", async () => {
    const v2Repository = createV2RepositoryMock(createObservationV2Bundle());
    const v3Repository = createV3RepositoryMock(null);
    const store = createObservationNativeReadStore({
      observationV2Repository: v2Repository,
      observationV3Repository: v3Repository,
    });

    const result = await store.getByReflectiveObjectId({
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      resolution: "explicit_v3",
    });

    expect(result).toBeNull();
    expect(v3Repository.getByReflectiveObjectId).toHaveBeenCalledWith("obj-1", "user-1");
    expect(v2Repository.getByReflectiveObjectId).not.toHaveBeenCalled();
  });
});
