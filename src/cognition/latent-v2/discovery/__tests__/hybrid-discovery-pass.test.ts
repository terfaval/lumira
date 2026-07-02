import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();
let mockOpenAiApiKey: string | null = "sk-test";

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: responsesCreateMock,
    };
  },
}));

vi.mock("@/src/infrastructure/environment/env", () => ({
  readRuntimeEnvironment: () => ({
    nodeEnv: "test",
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    openAiApiKey: mockOpenAiApiKey,
  }),
}));

import {
  buildDiscoveryCuePacket,
  buildDiscoveryPrompt,
  runHybridDiscoveryPass,
  generateDiscoveryLlmOutput,
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

function createHybridDiscoveryOutput() {
  return {
    generationContext: {
      runtimeVersion: "latent_discovery_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    candidateStructures: [
      {
        candidateId: "candidate-pollution-cleansing",
        origin: "dream_originated",
        sceneRefs: ["scene-1", "scene-2"],
        evidenceGroups: [
          {
            groupId: "group-pollution",
            sceneRef: "scene-1",
            observationRefs: ["bundle-1:scene-1:obs-1", "bundle-1:scene-1:obs-2"],
            boundaryNotes: ["The scene turns from routine presence into trying to manage the atmosphere."],
          },
          {
            groupId: "group-cleansing",
            sceneRef: "scene-2",
            observationRefs: ["bundle-1:scene-2:obs-1", "bundle-1:scene-2:obs-2"],
            boundaryNotes: ["The workplace gives way to a more exploratory healing-oriented search."],
          },
        ],
        provisionalStructureType: "repair_sequence",
        structureSketch: {
          nodes: ["polluted workplace", "healing search", "possible cleansing response"],
          relations: ["pollution gives way to healing-oriented searching"],
          tensions: ["pressure persists while healing remains incomplete"],
          gaps: ["The cleansing or cure is not secured."],
        },
        distinctnessRationale: "The healing-search movement stays structurally separate from later twin separation and helper signals.",
        uncertainty: ["The cure is not found yet."],
      },
      {
        candidateId: "candidate-twin-separation",
        origin: "dream_originated",
        sceneRefs: ["scene-3"],
        evidenceGroups: [
          {
            groupId: "group-twin-separation",
            sceneRef: "scene-3",
            observationRefs: ["bundle-1:scene-3:obs-1", "bundle-1:scene-3:obs-2"],
            boundaryNotes: ["A twin relationship becomes explicit and then disrupted."],
          },
        ],
        provisionalStructureType: "gap",
        structureSketch: {
          nodes: ["twin bond", "labyrinth separation", "continuing search"],
          relations: ["separation opens into searching"],
          tensions: ["connection and loss remain held together"],
          gaps: ["The twin remains missing."],
        },
        distinctnessRationale: "Twin separation has its own local evidence cluster and unresolved absence structure.",
        uncertainty: ["The twin remains missing."],
      },
      {
        candidateId: "candidate-search-structure",
        origin: "dream_originated",
        sceneRefs: ["scene-2", "scene-3"],
        evidenceGroups: [
          {
            groupId: "group-search-healing",
            sceneRef: "scene-2",
            observationRefs: ["bundle-1:scene-2:obs-1", "bundle-1:scene-2:obs-2"],
            boundaryNotes: [],
          },
          {
            groupId: "group-search-twin",
            sceneRef: "scene-3",
            observationRefs: ["bundle-1:scene-3:obs-2"],
            boundaryNotes: [],
          },
        ],
        provisionalStructureType: "search_structure",
        structureSketch: {
          nodes: ["healing mushroom", "twin", "ongoing search movement"],
          relations: ["search repeats across distinct dream neighborhoods"],
          tensions: [],
          gaps: ["Search remains unresolved in more than one scene."],
        },
        distinctnessRationale: "The repeating search movement spans scenes without collapsing the healing and twin structures into one candidate core.",
        uncertainty: ["The cure is not found yet.", "The twin remains missing."],
      },
      {
        candidateId: "candidate-late-helper",
        origin: "dream_originated",
        sceneRefs: ["scene-4"],
        evidenceGroups: [
          {
            groupId: "group-late-helper",
            sceneRef: "scene-4",
            observationRefs: ["bundle-1:scene-4:obs-1", "bundle-1:scene-4:obs-2"],
            boundaryNotes: ["The scene narrows from search into resisting relocation and noticing possible support."],
          },
        ],
        provisionalStructureType: "salience_signal",
        structureSketch: {
          nodes: ["resistance to relocation", "possible helper", "late-scene lucidity"],
          relations: ["possible support appears alongside resistance"],
          tensions: ["support remains uncertain while resistance stays active"],
          gaps: ["The helper remains uncertain rather than fully established."],
        },
        distinctnessRationale: "The late-scene helper signal remains separate instead of being absorbed into earlier search or separation structures.",
        uncertainty: ["The helper remains uncertain rather than fully established."],
      },
    ],
  };
}

describe("hybrid latent discovery pass", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
    mockOpenAiApiKey = "sk-test";
  });

  it("builds lightweight heuristic cues without turning them into final candidates", () => {
    const cues = buildDiscoveryCuePacket({
      packet: createDiscoveryInputPacket(),
    });

    expect(cues.sceneCues.map((sceneCue) => sceneCue.sceneRef)).toEqual(["scene-1", "scene-2", "scene-3", "scene-4"]);
    expect(cues.sceneCues[1].cueSignals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining(["transition", "search", "repair"]),
    );
    expect(cues.sceneCues[2].cueSignals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining(["search", "absence"]),
    );
    expect(cues.sceneCues[3].cueSignals.map((signal) => signal.kind)).toEqual(
      expect.arrayContaining(["late_scene_salience", "absence"]),
    );
    expect("candidateHints" in cues.sceneCues[0]).toBe(false);
  });

  it("builds a discovery prompt that preserves multiplicity without asking for opportunities", () => {
    const packet = createDiscoveryInputPacket();
    const prompt = buildDiscoveryPrompt({
      packet,
      cues: buildDiscoveryCuePacket({ packet }),
    });

    expect(prompt).toContain("What potentially distinct reflective structures exist?");
    expect(prompt).toContain("Preserve multiplicity.");
    expect(prompt).toContain("Preserve ambiguity.");
    expect(prompt).toContain("Do not construct Opportunities.");
    expect(prompt).toContain("Do not choose the most important structure.");
    expect(prompt).toContain("Heuristic cues are guidance only, not final candidate decisions.");
    expect(prompt).toContain("\"cueSignals\"");
  });

  it("fails cleanly when the OpenAI API key is missing", async () => {
    mockOpenAiApiKey = null;

    const result = await generateDiscoveryLlmOutput({
      packet: createDiscoveryInputPacket(),
      cues: buildDiscoveryCuePacket({
        packet: createDiscoveryInputPacket(),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      reason: "missing_openai_api_key",
    });
  });

  it("runs the non-production hybrid pass through cueing, llm output, parser, and validator", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify(createHybridDiscoveryOutput()),
    });

    const packet = createDiscoveryInputPacket();
    const result = await runHybridDiscoveryPass({
      packet,
    });

    expect(result.mode).toBe("generated");
    if (result.mode !== "generated") {
      return;
    }

    expect(result.output.candidateStructures).toHaveLength(4);
    expect(result.output.candidateStructures.map((candidate) => candidate.provisionalStructureType)).toEqual(
      expect.arrayContaining(["repair_sequence", "gap", "search_structure", "salience_signal"]),
    );
    expect(result.output.candidateStructures.some((candidate) => candidate.sceneRefs.includes("scene-4"))).toBe(true);
    expect(
      result.output.candidateStructures.some((candidate) =>
        candidate.evidenceGroups.some(
          (group) =>
            group.sceneRef === "scene-4" &&
            group.observationRefs.includes("bundle-1:scene-4:obs-2"),
        ),
      ),
    ).toBe(true);
    expect(
      result.output.candidateStructures.some((candidate) =>
        candidate.uncertainty.includes("The helper remains uncertain rather than fully established."),
      ),
    ).toBe(true);

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    expect(requestBody.input).toContain("What potentially distinct reflective structures exist?");
    expect(requestBody.input).toContain("Heuristic cues are guidance only, not final candidate decisions.");
    expect(requestBody.text.format.name).toBe("lumira_latent_discovery_v1");
  });

  it("rejects malformed llm discovery output before returning a discovery result", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        generationContext: {
          runtimeVersion: "latent_discovery_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        candidateStructures: [
          {
            candidateId: "candidate-invalid",
            origin: "dream_originated",
            sceneRefs: ["scene-9"],
            evidenceGroups: [],
            provisionalStructureType: "gap",
            structureSketch: {
              nodes: [],
              relations: [],
              tensions: [],
              gaps: [],
            },
            distinctnessRationale: "invalid",
            uncertainty: [],
          },
        ],
      }),
    });

    const result = await runHybridDiscoveryPass({
      packet: createDiscoveryInputPacket(),
    });

    expect(result).toEqual({
      mode: "failed",
      reason: "scene_ref_out_of_scope",
      details: expect.objectContaining({
        candidateId: "candidate-invalid",
        sceneRef: "scene-9",
      }),
    });
  });
});
