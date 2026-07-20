import { buildLatentSnapshotScaffold } from "@/src/cognition/latent/latent-engine";
import { generateOpeningV2CreateInputFromManifestation } from "@/src/cognition/openings/opening-v2-constructor";
import { applyOpeningCadencePolicy } from "@/src/cognition/openings/opening-cadence-policy";
import { deriveOpeningCandidatesFromLatent } from "@/src/cognition/openings/derive-opening-candidates-from-latent";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentRepository } from "@/src/domain/latent/contracts";
import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation, LatentOpportunitySalienceBand } from "@/src/domain/latent-v2/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { OpeningCandidate, OpeningTone, OpeningType } from "@/src/domain/openings/types";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { generateLatentOpportunitiesForReflectiveObject } from "@/src/runtime/orchestration/generate-latent-opportunities-for-reflective-object";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const SNAPSHOT_OBSERVATION_WINDOW = 24;
const RECENT_OPENINGS_LIMIT = 40;
const RECENT_SNAPSHOTS_LIMIT = 20;
const RECENT_RESPONSES_LIMIT = 80;
const LATENT_V2_OPENING_LIMIT = 3;
const OPENING_INVOCATION_BOUNDARY = "expand_opening_surface";
const LATENT_V2_OPENING_CONTEXT = "latent_v2_convergence_bridge";

interface ReflectionPreparationRepositories {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationRepository: ObservationRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
  threadRepository: ThreadRepository;
  responseRepository: ReflectiveResponseRepository;
  openingRepository: OpeningRepository;
  latentRepository: LatentRepository;
  latentOpportunityRepository: LatentOpportunityRepository;
}

export interface PrepareLatentOpeningForReflectionInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  repositories?: Partial<ReflectionPreparationRepositories>;
}

function resolveRepositories(
  repositories: Partial<ReflectionPreparationRepositories> = {},
): ReflectionPreparationRepositories {
  return {
    reflectiveObjectRepository: repositories.reflectiveObjectRepository ?? createReflectiveObjectRepository(),
    observationRepository: repositories.observationRepository ?? createObservationRepository(),
    observationV2Repository: repositories.observationV2Repository ?? createObservationV2Repository(),
    glossaryRepository: repositories.glossaryRepository ?? createGlossaryRepository(),
    threadRepository: repositories.threadRepository ?? createThreadRepository(),
    responseRepository: repositories.responseRepository ?? createResponseRepository(),
    openingRepository: repositories.openingRepository ?? createOpeningRepository(),
    latentRepository: repositories.latentRepository ?? createLatentRepository(),
    latentOpportunityRepository: repositories.latentOpportunityRepository ?? createLatentOpportunityRepository(),
  };
}

function findReusableLatentSnapshotForObject(
  snapshots: LatentSnapshot[],
  reflectiveObjectId: ReflectiveObjectId,
): LatentSnapshot | null {
  return snapshots.find((snapshot) => snapshot.provenance.sourceReflectiveObjects.includes(reflectiveObjectId)) ?? null;
}

function toUniqueStrings(values: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();

  for (const value of values) {
    if (!value) {
      continue;
    }

    unique.add(value);
  }

  return [...unique];
}

function toOpeningTypeFromManifestation(manifestation: LatentOpportunityManifestation): OpeningType {
  switch (manifestation.primaryCategory) {
    case "continuity":
    case "pattern":
    case "unresolved_pattern":
      return "continuity_noticing";
    case "ambiguity":
    case "contradiction":
    case "curiosity":
    case "gap":
      return "reflective_question";
    default:
      return "atmospheric_reflection";
  }
}

function toToneFromManifestation(salienceBand: LatentOpportunitySalienceBand): OpeningTone {
  switch (salienceBand) {
    case "high":
      return "curious";
    case "moderate":
      return "gentle";
    default:
      return "spacious";
  }
}

function toConfidenceBandFromManifestation(salienceBand: LatentOpportunitySalienceBand): "low" | "tentative" | "moderate" {
  switch (salienceBand) {
    case "high":
      return "moderate";
    case "moderate":
      return "tentative";
    default:
      return "low";
  }
}

function toCompatibilityUtterance(manifestation: LatentOpportunityManifestation): string {
  switch (manifestation.primaryCategory) {
    case "continuity":
    case "pattern":
    case "unresolved_pattern":
      return "A recurring thread may be worth noticing here.";
    case "ambiguity":
    case "contradiction":
    case "curiosity":
    case "gap":
      return "A gentle question may be worth keeping open here.";
    case "relationship":
      return "A nearby connection may be worth noticing here.";
    case "transition":
    case "transformation":
    case "reversal":
    case "tension":
      return "A nearby shift may be worth noticing here.";
    default:
      return "Something here may be worth revisiting gently.";
  }
}

function readReflectiveObjectLanguage(reflectiveObject: { metadata: Record<string, unknown> }): string {
  const objectLanguage = reflectiveObject.metadata.objectLanguage;
  if (objectLanguage === "hu" || objectLanguage === "en") {
    return objectLanguage;
  }

  const language = reflectiveObject.metadata.language;
  if (language === "hu" || language === "en") {
    return language;
  }

  return "unknown";
}

function toCompatibilityOpeningCandidate(
  manifestation: LatentOpportunityManifestation,
): OpeningCandidate {
  return {
    userId: manifestation.userId,
    openingType: toOpeningTypeFromManifestation(manifestation),
    tone: toToneFromManifestation(manifestation.salienceBand),
    utterance: toCompatibilityUtterance(manifestation),
    visibility: "invitation_surface",
    provenance: {
      sourceObjects: toUniqueStrings([
        manifestation.priorityReflectiveObjectId,
        ...manifestation.evidenceBlocks.map((block) => block.reflectiveObjectId),
      ]),
      sourceObservations: toUniqueStrings(
        manifestation.evidenceBlocks.flatMap((block) =>
          block.observations.map((observation) => observation.observationV2SceneObservationId),
        ),
      ),
      sourceGlossaryTerms: toUniqueStrings(manifestation.glossaryLinks.map((link) => link.glossaryTermId)),
      sourceThreads: [],
      sourceResponses: [],
      latentSnapshotReference: null,
      confidenceBand: toConfidenceBandFromManifestation(manifestation.salienceBand),
      // Temporary convergence bridge: current opening surfaces still expect Opening rows,
      // so we hand off only bounded invitation metadata, not raw Latent V2 internals.
      openingGenerationContext: LATENT_V2_OPENING_CONTEXT,
      sourceOpportunityManifestationId: manifestation.id,
    },
  };
}

async function deriveOpeningCandidatesFromLatentV2Manifestations(
  manifestations: LatentOpportunityManifestation[],
  objectLanguage: string,
): Promise<OpeningCandidate[]> {
  const sortedManifestations = [...manifestations]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, LATENT_V2_OPENING_LIMIT);

  const generated = await Promise.all(
    sortedManifestations.map(async (manifestation) => {
      const result = await generateOpeningV2CreateInputFromManifestation({
        manifestation,
        objectLanguage,
      });

      if (result.mode === "generated") {
        return {
          ...result.opening,
          visibility: result.opening.visibility ?? "invitation_surface",
        };
      }

      return toCompatibilityOpeningCandidate(manifestation);
    }),
  );

  return generated;
}

function logLatentV2Fallback(input: {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  reason: string;
  details?: Record<string, unknown>;
}) {
  console.warn("latent_v2_opening_prep_fallback", {
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    reason: input.reason,
    ...input.details,
  });
}

async function tryPrepareOpeningsFromLatentV2(
  input: PrepareLatentOpeningForReflectionInput,
  repositories: ReflectionPreparationRepositories,
  reflectiveObject: { metadata: Record<string, unknown> },
): Promise<"handled" | "fallback"> {
  const observationBundle = await repositories.observationV2Repository.getByReflectiveObjectId(
    input.reflectiveObjectId,
    input.userId,
  );
  if (!observationBundle) {
    return "fallback";
  }

  const reuseResolution = await repositories.latentOpportunityRepository.resolveReusableAcceptedGenerationRun(
    input.reflectiveObjectId,
    input.userId,
  );
  let currentRun = reuseResolution.reusable ? reuseResolution.generationRun : null;

  if (reuseResolution.reusable && reuseResolution.generationRun?.status === "empty") {
    return "fallback";
  }
  let manifestations = currentRun
    ? await repositories.latentOpportunityRepository.listManifestationsByGenerationRun(currentRun.id, input.userId)
    : [];

  if (manifestations.length === 0) {
    const generation = await generateLatentOpportunitiesForReflectiveObject({
      userId: input.userId,
      priorityReflectiveObjectId: input.reflectiveObjectId,
      acceptedRunReuseGuard: reuseResolution.generationRun && !reuseResolution.reusable ? "skip" : "evaluate",
      repositories: {
        reflectiveObjectRepository: repositories.reflectiveObjectRepository,
        observationV2Repository: repositories.observationV2Repository,
        glossaryRepository: repositories.glossaryRepository,
        latentOpportunityRepository: repositories.latentOpportunityRepository,
      },
    });

    if (generation.mode === "empty") {
      return "fallback";
    }

    if (generation.mode !== "persisted" || generation.persistedManifestations.length === 0) {
      logLatentV2Fallback({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        reason: generation.mode === "failed" ? `generation_failed:${generation.stage}` : "empty_assessment",
      });
      return "fallback";
    }

    currentRun = await repositories.latentOpportunityRepository.getCurrentGenerationRunForReflectiveObject(
      input.reflectiveObjectId,
      input.userId,
    );
    manifestations = currentRun
      ? await repositories.latentOpportunityRepository.listManifestationsByGenerationRun(currentRun.id, input.userId)
      : generation.persistedManifestations;
  }

  const candidates = await deriveOpeningCandidatesFromLatentV2Manifestations(
    manifestations,
    readReflectiveObjectLanguage(reflectiveObject),
  );
  if (candidates.length === 0) {
    logLatentV2Fallback({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      reason: "no_safe_opening_bridge",
    });
    return "fallback";
  }

  const recentOpenings = await repositories.openingRepository.listRecentOpeningsByUser(input.userId);
  const cadenceDecision = applyOpeningCadencePolicy({
    candidates,
    recentOpenings,
  });
  if (cadenceDecision.openings.length === 0) {
    return "handled";
  }

  await Promise.all(cadenceDecision.openings.map((candidate) => repositories.openingRepository.createOpening(candidate)));
  return "handled";
}

export async function prepareLatentOpeningForReflection(input: PrepareLatentOpeningForReflectionInput): Promise<void> {
  const repositories = resolveRepositories(input.repositories);
  const reflectiveObject = await repositories.reflectiveObjectRepository.getById(input.reflectiveObjectId, input.userId);
  if (!reflectiveObject) {
    return;
  }

  try {
    if ((await tryPrepareOpeningsFromLatentV2(input, repositories, reflectiveObject)) === "handled") {
      return;
    }
  } catch (error) {
    logLatentV2Fallback({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      reason: "unexpected_v2_error",
      details: {
        error: error instanceof Error ? error.message : "unknown_error",
      },
    });
  }

  const observations = await repositories.observationRepository.listByReflectiveObject({
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    limit: SNAPSHOT_OBSERVATION_WINDOW,
  });
  if (observations.length === 0) {
    return;
  }

  const snapshots = await repositories.latentRepository.listSnapshotsByUser(input.userId);
  let snapshot = findReusableLatentSnapshotForObject(snapshots, input.reflectiveObjectId);

  if (!snapshot) {
    const [glossaryTerms, threads, recentOpenings] = await Promise.all([
      repositories.glossaryRepository.listTerms(input.userId),
      repositories.threadRepository.listThreadsByUser(input.userId),
      repositories.openingRepository.listRecentOpeningsByUser(input.userId, RECENT_OPENINGS_LIMIT),
    ]);
    const responses = repositories.responseRepository.listResponsesByReflectiveObject
      ? await repositories.responseRepository.listResponsesByReflectiveObject(
          input.userId,
          input.reflectiveObjectId,
          RECENT_RESPONSES_LIMIT,
        )
      : await repositories.responseRepository.listResponsesByUser(input.userId, RECENT_RESPONSES_LIMIT);

    const snapshotScaffold = buildLatentSnapshotScaffold({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      observations,
      glossaryTerms,
      threads,
      responses,
      reflectiveObjectMetadata: reflectiveObject.metadata,
      recentSnapshots: snapshots.slice(0, RECENT_SNAPSHOTS_LIMIT),
      recentOpenings,
    });

    snapshot = await repositories.latentRepository.createSnapshot(snapshotScaffold);
  }

  const existingOpenings = await repositories.openingRepository.listOpeningsByLatentSnapshot(snapshot.id, input.userId);
  if (existingOpenings.length > 0) {
    return;
  }

  if (OPENING_INVOCATION_BOUNDARY !== "expand_opening_surface") {
    return;
  }

  const candidates = deriveOpeningCandidatesFromLatent(snapshot);
  const recentOpenings = await repositories.openingRepository.listRecentOpeningsByUser(input.userId);
  const cadenceDecision = applyOpeningCadencePolicy({
    candidates,
    recentOpenings,
  });
  if (cadenceDecision.openings.length === 0) {
    return;
  }

  await Promise.all(cadenceDecision.openings.map((candidate) => repositories.openingRepository.createOpening(candidate)));
}
