import { buildLlmSceneObservationExtraction, type LlmSceneObservationExtractionResult } from "@/src/cognition/observation/llm-scene-observation-extractor";
import { constructDerivedStructuresFromObservationBundle } from "@/src/cognition/observation/llm-derived-structure-constructor";
import {
  runObservationV3ShadowPipeline,
  type ObservationV3ShadowPipelineResult,
} from "@/src/cognition/observation-v3/pipeline";
import type { AdmissionDecision, AdmissionRequest } from "@/src/cognition/observation-v3/authority-admission";
import type { ObservationV3AuthorityRepository } from "@/src/domain/observation/contracts";
import type { ObservationNativeReadResolution } from "@/src/domain/observation/native-read";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";
import {
  createObservationV2WriteStore,
  type ObservationV2WriteStore,
} from "@/src/infrastructure/persistence/observation-v2-write-store";
import { createObservationV3Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v3-repository";
import { resolveObservationRuntimeAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-runtime-authority-mode";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

type ObservationGenerationStage = "generation" | "persistence";

interface AuthoritativeAdmissionPayload {
  request: AdmissionRequest;
  decision: AdmissionDecision;
}

export type GeneratedObservationForReflectiveObject =
  | {
      mode: "generated_v2";
      family: "v2";
      bundle: ObservationV2Bundle;
      diagnostics?: LlmSceneObservationExtractionResult["diagnostics"];
    }
  | {
      mode: "generated_v3";
      family: "v3";
      authorityRecord: ObservationV3AuthorityRecord;
      pipelineResult: ObservationV3ShadowPipelineResult;
    };

export type GenerateObservationForReflectiveObjectResult =
  | GeneratedObservationForReflectiveObject
  | {
      mode: "failed";
      family: "v2" | "v3";
      stage: ObservationGenerationStage;
      reason: string;
      pipelineResult?: ObservationV3ShadowPipelineResult;
    };

export type PersistGeneratedObservationForReflectiveObjectResult =
  | {
      mode: "persisted_v2";
      family: "v2";
      persistedBundle: ObservationV2Bundle;
      diagnostics?: LlmSceneObservationExtractionResult["diagnostics"];
    }
  | {
      mode: "persisted_v3";
      family: "v3";
      persistedAuthority: ObservationV3AuthorityRecord;
      pipelineResult: ObservationV3ShadowPipelineResult;
    }
  | {
      mode: "failed";
      family: "v2" | "v3";
      stage: "persistence";
      reason: string;
      pipelineResult?: ObservationV3ShadowPipelineResult;
    };

export interface GenerateObservationForReflectiveObjectInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  dreamText: string;
  observationResolution?: ObservationNativeReadResolution;
  generateV2Observation?: (input: {
    userId: string;
    reflectiveObjectId: string;
    dreamText: string;
  }) => Promise<LlmSceneObservationExtractionResult>;
  deriveV2ObservationStructures?: (bundle: ObservationV2Bundle) => Promise<ObservationV2Bundle>;
  runV3Pipeline?: (input: {
    userId: string;
    reflectiveObjectId: string;
    dreamText: string;
  }) => Promise<ObservationV3ShadowPipelineResult>;
  now?: () => string;
}

export interface PersistGeneratedObservationForReflectiveObjectInput {
  observation: GeneratedObservationForReflectiveObject;
  observationV2WriteStore?: ObservationV2WriteStore;
  observationV3Repository?: ObservationV3AuthorityRepository;
}

function isAuthoritativeDecision(decision: AdmissionDecision): boolean {
  return (
    (decision.disposition === "admitted" || decision.disposition === "admitted_with_observations")
    && decision.persistenceEligibility === "authoritative"
    && decision.authorityIdentity != null
  );
}

function findAuthoritativeAdmissionPayload(
  result: ObservationV3ShadowPipelineResult,
): AuthoritativeAdmissionPayload | null {
  const payload = result.stageResults.find((stage) => stage.stage === "authority_admission")?.payload;
  if (!payload) {
    return null;
  }

  const request = payload.request as AdmissionRequest | undefined;
  const decision = payload.decision as AdmissionDecision | undefined;
  if (!request || !decision) {
    return null;
  }

  return {
    request,
    decision,
  };
}

function buildObservationV3AuthorityRecord(input: {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  payload: AuthoritativeAdmissionPayload;
  now: string;
}): ObservationV3AuthorityRecord {
  const authorityIdentity = input.payload.decision.authorityIdentity;
  if (!authorityIdentity) {
    throw new Error("Observation V3 authority admission did not produce an authority identity.");
  }

  return {
    authorityId: authorityIdentity.authorityId,
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    sourceIdentity: input.payload.request.sourceIdentity,
    canonicalCandidate: input.payload.request.canonicalCandidate,
    provenanceManifest: input.payload.request.provenanceManifest,
    completeness: input.payload.request.completeness,
    memoryRealizationValidation: input.payload.request.memoryRealizationValidation,
    evidenceIntegrity: input.payload.request.evidenceIntegrity,
    uncertaintyPreservation: input.payload.request.uncertaintyPreservation,
    admissionIdentityInputComparison: input.payload.request.admissionIdentityInputComparison,
    governanceObservations: input.payload.request.governanceObservations,
    admissionDecision: input.payload.decision,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export async function generateObservationForReflectiveObject(
  input: GenerateObservationForReflectiveObjectInput,
): Promise<GenerateObservationForReflectiveObjectResult> {
  const resolution =
    input.observationResolution ??
    (resolveObservationRuntimeAuthorityMode() === "v3" ? "explicit_v3" : "explicit_v2");
  const generateV2Observation = input.generateV2Observation ?? buildLlmSceneObservationExtraction;
  const deriveV2ObservationStructures = input.deriveV2ObservationStructures ?? constructDerivedStructuresFromObservationBundle;
  const runV3Pipeline = input.runV3Pipeline ?? (async ({ userId, reflectiveObjectId, dreamText }) =>
    runObservationV3ShadowPipeline({
      userId,
      reflectiveObjectId,
      dreamText,
      liveProviderExecution: {},
    }));

  if (resolution === "explicit_v3") {
    const pipelineResult = await runV3Pipeline({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      dreamText: input.dreamText,
    });
    const admissionPayload = findAuthoritativeAdmissionPayload(pipelineResult);

    if (!admissionPayload) {
      return {
        mode: "failed",
        family: "v3",
        stage: "generation",
        reason: pipelineResult.summary.governanceDisposition ?? pipelineResult.summary.pipelineCompletionStatus,
        pipelineResult,
      };
    }

    if (!isAuthoritativeDecision(admissionPayload.decision)) {
      return {
        mode: "failed",
        family: "v3",
        stage: "generation",
        reason: admissionPayload.decision.disposition,
        pipelineResult,
      };
    }

    return {
      mode: "generated_v3",
      family: "v3",
      authorityRecord: buildObservationV3AuthorityRecord({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        payload: admissionPayload,
        now: input.now?.() ?? new Date().toISOString(),
      }),
      pipelineResult,
    };
  }

  const extraction = await generateV2Observation({
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    dreamText: input.dreamText,
  });

  if (extraction.mode !== "validated_llm" || !extraction.bundle) {
    return {
      mode: "failed",
      family: "v2",
      stage: "generation",
      reason: extraction.reason ?? "observation_v2_generation_failed",
    };
  }

  return {
    mode: "generated_v2",
    family: "v2",
    bundle: await deriveV2ObservationStructures(extraction.bundle),
    diagnostics: extraction.diagnostics,
  };
}

export async function persistGeneratedObservationForReflectiveObject(
  input: PersistGeneratedObservationForReflectiveObjectInput,
): Promise<PersistGeneratedObservationForReflectiveObjectResult> {
  if (input.observation.mode === "generated_v3") {
    const observationV3Repository = input.observationV3Repository ?? createObservationV3Repository();
    try {
      const persistedAuthority = await observationV3Repository.create(input.observation.authorityRecord);
      return {
        mode: "persisted_v3",
        family: "v3",
        persistedAuthority,
        pipelineResult: input.observation.pipelineResult,
      };
    } catch (error) {
      return {
        mode: "failed",
        family: "v3",
        stage: "persistence",
        reason: error instanceof Error ? error.message : "unknown_error",
        pipelineResult: input.observation.pipelineResult,
      };
    }
  }

  const observationV2WriteStore = input.observationV2WriteStore ?? createObservationV2WriteStore();
  try {
    const persistedBundle = await observationV2WriteStore.createFromBundle(input.observation.bundle);
    return {
      mode: "persisted_v2",
      family: "v2",
      persistedBundle,
      diagnostics: input.observation.diagnostics,
    };
  } catch (error) {
    return {
      mode: "failed",
      family: "v2",
      stage: "persistence",
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
}
