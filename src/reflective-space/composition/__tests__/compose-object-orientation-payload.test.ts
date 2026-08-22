import { describe, expect, it } from "vitest";

import { composeObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";

describe("composeObjectOrientationPayload", () => {
  it("builds a dream-centered orientation payload from existing object, glossary, and opening runtime data", async () => {
    const payload = await composeObjectOrientationPayload({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      reflectiveObjectRepository: {
        create: async () => {
          throw new Error("not used");
        },
        getById: async () => ({
          id: "obj-1",
          userId: "user-1",
          objectType: "dream",
          title: "Lantern House",
          primaryContent: "I was inside a house with water under the floorboards.",
          sourceContext: "manual",
          state: "active",
          metadata: {},
          createdAt: "2026-06-03T08:00:00.000Z",
          updatedAt: "2026-06-03T08:00:00.000Z",
        }),
        listByUser: async () => [],
        update: async () => null,
        archive: async () => null,
      },
      observationRepository: {
        create: async () => {
          throw new Error("not used");
        },
        listByReflectiveObject: async () => [
          {
            id: "obs-1",
            userId: "user-1",
            reflectiveObjectId: "obj-1",
            source: "system_descriptive_extract",
            summary: "A house, water, and a doorway remain central.",
            uncertaintyNotes: [],
            semanticPolicyResult: "accept",
            semanticPolicyReasons: [],
            provenanceTier: "system_extract",
            summaryTrace: [],
            latentBackflowGuard: "observation_only",
            boundaryVersion: "v1",
            status: "active",
            fragments: [
              {
                id: "frag-1",
                observationId: "obs-1",
                reflectiveObjectId: "obj-1",
                userId: "user-1",
                category: "location",
                fragmentText: "House",
                evidenceAdequacy: "snippet_only",
                evidence: {
                  snippet: "house",
                  spanStart: 0,
                  spanEnd: 5,
                  contextLabel: null,
                },
                uncertaintyNote: null,
                position: 0,
                createdAt: "2026-06-03T08:01:00.000Z",
                updatedAt: "2026-06-03T08:01:00.000Z",
              },
              {
                id: "frag-2",
                observationId: "obs-1",
                reflectiveObjectId: "obj-1",
                userId: "user-1",
                category: "object",
                fragmentText: "Doorway",
                evidenceAdequacy: "snippet_only",
                evidence: {
                  snippet: "doorway",
                  spanStart: 0,
                  spanEnd: 7,
                  contextLabel: null,
                },
                uncertaintyNote: null,
                position: 1,
                createdAt: "2026-06-03T08:01:00.000Z",
                updatedAt: "2026-06-03T08:01:00.000Z",
              },
            ],
            createdAt: "2026-06-03T08:01:00.000Z",
            updatedAt: "2026-06-03T08:01:00.000Z",
          },
        ],
        getById: async () => null,
      },
      observationNativeReadRepository: {
        getByReflectiveObjectId: async () => ({
          family: "v2",
          native: {
          bundleId: "bundle-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          source: "system_llm_extract",
          runtimeVersion: "observation_v2_phase1",
          uncertaintyNotes: [],
          provenance: {
            provenanceTier: "system_extract",
            semanticPolicyResult: "accept_with_uncertainty",
            semanticPolicyReasons: [],
            latentBackflowGuard: "observation_only",
            boundaryVersion: "observation_v2_phase1",
          },
          scenes: [
            {
              sceneId: "scene-1",
              position: 0,
              summary: "A house and doorway remain central.",
              boundaryReasoning: [],
              evidenceContext: {
                snippet: "house and doorway",
                spanStart: 0,
                spanEnd: 17,
                contextLabel: "scene",
              },
              observations: [],
              derived: {
                actors: [],
                locations: [{ label: "House", observationIds: ["obsv2-1"] }],
                objects: [{ label: "Doorway", observationIds: ["obsv2-1"] }],
                interactions: [],
                affect: [],
                agency: [],
                phenomenology: [],
                metacognition: [],
              },
            },
            {
              sceneId: "scene-2",
              position: 1,
              summary: "Water stayed under the floorboards.",
              boundaryReasoning: [],
              evidenceContext: {
                snippet: "water under the floorboards",
                spanStart: 0,
                spanEnd: 27,
                contextLabel: "scene",
              },
              observations: [],
              derived: {
                actors: [],
                locations: [],
                objects: [{ label: "Water", observationIds: ["obsv2-2"] }],
                interactions: [],
                affect: [],
                agency: [],
                phenomenology: [],
                metacognition: [],
              },
            },
          ],
          },
        }),
      },
      glossaryRepository: {
        listTerms: async () => [],
        listTermsByReflectiveObject: async () => [
          {
            id: "term-bridge",
            userId: "user-1",
            normalizedKey: "bridge",
            displayLabel: "Bridge",
            canonicalLabel: "Bridge",
            type: "place",
            aliases: [],
            generalNote: "Recurring crossing point.",
            appearanceCount: 2,
            notes: "Recurring crossing point.",
            state: "active",
            suppression: { state: "none", suppressedAt: null, reason: null },
            createdAt: "2026-06-03T08:01:00.000Z",
            updatedAt: "2026-06-03T08:01:00.000Z",
          },
        ],
        getTermById: async () => null,
        listAppearanceRecordsByTerm: async () => [],
        createTerm: async () => {
          throw new Error("not used");
        },
        updateTerm: async () => null,
        listCandidates: async () => [
          {
            id: "cand-1",
            userId: "user-1",
            reflectiveObjectId: "obj-1",
            normalizedKey: "house",
            displayLabel: "House",
            sourceCategory: "location",
            sourceObservationId: "obs-1",
            sourceObservationFragmentId: "frag-1",
            recurrenceCount: 3,
            candidateClass: "new_candidate",
            proposedEntityIds: [],
            state: "pinned",
            suppression: { state: "none", suppressedAt: null, reason: null },
            continuityVisibility: null,
            lastSeenAt: "2026-06-03T08:01:00.000Z",
            createdAt: "2026-06-03T08:01:00.000Z",
            updatedAt: "2026-06-03T08:01:00.000Z",
          },
          {
            id: "cand-2",
            userId: "user-1",
            reflectiveObjectId: "obj-2",
            normalizedKey: "house",
            displayLabel: "House",
            sourceCategory: "location",
            sourceObservationId: "obs-2",
            sourceObservationFragmentId: "frag-2",
            recurrenceCount: 1,
            candidateClass: "new_candidate",
            proposedEntityIds: [],
            state: "candidate",
            suppression: { state: "none", suppressedAt: null, reason: null },
            continuityVisibility: null,
            lastSeenAt: "2026-06-05T08:01:00.000Z",
            createdAt: "2026-06-05T08:01:00.000Z",
            updatedAt: "2026-06-05T08:01:00.000Z",
          },
        ],
        listCandidatesByReflectiveObject: async () => [
          {
            id: "cand-1",
            userId: "user-1",
            reflectiveObjectId: "obj-1",
            normalizedKey: "house",
            displayLabel: "House",
            sourceCategory: "location",
            sourceObservationId: "obs-1",
            sourceObservationFragmentId: "frag-1",
            recurrenceCount: 3,
            candidateClass: "new_candidate",
            proposedEntityIds: [],
            state: "pinned",
            suppression: { state: "none", suppressedAt: null, reason: null },
            continuityVisibility: null,
            lastSeenAt: "2026-06-03T08:01:00.000Z",
            createdAt: "2026-06-03T08:01:00.000Z",
            updatedAt: "2026-06-03T08:01:00.000Z",
          },
        ],
        getCandidateById: async () => null,
        upsertCandidates: async () => [],
        setCandidateLifecycle: async () => null,
        resolveCandidate: async () => null,
        createAssociation: async () => {
          throw new Error("not used");
        },
        createAppearanceRecord: async () => null,
      },
      threadRepository: {
        createThread: async () => {
          throw new Error("not used");
        },
        getThreadById: async () => null,
        listThreadsByUser: async () => [],
        updateThread: async () => null,
        setThreadState: async () => null,
        archiveThread: async () => null,
        createObjectAssociation: async () => {
          throw new Error("not used");
        },
        createGlossaryAssociation: async () => {
          throw new Error("not used");
        },
        listAssociationsByThread: async () => [],
      },
      openingRepository: {
        createOpening: async () => {
          throw new Error("not used");
        },
        getOpeningById: async () => null,
        listOpeningSurfacesByUser: async () => [],
        listDormantSuppressedOpeningsByUser: async () => [],
        listRecentOpeningsByUser: async () => [
          {
            id: "opening-new",
            userId: "user-1",
            openingType: "continuity_noticing",
            tone: "gentle",
            utterance: "The doorway may matter here.",
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
              sourceObservations: ["obs-1"],
              sourceGlossaryTerms: [],
              sourceThreads: [],
              sourceResponses: [],
              latentSnapshotReference: null,
              confidenceBand: "tentative",
              openingGenerationContext: "test",
              openingContext: {
                context: "A threshold between staying inside and moving onward.",
                sourceOpportunityManifestationId: "manifestation-1",
                openingKind: "question",
                sourceRuntime: "opening_v2_constructor_mvp",
              },
            },
            activatedAt: null,
            dismissedAt: null,
            archivedAt: null,
            createdAt: "2026-06-03T08:02:00.000Z",
            updatedAt: "2026-06-03T08:02:00.000Z",
          },
          {
            id: "opening-active",
            userId: "user-1",
            openingType: "reflective_question",
            tone: "curious",
            utterance: "What shifts when the water stays hidden?",
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
              sourceGlossaryTerms: [],
              sourceThreads: [],
              sourceResponses: [],
              latentSnapshotReference: null,
              confidenceBand: "moderate",
              openingGenerationContext: "test",
              openingContext: {
                context: "The hidden water keeps the pressure below the scene.",
                sourceOpportunityManifestationId: "manifestation-2",
                openingKind: "question",
                sourceRuntime: "opening_v2_constructor_mvp",
              },
            },
            activatedAt: "2026-06-03T08:03:00.000Z",
            dismissedAt: null,
            archivedAt: null,
            createdAt: "2026-06-03T08:03:00.000Z",
            updatedAt: "2026-06-03T08:03:00.000Z",
          },
          {
            id: "opening-dormant",
            userId: "user-1",
            openingType: "reflective_recall",
            tone: "calm",
            utterance: "This dream may revisit an older threshold.",
            state: "available",
            visibility: "invitation_surface",
            suppressionState: "suppressed",
            suppressionDuration: "temporary",
            suppressionReason: "quiet_for_now",
            suppressionExpiry: { at: "2026-06-04T08:04:00.000Z" },
            suppressionRevisitEligibility: "revisitable_dormant",
            suppressionReactivatedAt: null,
            provenance: {
              sourceObjects: ["obj-1"],
              sourceObservations: ["obs-1"],
              sourceGlossaryTerms: [],
              sourceThreads: [],
              sourceResponses: [],
              latentSnapshotReference: null,
              confidenceBand: "tentative",
              openingGenerationContext: "test",
              openingContext: {
                context: "The dream may be revisiting a familiar edge.",
                sourceOpportunityManifestationId: "manifestation-3",
                openingKind: "question",
                sourceRuntime: "opening_v2_constructor_mvp",
              },
            },
            activatedAt: null,
            dismissedAt: null,
            archivedAt: null,
            createdAt: "2026-06-03T08:04:00.000Z",
            updatedAt: "2026-06-03T08:04:00.000Z",
          },
          {
            id: "opening-other-object",
            userId: "user-1",
            openingType: "juxtaposition",
            tone: "spacious",
            utterance: "This belongs elsewhere.",
            state: "available",
            visibility: "invitation_surface",
            suppressionState: "none",
            suppressionDuration: null,
            suppressionReason: null,
            suppressionExpiry: { at: null },
            suppressionRevisitEligibility: "revisitable_dormant",
            suppressionReactivatedAt: null,
            provenance: {
              sourceObjects: ["obj-2"],
              sourceObservations: [],
              sourceGlossaryTerms: [],
              sourceThreads: [],
              sourceResponses: [],
              latentSnapshotReference: null,
              confidenceBand: "tentative",
              openingGenerationContext: "test",
              openingContext: {
                context: "Unrelated context.",
                sourceOpportunityManifestationId: "manifestation-4",
                openingKind: "question",
                sourceRuntime: "opening_v2_constructor_mvp",
              },
            },
            activatedAt: null,
            dismissedAt: null,
            archivedAt: null,
            createdAt: "2026-06-03T08:05:00.000Z",
            updatedAt: "2026-06-03T08:05:00.000Z",
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
      },
    });

    expect(payload?.dream.title).toBe("Lantern House");
    expect(payload?.dream.editHref).toBe("/objects/obj-1/reflect");
    expect(payload?.dream.preview).toBe("A house and doorway remain central. Water stayed under the floorboards.");
    expect(payload?.glossary.items.map((item) => item.label)).toEqual(["House", "Bridge"]);
    expect(payload?.glossary.items.map((item) => item.status)).toEqual(["new", "saved"]);
    expect(payload?.glossary.items[0]).toMatchObject({
      candidateClass: "new_candidate",
      status: "new",
      continuityVisibility: {
        possibleContinuity: true,
        dreamCount: 2,
        firstSeenAt: "2026-06-03T08:01:00.000Z",
        lastSeenAt: "2026-06-05T08:01:00.000Z",
      },
    });
    expect(payload?.glossary.items[1]).toMatchObject({
      label: "Bridge",
      canonicalLabel: "Bridge",
      status: "saved",
      href: null,
    });
    expect(payload?.openingStack.counts).toEqual({ new: 1, active: 1, dormant: 1, all: 3 });
    expect(payload?.threadOverview).toEqual([
      { state: "new", count: 1 },
      { state: "active", count: 1 },
      { state: "dormant", count: 1 },
    ]);
    expect(payload?.openingStack.items.map((item) => item.id)).toEqual([
      "opening-new",
      "opening-active",
      "opening-dormant",
    ]);
    expect(payload?.openingStack.items.map((item) => item.context)).toEqual([
      "A threshold between staying inside and moving onward.",
      "The hidden water keeps the pressure below the scene.",
      "The dream may be revisiting a familiar edge.",
    ]);
  });

  it("returns null when the reflective object does not exist for the user", async () => {
    const payload = await composeObjectOrientationPayload({
      userId: "user-1",
      reflectiveObjectId: "missing",
      reflectiveObjectRepository: {
        create: async () => {
          throw new Error("not used");
        },
        getById: async () => null,
        listByUser: async () => [],
        update: async () => null,
        archive: async () => null,
      },
      observationRepository: {
        create: async () => {
          throw new Error("not used");
        },
        listByReflectiveObject: async () => [],
        getById: async () => null,
      },
      observationNativeReadRepository: {
        getByReflectiveObjectId: async () => null,
      },
      glossaryRepository: {
        listTerms: async () => [],
        listTermsByReflectiveObject: async () => [],
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
      threadRepository: {
        createThread: async () => {
          throw new Error("not used");
        },
        getThreadById: async () => null,
        listThreadsByUser: async () => [],
        updateThread: async () => null,
        setThreadState: async () => null,
        archiveThread: async () => null,
        createObjectAssociation: async () => {
          throw new Error("not used");
        },
        createGlossaryAssociation: async () => {
          throw new Error("not used");
        },
        listAssociationsByThread: async () => [],
      },
      openingRepository: {
        createOpening: async () => {
          throw new Error("not used");
        },
        getOpeningById: async () => null,
        listOpeningSurfacesByUser: async () => [],
        listDormantSuppressedOpeningsByUser: async () => [],
        listRecentOpeningsByUser: async () => [],
        listOpeningsByLatentSnapshot: async () => [],
        activateOpening: async () => null,
        reactivateOpening: async () => null,
        dismissOpening: async () => null,
        setSuppression: async () => null,
        recordSurfaceEvent: async () => {
          throw new Error("not used");
        },
      },
    });

    expect(payload).toBeNull();
  });

  it("supports explicit V3 native observation previews without requiring V2 bundle ids", async () => {
    const payload = await composeObjectOrientationPayload({
      userId: "user-v3",
      reflectiveObjectId: "obj-v3",
      observationResolution: "explicit_v3",
      reflectiveObjectRepository: {
        create: async () => { throw new Error("not used"); },
        getById: async () => ({
          id: "obj-v3",
          userId: "user-v3",
          objectType: "dream",
          title: "Courtyard dream",
          primaryContent: "Fallback text",
          sourceContext: "manual",
          state: "active",
          metadata: {},
          createdAt: "2026-06-21T08:00:00.000Z",
          updatedAt: "2026-06-21T08:00:00.000Z",
        }),
        listByUser: async () => [],
        update: async () => null,
        archive: async () => null,
      },
      observationRepository: {
        create: async () => { throw new Error("not used"); },
        listByReflectiveObject: async () => [],
        getById: async () => null,
      },
      observationNativeReadRepository: {
        getByReflectiveObjectId: async ({ resolution }) => {
          expect(resolution).toBe("explicit_v3");
          return {
            family: "v3",
            native: {
              canonicalCandidate: {
                localities: [],
                descriptiveUnits: [
                  {
                    canonicalUnitId: "unit-1",
                    localityId: null,
                    order: 0,
                    statement: "A quiet courtyard keeps holding the dream in place.",
                    evidenceRefs: [],
                    uncertainty: null,
                    derivedFromUnitIds: [],
                  },
                ],
              },
            } as any,
          };
        },
      },
      glossaryRepository: {
        listTerms: async () => [],
        listTermsByReflectiveObject: async () => [],
        getTermById: async () => null,
        listAppearanceRecordsByTerm: async () => [],
        createTerm: async () => { throw new Error("not used"); },
        updateTerm: async () => null,
        listCandidates: async () => [],
        listCandidatesByReflectiveObject: async () => [],
        getCandidateById: async () => null,
        upsertCandidates: async () => [],
        setCandidateLifecycle: async () => null,
        resolveCandidate: async () => null,
        createAssociation: async () => { throw new Error("not used"); },
        createAppearanceRecord: async () => null,
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
    });

    expect(payload?.dream.preview).toBe("A quiet courtyard keeps holding the dream in place.");
  });
});
