import { describe, expect, it } from "vitest";

import {
  composeOpeningDialogueWindow,
  parseOpeningActivationEventCursor,
  serializeOpeningActivationEventCursor,
} from "@/src/reflective-space/composition/compose-opening-dialogue-window";

describe("composeOpeningDialogueWindow", () => {
  it("returns bounded window and preserves no-response traces", async () => {
    const result = await composeOpeningDialogueWindow({
      userId: "user-1",
      limit: 1,
      openingRepository: {
        createOpening: async () => { throw new Error("not used"); },
        getOpeningById: async () => ({
          id: "opening-1",
          userId: "user-1",
          openingType: "reflective_question",
          tone: "gentle",
          utterance: "This may connect nearby.",
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
            sourceObservations: [],
            sourceGlossaryTerms: [],
            sourceThreads: [],
            sourceResponses: [],
            latentSnapshotReference: null,
            confidenceBand: "tentative",
            openingGenerationContext: "test",
          },
          activatedAt: null,
          dismissedAt: null,
          archivedAt: null,
          createdAt: "2026-05-25T00:00:00.000Z",
          updatedAt: "2026-05-25T00:00:00.000Z",
        }),
        listOpeningSurfacesByUser: async () => [],
        listDormantSuppressedOpeningsByUser: async () => [],
        listRecentOpeningsByUser: async () => [],
        listOpeningsByLatentSnapshot: async () => [],
        activateOpening: async () => null,
        reactivateOpening: async () => null,
        dismissOpening: async () => null,
        setSuppression: async () => null,
        recordSurfaceEvent: async () => { throw new Error("not used"); },
      },
      responseRepository: {
        createResponse: async () => { throw new Error("not used"); },
        getResponseById: async () => null,
        listResponsesByUser: async () => [],
        updateResponse: async () => null,
        setResponseState: async () => null,
        archiveResponse: async () => null,
        createObjectAssociation: async () => { throw new Error("not used"); },
        createThreadAssociation: async () => { throw new Error("not used"); },
        removeObjectAssociation: async () => false,
        removeThreadAssociation: async () => false,
        listAssociationsByResponse: async () => [],
        createOpeningActivationEvent: async () => { throw new Error("not used"); },
        listOpeningActivationEventsByWindow: async () => [
          {
            id: "event-1",
            userId: "user-1",
            openingId: "opening-1",
            activationSource: "reflective_space_surface",
            activationContext: "reflective_space_surface",
            openingResponseContext: "activation_without_response",
            responseId: null,
            createdAt: "2026-05-25T00:00:00.000Z",
            updatedAt: "2026-05-25T00:00:00.000Z",
          },
          {
            id: "event-2",
            userId: "user-1",
            openingId: "opening-1",
            activationSource: "reflective_space_surface",
            activationContext: "reflective_space_surface",
            openingResponseContext: "activation_without_response",
            responseId: null,
            createdAt: "2026-05-24T00:00:00.000Z",
            updatedAt: "2026-05-24T00:00:00.000Z",
          },
        ],
        createOpeningResponseAssociation: async () => { throw new Error("not used"); },
        removeOpeningResponseAssociation: async () => false,
        listOpeningResponseAssociationsByOpening: async () => [],
      },
    });

    expect(result.dialogues).toHaveLength(1);
    expect(result.window.hasMore).toBe(true);
    expect(result.window.section).toBe("dialogues");
    expect(result.window.nextCursor).toContain("|");
    expect(result.dialogues[0].lineage.openingResponseContext).toBe("activation_without_response");
  });

  it("round-trips stable dialogue cursor format", () => {
    const cursor = {
      createdAt: "2026-05-25T00:00:00.000Z",
      id: "event-42",
    };

    const serialized = serializeOpeningActivationEventCursor(cursor);
    const parsed = parseOpeningActivationEventCursor(serialized);

    expect(parsed).toEqual(cursor);
  });

  it("keeps historical trace intelligible when source entities are archived", async () => {
    const result = await composeOpeningDialogueWindow({
      userId: "user-1",
      limit: 2,
      openingRepository: {
        createOpening: async () => { throw new Error("not used"); },
        getOpeningById: async () => null,
        getOpeningByIdIncludingArchived: async () => ({
          id: "opening-archived",
          userId: "user-1",
          openingType: "reflective_question",
          tone: "gentle",
          utterance: "This trace can still be revisited.",
          state: "archived",
          visibility: "opened",
          suppressionState: "suppressed",
          suppressionDuration: "indefinite",
          suppressionReason: "quiet_for_now",
          suppressionExpiry: { at: null },
          suppressionRevisitEligibility: "revisitable_dormant",
          suppressionReactivatedAt: null,
          provenance: {
            sourceObjects: ["obj-1"],
            sourceObservations: [],
            sourceGlossaryTerms: [],
            sourceThreads: [],
            sourceResponses: [],
            latentSnapshotReference: null,
            confidenceBand: "low",
            openingGenerationContext: "archived_test",
          },
          activatedAt: null,
          dismissedAt: null,
          archivedAt: "2026-05-24T00:00:00.000Z",
          createdAt: "2026-05-23T00:00:00.000Z",
          updatedAt: "2026-05-24T00:00:00.000Z",
        }),
        listOpeningSurfacesByUser: async () => [],
        listDormantSuppressedOpeningsByUser: async () => [],
        listRecentOpeningsByUser: async () => [],
        listOpeningsByLatentSnapshot: async () => [],
        activateOpening: async () => null,
        reactivateOpening: async () => null,
        dismissOpening: async () => null,
        setSuppression: async () => null,
        recordSurfaceEvent: async () => { throw new Error("not used"); },
      },
      responseRepository: {
        createResponse: async () => { throw new Error("not used"); },
        getResponseById: async () => null,
        getResponseByIdIncludingArchived: async () => ({
          id: "response-archived",
          userId: "user-1",
          title: "Archived response",
          responseText: "Still part of reflective history.",
          state: "archived",
          visibility: "hidden",
          source: "manual_entry",
          archivedAt: "2026-05-24T00:00:00.000Z",
          createdAt: "2026-05-23T00:00:00.000Z",
          updatedAt: "2026-05-24T00:00:00.000Z",
        }),
        listResponsesByUser: async () => [],
        updateResponse: async () => null,
        setResponseState: async () => null,
        archiveResponse: async () => null,
        createObjectAssociation: async () => { throw new Error("not used"); },
        createThreadAssociation: async () => { throw new Error("not used"); },
        removeObjectAssociation: async () => false,
        removeThreadAssociation: async () => false,
        listAssociationsByResponse: async () => [],
        createOpeningActivationEvent: async () => { throw new Error("not used"); },
        listOpeningActivationEventsByWindow: async () => [
          {
            id: "event-archived",
            userId: "user-1",
            openingId: "opening-archived",
            activationSource: "continuity_revisit",
            activationContext: "continuity_revisit",
            openingResponseContext: "response_authored",
            responseId: "response-archived",
            createdAt: "2026-05-24T00:00:00.000Z",
            updatedAt: "2026-05-24T00:00:00.000Z",
          },
        ],
        createOpeningResponseAssociation: async () => { throw new Error("not used"); },
        removeOpeningResponseAssociation: async () => false,
        listOpeningResponseAssociationsByOpening: async () => [],
      },
    });

    expect(result.dialogues).toHaveLength(1);
    expect(result.dialogues[0].entry.response?.state).toBe("archived");
    expect(result.dialogues[0].entry.opening.state).toBe("archived");
  });
});
