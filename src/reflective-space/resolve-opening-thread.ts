import { DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS } from "@/src/domain/anchor-v1/continuity-neighborhood";
import {
  ContinuityNeighborhoodOperationalError,
  hasContinuityNeighborhoodAmbiguity,
  type ContinuityNeighborhoodReader,
} from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import type { Opening } from "@/src/domain/openings/types";
import { createContinuityNeighborhoodReader } from "@/src/infrastructure/supabase/repositories/create-continuity-neighborhood-reader";
import { resolveOpeningContinuityNeighborhoodLookup } from "@/src/reflective-space/resolve-opening-continuity-neighborhood-lookup";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import type { ReflectiveThreadAssociation } from "@/src/domain/threads/types";

export function hasObjectLineageOverlap(
  threadAssociations: ReflectiveThreadAssociation[],
  openingSourceObjectIds: string[],
): boolean {
  if (openingSourceObjectIds.length === 0) {
    return false;
  }

  const sourceObjectIds = new Set(openingSourceObjectIds);
  return threadAssociations.some(
    (association) =>
      association.reflectiveObjectId !== null && sourceObjectIds.has(association.reflectiveObjectId),
  );
}

function collectContinuityObjectIds(
  neighborhood: Awaited<ReturnType<ContinuityNeighborhoodReader["readNeighborhood"]>>,
): string[] {
  if (
    neighborhood.partial ||
    neighborhood.center.resolvedCenterKind === null ||
    hasContinuityNeighborhoodAmbiguity(neighborhood.ambiguity)
  ) {
    return [];
  }

  return [
    ...new Set(
      neighborhood.manifestations
        .map((manifestation) => manifestation.reflectiveObjectId)
        .filter((reflectiveObjectId): reflectiveObjectId is string => typeof reflectiveObjectId === "string" && reflectiveObjectId.length > 0),
    ),
  ];
}

async function validateThreadCandidate(
  threadId: string,
  userId: string,
  openingSourceObjectIds: string[],
  continuityObjectIds: string[],
  threadRepository: ThreadRepository,
): Promise<string | null> {
  const thread = await threadRepository.getThreadById(threadId, userId);
  if (!thread) {
    return null;
  }

  const threadAssociations = await threadRepository.listAssociationsByThread(threadId, userId);
  const candidateObjectIds = [
    ...new Set([
      ...openingSourceObjectIds,
      ...continuityObjectIds,
    ]),
  ];

  if (!hasObjectLineageOverlap(threadAssociations, candidateObjectIds)) {
    return null;
  }

  return threadId;
}

export async function resolveReusableThreadId(input: {
  opening: Pick<Opening, "id" | "provenance">;
  userId: string;
  responseRepository: ReflectiveResponseRepository;
  threadRepository: ThreadRepository;
  continuityNeighborhoodReader?: ContinuityNeighborhoodReader;
}): Promise<string | null> {
  let continuityObjectIds: string[] = [];
  const continuityLookup = resolveOpeningContinuityNeighborhoodLookup(input.opening);
  if (continuityLookup) {
    try {
      const continuityNeighborhoodReader =
        input.continuityNeighborhoodReader ?? createContinuityNeighborhoodReader();
      const neighborhood = await continuityNeighborhoodReader.readNeighborhood(
        input.userId,
        continuityLookup,
        DEFAULT_CONTINUITY_NEIGHBORHOOD_BOUNDS,
      );
      continuityObjectIds = collectContinuityObjectIds(neighborhood);
    } catch (error) {
      if (!(error instanceof ContinuityNeighborhoodOperationalError)) {
        throw error;
      }
    }
  }

  const sourceThreadIds = [
    ...new Set((input.opening.provenance.sourceThreads ?? []).filter(Boolean)),
  ];
  for (const threadId of sourceThreadIds) {
    const validated = await validateThreadCandidate(
      threadId,
      input.userId,
      input.opening.provenance.sourceObjects ?? [],
      continuityObjectIds,
      input.threadRepository,
    );

    if (validated) {
      return validated;
    }
  }

  const openingAssociations = await input.responseRepository.listOpeningResponseAssociationsByOpening(
    input.opening.id,
    input.userId,
  );
  const candidateThreadIds = [
    ...new Set(openingAssociations.map((association) => association.threadId).filter(Boolean)),
  ] as string[];

  for (const threadId of candidateThreadIds) {
    const validated = await validateThreadCandidate(
      threadId,
      input.userId,
      input.opening.provenance.sourceObjects ?? [],
      continuityObjectIds,
      input.threadRepository,
    );

    if (validated) {
      return validated;
    }
  }

  return null;
}
