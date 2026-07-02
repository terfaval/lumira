import { describe, expect, it } from "vitest";

import {
  discoverCandidateStructures,
  parseAndValidateDiscoveryOutput,
  parseDiscoveryOutput,
  validateDiscoveryOutput,
  type DiscoveryInputPacket,
} from "@/src/cognition/latent-v2/discovery";

function createDiscoveryInputPacket(): DiscoveryInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_discovery_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Dense multi-scene dream",
      objectLanguage: "en",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2_phase1",
      semanticPolicyResult: "accept_with_uncertainty",
      bundleUncertaintyNotes: ["Some boundaries remain fuzzy."],
    },
    discoveryPolicy: {
      persistence: "ephemeral",
      recreatableFromUpstream: true,
      countsAsSystemMemory: false,
    },
    priorityObject: {
      content:
        "I move through a polluted workplace, search for a healing mushroom, get separated from my twin, resist being taken away, and later notice a possible helper near the end.",
      summary: "A dense dream with search, separation, cleansing, and late-scene helper signals.",
    },
    scenes: [
      {
        sceneRowId: "bundle-1:scene-1",
        sceneStableId: "scene-1",
        position: 1,
        summary: "Workplace pressure mixes with polluted atmosphere.",
        evidenceSnippet: "polluted workplace",
        boundarySignals: [
          {
            kind: "goal_change",
            note: "The scene turns from routine presence into trying to manage the atmosphere.",
          },
        ],
        derivedStructures: {
          actors: ["dreamer", "coworkers"],
          locations: ["workplace"],
          objects: ["polluted water"],
          interactions: ["trying to continue working"],
          affect: ["pressure"],
          agency: ["continuing anyway"],
          metacognition: [],
          phenomenology: ["noise"],
        },
        observations: [
          {
            observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
            observationStableId: "obs-1",
            position: 1,
            text: "The workplace feels polluted and noisy.",
            category: "phenomenology",
            evidence: [{ snippet: "polluted and noisy", spanStart: 0, spanEnd: 18 }],
            uncertaintyNote: null,
          },
          {
            observationV2SceneObservationId: "bundle-1:scene-1:obs-2",
            observationStableId: "obs-2",
            position: 2,
            text: "I keep trying to continue working despite the pressure.",
            category: "interaction",
            evidence: [{ snippet: "continue working", spanStart: 22, spanEnd: 38 }],
            uncertaintyNote: "It is unclear whether the effort helps.",
          },
        ],
      },
      {
        sceneRowId: "bundle-1:scene-2",
        sceneStableId: "scene-2",
        position: 2,
        summary: "The dream turns toward cleansing and healing search.",
        evidenceSnippet: "search for a healing mushroom",
        boundarySignals: [
          {
            kind: "spatial_change",
            note: "The workplace gives way to a more exploratory healing-oriented search.",
          },
        ],
        derivedStructures: {
          actors: ["dreamer"],
          locations: ["healing terrain"],
          objects: ["healing mushroom"],
          interactions: ["searching"],
          affect: ["hope"],
          agency: ["actively searching"],
          metacognition: [],
          phenomenology: [],
        },
        observations: [
          {
            observationV2SceneObservationId: "bundle-1:scene-2:obs-1",
            observationStableId: "obs-1",
            position: 1,
            text: "I search for a healing mushroom.",
            category: "interaction",
            evidence: [{ snippet: "search for a healing mushroom", spanStart: 0, spanEnd: 29 }],
            uncertaintyNote: null,
          },
          {
            observationV2SceneObservationId: "bundle-1:scene-2:obs-2",
            observationStableId: "obs-2",
            position: 2,
            text: "The search feels hopeful but unresolved.",
            category: "affect",
            evidence: [{ snippet: "hopeful but unresolved", spanStart: 17, spanEnd: 39 }],
            uncertaintyNote: "The cure is not found yet.",
          },
        ],
      },
      {
        sceneRowId: "bundle-1:scene-3",
        sceneStableId: "scene-3",
        position: 3,
        summary: "The dream enters twin separation and labyrinth movement.",
        evidenceSnippet: "separated from my twin",
        boundarySignals: [
          {
            kind: "actor_change",
            note: "A twin relationship becomes explicit and then disrupted.",
          },
        ],
        derivedStructures: {
          actors: ["dreamer", "twin"],
          locations: ["labyrinth"],
          objects: [],
          interactions: ["searching", "getting separated"],
          affect: ["loss"],
          agency: ["trying to find the twin"],
          metacognition: [],
          phenomenology: [],
        },
        observations: [
          {
            observationV2SceneObservationId: "bundle-1:scene-3:obs-1",
            observationStableId: "obs-1",
            position: 1,
            text: "I get separated from my twin in a labyrinth.",
            category: "interaction",
            evidence: [{ snippet: "separated from my twin", spanStart: 6, spanEnd: 28 }],
            uncertaintyNote: null,
          },
          {
            observationV2SceneObservationId: "bundle-1:scene-3:obs-2",
            observationStableId: "obs-2",
            position: 2,
            text: "I keep trying to search for the twin.",
            category: "agency",
            evidence: [{ snippet: "search for the twin", spanStart: 18, spanEnd: 37 }],
            uncertaintyNote: "The twin remains missing.",
          },
        ],
      },
      {
        sceneRowId: "bundle-1:scene-4",
        sceneStableId: "scene-4",
        position: 4,
        summary: "A late scene introduces resistance and a possible helper.",
        evidenceSnippet: "resist being taken away",
        boundarySignals: [
          {
            kind: "goal_change",
            note: "The scene narrows from search into resisting relocation and noticing possible support.",
          },
        ],
        derivedStructures: {
          actors: ["dreamer", "possible helper"],
          locations: ["exit edge"],
          objects: [],
          interactions: ["resisting", "noticing support"],
          affect: ["alertness"],
          agency: ["resisting being taken elsewhere"],
          metacognition: [],
          phenomenology: ["lucidity"],
        },
        observations: [
          {
            observationV2SceneObservationId: "bundle-1:scene-4:obs-1",
            observationStableId: "obs-1",
            position: 1,
            text: "I resist being taken somewhere else.",
            category: "agency",
            evidence: [{ snippet: "resist being taken", spanStart: 2, spanEnd: 21 }],
            uncertaintyNote: null,
          },
          {
            observationV2SceneObservationId: "bundle-1:scene-4:obs-2",
            observationStableId: "obs-2",
            position: 2,
            text: "A possible helper appears near the end.",
            category: "actor",
            evidence: [{ snippet: "possible helper", spanStart: 2, spanEnd: 17 }],
            uncertaintyNote: "The helper remains uncertain rather than fully established.",
          },
        ],
      },
    ],
  };
}

describe("latent discovery runtime", () => {
  it("fails parsing when candidate structures are malformed", () => {
    const parsed = parseDiscoveryOutput({
      generationContext: {
        runtimeVersion: "latent_discovery_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      candidateStructures: [
        {
          candidateId: "",
        },
      ],
    });

    expect(parsed).toBeNull();
  });

  it("rejects candidate structures with scene refs outside the input packet", () => {
    const input = createDiscoveryInputPacket();
    const invalidOutput = {
      generationContext: {
        runtimeVersion: "latent_discovery_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      candidateStructures: [
        {
          candidateId: "candidate-1",
          origin: "dream_originated",
          sceneRefs: ["scene-missing"],
          evidenceGroups: [
            {
              groupId: "group-1",
              sceneRef: "scene-missing",
              observationRefs: ["bundle-1:scene-1:obs-1"],
              boundaryNotes: [],
            },
          ],
          provisionalStructureType: "gap",
          structureSketch: {
            nodes: ["missing helper"],
            relations: [],
            tensions: [],
            gaps: ["unclear support"],
          },
          distinctnessRationale: "Anchored to a scene that is not in the packet.",
          uncertainty: ["Support remains unclear."],
        },
      ],
    };

    const parsed = parseDiscoveryOutput(invalidOutput);
    expect(parsed).not.toBeNull();
    if (!parsed) {
      return;
    }

    const validated = validateDiscoveryOutput({
      inputPacket: input,
      outputPacket: parsed,
    });

    expect(validated).toEqual({
      ok: false,
      reason: "scene_ref_out_of_scope",
      details: expect.objectContaining({
        candidateId: "candidate-1",
        sceneRef: "scene-missing",
      }),
    });
  });

  it("discovers multiple candidate structures from a dense multi-scene dream without losing late-scene material", () => {
    const input = createDiscoveryInputPacket();

    const result = discoverCandidateStructures({
      packet: input,
    });

    expect(result.mode).toBe("generated");
    if (result.mode !== "generated") {
      return;
    }

    const validated = parseAndValidateDiscoveryOutput({
      input: input,
      raw: result.output,
    });

    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }

    expect(validated.value.candidateStructures.length).toBeGreaterThanOrEqual(5);
    expect(validated.value.candidateStructures.some((candidate) => candidate.sceneRefs.includes("scene-4"))).toBe(true);
    expect(
      validated.value.candidateStructures.some((candidate) =>
        candidate.evidenceGroups.some((group) => group.sceneRef === "scene-4" && group.observationRefs.length > 0),
      ),
    ).toBe(true);
    expect(
      validated.value.candidateStructures.every((candidate) =>
        candidate.evidenceGroups.every((group) => group.observationRefs.length > 0),
      ),
    ).toBe(true);
    expect(
      validated.value.candidateStructures.map((candidate) => candidate.provisionalStructureType),
    ).toEqual(
      expect.arrayContaining(["transition", "search_structure", "gap"]),
    );
  });
});
