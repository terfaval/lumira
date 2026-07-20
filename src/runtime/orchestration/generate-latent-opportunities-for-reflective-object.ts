import {
  composeOpportunityConstructorInputPacket,
  composeOpportunityConstructorInputPacketWithProvenance,
  buildAuthorityFingerprint,
  captureExecutionProvenance,
  generateOpportunityConstructorOutput,
  mapValidatedOpportunityConstructorOutputToRepositoryInputs,
  parseOpportunityConstructorOutput,
  validateOpportunityConstructorOutput,
  type ComposedOpportunityConstructorInput,
  type LatentAuthorityProvenance,
  type LatentContextProvenance,
  type LatentExecutionProvenance,
  type OpportunityConstructorInputPacket,
  type OpportunityConstructorOutputPacket,
  type OpportunityRepositoryCreateMapping,
  type ValidatedOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type {
  LatentGenerationRun,
  LatentOpportunityIdentity,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

type GenerateStage = "input_packet" | "llm" | "parse" | "validation" | "mapping" | "persistence";

type CleanupResource =
  | {
      kind: "generation_run";
      id: string;
    }
  | {
      kind: "identity";
      id: string;
    }
  | {
      kind: "manifestation";
      id: string;
    };

type CleanupSummary = {
  attempted: boolean;
  completed: boolean;
  resourceCount: number;
};

type OpportunityConstructorGenerator = typeof generateOpportunityConstructorOutput;

export interface GenerateLatentOpportunitiesForReflectiveObjectRepositories {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
  latentOpportunityRepository: LatentOpportunityRepository;
}

export interface GenerateLatentOpportunitiesForReflectiveObjectInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  acceptedRunReuseGuard?: "evaluate" | "skip";
  repositories?: GenerateLatentOpportunitiesForReflectiveObjectRepositories;
  composeInputPacket?: (input: {
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    reflectiveObjectRepository: ReflectiveObjectRepository;
    observationV2Repository: ObservationV2Repository;
    glossaryRepository: GlossaryRepository;
    latentOpportunityRepository: LatentOpportunityRepository;
  }) => Promise<OpportunityConstructorInputPacket | ComposedOpportunityConstructorInput>;
  generateOutput?: OpportunityConstructorGenerator;
}

export type GenerateLatentOpportunitiesForReflectiveObjectResult =
  | {
      mode: "persisted";
      packet: OpportunityConstructorInputPacket;
      rawOutput: string;
      parsedOutput: OpportunityConstructorOutputPacket;
      validatedOutput: ValidatedOpportunityConstructorOutput;
      mappedPayload: OpportunityRepositoryCreateMapping;
      persistedIdentities: LatentOpportunityIdentity[];
      persistedManifestations: LatentOpportunityManifestation[];
    }
  | {
      mode: "empty";
      packet: OpportunityConstructorInputPacket;
      generationRunId: string;
      source: "new_assessment" | "existing_assessment";
      rawOutput?: string;
      parsedOutput?: OpportunityConstructorOutputPacket;
      validatedOutput?: ValidatedOpportunityConstructorOutput;
    }
  | {
      mode: "failed";
      stage: GenerateStage;
      reason: string;
      details?: Record<string, unknown>;
      packet?: OpportunityConstructorInputPacket;
      rawOutput?: string;
      parsedOutput?: OpportunityConstructorOutputPacket;
      validatedOutput?: ValidatedOpportunityConstructorOutput;
      mappedPayload?: OpportunityRepositoryCreateMapping;
      cleanup?: CleanupSummary;
    };

function defaultRepositories(): GenerateLatentOpportunitiesForReflectiveObjectRepositories {
  return {
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    observationV2Repository: createObservationV2Repository(),
    glossaryRepository: createGlossaryRepository(),
    latentOpportunityRepository: createLatentOpportunityRepository(),
  };
}

function readErrorReason(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : "unknown_error";
}

function buildInputFingerprint(packet: OpportunityConstructorInputPacket): string {
  return JSON.stringify({
    runtimeVersion: packet.generationContext.runtimeVersion,
    priorityReflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
    observationBundleId: packet.generationContext.observationBundleId,
    objectLanguage: packet.generationContext.objectLanguage,
    semanticPolicyResult: packet.generationContext.semanticPolicyResult,
    bundleUncertaintyNotes: packet.generationContext.bundleUncertaintyNotes,
    sceneIds: packet.scenes.map((scene) => scene.sceneStableId),
    observationIds: packet.observations.map((observation) => observation.observationV2SceneObservationId),
    confirmedGlossaryTermIds: packet.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId),
    reflectionIds: packet.reflectionContext?.reflections?.map((reflection) => reflection.reflectionId) ?? [],
    existingOpportunityIdentityIds: packet.existingOpportunityContext.identities.map((identity) => identity.identityId),
  });
}

async function cleanupCreatedResources(input: {
  resources: CleanupResource[];
  userId: UserId;
  repository: LatentOpportunityRepository;
}): Promise<CleanupSummary> {
  if (input.resources.length === 0) {
    return {
      attempted: false,
      completed: true,
      resourceCount: 0,
    };
  }

  let completed = true;
  for (const resource of [...input.resources].reverse()) {
    try {
      if (resource.kind === "manifestation") {
        await input.repository.deleteManifestation(resource.id, input.userId);
      } else if (resource.kind === "generation_run") {
        await input.repository.deleteGenerationRun(resource.id, input.userId);
      } else {
        await input.repository.deleteIdentity(resource.id, input.userId);
      }
    } catch (error) {
      completed = false;
      console.error("latent_opportunity_orchestrator_cleanup_failed", {
        resourceKind: resource.kind,
        resourceId: resource.id,
        userId: input.userId,
        error: readErrorReason(error),
      });
    }
  }

  return {
    attempted: true,
    completed,
    resourceCount: input.resources.length,
  };
}

export async function generateLatentOpportunitiesForReflectiveObject(
  input: GenerateLatentOpportunitiesForReflectiveObjectInput,
): Promise<GenerateLatentOpportunitiesForReflectiveObjectResult> {
  const repositories = input.repositories ?? defaultRepositories();
  const acceptedRunReuseGuard = input.acceptedRunReuseGuard ?? "evaluate";
  const composeInputPacket =
    input.composeInputPacket ??
    ((args: Parameters<NonNullable<GenerateLatentOpportunitiesForReflectiveObjectInput["composeInputPacket"]>>[0]) =>
      composeOpportunityConstructorInputPacketWithProvenance(args));
  const generateOutput = input.generateOutput ?? generateOpportunityConstructorOutput;

  let packet: OpportunityConstructorInputPacket;
  let authorityProvenance: LatentAuthorityProvenance | null = null;
  let contextProvenance: LatentContextProvenance | null = null;
  try {
    const composed = await composeInputPacket({
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      reflectiveObjectRepository: repositories.reflectiveObjectRepository,
      observationV2Repository: repositories.observationV2Repository,
      glossaryRepository: repositories.glossaryRepository,
      latentOpportunityRepository: repositories.latentOpportunityRepository,
    });
    if ("packet" in composed) {
      packet = composed.packet;
      authorityProvenance = composed.authorityProvenance;
      contextProvenance = composed.contextProvenance;
    } else {
      packet = composed;
    }
  } catch (error) {
    return {
      mode: "failed",
      stage: "input_packet",
      reason: readErrorReason(error),
    };
  }

  if (acceptedRunReuseGuard === "evaluate") {
    const existingCurrentRun =
      await repositories.latentOpportunityRepository.getCurrentGenerationRunForReflectiveObject(
        input.priorityReflectiveObjectId,
        input.userId,
      );
    if (existingCurrentRun) {
      return {
        mode: "failed",
        stage: "persistence",
        reason: "current_generation_run_exists",
        packet,
      };
    }

    const historicalRuns = await repositories.latentOpportunityRepository.listGenerationRunsForReflectiveObject(
      input.priorityReflectiveObjectId,
      input.userId,
    );
    const latestRun = historicalRuns[0] ?? null;
    if (latestRun?.status === "empty") {
      return {
        mode: "empty",
        packet,
        generationRunId: latestRun.id,
        source: "existing_assessment",
      };
    }
  }

  const inputFingerprint = buildInputFingerprint(packet);
  const executionProvenance: LatentExecutionProvenance = captureExecutionProvenance(packet);
  const authorityFingerprint = authorityProvenance ? buildAuthorityFingerprint(authorityProvenance) : null;
  let generationRun: LatentGenerationRun;
  try {
    generationRun = await repositories.latentOpportunityRepository.createGenerationRun({
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      status: "pending",
      inputFingerprint,
      authorityFingerprint,
      authorityProvenance,
      contextProvenance,
      executionProvenance,
      triggerReason: null,
      predecessorRunId: null,
    });
  } catch (error) {
    return {
      mode: "failed",
      stage: "persistence",
      reason: readErrorReason(error),
      packet,
    };
  }

  const generation = await generateOutput({ packet });
  if (generation.mode === "failed") {
    await repositories.latentOpportunityRepository
      .markGenerationRunFailed(generationRun.id, input.userId)
      .catch(() => undefined);
    return {
      mode: "failed",
      stage: "llm",
      reason: generation.reason,
      details: generation.details,
      packet,
    };
  }

  const parsedOutput = parseOpportunityConstructorOutput(generation.rawOutput);
  if (!parsedOutput) {
    await repositories.latentOpportunityRepository
      .markGenerationRunRejected(generationRun.id, input.userId)
      .catch(() => undefined);
    return {
      mode: "failed",
      stage: "parse",
      reason: "invalid_output_packet",
      packet,
      rawOutput: generation.rawOutput,
    };
  }

  const validation = validateOpportunityConstructorOutput({
    inputPacket: packet,
    outputPacket: parsedOutput,
  });
  if (!validation.ok) {
    await repositories.latentOpportunityRepository
      .markGenerationRunRejected(generationRun.id, input.userId)
      .catch(() => undefined);
    return {
      mode: "failed",
      stage: "validation",
      reason: validation.reason,
      details: validation.details,
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
    };
  }

  if (validation.value.decision.mode === "no_opportunity") {
    await repositories.latentOpportunityRepository
      .markGenerationRunEmpty(generationRun.id, input.userId)
      .catch(() => undefined);
    return {
      mode: "empty",
      packet,
      generationRunId: generationRun.id,
      source: "new_assessment",
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
    };
  }

  let mapping: OpportunityRepositoryCreateMapping;
  try {
    mapping = mapValidatedOpportunityConstructorOutputToRepositoryInputs(validation.value);
  } catch (error) {
    return {
      mode: "failed",
      stage: "mapping",
      reason: readErrorReason(error),
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
    };
  }

  const persistedIdentities: LatentOpportunityIdentity[] = [];
  const persistedManifestations: LatentOpportunityManifestation[] = [];
  const createdResources: CleanupResource[] = [
    {
      kind: "generation_run",
      id: generationRun.id,
    },
  ];

  try {
    for (const createPlan of mapping.creates) {
      let resolvedIdentityId = createPlan.manifestation.identityId;

      if (createPlan.identity.mode === "create_new") {
        const createdIdentity: LatentOpportunityIdentity = await repositories.latentOpportunityRepository.createIdentity(
          createPlan.identity.input,
        );
        resolvedIdentityId = createdIdentity.id;
        persistedIdentities.push(createdIdentity);
        createdResources.push({
          kind: "identity",
          id: createdIdentity.id,
        });
      }

      const manifestation = await repositories.latentOpportunityRepository.createManifestation({
        ...createPlan.manifestation,
        generationRunId: generationRun.id,
        identityId: resolvedIdentityId,
      });

      persistedManifestations.push(manifestation);
      createdResources.push({
        kind: "manifestation",
        id: manifestation.id,
      });
    }

    await repositories.latentOpportunityRepository.markGenerationRunCurrent(generationRun.id, input.userId);
  } catch (error) {
    return {
      mode: "failed",
      stage: "persistence",
      reason: readErrorReason(error),
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
      mappedPayload: mapping,
      cleanup: await cleanupCreatedResources({
        resources: createdResources,
        userId: input.userId,
        repository: repositories.latentOpportunityRepository,
      }),
    };
  }

  return {
    mode: "persisted",
    packet,
    rawOutput: generation.rawOutput,
    parsedOutput,
    validatedOutput: validation.value,
    mappedPayload: mapping,
    persistedIdentities,
    persistedManifestations,
  };
}
