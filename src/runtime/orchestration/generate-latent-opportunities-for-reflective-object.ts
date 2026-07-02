import {
  composeOpportunityConstructorInputPacket,
  generateOpportunityConstructorOutput,
  mapValidatedOpportunityConstructorOutputToRepositoryInputs,
  parseOpportunityConstructorOutput,
  validateOpportunityConstructorOutput,
  type OpportunityConstructorInputPacket,
  type OpportunityConstructorOutputPacket,
  type OpportunityRepositoryCreateMapping,
  type ValidatedOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityIdentity, LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
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
  repositories?: GenerateLatentOpportunitiesForReflectiveObjectRepositories;
  composeInputPacket?: (input: {
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    reflectiveObjectRepository: ReflectiveObjectRepository;
    observationV2Repository: ObservationV2Repository;
    glossaryRepository: GlossaryRepository;
    latentOpportunityRepository: LatentOpportunityRepository;
  }) => Promise<OpportunityConstructorInputPacket>;
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
      mode: "no_opportunity";
      packet: OpportunityConstructorInputPacket;
      rawOutput: string;
      parsedOutput: OpportunityConstructorOutputPacket;
      validatedOutput: ValidatedOpportunityConstructorOutput;
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
  const composeInputPacket =
    input.composeInputPacket ??
    ((args: Parameters<NonNullable<GenerateLatentOpportunitiesForReflectiveObjectInput["composeInputPacket"]>>[0]) =>
      composeOpportunityConstructorInputPacket(args));
  const generateOutput = input.generateOutput ?? generateOpportunityConstructorOutput;

  let packet: OpportunityConstructorInputPacket;
  try {
    packet = await composeInputPacket({
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      reflectiveObjectRepository: repositories.reflectiveObjectRepository,
      observationV2Repository: repositories.observationV2Repository,
      glossaryRepository: repositories.glossaryRepository,
      latentOpportunityRepository: repositories.latentOpportunityRepository,
    });
  } catch (error) {
    return {
      mode: "failed",
      stage: "input_packet",
      reason: readErrorReason(error),
    };
  }

  const generation = await generateOutput({ packet });
  if (generation.mode === "failed") {
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
    return {
      mode: "no_opportunity",
      packet,
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
  const createdResources: CleanupResource[] = [];

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
        identityId: resolvedIdentityId,
      });

      persistedManifestations.push(manifestation);
      createdResources.push({
        kind: "manifestation",
        id: manifestation.id,
      });
    }
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
