import { describe, expect, it } from "vitest";

import { composeDeepReflectionPayload } from "@/src/reflective-space/composition/compose-deep-reflection-payload";

describe("composeDeepReflectionPayload", () => {
  it("builds a thread-centered payload with dialogue entries, nearby context, and alternate openings", async () => {
    const payload = await composeDeepReflectionPayload({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      threadId: "thread-1",
      threadRepository: {
        createThread: async () => {
          throw new Error("not used");
        },
        getThreadById: async () => ({
          id: "thread-1",
          userId: "user-1",
          title: "Doorway thread",
          contextNote: null,
          state: "active",
          visibility: "ambient",
          dormantSince: null,
          archivedAt: null,
          continuityCues: [],
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        }),
        listThreadsByUser: async () => [],
        listThreadsByReflectiveObject: async () => [],
        updateThread: async () => null,
        setThreadState: async () => null,
        archiveThread: async () => null,
        createObjectAssociation: async () => {
          throw new Error("not used");
        },
        createGlossaryAssociation: async () => {
          throw new Error("not used");
        },
        listAssociationsByThread: async () => [
          {
            id: "thread-assoc-1",
            userId: "user-1",
            threadId: "thread-1",
            kind: "reflective_object",
            reflectiveObjectId: "obj-1",
            glossaryTermId: null,
            reflectiveResponseId: null,
            associationLabel: null,
            createdAt: "2026-06-10T10:00:00.000Z",
            updatedAt: "2026-06-10T10:00:00.000Z",
          },
        ],
      },
      openingRepository: {
        createOpening: async () => {
          throw new Error("not used");
        },
        getOpeningById: async () => ({
          id: "opening-1",
          userId: "user-1",
          openingType: "reflective_question",
          tone: "gentle",
          utterance: "What shifts at the doorway?",
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
            latentSnapshotReference: null,
            confidenceBand: "tentative",
            openingGenerationContext: "test",
            openingContext: {
              context: "A threshold between staying and moving.",
              sourceOpportunityManifestationId: "man-1",
              openingKind: "question",
              sourceRuntime: "latent_v2",
            },
            sourceOpportunityManifestationId: "man-1",
          },
          activatedAt: "2026-06-10T10:00:00.000Z",
          dismissedAt: null,
          archivedAt: null,
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        }),
        listOpeningSurfacesByUser: async () => [],
        listDormantSuppressedOpeningsByUser: async () => [],
        listRecentOpeningsByUser: async () => [
          {
            id: "opening-1",
            userId: "user-1",
            openingType: "reflective_question",
            tone: "gentle",
            utterance: "What shifts at the doorway?",
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
              latentSnapshotReference: null,
              confidenceBand: "tentative",
              openingGenerationContext: "test",
              openingContext: {
                context: "A threshold between staying and moving.",
                sourceOpportunityManifestationId: "man-1",
                openingKind: "question",
                sourceRuntime: "latent_v2",
              },
              sourceOpportunityManifestationId: "man-1",
            },
            activatedAt: "2026-06-10T10:00:00.000Z",
            dismissedAt: null,
            archivedAt: null,
            createdAt: "2026-06-10T10:00:00.000Z",
            updatedAt: "2026-06-10T10:00:00.000Z",
          },
          {
            id: "opening-2",
            userId: "user-1",
            openingType: "continuity_noticing",
            tone: "calm",
            utterance: "The stairs may carry the same tension.",
            state: "available",
            visibility: "invitation_surface",
            suppressionState: "none",
            suppressionDuration: null,
            suppressionReason: null,
            suppressionExpiry: { at: null },
            suppressionRevisitEligibility: "revisitable_dormant",
            suppressionReactivatedAt: null,
            provenance: {
              sourceObjects: ["obj-1"],
              sourceObservations: ["obs-2"],
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
            createdAt: "2026-06-10T11:00:00.000Z",
            updatedAt: "2026-06-10T11:00:00.000Z",
          },
        ],
        listOpeningsByLatentSnapshot: async () => [],
        activateOpening: async () => null,
        reactivateOpening: async () => null,
        dismissOpening: async () => null,
        setSuppression: async () => null,
        recordSurfaceEvent: async () => {
          throw new Error("not used");
        },
        attachThreadToOpening: async () => null,
      },
      responseRepository: {
        createResponse: async () => {
          throw new Error("not used");
        },
        getResponseById: async () => ({
          id: "response-1",
          userId: "user-1",
          title: "First response",
          responseText: "I stayed with the threshold instead of crossing it.",
          state: "active",
          visibility: "foreground",
          source: "manual_entry",
          archivedAt: null,
          createdAt: "2026-06-10T10:05:00.000Z",
          updatedAt: "2026-06-10T10:05:00.000Z",
        }),
        listResponsesByUser: async () => [],
        updateResponse: async () => null,
        setResponseState: async () => null,
        archiveResponse: async () => null,
        createObjectAssociation: async () => {
          throw new Error("not used");
        },
        createThreadAssociation: async () => {
          throw new Error("not used");
        },
        removeObjectAssociation: async () => false,
        removeThreadAssociation: async () => false,
        listAssociationsByResponse: async () => [
          {
            id: "response-thread-1",
            userId: "user-1",
            responseId: "response-1",
            kind: "reflective_thread",
            openingId: null,
            reflectiveObjectId: null,
            threadId: "thread-1",
            associationLabel: null,
            createdAt: "2026-06-10T10:05:00.000Z",
            updatedAt: "2026-06-10T10:05:00.000Z",
          },
        ],
        createOpeningActivationEvent: async () => {
          throw new Error("not used");
        },
        listOpeningActivationEventsByWindow: async () => [
          {
            id: "event-1",
            userId: "user-1",
            openingId: "opening-1",
            activationSource: "reflective_space_surface",
            activationContext: "reflective_space_surface",
            openingResponseContext: "activation_without_response",
            responseId: null,
            createdAt: "2026-06-10T10:00:00.000Z",
            updatedAt: "2026-06-10T10:00:00.000Z",
          },
          {
            id: "event-2",
            userId: "user-1",
            openingId: "opening-1",
            activationSource: "manual_revisit",
            activationContext: "manual_revisit",
            openingResponseContext: "response_authored",
            responseId: "response-1",
            createdAt: "2026-06-10T10:05:00.000Z",
            updatedAt: "2026-06-10T10:05:00.000Z",
          },
        ],
        createOpeningResponseAssociation: async () => {
          throw new Error("not used");
        },
        removeOpeningResponseAssociation: async () => false,
        listOpeningResponseAssociationsByOpening: async () => [
          {
            threadId: "thread-1",
            responseId: "response-1",
            openingId: "opening-1",
            activationEventId: "event-2",
            openingResponseContext: "response_authored",
            openingActivationContext: "manual_revisit",
            associationLabel: null,
            id: "assoc-1",
            userId: "user-1",
            createdAt: "2026-06-10T10:05:00.000Z",
            updatedAt: "2026-06-10T10:05:00.000Z",
          },
        ],
      },
      observationRepository: {
        create: async () => {
          throw new Error("not used");
        },
        listByReflectiveObject: async () => [],
        getById: async () => null,
      },
      observationV2Repository: {
        create: async () => {
          throw new Error("not used");
        },
        getByBundleId: async () => null,
        getByReflectiveObjectId: async () => ({
          bundleId: "bundle-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          source: "system_llm_extract",
          runtimeVersion: "observation_v2_phase1",
          uncertaintyNotes: [],
          provenance: {
            provenanceTier: "system_extract",
            semanticPolicyResult: "accept",
            semanticPolicyReasons: [],
            latentBackflowGuard: "observation_only",
            boundaryVersion: "observation_v2_phase1",
          },
          scenes: [],
        }),
      },
      glossaryRepository: {
        listTerms: async () => [],
        listTermsByReflectiveObject: async () => [
          {
            id: "term-1",
            userId: "user-1",
            normalizedKey: "doorway",
            displayLabel: "Doorway",
            canonicalLabel: "Doorway",
            type: "place",
            aliases: [],
            generalNote: "A recurring threshold image.",
            appearanceCount: 3,
            notes: null,
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-06-10T10:00:00.000Z",
            updatedAt: "2026-06-10T10:00:00.000Z",
          },
        ],
        getTermById: async () => null,
        listAppearanceRecordsByTerm: async () => [],
        createTerm: async () => {
          throw new Error("not used");
        },
        updateTerm: async () => null,
        listCandidates: async () => [],
        listCandidatesByReflectiveObject: async () => [],
        getCandidateById: async () => null,
        upsertCandidates: async () => [],
        setCandidateLifecycle: async () => null,
        resolveCandidate: async () => null,
        createAssociation: async () => {
          throw new Error("not used");
        },
        createAppearanceRecord: async () => null,
      },
      latentOpportunityRepository: {
        createIdentity: async () => {
          throw new Error("not used");
        },
        createManifestation: async () => {
          throw new Error("not used");
        },
        deleteIdentity: async () => undefined,
        deleteManifestation: async () => undefined,
        getManifestationById: async () => ({
          id: "man-1",
          identityId: "identity-1",
          userId: "user-1",
          priorityReflectiveObjectId: "obj-1",
          summary: "A threshold between staying and moving keeps repeating.",
          structure: {
            kind: "transition",
            label: "Threshold",
            elements: ["staying", "moving"],
          },
          primaryCategory: "transition",
          secondaryCategories: [],
          credibilityScore: 0.7,
          reflectivePotentialScore: 0.8,
          salienceBand: "moderate",
          salienceRationale: {},
          constructionMetadata: {},
          archivedAt: null,
          identity: {
            id: "identity-1",
            userId: "user-1",
            title: "Threshold",
            primaryCategory: "transition",
            secondaryCategories: [],
            lifecycleState: "emerging",
            status: "active",
            archivedAt: null,
            createdAt: "2026-06-10T10:00:00.000Z",
            updatedAt: "2026-06-10T10:00:00.000Z",
          },
          evidenceBlocks: [
            {
              id: "block-1",
              manifestationId: "man-1",
              userId: "user-1",
              reflectiveObjectId: "obj-1",
              role: "priority",
              summary: "The dream lingers at a doorway before moving on.",
              position: 0,
              createdAt: "2026-06-10T10:00:00.000Z",
              observations: [
                {
                  id: "ev-obs-1",
                  evidenceBlockId: "block-1",
                  userId: "user-1",
                  observationV2SceneObservationId: "obs-1",
                  sceneId: "scene-1",
                  role: "primary_support",
                  supportsNodeKeys: ["threshold"],
                  supportsEdgeIndexes: [0],
                  createdAt: "2026-06-10T10:00:00.000Z",
                },
              ],
            },
          ],
          glossaryLinks: [
            {
              id: "link-1",
              manifestationId: "man-1",
              userId: "user-1",
              glossaryTermId: "term-1",
              role: "continuity",
              createdAt: "2026-06-10T10:00:00.000Z",
            },
          ],
          createdAt: "2026-06-10T10:00:00.000Z",
          updatedAt: "2026-06-10T10:00:00.000Z",
        }),
        listManifestationsByPriorityReflectiveObject: async () => [],
        listManifestationsByIdentity: async () => [],
        listRecentManifestationsByUser: async () => [],
      },
    });

    expect(payload).not.toBeNull();
    if (!payload) {
      throw new Error("Payload should not be null.");
    }

    expect(payload.thread.id).toBe("thread-1");
    expect(payload.center.kind).toBe("thread");
    expect(payload.dialogue.entries.map((entry) => entry.role)).toEqual(["opening", "user"]);
    expect(payload.dialogue.entries[0]).toMatchObject({
      role: "opening",
      openingId: "opening-1",
    });
    expect(payload.nearbyContext.cards.map((card) => card.kind)).toEqual([
      "supporting_fragment",
      "opportunity_structure",
      "motif",
    ]);
    expect(payload.nearbyContext.cards[0]).toMatchObject({
      kind: "supporting_fragment",
      summary: "The dream lingers at a doorway before moving on.",
      details: ["Observation support: 1 linked detail"],
    });
    expect(payload.alternateOpenings.items.map((item) => item.id)).toEqual(["opening-2"]);
  });
});
