import { describe, expect, it, vi } from "vitest";

import { composeDiscoveryInputPacket } from "@/src/cognition/latent-v2/discovery";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

function createReflectiveObject(): ReflectiveObject {
  return {
    id: "object-1",
    userId: "user-1",
    objectType: "dream",
    title: "House search dream",
    primaryContent: "I move through a house searching for someone, then the scene shifts to a stairwell.",
    sourceContext: "manual",
    state: "active",
    metadata: {
      conciseSummary: "Searching through a house before the scene shifts to a stairwell.",
    },
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
  };
}

function createObservationBundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "object-1",
    userId: "user-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    uncertaintyNotes: ["Scene edges remain slightly fuzzy."],
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "hu",
    },
    scenes: [
      {
        sceneId: "scene-b",
        position: 2,
        summary: "The dreamer moves into a stairwell.",
        boundaryReasoning: [
          {
            kind: "spatial_change",
            note: "The house interior gives way to a stairwell.",
          },
        ],
        evidenceContext: {
          snippet: "the scene shifts to a stairwell",
          spanStart: 58,
          spanEnd: 87,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-b2",
            position: 2,
            text: "The scene now centers on a stairwell.",
            evidence: [
              {
                snippet: "shifts to a stairwell",
                spanStart: 67,
                spanEnd: 87,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-b1",
            position: 1,
            text: "Movement continues through the transition.",
            evidence: [
              {
                snippet: "scene shifts",
                spanStart: 58,
                spanEnd: 70,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: "The precise transition tone is unclear.",
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: [] }],
          locations: [{ identityKey: "stairwell", displayLabel: "lépcsőház", sourceLanguage: "hu", observationIds: ["obs-b2"] }],
          objects: [],
          interactions: [{ identityKey: "moving", displayLabel: "haladás", sourceLanguage: "hu", observationIds: ["obs-b1"] }],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-a",
        position: 1,
        summary: "The dreamer searches through a house.",
        boundaryReasoning: [
          {
            kind: "goal_change",
            note: "Wandering sharpens into active searching.",
          },
        ],
        evidenceContext: {
          snippet: "move through a house searching for someone",
          spanStart: 2,
          spanEnd: 43,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-a2",
            position: 2,
            text: "Uncertainty builds during the search.",
            evidence: [
              {
                snippet: "searching for someone",
                spanStart: 22,
                spanEnd: 43,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: "The source of uncertainty is not explicit.",
          },
          {
            observationId: "obs-a1",
            position: 1,
            text: "The dreamer searches through the house.",
            evidence: [
              {
                snippet: "move through a house searching for someone",
                spanStart: 2,
                spanEnd: 43,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: [] }],
          locations: [{ identityKey: "house", displayLabel: "ház", sourceLanguage: "hu", observationIds: [] }],
          objects: [],
          interactions: [{ identityKey: "searching", displayLabel: "keresés", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          affect: [{ identityKey: "uncertainty", displayLabel: "bizonytalanság", sourceLanguage: "hu", observationIds: ["obs-a2"] }],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function createRepositories(): {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationV2Repository: ObservationV2Repository;
} {
  return {
    reflectiveObjectRepository: {
      create: vi.fn(),
      getById: vi.fn().mockResolvedValue(createReflectiveObject()),
      listByUser: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
    },
    observationV2Repository: {
      create: vi.fn(),
      getByBundleId: vi.fn(),
      getByReflectiveObjectId: vi.fn().mockResolvedValue(createObservationBundle()),
      archive: vi.fn(),
    },
  };
}

describe("composeDiscoveryInputPacket", () => {
  it("preserves scenes as scene-grouped observation clusters", async () => {
    const repositories = createRepositories();

    const packet = await composeDiscoveryInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.scenes).toHaveLength(2);
    expect(packet.scenes[0].sceneStableId).toBe("scene-a");
    expect(packet.scenes[0].observations.map((observation) => observation.observationStableId)).toEqual(["obs-a1", "obs-a2"]);
    expect(packet.scenes[1].sceneStableId).toBe("scene-b");
    expect(packet.scenes[1].observations.map((observation) => observation.observationStableId)).toEqual(["obs-b1", "obs-b2"]);
  });

  it("infers observation categories from derived observation links instead of defaulting every observation to other", async () => {
    const repositories = createRepositories();

    const packet = await composeDiscoveryInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.scenes[0].observations.map((observation) => observation.category)).toEqual(["interaction", "affect"]);
    expect(packet.scenes[1].observations.map((observation) => observation.category)).toEqual(["interaction", "location"]);
  });

  it("marks discovery output as ephemeral runtime scaffolding", async () => {
    const repositories = createRepositories();

    const packet = await composeDiscoveryInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.generationContext.runtimeVersion).toBe("latent_discovery_v1");
    expect(packet.discoveryPolicy).toEqual({
      persistence: "ephemeral",
      recreatableFromUpstream: true,
      countsAsSystemMemory: false,
    });
  });
});
