import type { Opening } from "@/src/domain/openings/types";
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

async function validateThreadCandidate(
  threadId: string,
  userId: string,
  openingSourceObjectIds: string[],
  threadRepository: ThreadRepository,
): Promise<string | null> {
  const thread = await threadRepository.getThreadById(threadId, userId);
  if (!thread) {
    return null;
  }

  const threadAssociations = await threadRepository.listAssociationsByThread(threadId, userId);
  if (!hasObjectLineageOverlap(threadAssociations, openingSourceObjectIds)) {
    return null;
  }

  return threadId;
}

export async function resolveReusableThreadId(input: {
  opening: Pick<Opening, "id" | "provenance">;
  userId: string;
  responseRepository: ReflectiveResponseRepository;
  threadRepository: ThreadRepository;
}): Promise<string | null> {
  const sourceThreadIds = [
    ...new Set((input.opening.provenance.sourceThreads ?? []).filter(Boolean)),
  ];
  for (const threadId of sourceThreadIds) {
    const validated = await validateThreadCandidate(
      threadId,
      input.userId,
      input.opening.provenance.sourceObjects ?? [],
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
      input.threadRepository,
    );

    if (validated) {
      return validated;
    }
  }

  return null;
}
