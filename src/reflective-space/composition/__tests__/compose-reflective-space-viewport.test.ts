import { describe, expect, it } from "vitest";

import { composeReflectiveSpaceViewport } from "@/src/reflective-space/composition/compose-reflective-space-viewport";

describe("composeReflectiveSpaceViewport", () => {
  it("builds bounded viewport with suppression-aware opening surfaces and dialogue window", async () => {
    const viewport = await composeReflectiveSpaceViewport({
      userId: "user-1",
      objectLimit: 1,
      dialogueLimit: 1,
      reflectiveObjectRepository: {
        create: async () => { throw new Error("not used"); },
        getById: async () => null,
        listByUser: async () => [
          {
            id: "obj-1",
            userId: "user-1",
            objectType: "dream",
            title: "A",
            primaryContent: "Content",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-25T00:00:00.000Z",
            updatedAt: "2026-05-25T00:00:00.000Z",
          },
          {
            id: "obj-2",
            userId: "user-1",
            objectType: "memory",
            title: "B",
            primaryContent: "Content",
            sourceContext: "manual",
            state: "active",
            metadata: {},
            createdAt: "2026-05-24T00:00:00.000Z",
            updatedAt: "2026-05-24T00:00:00.000Z",
          },
        ],
        update: async () => null,
        archive: async () => null,
      },
      observationRepository: {
        create: async () => { throw new Error("not used"); },
        listByReflectiveObject: async () => [],
        getById: async () => null,
      },
      glossaryRepository: {
        listTerms: async () => [],
        getTermById: async () => null,
        renameTerm: async () => null,
        listCandidates: async () => [],
        listCandidatesByReflectiveObject: async () => [],
        getCandidateById: async () => null,
        upsertCandidates: async () => [],
        setCandidateLifecycle: async () => null,
        createAssociation: async () => { throw new Error("not used"); },
      },
      threadRepository: {
        createThread: async () => { throw new Error("not used"); },
        getThreadById: async () => null,
        listThreadsByUser: async () => [],
        updateThread: async () => null,
        setThreadState: async () => null,
        archiveThread: async () => null,
        createObjectAssociation: async () => { throw new Error("not used"); },
        createGlossaryAssociation: async () => { throw new Error("not used"); },
        listAssociationsByThread: async () => [],
      },
      openingRepository: {
        createOpening: async () => { throw new Error("not used"); },
        getOpeningById: async (openingId) => ({
          id: openingId,
          userId: "user-1",
          openingType: "continuity_noticing",
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
        listOpeningSurfacesByUser: async () => [
          {
            openingId: "opening-1",
            userId: "user-1",
            openingType: "continuity_noticing",
            tone: "gentle",
            visibility: "invitation_surface",
            suppressionState: "none",
            suppressionDuration: null,
            suppressionRevisitEligibility: "revisitable_dormant",
            state: "available",
            preview: "continuity noticing is available",
            activated: false,
            createdAt: "2026-05-25T00:00:00.000Z",
          },
        ],
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
        ],
        createOpeningResponseAssociation: async () => { throw new Error("not used"); },
        removeOpeningResponseAssociation: async () => false,
        listOpeningResponseAssociationsByOpening: async () => [],
      },
    });

    expect(viewport.sections.reflectiveObjects.items).toHaveLength(1);
    expect(viewport.windows.objectsWindow.hasMore).toBe(true);
    expect(viewport.windows.dialogueWindow.section).toBe("dialogues");
    expect(viewport.payloadGuardrails.maxSerializedBytes).toBeGreaterThan(0);
    expect(viewport.sections.openingDialogues.items[0]?.lineage.openingResponseContext).toBe("activation_without_response");
  });

  it("enforces section window contracts and bounded omissions", async () => {
    const objects = Array.from({ length: 25 }, (_, index) => ({
      id: `obj-${index + 1}`,
      userId: "user-2",
      objectType: "dream" as const,
      title: `Object ${index + 1}`,
      primaryContent: "x".repeat(400),
      sourceContext: "manual" as const,
      state: "active" as const,
      metadata: {},
      createdAt: `2026-05-${String(25 - index).padStart(2, "0")}T00:00:00.000Z`,
      updatedAt: `2026-05-${String(25 - index).padStart(2, "0")}T00:00:00.000Z`,
    }));

    const viewport = await composeReflectiveSpaceViewport({
      userId: "user-2",
      objectLimit: 8,
      dialogueLimit: 5,
      reflectiveObjectRepository: {
        create: async () => { throw new Error("not used"); },
        getById: async () => null,
        listByUser: async () => objects,
        update: async () => null,
        archive: async () => null,
      },
      observationRepository: {
        create: async () => { throw new Error("not used"); },
        listByReflectiveObject: async () => [],
        getById: async () => null,
      },
      glossaryRepository: {
        listTerms: async () => [],
        getTermById: async () => null,
        renameTerm: async () => null,
        listCandidates: async () => [],
        listCandidatesByReflectiveObject: async () => [],
        getCandidateById: async () => null,
        upsertCandidates: async () => [],
        setCandidateLifecycle: async () => null,
        createAssociation: async () => { throw new Error("not used"); },
      },
      threadRepository: {
        createThread: async () => { throw new Error("not used"); },
        getThreadById: async () => null,
        listThreadsByUser: async () => [],
        updateThread: async () => null,
        setThreadState: async () => null,
        archiveThread: async () => null,
        createObjectAssociation: async () => { throw new Error("not used"); },
        createGlossaryAssociation: async () => { throw new Error("not used"); },
        listAssociationsByThread: async () => [],
      },
      openingRepository: {
        createOpening: async () => { throw new Error("not used"); },
        getOpeningById: async () => null,
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
        listOpeningActivationEventsByWindow: async () => [],
        createOpeningResponseAssociation: async () => { throw new Error("not used"); },
        removeOpeningResponseAssociation: async () => false,
        listOpeningResponseAssociationsByOpening: async () => [],
      },
    });

    expect(viewport.sections.reflectiveObjects.items).toHaveLength(8);
    expect(viewport.windows.objectsWindow.limit).toBe(8);
    expect(viewport.windows.objectsWindow.hasMore).toBe(true);
    expect(viewport.windows.objectsWindow.section).toBe("reflective_objects");
    expect(viewport.windows.dialogueWindow.section).toBe("dialogues");
    expect(viewport.payloadGuardrails.estimatedSerializedBytes).toBeLessThanOrEqual(viewport.payloadGuardrails.maxSerializedBytes);
  });
});
