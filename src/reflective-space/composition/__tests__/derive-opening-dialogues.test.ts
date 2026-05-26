import { describe, expect, it } from "vitest";

import type { Opening } from "@/src/domain/openings/types";
import type { OpeningActivationEvent, ReflectiveResponse, ReflectiveResponseAssociation } from "@/src/domain/responses/types";
import { buildOpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";

const opening: Opening = {
  id: "opening-1",
  userId: "user-1",
  openingType: "reflective_recall",
  tone: "calm",
  utterance: "This may connect with a nearby continuity thread.",
  state: "activated",
  visibility: "opened",
  suppressionState: "none",
  suppressionDuration: null,
  suppressionReason: null,
  suppressionExpiry: { at: null },
  suppressionRevisitEligibility: "revisitable_dormant",
  suppressionReactivatedAt: null,
  provenance: {
    sourceObjects: ["obj-1"],
    sourceObservations: ["obs-1"],
    sourceGlossaryTerms: ["term-1"],
    sourceThreads: ["thread-1"],
    sourceResponses: [],
    latentSnapshotReference: "latent-1",
    confidenceBand: "tentative",
    openingGenerationContext: "phase8_dialogue_test",
  },
  activatedAt: "2026-05-25T00:00:00.000Z",
  dismissedAt: null,
  archivedAt: null,
  createdAt: "2026-05-25T00:00:00.000Z",
  updatedAt: "2026-05-25T00:00:00.000Z",
};

const activation: OpeningActivationEvent = {
  id: "event-1",
  userId: "user-1",
  openingId: "opening-1",
  activationSource: "reflective_space_surface",
  activationContext: "reflective_space_surface",
  openingResponseContext: "activation_without_response",
  responseId: null,
  createdAt: "2026-05-25T00:10:00.000Z",
  updatedAt: "2026-05-25T00:10:00.000Z",
};

const response: ReflectiveResponse = {
  id: "response-1",
  userId: "user-1",
  title: "After opening",
  responseText: "I stayed with the image without forcing closure.",
  state: "active",
  visibility: "ambient",
  source: "manual_entry",
  archivedAt: null,
  createdAt: "2026-05-25T00:12:00.000Z",
  updatedAt: "2026-05-25T00:12:00.000Z",
};

const associations: ReflectiveResponseAssociation[] = [
  {
    id: "assoc-obj-1",
    userId: "user-1",
    responseId: "response-1",
    kind: "reflective_object",
    openingId: null,
    reflectiveObjectId: "obj-2",
    threadId: null,
    associationLabel: null,
    createdAt: "2026-05-25T00:12:00.000Z",
    updatedAt: "2026-05-25T00:12:00.000Z",
  },
  {
    id: "assoc-thread-1",
    userId: "user-1",
    responseId: "response-1",
    kind: "reflective_thread",
    openingId: null,
    reflectiveObjectId: null,
    threadId: "thread-2",
    associationLabel: null,
    createdAt: "2026-05-25T00:12:00.000Z",
    updatedAt: "2026-05-25T00:12:00.000Z",
  },
];

describe("buildOpeningDialogue", () => {
  it("preserves activation_without_response visibility", () => {
    const dialogue = buildOpeningDialogue({
      opening,
      activationEvent: activation,
      response: null,
      responseAssociations: [],
    });

    expect(dialogue.lineage.openingResponseContext).toBe("activation_without_response");
    expect(dialogue.entry.response).toBeNull();
  });

  it("composes bounded continuity context with unique ids", () => {
    const dialogue = buildOpeningDialogue({
      opening,
      activationEvent: {
        ...activation,
        openingResponseContext: "response_authored",
        responseId: "response-1",
      },
      response,
      responseAssociations: associations,
    });

    expect(dialogue.context.reflectiveObjectIds).toEqual(["obj-1", "obj-2"]);
    expect(dialogue.context.threadIds).toEqual(["thread-1", "thread-2"]);
    expect(dialogue.provenance.sourceObservations).toEqual(["obs-1"]);
  });
});
