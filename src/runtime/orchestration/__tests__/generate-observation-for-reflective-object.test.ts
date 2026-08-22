import { describe, expect, it, vi } from "vitest";

import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";
import type { NativeObservationReadResult } from "@/src/domain/observation/native-read";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import {
  generateObservationForReflectiveObject,
  persistGeneratedObservationForReflectiveObject,
} from "@/src/runtime/orchestration/generate-observation-for-reflective-object";

function createObservationV2Bundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "obj-1",
    userId: "user-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    uncertaintyNotes: [],
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "en",
    },
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
      descriptiveUnits: [
        {
          canonicalUnitId: "unit-1",
          derivedFromUnitIds: ["derived-unit-1"],
          localityId: null,
          order: 1,
          statement: "A figure remains present.",
          evidenceRefs: [
            {
              evidenceId: "evidence-1",
              sourceHash: "source-hash-1",
              snippet: "a figure remains present",
              spanStart: 0,
              spanEnd: 24,
              contextLabel: "quoted_support",
            },
          ],
          uncertainty: null,
        },
      ],
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
        realizationPolicyVersion: "observation-v3-shadow-pipeline-v1",
        realizationPolicyFingerprint: "observation-v3-shadow-pipeline-v1",
      },
      canonicalHash: "canonical-hash-1",
    },
    provenanceManifest: {
      provenanceId: "provenance-1",
      status: "available",
      derivationKind: "adapter_derived",
      sourceBoundaryVersion: "observation-v3-shadow-pipeline-v1",
      provenanceTier: "system_extract",
      dreamLanguage: null,
      evidenceRef: "canonical-provenance",
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
      contractFingerprint: "shadow-authority-admission-contract-v1",
    },
    createdAt: "2026-08-11T10:00:00.000Z",
    updatedAt: "2026-08-11T10:00:00.000Z",
  };
}

function createObservationV3PipelineResult(record: ObservationV3AuthorityRecord) {
  return {
    pipelineId: "pipeline-1",
    pipelineFingerprint: {
      pipelineVersion: "observation-v3-shadow-pipeline-v1",
      pipelineHash: "pipeline-hash-1",
    },
    stageResults: [
      {
        stage: "authority_admission",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: "native-admission-decision.json",
        adapterFingerprint: null,
        subsystemFingerprint: "subsystem-hash-1",
        inputHash: "input-hash-1",
        outputHash: "output-hash-1",
        skippedReason: null,
        startedAt: "2026-08-11T10:00:00.000Z",
        completedAt: "2026-08-11T10:00:01.000Z",
        latencyMs: 1000,
        payload: {
          request: {
            sourceIdentity: record.sourceIdentity,
            canonicalCandidate: record.canonicalCandidate,
            provenanceManifest: record.provenanceManifest,
            completeness: record.completeness,
            memoryRealizationValidation: record.memoryRealizationValidation,
            evidenceIntegrity: record.evidenceIntegrity,
            uncertaintyPreservation: record.uncertaintyPreservation,
            admissionIdentityInputComparison: record.admissionIdentityInputComparison,
            governanceObservations: record.governanceObservations,
            contractFingerprint: record.admissionDecision.contractFingerprint,
          },
          decision: record.admissionDecision,
          disposition: record.admissionDecision.disposition,
          authorityIdentity: record.admissionDecision.authorityIdentity,
          receivedCanonicalCandidateId: record.canonicalCandidate.canonicalCandidateId,
        },
        failure: null,
      },
    ],
    summary: {
      governanceDisposition: record.admissionDecision.disposition,
      finalOutcome: record.admissionDecision.disposition,
      pipelineCompletionStatus: "completed",
      skippedStages: [],
      startedAt: "2026-08-11T10:00:00.000Z",
      completedAt: "2026-08-11T10:00:02.000Z",
      totalLatencyMs: 2000,
    },
    failurePropagation: {
      failureSourceStage: null,
      skippedStages: [],
    },
    artifacts: {},
    subsystemFingerprints: {},
  } as const;
}

describe("generateObservationForReflectiveObject", () => {
  it("keeps V2 as the default capture generation and persistence path", async () => {
    const extractedBundle = createObservationV2Bundle();
    const persistedBundle = {
      ...createObservationV2Bundle(),
      bundleId: "bundle-persisted-1",
    };
    const createObservationV2Mock = vi.fn().mockResolvedValue(persistedBundle);

    const generated = await generateObservationForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "A dream",
      generateV2Observation: vi.fn().mockResolvedValue({
        mode: "validated_llm",
        bundle: extractedBundle,
      }),
      deriveV2ObservationStructures: vi.fn().mockResolvedValue(extractedBundle),
      runV3Pipeline: vi.fn(),
    });

    expect(generated).toEqual({
      mode: "generated_v2",
      family: "v2",
      bundle: extractedBundle,
      diagnostics: undefined,
    });

    if (generated.mode !== "generated_v2") {
      return;
    }

    await expect(
      persistGeneratedObservationForReflectiveObject({
        observation: generated,
        observationV2WriteStore: {
          createFromBundle: createObservationV2Mock,
        },
      }),
    ).resolves.toEqual({
      mode: "persisted_v2",
      family: "v2",
      persistedBundle,
      diagnostics: undefined,
    });
  });

  it("runs explicit V3 generation through admission and native V3 persistence without falling back to V2", async () => {
    const record = createObservationV3AuthorityRecord();
    const createObservationV3Mock = vi.fn().mockResolvedValue(record);
    const getByReflectiveObjectIdMock = vi.fn().mockResolvedValue(record);
    const v3PipelineResult = createObservationV3PipelineResult(record);

    const generated = await generateObservationForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "A dream",
      observationResolution: "explicit_v3",
      generateV2Observation: vi.fn(),
      deriveV2ObservationStructures: vi.fn(),
      runV3Pipeline: vi.fn().mockResolvedValue(v3PipelineResult),
      now: () => "2026-08-11T12:00:00.000Z",
    });

    expect(generated.mode).toBe("generated_v3");
    if (generated.mode !== "generated_v3") {
      return;
    }

    await expect(
      persistGeneratedObservationForReflectiveObject({
        observation: generated,
        observationV3Repository: {
          create: createObservationV3Mock,
          getByAuthorityId: vi.fn(),
          getByReflectiveObjectId: getByReflectiveObjectIdMock,
        },
      }),
    ).resolves.toEqual({
      mode: "persisted_v3",
      family: "v3",
      persistedAuthority: record,
      pipelineResult: v3PipelineResult,
    });

    expect(createObservationV3Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        authorityId: "authority-1",
        reflectiveObjectId: "obj-1",
        userId: "user-1",
      }),
    );

    const nativeReadStore = createObservationNativeReadStore({
      observationV2Repository: {
        create: vi.fn(),
        getByBundleId: vi.fn(),
        getByReflectiveObjectId: vi.fn().mockResolvedValue(null),
        archive: vi.fn(),
      },
      observationV3Repository: {
        create: createObservationV3Mock,
        getByAuthorityId: vi.fn(),
        getByReflectiveObjectId: getByReflectiveObjectIdMock,
      },
    });

    await expect(
      nativeReadStore.getByReflectiveObjectId({
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        resolution: "explicit_v3",
      }),
    ).resolves.toEqual({
      family: "v3",
      native: record,
    } satisfies NativeObservationReadResult);
  });

  it("does not persist authoritative V3 state or silently fall back to V2 when explicit V3 is non-authoritative", async () => {
    const record = createObservationV3AuthorityRecord();
    const nonAuthoritativeResult = createObservationV3PipelineResult({
      ...record,
      admissionDecision: {
        ...record.admissionDecision,
        disposition: "deferred_for_supplemental_realization",
        authorityIdentity: null,
        persistenceEligibility: "provisional_non_authoritative",
        downstreamEligibility: "non_authoritative_internal_only",
        requiredNextAction: "request_supplemental_realization",
      },
    });
    const createObservationV3Mock = vi.fn();
    const createObservationV2Mock = vi.fn();

    const result = await generateObservationForReflectiveObject({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      dreamText: "A dream",
      observationResolution: "explicit_v3",
      generateV2Observation: vi.fn(),
      deriveV2ObservationStructures: vi.fn(),
      runV3Pipeline: vi.fn().mockResolvedValue(nonAuthoritativeResult),
    });

    expect(result).toEqual({
      mode: "failed",
      family: "v3",
      stage: "generation",
      reason: "deferred_for_supplemental_realization",
      pipelineResult: nonAuthoritativeResult,
    });
    expect(createObservationV3Mock).not.toHaveBeenCalled();
    expect(createObservationV2Mock).not.toHaveBeenCalled();
  });
});
