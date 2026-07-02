import {
  composeAnchorConstructorInputPacket,
  generateAnchorConstructorOutput,
  mapValidatedAnchorConstructorOutputToRepositoryInputs,
  parseAnchorConstructorOutput,
  validateAnchorConstructorOutput,
  type AnchorConstructorInputPacket,
  type AnchorConstructorLlmGenerationResult,
  type AnchorConstructorOutput,
  type AnchorRepositoryCreateMapping,
  type ValidatedAnchorConstructorOutput,
} from "@/src/cognition/anchor-v1/constructor";
import type { AnchorRepository } from "@/src/domain/anchor-v1/contracts";
import type { AnchorIdentity, AnchorManifestation, AnchorParticipation } from "@/src/domain/anchor-v1/types";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createAnchorRepository } from "@/src/infrastructure/supabase/repositories/create-anchor-repository";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

type GenerateStage = "input_packet" | "llm" | "parse" | "validation" | "mapping" | "persistence";

type CleanupSummary = {
  attempted: boolean;
  completed: boolean;
  resourceCount: number;
};

type AnchorConstructorGenerator = (input: {
  packet: AnchorConstructorInputPacket;
}) => Promise<AnchorConstructorLlmGenerationResult>;

export interface GenerateAnchorsForReflectiveObjectRepositories {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
  latentOpportunityRepository: LatentOpportunityRepository;
  anchorRepository: AnchorRepository;
}

export interface GenerateAnchorsForReflectiveObjectInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  repositories?: GenerateAnchorsForReflectiveObjectRepositories;
  composeInputPacket?: (input: {
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    reflectiveObjectRepository: ReflectiveObjectRepository;
    observationV2Repository: ObservationV2Repository;
    glossaryRepository: GlossaryRepository;
    latentOpportunityRepository: LatentOpportunityRepository;
  }) => Promise<AnchorConstructorInputPacket>;
  generateOutput?: AnchorConstructorGenerator;
}

export type GenerateAnchorsForReflectiveObjectResult =
  | {
      mode: "persisted";
      success: true;
      packet: AnchorConstructorInputPacket;
      rawOutput: string;
      parsedOutput: AnchorConstructorOutput;
      validatedOutput: ValidatedAnchorConstructorOutput;
      mappedPayload: AnchorRepositoryCreateMapping;
      persistedIdentities: AnchorIdentity[];
      persistedManifestations: AnchorManifestation[];
      persistedParticipations: AnchorParticipation[];
      identitiesCreated: number;
      manifestationsCreated: number;
      participationsCreated: number;
      anchorIds: string[];
    }
  | {
      mode: "no_anchor";
      success: true;
      packet: AnchorConstructorInputPacket;
      rawOutput: string;
      parsedOutput: AnchorConstructorOutput;
      validatedOutput: ValidatedAnchorConstructorOutput;
      identitiesCreated: 0;
      manifestationsCreated: 0;
      participationsCreated: 0;
      anchorIds: [];
    }
  | {
      mode: "failed";
      success: false;
      stage: GenerateStage;
      reason: string;
      details?: Record<string, unknown>;
      packet?: AnchorConstructorInputPacket;
      rawOutput?: string;
      parsedOutput?: AnchorConstructorOutput;
      validatedOutput?: ValidatedAnchorConstructorOutput;
      mappedPayload?: AnchorRepositoryCreateMapping;
      cleanup?: CleanupSummary;
    };

function defaultRepositories(): GenerateAnchorsForReflectiveObjectRepositories {
  return {
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    observationV2Repository: createObservationV2Repository(),
    glossaryRepository: createGlossaryRepository(),
    latentOpportunityRepository: createLatentOpportunityRepository(),
    anchorRepository: createAnchorRepository(),
  };
}

function readErrorReason(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : "unknown_error";
}

async function cleanupCreatedIdentities(input: {
  anchorIds: string[];
  userId: UserId;
  repository: AnchorRepository;
}): Promise<CleanupSummary> {
  if (input.anchorIds.length === 0) {
    return {
      attempted: false,
      completed: true,
      resourceCount: 0,
    };
  }

  let completed = true;
  for (const anchorId of [...input.anchorIds].reverse()) {
    try {
      await input.repository.deleteIdentity(anchorId, input.userId);
    } catch (error) {
      completed = false;
      console.error("anchor_orchestrator_cleanup_failed", {
        anchorId,
        userId: input.userId,
        error: readErrorReason(error),
      });
    }
  }

  return {
    attempted: true,
    completed,
    resourceCount: input.anchorIds.length,
  };
}

export async function generateAnchorsForReflectiveObject(
  input: GenerateAnchorsForReflectiveObjectInput,
): Promise<GenerateAnchorsForReflectiveObjectResult> {
  const repositories = input.repositories ?? defaultRepositories();
  const composeInputPacket =
    input.composeInputPacket ??
    ((args: Parameters<NonNullable<GenerateAnchorsForReflectiveObjectInput["composeInputPacket"]>>[0]) =>
      composeAnchorConstructorInputPacket(args));
  const generateOutput = input.generateOutput ?? generateAnchorConstructorOutput;

  let packet: AnchorConstructorInputPacket;
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
      success: false,
      stage: "input_packet",
      reason: readErrorReason(error),
    };
  }

  const generation = await generateOutput({ packet });
  if (generation.mode === "failed") {
    return {
      mode: "failed",
      success: false,
      stage: "llm",
      reason: generation.reason,
      details: generation.details,
      packet,
    };
  }

  const parsedOutput = parseAnchorConstructorOutput(generation.rawOutput);
  if (!parsedOutput) {
    return {
      mode: "failed",
      success: false,
      stage: "parse",
      reason: "invalid_output_packet",
      packet,
      rawOutput: generation.rawOutput,
    };
  }

  const validation = validateAnchorConstructorOutput({
    inputPacket: packet,
    outputPacket: parsedOutput,
  });
  if (!validation.ok) {
    return {
      mode: "failed",
      success: false,
      stage: "validation",
      reason: validation.reason,
      details: validation.details,
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
    };
  }

  if (validation.value.decision.mode === "no_anchor") {
    return {
      mode: "no_anchor",
      success: true,
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
      identitiesCreated: 0,
      manifestationsCreated: 0,
      participationsCreated: 0,
      anchorIds: [],
    };
  }

  let mapping: AnchorRepositoryCreateMapping;
  try {
    mapping = mapValidatedAnchorConstructorOutputToRepositoryInputs(validation.value);
  } catch (error) {
    return {
      mode: "failed",
      success: false,
      stage: "mapping",
      reason: readErrorReason(error),
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
    };
  }

  const persistedIdentities: AnchorIdentity[] = [];
  const persistedManifestations: AnchorManifestation[] = [];
  const persistedParticipations: AnchorParticipation[] = [];
  const createdAnchorIds: string[] = [];

  try {
    for (const createPlan of mapping.creates) {
      const createdIdentity = await repositories.anchorRepository.createIdentity(createPlan.identity.input);
      createdAnchorIds.push(createdIdentity.id);
      persistedIdentities.push(createdIdentity);

      const createdManifestation = await repositories.anchorRepository.createManifestation({
        ...createPlan.manifestation,
        anchorId: createdIdentity.id,
      });
      persistedManifestations.push(createdManifestation);

      for (const participation of createPlan.participations) {
        const createdParticipation = await repositories.anchorRepository.createParticipation({
          ...participation,
          anchorId: createdIdentity.id,
          anchorManifestationId: createdManifestation.id,
        });
        persistedParticipations.push(createdParticipation);
      }
    }
  } catch (error) {
    return {
      mode: "failed",
      success: false,
      stage: "persistence",
      reason: readErrorReason(error),
      packet,
      rawOutput: generation.rawOutput,
      parsedOutput,
      validatedOutput: validation.value,
      mappedPayload: mapping,
      cleanup: await cleanupCreatedIdentities({
        anchorIds: createdAnchorIds,
        userId: input.userId,
        repository: repositories.anchorRepository,
      }),
    };
  }

  return {
    mode: "persisted",
    success: true,
    packet,
    rawOutput: generation.rawOutput,
    parsedOutput,
    validatedOutput: validation.value,
    mappedPayload: mapping,
    persistedIdentities,
    persistedManifestations,
    persistedParticipations,
    identitiesCreated: persistedIdentities.length,
    manifestationsCreated: persistedManifestations.length,
    participationsCreated: persistedParticipations.length,
    anchorIds: persistedIdentities.map((identity) => identity.id),
  };
}
