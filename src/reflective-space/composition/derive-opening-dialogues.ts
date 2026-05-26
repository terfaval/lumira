import type { Opening } from "@/src/domain/openings/types";
import type { OpeningActivationEvent, ReflectiveResponse, ReflectiveResponseAssociation } from "@/src/domain/responses/types";

export interface OpeningDialogueLineage {
  openingId: string;
  activationEventId: string;
  activationAt: string;
  openingActivationContext: OpeningActivationEvent["activationContext"];
  openingResponseContext: OpeningActivationEvent["openingResponseContext"];
  responseId: string | null;
}

export interface OpeningDialogueContext {
  reflectiveObjectIds: string[];
  threadIds: string[];
  glossaryTermIds: string[];
}

export interface OpeningDialogueEntry {
  opening: {
    id: string;
    openingType: Opening["openingType"];
    tone: Opening["tone"];
    utterance: string;
    state: Opening["state"];
    visibility: Opening["visibility"];
  };
  activation: {
    eventId: string;
    source: OpeningActivationEvent["activationSource"];
    context: OpeningActivationEvent["activationContext"];
    openingResponseContext: OpeningActivationEvent["openingResponseContext"];
    activatedAt: string;
  };
  response: {
    id: string;
    title: string;
    responseText: string;
    state: ReflectiveResponse["state"];
    visibility: ReflectiveResponse["visibility"];
    source: ReflectiveResponse["source"];
    createdAt: string;
  } | null;
}

export interface OpeningDialogue {
  dialogueId: string;
  userId: string;
  lineage: OpeningDialogueLineage;
  context: OpeningDialogueContext;
  provenance: Opening["provenance"];
  entry: OpeningDialogueEntry;
}

interface BuildOpeningDialogueInput {
  opening: Opening;
  activationEvent: OpeningActivationEvent;
  response: ReflectiveResponse | null;
  responseAssociations: ReflectiveResponseAssociation[];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function deriveThreadIds(opening: Opening, responseAssociations: ReflectiveResponseAssociation[]): string[] {
  const fromOpening = opening.provenance.sourceThreads;
  const fromAssociations = responseAssociations
    .filter((association) => association.threadId !== null)
    .map((association) => association.threadId as string);

  return unique([...fromOpening, ...fromAssociations]);
}

function deriveReflectiveObjectIds(opening: Opening, responseAssociations: ReflectiveResponseAssociation[]): string[] {
  const fromOpening = opening.provenance.sourceObjects;
  const fromAssociations = responseAssociations
    .filter((association) => association.reflectiveObjectId !== null)
    .map((association) => association.reflectiveObjectId as string);

  return unique([...fromOpening, ...fromAssociations]);
}

export function buildOpeningDialogue(input: BuildOpeningDialogueInput): OpeningDialogue {
  return {
    dialogueId: input.activationEvent.id,
    userId: input.activationEvent.userId,
    lineage: {
      openingId: input.opening.id,
      activationEventId: input.activationEvent.id,
      activationAt: input.activationEvent.createdAt,
      openingActivationContext: input.activationEvent.activationContext,
      openingResponseContext: input.activationEvent.openingResponseContext,
      responseId: input.activationEvent.responseId,
    },
    context: {
      reflectiveObjectIds: deriveReflectiveObjectIds(input.opening, input.responseAssociations),
      threadIds: deriveThreadIds(input.opening, input.responseAssociations),
      glossaryTermIds: input.opening.provenance.sourceGlossaryTerms,
    },
    provenance: input.opening.provenance,
    entry: {
      opening: {
        id: input.opening.id,
        openingType: input.opening.openingType,
        tone: input.opening.tone,
        utterance: input.opening.utterance,
        state: input.opening.state,
        visibility: input.opening.visibility,
      },
      activation: {
        eventId: input.activationEvent.id,
        source: input.activationEvent.activationSource,
        context: input.activationEvent.activationContext,
        openingResponseContext: input.activationEvent.openingResponseContext,
        activatedAt: input.activationEvent.createdAt,
      },
      response: input.response
        ? {
            id: input.response.id,
            title: input.response.title,
            responseText: input.response.responseText,
            state: input.response.state,
            visibility: input.response.visibility,
            source: input.response.source,
            createdAt: input.response.createdAt,
          }
        : null,
    },
  };
}
