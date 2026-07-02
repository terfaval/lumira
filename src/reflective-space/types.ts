import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";
import type { ReflectiveOpening } from "@/src/domain/openings/types";
import type { OpeningSurface } from "@/src/domain/openings/types";
import type { ReflectiveResponse } from "@/src/domain/responses/types";
import type { GlossaryTerm } from "@/src/domain/glossary/types";
import type { ReflectiveLatentHint } from "@/src/reflective-space/composition/derive-latent-hints";
import type { OpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";
import type { ReflectiveOpeningSurface } from "@/src/reflective-space/composition/derive-opening-surfaces";
import type { ReflectiveResponseSurface } from "@/src/reflective-space/composition/derive-response-surfaces";
import type { ReflectiveThreadSurface } from "@/src/reflective-space/composition/derive-thread-surfaces";

export interface ReflectiveGlossaryCue {
  label: string;
  category: "actor" | "location" | "object" | "emotion" | "recurrence_candidate";
  recurrenceCount: number;
  phrasing: string;
}

export interface ReflectiveSpaceViewport {
  center: ReflectiveObject;
  ambientThreads: ReflectiveThread[];
  ambientResponses: ReflectiveResponse[];
  openings: ReflectiveOpening[];
  openingSurfaces: ReflectiveOpeningSurface[];
  threadSurfaces: ReflectiveThreadSurface[];
  responseSurfaces: ReflectiveResponseSurface[];
  latentHints: ReflectiveLatentHint[];
  openingDialogues?: OpeningDialogue[];
  glossaryCues: ReflectiveGlossaryCue[];
  summary: string;
}

export interface ReflectiveSpaceViewportWindow {
  mode: "bounded_archive_window";
  section:
    | "reflective_objects"
    | "threads"
    | "responses"
    | "glossary"
    | "openings"
    | "dialogues";
  scope: "user_reflective_space";
  limit: number;
  returned: number;
  hasMore: boolean;
  nextCursor: string | null;
  nextBeforeCreatedAt: string | null;
  omissionReason:
    | "none"
    | "section_cap"
    | "payload_guardrail_trim"
    | "silence_legitimate";
}

export interface ReflectiveSpaceViewportSection<T> {
  items: T[];
}

export interface ReflectiveSpaceViewportContinuity {
  glossaryTerms: GlossaryTerm[];
  glossaryCues: ReflectiveGlossaryCue[];
  dormantThreadSurfaces: ReflectiveThreadSurface[];
}

export interface ReflectiveSpaceViewportReadModel {
  summary: string;
  centerObjectId: string | null;
  sections: {
    reflectiveObjects: ReflectiveSpaceViewportSection<ReflectiveObject>;
    threadSurfaces: ReflectiveSpaceViewportSection<ReflectiveThreadSurface>;
    responseSurfaces: ReflectiveSpaceViewportSection<ReflectiveResponseSurface>;
    openingSurfaces: ReflectiveSpaceViewportSection<OpeningSurface>;
    openingDialogues: ReflectiveSpaceViewportSection<OpeningDialogue>;
  };
  continuity: ReflectiveSpaceViewportContinuity;
  payloadGuardrails: {
    maxSerializedBytes: number;
    estimatedSerializedBytes: number;
    trimmedByPayloadGuardrail: boolean;
  };
  windows: {
    objectsWindow: ReflectiveSpaceViewportWindow;
    threadsWindow: ReflectiveSpaceViewportWindow;
    responsesWindow: ReflectiveSpaceViewportWindow;
    glossaryWindow: ReflectiveSpaceViewportWindow;
    openingsWindow: ReflectiveSpaceViewportWindow;
    dialogueWindow: ReflectiveSpaceViewportWindow;
  };
}
