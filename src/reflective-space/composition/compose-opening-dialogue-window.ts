import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { OpeningActivationEventCursor } from "@/src/domain/responses/contracts";
import type { Opening } from "@/src/domain/openings/types";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ReflectiveResponseAssociation } from "@/src/domain/responses/types";
import { buildOpeningDialogue, type OpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";
import type { UserId } from "@/src/shared/types";

const DEFAULT_DIALOGUE_LIMIT = 8;
const MAX_DIALOGUE_LIMIT = 20;
const MAX_SCAN = 120;
const BATCH_SIZE = 30;

export interface ComposeOpeningDialogueWindowInput {
  userId: UserId;
  limit?: number;
  beforeCreatedAt?: string;
  beforeCursor?: OpeningActivationEventCursor;
  openingId?: string;
  threadId?: string;
  reflectiveObjectId?: string;
  openingRepository: OpeningRepository;
  responseRepository: ReflectiveResponseRepository;
}

export interface ComposeOpeningDialogueWindowOutput {
  dialogues: OpeningDialogue[];
  window: {
    mode: "bounded_archive_window";
    section: "dialogues";
    scope: "user_reflective_space";
    limit: number;
    returned: number;
    hasMore: boolean;
    nextCursor: string | null;
    nextBeforeCreatedAt: string | null;
    omissionReason: "none" | "section_cap" | "payload_guardrail_trim" | "silence_legitimate";
  };
}

export function serializeOpeningActivationEventCursor(cursor: OpeningActivationEventCursor): string {
  return `${cursor.createdAt}|${cursor.id}`;
}

export function parseOpeningActivationEventCursor(raw: string | null): OpeningActivationEventCursor | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  const separatorIndex = trimmed.lastIndexOf("|");
  if (separatorIndex <= 0 || separatorIndex >= trimmed.length - 1) {
    return undefined;
  }

  const createdAt = trimmed.slice(0, separatorIndex);
  const id = trimmed.slice(separatorIndex + 1);

  if (createdAt.length === 0 || id.length === 0) {
    return undefined;
  }

  return { createdAt, id };
}

function toBoundedLimit(raw: number | undefined): number {
  if (!raw || !Number.isFinite(raw) || raw < 1) {
    return DEFAULT_DIALOGUE_LIMIT;
  }

  return Math.min(Math.floor(raw), MAX_DIALOGUE_LIMIT);
}

function isScopedDialogue(dialogue: OpeningDialogue, input: ComposeOpeningDialogueWindowInput): boolean {
  if (input.threadId && !dialogue.context.threadIds.includes(input.threadId)) {
    return false;
  }

  if (input.reflectiveObjectId && !dialogue.context.reflectiveObjectIds.includes(input.reflectiveObjectId)) {
    return false;
  }

  return true;
}

async function loadOpening(
  cache: Map<string, Opening | null>,
  loadById: (openingId: string, userId: UserId) => Promise<Opening | null>,
  openingId: string,
  userId: UserId,
): Promise<Opening | null> {
  if (!cache.has(openingId)) {
    cache.set(openingId, await loadById(openingId, userId));
  }

  return cache.get(openingId) ?? null;
}

async function loadResponseAssociations(
  cache: Map<string, ReflectiveResponseAssociation[]>,
  responseRepository: ReflectiveResponseRepository,
  responseId: string,
  userId: UserId,
): Promise<ReflectiveResponseAssociation[]> {
  if (!cache.has(responseId)) {
    cache.set(responseId, await responseRepository.listAssociationsByResponse(responseId, userId));
  }

  return cache.get(responseId) ?? [];
}

export async function composeOpeningDialogueWindow(
  input: ComposeOpeningDialogueWindowInput,
): Promise<ComposeOpeningDialogueWindowOutput> {
  const limit = toBoundedLimit(input.limit);

  const openingCache = new Map<string, Opening | null>();
  const responseCache = new Map<string, Awaited<ReturnType<typeof input.responseRepository.getResponseById>>>();
  const responseAssociationCache = new Map<string, ReflectiveResponseAssociation[]>();
  const loadOpeningById = input.openingRepository.getOpeningByIdIncludingArchived
    ? input.openingRepository.getOpeningByIdIncludingArchived.bind(input.openingRepository)
    : input.openingRepository.getOpeningById.bind(input.openingRepository);
  const loadResponseById = input.responseRepository.getResponseByIdIncludingArchived
    ? input.responseRepository.getResponseByIdIncludingArchived.bind(input.responseRepository)
    : input.responseRepository.getResponseById.bind(input.responseRepository);

  const collected: OpeningDialogue[] = [];
  let scanned = 0;
  let cursorBeforeCreatedAt = input.beforeCreatedAt;
  let cursorBefore = input.beforeCursor;

  while (collected.length < limit + 1 && scanned < MAX_SCAN) {
    const batchLimit = Math.min(BATCH_SIZE, MAX_SCAN - scanned);

    const activationEvents = await input.responseRepository.listOpeningActivationEventsByWindow({
      userId: input.userId,
      openingId: input.openingId,
      beforeCreatedAt: cursorBeforeCreatedAt,
      beforeCursor: cursorBefore,
      limit: batchLimit,
    });

    if (activationEvents.length === 0) {
      break;
    }

    scanned += activationEvents.length;
    const lastActivationEvent = activationEvents[activationEvents.length - 1];
    cursorBeforeCreatedAt = lastActivationEvent?.createdAt;
    cursorBefore = lastActivationEvent
      ? {
          createdAt: lastActivationEvent.createdAt,
          id: lastActivationEvent.id,
        }
      : cursorBefore;

    for (const activationEvent of activationEvents) {
      const opening = await loadOpening(
        openingCache,
        loadOpeningById,
        activationEvent.openingId,
        input.userId,
      );
      if (!opening) {
        continue;
      }

      const responseId = activationEvent.responseId;
      if (responseId && !responseCache.has(responseId)) {
        responseCache.set(responseId, await loadResponseById(responseId, input.userId));
      }

      const response = responseId ? (responseCache.get(responseId) ?? null) : null;
      const responseAssociations = response
        ? await loadResponseAssociations(responseAssociationCache, input.responseRepository, response.id, input.userId)
        : [];

      const dialogue = buildOpeningDialogue({
        opening,
        activationEvent,
        response,
        responseAssociations,
      });

      if (!isScopedDialogue(dialogue, input)) {
        continue;
      }

      collected.push(dialogue);
      if (collected.length >= limit + 1) {
        break;
      }
    }

    if (activationEvents.length < batchLimit) {
      break;
    }
  }

  const hasMore = collected.length > limit;
  const dialogues = collected.slice(0, limit);
  const nextCursor = hasMore
    ? dialogues[dialogues.length - 1]
      ? serializeOpeningActivationEventCursor({
          createdAt: dialogues[dialogues.length - 1].lineage.activationAt,
          id: dialogues[dialogues.length - 1].dialogueId,
        })
      : null
    : null;

  return {
    dialogues,
    window: {
      mode: "bounded_archive_window",
      section: "dialogues",
      scope: "user_reflective_space",
      limit,
      returned: dialogues.length,
      hasMore,
      nextCursor,
      nextBeforeCreatedAt: hasMore ? dialogues[dialogues.length - 1]?.lineage.activationAt ?? null : null,
      omissionReason: hasMore ? "section_cap" : (dialogues.length === 0 ? "silence_legitimate" : "none"),
    },
  };
}
