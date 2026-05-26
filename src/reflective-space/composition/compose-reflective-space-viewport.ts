import type { OpeningActivationEventCursor } from "@/src/domain/responses/contracts";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { composeOpeningDialogueWindow } from "@/src/reflective-space/composition/compose-opening-dialogue-window";
import { deriveGlossaryCuesFromObservations } from "@/src/reflective-space/composition/derive-glossary-cues";
import { deriveResponseSurfaces } from "@/src/reflective-space/composition/derive-response-surfaces";
import { deriveThreadSurfaces } from "@/src/reflective-space/composition/derive-thread-surfaces";
import type { ReflectiveSpaceViewportReadModel, ReflectiveSpaceViewportWindow } from "@/src/reflective-space/types";
import type { UserId } from "@/src/shared/types";

const DEFAULT_OBJECT_LIMIT = 8;
const MAX_OBJECT_LIMIT = 20;
const DEFAULT_DIALOGUE_LIMIT = 8;
const MAX_DIALOGUE_LIMIT = 20;
const OBSERVATION_LIMIT = 4;
const THREAD_SURFACE_LIMIT = 8;
const RESPONSE_SURFACE_LIMIT = 8;
const GLOSSARY_LIMIT = 8;
const OPENING_SURFACE_LIMIT = 3;
const MAX_VIEWPORT_SERIALIZED_BYTES = 32_768;

export interface ComposeReflectiveSpaceViewportInput {
  userId: UserId;
  centerObjectId?: string;
  objectLimit?: number;
  dialogueLimit?: number;
  dialogueBeforeCreatedAt?: string;
  dialogueBeforeCursor?: OpeningActivationEventCursor;
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationRepository: ObservationRepository;
  glossaryRepository: GlossaryRepository;
  threadRepository: ThreadRepository;
  openingRepository: OpeningRepository;
  responseRepository: ReflectiveResponseRepository;
}

function toBoundedLimit(raw: number | undefined, fallback: number, max: number): number {
  if (!raw || !Number.isFinite(raw) || raw < 1) {
    return fallback;
  }

  return Math.min(Math.floor(raw), max);
}

function toWindow(input: {
  section: ReflectiveSpaceViewportWindow["section"];
  limit: number;
  returned: number;
  hasMore: boolean;
  nextBeforeCreatedAt?: string | null;
  omissionReason?: ReflectiveSpaceViewportWindow["omissionReason"];
}): ReflectiveSpaceViewportWindow {
  return {
    mode: "bounded_archive_window",
    section: input.section,
    scope: "user_reflective_space",
    limit: input.limit,
    returned: input.returned,
    hasMore: input.hasMore,
    nextCursor: null,
    nextBeforeCreatedAt: input.nextBeforeCreatedAt ?? null,
    omissionReason: input.omissionReason ?? (input.returned === 0 ? "silence_legitimate" : "none"),
  };
}

function estimateSerializedBytes(viewport: ReflectiveSpaceViewportReadModel): number {
  return new TextEncoder().encode(JSON.stringify(viewport)).length;
}

function applyPayloadGuardrail(viewport: ReflectiveSpaceViewportReadModel): ReflectiveSpaceViewportReadModel {
  let estimated = estimateSerializedBytes(viewport);
  let trimmedByPayloadGuardrail = false;

  const markTrimmed = (window: ReflectiveSpaceViewportWindow) => {
    window.omissionReason = "payload_guardrail_trim";
    window.hasMore = true;
  };

  const trimmers: Array<() => boolean> = [
    () => {
      if (viewport.sections.openingDialogues.items.length === 0) return false;
      viewport.sections.openingDialogues.items.pop();
      viewport.windows.dialogueWindow.returned = viewport.sections.openingDialogues.items.length;
      markTrimmed(viewport.windows.dialogueWindow);
      return true;
    },
    () => {
      if (viewport.sections.observations.items.length === 0) return false;
      viewport.sections.observations.items.pop();
      viewport.windows.observationsWindow.returned = viewport.sections.observations.items.length;
      markTrimmed(viewport.windows.observationsWindow);
      return true;
    },
    () => {
      if (viewport.sections.responseSurfaces.items.length === 0) return false;
      viewport.sections.responseSurfaces.items.pop();
      viewport.windows.responsesWindow.returned = viewport.sections.responseSurfaces.items.length;
      markTrimmed(viewport.windows.responsesWindow);
      return true;
    },
    () => {
      if (viewport.sections.threadSurfaces.items.length === 0) return false;
      viewport.sections.threadSurfaces.items.pop();
      viewport.continuity.dormantThreadSurfaces = viewport.continuity.dormantThreadSurfaces.filter((surface) =>
        viewport.sections.threadSurfaces.items.some((item) => item.threadId === surface.threadId)
      );
      viewport.windows.threadsWindow.returned = viewport.sections.threadSurfaces.items.length;
      markTrimmed(viewport.windows.threadsWindow);
      return true;
    },
    () => {
      if (viewport.continuity.glossaryCues.length === 0) return false;
      viewport.continuity.glossaryCues.pop();
      viewport.windows.glossaryWindow.returned = Math.max(
        viewport.continuity.glossaryTerms.length,
        viewport.continuity.glossaryCues.length,
      );
      markTrimmed(viewport.windows.glossaryWindow);
      return true;
    },
    () => {
      if (viewport.continuity.glossaryTerms.length === 0) return false;
      viewport.continuity.glossaryTerms.pop();
      viewport.windows.glossaryWindow.returned = Math.max(
        viewport.continuity.glossaryTerms.length,
        viewport.continuity.glossaryCues.length,
      );
      markTrimmed(viewport.windows.glossaryWindow);
      return true;
    },
    () => {
      if (viewport.sections.openingSurfaces.items.length === 0) return false;
      viewport.sections.openingSurfaces.items.pop();
      viewport.windows.openingsWindow.returned = viewport.sections.openingSurfaces.items.length;
      markTrimmed(viewport.windows.openingsWindow);
      return true;
    },
    () => {
      if (viewport.sections.reflectiveObjects.items.length <= 1) return false;
      viewport.sections.reflectiveObjects.items.pop();
      viewport.windows.objectsWindow.returned = viewport.sections.reflectiveObjects.items.length;
      markTrimmed(viewport.windows.objectsWindow);
      return true;
    },
  ];

  let madeProgress = true;
  while (estimated > MAX_VIEWPORT_SERIALIZED_BYTES && madeProgress) {
    madeProgress = false;
    for (const trim of trimmers) {
      if (!trim()) {
        continue;
      }

      trimmedByPayloadGuardrail = true;
      madeProgress = true;
      estimated = estimateSerializedBytes(viewport);
      if (estimated <= MAX_VIEWPORT_SERIALIZED_BYTES) {
        break;
      }
    }
  }

  viewport.payloadGuardrails = {
    maxSerializedBytes: MAX_VIEWPORT_SERIALIZED_BYTES,
    estimatedSerializedBytes: estimated,
    trimmedByPayloadGuardrail,
  };

  return viewport;
}

export async function composeReflectiveSpaceViewport(
  input: ComposeReflectiveSpaceViewportInput,
): Promise<ReflectiveSpaceViewportReadModel> {
  const objectLimit = toBoundedLimit(input.objectLimit, DEFAULT_OBJECT_LIMIT, MAX_OBJECT_LIMIT);
  const dialogueLimit = toBoundedLimit(input.dialogueLimit, DEFAULT_DIALOGUE_LIMIT, MAX_DIALOGUE_LIMIT);

  const [objectRows, threadRows, glossaryRows, responseRows, openingRows] = await Promise.all([
    input.reflectiveObjectRepository.listByUser(input.userId, objectLimit + 1),
    input.threadRepository.listThreadsByUser(input.userId, THREAD_SURFACE_LIMIT + 1),
    input.glossaryRepository.listTerms(input.userId, GLOSSARY_LIMIT + 1),
    input.responseRepository.listResponsesByUser(input.userId, RESPONSE_SURFACE_LIMIT + 1),
    input.openingRepository.listOpeningSurfacesByUser(input.userId, OPENING_SURFACE_LIMIT + 1),
  ]);

  const hasMoreObjects = objectRows.length > objectLimit;
  const reflectiveObjects = objectRows.slice(0, objectLimit);

  const centerObjectId = input.centerObjectId && objectRows.some((item) => item.id === input.centerObjectId)
    ? input.centerObjectId
    : (reflectiveObjects[0]?.id ?? null);

  const observationRows = centerObjectId
    ? await input.observationRepository.listByReflectiveObject({
        userId: input.userId,
        reflectiveObjectId: centerObjectId,
        limit: OBSERVATION_LIMIT + 1,
      })
    : [];
  const hasMoreObservations = observationRows.length > OBSERVATION_LIMIT;
  const observations = observationRows.slice(0, OBSERVATION_LIMIT);

  const threadSurfacesAll = deriveThreadSurfaces(threadRows);
  const hasMoreThreadSurfaces = threadSurfacesAll.length > THREAD_SURFACE_LIMIT;
  const threadSurfaces = threadSurfacesAll.slice(0, THREAD_SURFACE_LIMIT);

  const responseSurfacesAll = deriveResponseSurfaces(responseRows);
  const hasMoreResponseSurfaces = responseSurfacesAll.length > RESPONSE_SURFACE_LIMIT;
  const responseSurfaces = responseSurfacesAll.slice(0, RESPONSE_SURFACE_LIMIT);

  const hasMoreOpenings = openingRows.length > OPENING_SURFACE_LIMIT;
  const openingSurfaces = openingRows.slice(0, OPENING_SURFACE_LIMIT);

  const glossaryTerms = glossaryRows.slice(0, GLOSSARY_LIMIT);
  const hasMoreGlossaryTerms = glossaryRows.length > GLOSSARY_LIMIT;
  const glossaryCuesAll = deriveGlossaryCuesFromObservations(observations);
  const hasMoreGlossaryCues = glossaryCuesAll.length > GLOSSARY_LIMIT;
  const glossaryCues = glossaryCuesAll.slice(0, GLOSSARY_LIMIT);

  const dormantThreadSurfaces = threadSurfaces.filter((surface) => surface.state === "dormant" || surface.state === "quiet");

  const dialogueWindow = await composeOpeningDialogueWindow({
    userId: input.userId,
    limit: dialogueLimit,
    beforeCreatedAt: input.dialogueBeforeCreatedAt,
    beforeCursor: input.dialogueBeforeCursor,
    openingRepository: input.openingRepository,
    responseRepository: input.responseRepository,
  });

  const summary = centerObjectId
    ? "Reflective space remains bounded and calm. Optional continuity surfaces are available."
    : "Reflective space is quiet right now. You may add reflective material whenever it feels right.";

  const viewport: ReflectiveSpaceViewportReadModel = {
    summary,
    centerObjectId,
    sections: {
      reflectiveObjects: { items: reflectiveObjects },
      observations: { items: observations },
      threadSurfaces: { items: threadSurfaces },
      responseSurfaces: { items: responseSurfaces },
      openingSurfaces: { items: openingSurfaces },
      openingDialogues: { items: dialogueWindow.dialogues },
    },
    continuity: {
      glossaryTerms,
      glossaryCues,
      dormantThreadSurfaces,
    },
    payloadGuardrails: {
      maxSerializedBytes: MAX_VIEWPORT_SERIALIZED_BYTES,
      estimatedSerializedBytes: 0,
      trimmedByPayloadGuardrail: false,
    },
    windows: {
      objectsWindow: toWindow({
        section: "reflective_objects",
        limit: objectLimit,
        returned: reflectiveObjects.length,
        hasMore: hasMoreObjects,
        nextBeforeCreatedAt: hasMoreObjects ? reflectiveObjects[reflectiveObjects.length - 1]?.createdAt ?? null : null,
        omissionReason: hasMoreObjects ? "section_cap" : (reflectiveObjects.length === 0 ? "silence_legitimate" : "none"),
      }),
      observationsWindow: toWindow({
        section: "observations",
        limit: OBSERVATION_LIMIT,
        returned: observations.length,
        hasMore: hasMoreObservations,
        nextBeforeCreatedAt: hasMoreObservations ? observations[observations.length - 1]?.createdAt ?? null : null,
        omissionReason: hasMoreObservations ? "section_cap" : (observations.length === 0 ? "silence_legitimate" : "none"),
      }),
      threadsWindow: toWindow({
        section: "threads",
        limit: THREAD_SURFACE_LIMIT,
        returned: threadSurfaces.length,
        hasMore: hasMoreThreadSurfaces,
        nextBeforeCreatedAt: null,
        omissionReason: hasMoreThreadSurfaces ? "section_cap" : (threadSurfaces.length === 0 ? "silence_legitimate" : "none"),
      }),
      responsesWindow: toWindow({
        section: "responses",
        limit: RESPONSE_SURFACE_LIMIT,
        returned: responseSurfaces.length,
        hasMore: hasMoreResponseSurfaces,
        nextBeforeCreatedAt: null,
        omissionReason: hasMoreResponseSurfaces ? "section_cap" : (responseSurfaces.length === 0 ? "silence_legitimate" : "none"),
      }),
      glossaryWindow: toWindow({
        section: "glossary",
        limit: GLOSSARY_LIMIT,
        returned: Math.max(glossaryTerms.length, glossaryCues.length),
        hasMore: hasMoreGlossaryTerms || hasMoreGlossaryCues,
        nextBeforeCreatedAt: hasMoreGlossaryTerms ? glossaryTerms[glossaryTerms.length - 1]?.createdAt ?? null : null,
        omissionReason:
          hasMoreGlossaryTerms || hasMoreGlossaryCues
            ? "section_cap"
            : (glossaryTerms.length === 0 && glossaryCues.length === 0 ? "silence_legitimate" : "none"),
      }),
      openingsWindow: toWindow({
        section: "openings",
        limit: OPENING_SURFACE_LIMIT,
        returned: openingSurfaces.length,
        hasMore: hasMoreOpenings,
        nextBeforeCreatedAt: hasMoreOpenings ? openingSurfaces[openingSurfaces.length - 1]?.createdAt ?? null : null,
        omissionReason: hasMoreOpenings ? "section_cap" : (openingSurfaces.length === 0 ? "silence_legitimate" : "none"),
      }),
      dialogueWindow: {
        ...dialogueWindow.window,
      },
    },
  };

  return applyPayloadGuardrail(viewport);
}
