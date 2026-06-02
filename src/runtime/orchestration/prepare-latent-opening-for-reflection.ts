import { buildLatentSnapshotScaffold } from "@/src/cognition/latent/latent-engine";
import { applyOpeningCadencePolicy } from "@/src/cognition/openings/opening-cadence-policy";
import { deriveOpeningCandidatesFromLatent } from "@/src/cognition/openings/derive-opening-candidates-from-latent";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentRepository } from "@/src/domain/latent/contracts";
import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const SNAPSHOT_OBSERVATION_WINDOW = 24;
const RECENT_OPENINGS_LIMIT = 40;
const RECENT_SNAPSHOTS_LIMIT = 20;
const RECENT_RESPONSES_LIMIT = 80;
const OPENING_INVOCATION_BOUNDARY = "expand_opening_surface";

interface ReflectionPreparationRepositories {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationRepository: ObservationRepository;
  glossaryRepository: GlossaryRepository;
  threadRepository: ThreadRepository;
  responseRepository: ReflectiveResponseRepository;
  openingRepository: OpeningRepository;
  latentRepository: LatentRepository;
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
    glossaryRepository: repositories.glossaryRepository ?? createGlossaryRepository(),
    threadRepository: repositories.threadRepository ?? createThreadRepository(),
    responseRepository: repositories.responseRepository ?? createResponseRepository(),
    openingRepository: repositories.openingRepository ?? createOpeningRepository(),
    latentRepository: repositories.latentRepository ?? createLatentRepository(),
  };
}

function findReusableLatentSnapshotForObject(
  snapshots: LatentSnapshot[],
  reflectiveObjectId: ReflectiveObjectId,
): LatentSnapshot | null {
  return snapshots.find((snapshot) => snapshot.provenance.sourceReflectiveObjects.includes(reflectiveObjectId)) ?? null;
}

export async function prepareLatentOpeningForReflection(input: PrepareLatentOpeningForReflectionInput): Promise<void> {
  const repositories = resolveRepositories(input.repositories);
  const reflectiveObject = await repositories.reflectiveObjectRepository.getById(input.reflectiveObjectId, input.userId);
  if (!reflectiveObject) {
    return;
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
