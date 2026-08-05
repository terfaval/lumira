import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();

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
    openAiApiKey: "sk-test",
  }),
}));

import {
  buildLlmSceneObservationExtraction,
  buildSceneObservationExtractionFromStructuredResult,
} from "@/src/cognition/observation/llm-scene-observation-extractor";
import type { CompletenessAnalysisShadowResult } from "@/src/cognition/observation-v3/completeness-analysis";
import type { SourceAnalysisShadowResult } from "@/src/cognition/observation-v3/source-analysis";

function buildLongDreamText(): string {
  return [
    "I was at work and people kept mocking me while I tried to stay calm.",
    "Then I became lucid and realized the dream was unstable.",
    "After that I left the building and wandered through a large city full of smoke and dirty water.",
    "I kept trying to cleanse the streets and guide people toward clearer spaces.",
    "Later I was with my twin and we were arguing about how to help someone who was hurt.",
    "There was a fire response, a maze-like structure, and a feeling of separation.",
    "At the end we moved through snow toward a coastline and a helper finally appeared.",
  ]
    .join(" ")
    .repeat(10);
}

function buildUndercoveredStructuredScene() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream stays in the opening workplace conflict.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 320,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is in a workplace while others mock and pressure them.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [
            {
              identityKey: "coworkers",
              displayLabel: "coworkers",
              sourceLanguage: "en",
              label: "coworkers",
              observationIds: ["obs-1"],
            },
          ],
          locations: [
            {
              identityKey: "workplace",
              displayLabel: "workplace",
              sourceLanguage: "en",
              label: "workplace",
              observationIds: ["obs-1"],
            },
          ],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildTransitionHeavyMacroScene() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream stays in one large scene even as the situation shifts from mockery to lucidity to searching to conflict to escape.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 340,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "Then the dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "After that the dreamer leaves the building and wanders through a city full of smoke and dirty water.",
            evidence: [
              {
                snippet: "After that I left the building and wandered through a large city full of smoke and dirty water.",
                spanStart: 125,
                spanEnd: 220,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-4",
            position: 3,
            text: "The dreamer tries to cleanse the streets and guide people toward clearer spaces.",
            evidence: [
              {
                snippet: "I kept trying to cleanse the streets and guide people toward clearer spaces.",
                spanStart: 221,
                spanEnd: 300,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-5",
            position: 4,
            text: "Later the dreamer argues with a twin about helping someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-6",
            position: 5,
            text: "At the end they move through snow toward a coastline and a helper finally appears.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: 388,
                spanEnd: 470,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildEndingCompressedStructuredDream(dreamText: string) {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream moves from conflict into lucid wandering and relational tension.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 387,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "The dreamer wanders through a smoke-filled city and tries to guide people.",
            evidence: [
              {
                snippet: "After that I left the building and wandered through a large city full of smoke and dirty water.",
                spanStart: 125,
                spanEnd: 220,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-4",
            position: 3,
            text: "The dreamer argues with a twin about how to help someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
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
        summary: "At the end the dream reaches the coastline.",
        boundaryReasoning: [{ kind: "goal_change", note: "The ending moves toward a final destination." }],
        evidenceContext: {
          snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
          spanStart: dreamText.length - 500,
          spanEnd: dreamText.length - 10,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-5",
            position: 0,
            text: "At the end they move toward a coastline.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildMeaningfullyRetainedEndingStructuredDream(dreamText: string) {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dream moves from workplace mockery into lucid instability and conflict.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I was at work and people kept mocking me while I tried to stay calm.",
          spanStart: 0,
          spanEnd: 387,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The dreamer is mocked at work while trying to stay calm.",
            evidence: [
              {
                snippet: "I was at work and people kept mocking me while I tried to stay calm.",
                spanStart: 0,
                spanEnd: 68,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer becomes lucid and realizes the dream is unstable.",
            evidence: [
              {
                snippet: "Then I became lucid and realized the dream was unstable.",
                spanStart: 69,
                spanEnd: 124,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "The dreamer argues with a twin about how to help someone who is hurt.",
            evidence: [
              {
                snippet: "Later I was with my twin and we were arguing about how to help someone who was hurt.",
                spanStart: 301,
                spanEnd: 387,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
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
        summary: "The ending moves through snow toward a coastline and the helper finally appears.",
        boundaryReasoning: [{ kind: "goal_change", note: "The ending shifts into a final movement and encounter." }],
        evidenceContext: {
          snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
          spanStart: dreamText.length - 500,
          spanEnd: dreamText.length - 10,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-4",
            position: 0,
            text: "At the end they move through snow toward a coastline.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-5",
            position: 1,
            text: "A helper finally appears at the coastline, changing the ending encounter.",
            evidence: [
              {
                snippet: "At the end we moved through snow toward a coastline and a helper finally appeared.",
                spanStart: dreamText.length - 500,
                spanEnd: dreamText.length - 10,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function buildPhenomenologyWithoutMetacognitionStructuredDream() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The house changes shape and family roles shift without explicit dreamer reflection.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "The hallway folded back into itself and the rooms were suddenly inside each other.",
          spanStart: 0,
          spanEnd: 142,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The hallway folds back into itself and the rooms are suddenly inside each other.",
            evidence: [
              {
                snippet: "The hallway folded back into itself and the rooms were suddenly inside each other.",
                spanStart: 0,
                spanEnd: 78,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer's sister is suddenly also their mother while everyone continues acting normally.",
            evidence: [
              {
                snippet: "My sister was suddenly also my mother and nobody reacted to it.",
                spanStart: 79,
                spanEnd: 142,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [{ identityKey: "house", displayLabel: "house", sourceLanguage: "en", label: "house", observationIds: ["obs-1"] }],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [
            { identityKey: "impossible_space", displayLabel: "impossible space", sourceLanguage: "en", label: "impossible space", observationIds: ["obs-1"] },
            { identityKey: "altered_identity", displayLabel: "altered identity", sourceLanguage: "en", label: "altered identity", observationIds: ["obs-2"] },
          ],
          metacognition: [],
        },
      },
    ],
  };
}

function buildExplicitMetacognitionStructuredDream() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The dreamer notices the dream has become unstable and recognizes they are still dreaming.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I noticed the mirror showed the wrong face and then realized I was still dreaming.",
          spanStart: 0,
          spanEnd: 149,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The mirror shows the wrong face when the dreamer looks into it.",
            evidence: [
              {
                snippet: "I noticed the mirror showed the wrong face",
                spanStart: 0,
                spanEnd: 42,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer notices the mismatch, realizes they are still dreaming, and becomes unsure whether waking is possible.",
            evidence: [
              {
                snippet: "then realized I was still dreaming and wondered if waking up was possible",
                spanStart: 43,
                spanEnd: 117,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [{ identityKey: "bedroom", displayLabel: "bedroom", sourceLanguage: "en", label: "bedroom", observationIds: ["obs-1", "obs-2"] }],
          objects: [{ identityKey: "mirror", displayLabel: "mirror", sourceLanguage: "en", label: "mirror", observationIds: ["obs-1"] }],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [
            { identityKey: "strange_reflection", displayLabel: "strange reflection", sourceLanguage: "en", label: "strange reflection", observationIds: ["obs-1"] },
          ],
          metacognition: [
            { identityKey: "lucid_awareness", displayLabel: "lucid awareness", sourceLanguage: "en", label: "lucid awareness", observationIds: ["obs-2"] },
            { identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty", sourceLanguage: "en", label: "awareness of uncertainty", observationIds: ["obs-2"] },
          ],
        },
      },
    ],
  };
}

function buildWeirdEventWithoutAwarenessStructuredDream() {
  return {
    dreamLanguage: "en",
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "The environment keeps changing but the dreamer does not explicitly notice or reflect on it.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "The street kept turning into a river and then back into pavement while people kept walking.",
          spanStart: 0,
          spanEnd: 149,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "The street keeps turning into a river and then back into pavement while people keep walking.",
            evidence: [
              {
                snippet: "The street kept turning into a river and then back into pavement while people kept walking.",
                spanStart: 0,
                spanEnd: 89,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer keeps moving with the crowd without any explicit realization about the changes.",
            evidence: [
              {
                snippet: "I just kept moving with them toward the station.",
                spanStart: 90,
                spanEnd: 136,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [],
          locations: [{ identityKey: "street", displayLabel: "street", sourceLanguage: "en", label: "street", observationIds: ["obs-1"] }],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [
            { identityKey: "environmental_instability", displayLabel: "environmental instability", sourceLanguage: "en", label: "environmental instability", observationIds: ["obs-1"] },
          ],
          metacognition: [],
        },
      },
    ],
  };
}

describe("buildSceneObservationExtractionFromStructuredResult", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
  });

  it("parses a scene-first structured payload into a V2 bundle and V1 projection", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase. Later the dreamer cannot move, feels anxious, notices time distortion, and knows something is wrong.",
      structured: {
        dreamLanguage: "en",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "The dreamer follows a guide and later becomes anxious and unable to move.",
            boundaryReasoning: [],
            evidenceContext: { snippet: "a guide leads upward", contextLabel: "scene" },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "The dreamer follows a young male up a spiral staircase.",
                evidence: [{ snippet: "a guide leads upward", contextLabel: "quoted_support" }],
                uncertaintyNote: null,
              },
              {
                observationId: "obs-2",
                position: 1,
                text: "Later the dreamer cannot move, feels anxious, notices distorted time, and knows something is wrong.",
                evidence: [{ snippet: "cannot move and knows something is wrong", contextLabel: "quoted_support" }],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [{ identityKey: "young_male", displayLabel: "young male", sourceLanguage: "en", label: "young male", observationIds: ["obs-1"] }],
              locations: [{ identityKey: "spiral_staircase", displayLabel: "spiral staircase", sourceLanguage: "en", label: "spiral staircase", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [{ identityKey: "guidance", displayLabel: "guidance", sourceLanguage: "en", label: "guidance", observationIds: ["obs-1"] }],
              affect: [{ identityKey: "anxiety", displayLabel: "anxiety", sourceLanguage: "en", label: "anxiety", observationIds: ["obs-2"] }],
              agency: [{ identityKey: "being_unable", displayLabel: "being unable", sourceLanguage: "en", label: "being unable", observationIds: ["obs-2"] }],
              phenomenology: [{ identityKey: "distorted_time", displayLabel: "distorted time", sourceLanguage: "en", label: "distorted time", observationIds: ["obs-2"] }],
              metacognition: [{ identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty", sourceLanguage: "en", label: "awareness of uncertainty", observationIds: ["obs-2"] }],
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.provenance?.dreamLanguage).toBe("en");
    expect(result.bundle?.scenes[0].derived.actors[0]).toMatchObject({
      identityKey: "young_male",
      displayLabel: "young male",
      sourceLanguage: "en",
      label: "young male",
    });
    expect(result.bundle?.scenes[0].derived.interactions).toEqual([
      expect.objectContaining({ identityKey: "guidance", displayLabel: "guidance" }),
    ]);
    expect(result.bundle?.scenes[0].derived.affect).toEqual([
      expect.objectContaining({ identityKey: "anxiety", displayLabel: "anxiety" }),
    ]);
    expect(result.bundle?.scenes[0].derived.agency).toEqual([
      expect.objectContaining({ identityKey: "being_unable", displayLabel: "being unable" }),
    ]);
    expect(result.bundle?.scenes[0].derived.phenomenology).toEqual([
      expect.objectContaining({ identityKey: "distorted_time", displayLabel: "distorted time" }),
    ]);
    expect(result.bundle?.scenes[0].derived.metacognition).toEqual([
      expect.objectContaining({ identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty" }),
    ]);
    expect(result.bundle?.scenes[0].observations[0].text).toContain("spiral staircase");
    expect(result.payload?.fragments.length).toBeGreaterThan(0);
  });

  it("preserves explicit phenomenology without inventing metacognition", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText:
        "The hallway folded back into itself and the rooms were suddenly inside each other. My sister was suddenly also my mother and nobody reacted to it.",
      structured: buildPhenomenologyWithoutMetacognitionStructuredDream(),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes[0].derived.phenomenology).toEqual([
      expect.objectContaining({ identityKey: "impossible_space", displayLabel: "impossible space" }),
      expect.objectContaining({ identityKey: "altered_identity", displayLabel: "altered identity" }),
    ]);
    expect(result.bundle?.scenes[0].derived.metacognition).toEqual([]);
  });

  it("preserves explicit metacognitive awareness when the dreamer notices and realizes something", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText:
        "I noticed the mirror showed the wrong face and then realized I was still dreaming and wondered if waking up was possible.",
      structured: buildExplicitMetacognitionStructuredDream(),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes[0].derived.metacognition).toEqual([
      expect.objectContaining({ identityKey: "lucid_awareness", displayLabel: "lucid awareness" }),
      expect.objectContaining({ identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty" }),
    ]);
    expect(
      result.bundle?.scenes[0].observations.some((observation) =>
        observation.text.includes("notices") || observation.text.includes("realizes"),
      ),
    ).toBe(true);
  });

  it("does not invent metacognition when weird events occur without explicit awareness", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText:
        "The street kept turning into a river and then back into pavement while people kept walking. I just kept moving with them toward the station.",
      structured: buildWeirdEventWithoutAwarenessStructuredDream(),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes[0].derived.phenomenology).toEqual([
      expect.objectContaining({ identityKey: "environmental_instability", displayLabel: "environmental instability" }),
    ]);
    expect(result.bundle?.scenes[0].derived.metacognition).toEqual([]);
  });

  it("calls the provider with a scene-first schema and returns a validated scene bundle", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        dreamLanguage: "en",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "The dreamer follows a guide.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "a guide leads upward",
              spanStart: 0,
              spanEnd: 20,
              contextLabel: "scene",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "The dreamer follows a young male up a spiral staircase.",
                evidence: [
                  {
                    snippet: "a guide leads upward",
                    spanStart: 0,
                    spanEnd: 20,
                    contextLabel: "quoted_support",
                  },
                ],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [{ identityKey: "young_male", displayLabel: "young male", sourceLanguage: "en", label: "young male", observationIds: ["obs-1"] }],
              locations: [{ identityKey: "spiral_staircase", displayLabel: "spiral staircase", sourceLanguage: "en", label: "spiral staircase", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [{ identityKey: "guidance", displayLabel: "guidance", sourceLanguage: "en", label: "guidance", observationIds: ["obs-1"] }],
              affect: [],
              agency: [{ identityKey: "following", displayLabel: "following", sourceLanguage: "en", label: "following", observationIds: ["obs-1"] }],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      }),
    });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(1);

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    const requestOptions = responsesCreateMock.mock.calls[0]?.[1];
    expect(requestBody.text.format.schema.required).toEqual(["dreamLanguage", "scenes"]);
    expect(requestBody.text.format.schema.$defs.derivedItem.required).toEqual([
      "identityKey",
      "displayLabel",
      "sourceLanguage",
      "label",
      "observationIds",
    ]);
    expect(requestBody.input).toContain("Extract scene-first dream observations only.");
    expect(requestBody.input).toContain(
      "Preserve meaningful material from the beginning, middle, and end of the dream when it is present.",
    );
    expect(requestBody.input).toContain(
      "Do not let the ending collapse into a thin or summary-only trace when the later dream contains meaningful transitions, encounters, emotional shifts, dream-state changes, or unresolved ending states.",
    );
    expect(requestBody.input).toContain(
      "Do not force equal detail across beginning, middle, and end. Preserve what is meaningfully present without padding sparse sections.",
    );
    expect(requestBody.input).toContain("Do not rely only on location change when deciding scene boundaries.");
    expect(requestBody.input).toContain(
      "Situational shifts, relational shifts, goal-state shifts, and dream-logic shifts may require a new scene even when the location remains similar.",
    );
    expect(requestBody.input).toContain(
      "Examples of meaningful scene-boundary signals include: a new activity, a new social situation, a new objective, a new problem, a relational reversal, or a change in world rules.",
    );
    expect(requestBody.input).toContain(
      "Do not create a new scene for every small action. Preserve meaningful scenes, not micro-scenes.",
    );
    expect(requestBody.input).toContain("Observation boundaries are based on distinct observable units, not sentence boundaries.");
    expect(requestBody.input).toContain("Set dreamLanguage to hu, en, or unknown.");
    expect(requestBody.input).toContain("interactions");
    expect(requestBody.input).toContain("affect");
    expect(requestBody.input).toContain("agency");
    expect(requestBody.input).toContain("phenomenology");
    expect(requestBody.input).toContain("metacognition");
    expect(requestBody.input).toContain(
      "Phenomenology = experiential dream qualities and reality-behavior anomalies such as impossible space, transformed environments, altered scale, altered identity, discontinuity, impossible causality, strange reflections, unusual realism, sensory emphasis, or distorted time.",
    );
    expect(requestBody.input).toContain(
      "Metacognition = explicit dreamer awareness states such as noticing something strange, realizing something changed, recognizing the dream state, awareness of uncertainty, awareness of remembering, awareness of not knowing, self-observation, or lucid awareness.",
    );
    expect(requestBody.input).toContain(
      "Extract these categories only when supported by explicit dream evidence or strongly implied by directly described dream action.",
    );
    expect(requestBody.input).toContain(
      "Capture anomalies and awareness only as described in the dream. Do not interpret them as symbolism, psychology, hidden meaning, or diagnosis.",
    );
    expect(requestBody.input).toContain(
      "Do not infer metacognition from unusual events alone, and do not force phenomenology or metacognition when the evidence is weak or absent.",
    );
    expect(requestBody.input).toContain(
      "Do not generate meanings, hypotheses, reflective questions, opportunities, tensions, or latent reasoning.",
    );
    expect(requestOptions.timeout).toBe(180000);
  });

  it("preserves Hungarian display labels while keeping stable identity keys", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "Apám állt az ajtóban, és egy segítő intett nekem.",
      structured: {
        dreamLanguage: "hu",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "Az apa és egy segítő jelenik meg.",
            boundaryReasoning: [],
            evidenceContext: { snippet: "Apám állt az ajtóban", contextLabel: "scene" },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "Az apa az ajtóban áll.",
                evidence: [{ snippet: "Apám állt az ajtóban", contextLabel: "quoted_support" }],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [
                { identityKey: "father", displayLabel: "Apa", sourceLanguage: "hu", label: "Apa", observationIds: ["obs-1"] },
                { identityKey: "helper", displayLabel: "Segítő", sourceLanguage: "hu", label: "Segítő", observationIds: ["obs-1"] },
              ],
              locations: [{ identityKey: "doorway", displayLabel: "Ajtó", sourceLanguage: "hu", label: "Ajtó", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [],
              affect: [],
              agency: [],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      },
    });

    expect(result.bundle?.provenance?.dreamLanguage).toBe("hu");
    expect(result.bundle?.scenes[0].derived.actors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ identityKey: "father", displayLabel: "Apa", sourceLanguage: "hu" }),
        expect.objectContaining({ identityKey: "helper", displayLabel: "Segítő", sourceLanguage: "hu" }),
      ]),
    );
  });
  it("fails closed for obvious long-dream undercoverage in structured extraction", async () => {
    const attemptEvidence: unknown[] = [];
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
      structured: buildUndercoveredStructuredScene(),
      onAttemptEvidence: (evidence) => {
        attemptEvidence.push(evidence);
      },
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "coverage_guard_failed",
      diagnostics: {
        fallbackReason: "coverage_guard_failed",
      },
    });
    expect(attemptEvidence).toEqual([
      expect.objectContaining({
        attempt: 1,
        status: "candidate_rejected",
        acceptedAttempt: false,
        causedFinalFallback: true,
        candidateBundle: expect.objectContaining({
          scenes: expect.any(Array),
        }),
        diagnostics: expect.objectContaining({
          guardVerdict: "coverage_guard_failed",
          fallbackReason: "coverage_guard_failed",
        }),
      }),
    ]);
  });

  it("fails closed for obvious long-dream macro-scene over-merge in structured extraction", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
      structured: buildTransitionHeavyMacroScene(),
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "overmerge_guard_failed",
      diagnostics: {
        fallbackReason: "overmerge_guard_failed",
      },
    });
  });

  it("does not trip the coverage guard for short single-scene dreams", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "I was at work, someone challenged me, and I woke up after standing up for myself.",
      structured: buildUndercoveredStructuredScene(),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(1);
  });

  it("does not trip the coverage guard when a long dream has multiple extracted scenes", async () => {
    const longDream = buildLongDreamText();

    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      structured: buildMeaningfullyRetainedEndingStructuredDream(longDream),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(2);
  });

  it("fails closed for obvious long-dream ending compression when late material is only thinly represented", async () => {
    const longDream = buildLongDreamText();

    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      structured: buildEndingCompressedStructuredDream(longDream),
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "late_section_guard_failed",
      diagnostics: {
        fallbackReason: "late_section_guard_failed",
      },
    });
  });

  it("accepts long dreams when late material is meaningfully retained", async () => {
    const longDream = buildLongDreamText();

    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      structured: buildMeaningfullyRetainedEndingStructuredDream(longDream),
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(2);
  });

  it("logs provider diagnostics and falls back when the OpenAI request fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const providerError = Object.assign(new Error("Rate limit exceeded"), {
      name: "RateLimitError",
      status: 429,
      code: "rate_limit_exceeded",
    });
    responsesCreateMock.mockRejectedValue(providerError);

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
    });

    expect(result).toEqual({
      mode: "fallback",
      reason: "provider_error",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "llm_scene_observation_extraction_provider_error",
      expect.objectContaining({
        reflectiveObjectId: "object-1",
        errorName: "RateLimitError",
        errorMessage: "Rate limit exceeded",
        errorStatus: 429,
        errorCode: "rate_limit_exceeded",
      }),
    );
  });

  it("retries once through the same extractor path when the first response is undercovered", async () => {
    const longDream = buildLongDreamText();
    const attemptEvidence: unknown[] = [];
    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildUndercoveredStructuredScene()),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildMeaningfullyRetainedEndingStructuredDream(longDream)),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      onAttemptEvidence: (evidence) => {
        attemptEvidence.push(evidence);
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(2);
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
    expect(attemptEvidence).toEqual([
      expect.objectContaining({
        attempt: 1,
        status: "candidate_rejected",
        acceptedAttempt: false,
      }),
      expect.objectContaining({
        attempt: 2,
        status: "candidate_accepted",
        acceptedAttempt: true,
      }),
    ]);
  });

  it("retries once through the same extractor path when the first response is obviously over-merged", async () => {
    const longDream = buildLongDreamText();

    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildTransitionHeavyMacroScene()),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildMeaningfullyRetainedEndingStructuredDream(longDream)),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(2);
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed after a retry when repeated responses remain severely undercovered", async () => {
    const attemptEvidence: unknown[] = [];
    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildUndercoveredStructuredScene()),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildUndercoveredStructuredScene()),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
      onAttemptEvidence: (evidence) => {
        attemptEvidence.push(evidence);
      },
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "coverage_guard_failed_after_retry",
      diagnostics: {
        fallbackReason: "coverage_guard_failed_after_retry",
      },
    });
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
    expect(attemptEvidence).toEqual([
      expect.objectContaining({
        attempt: 1,
        status: "candidate_rejected",
        acceptedAttempt: false,
        causedFinalFallback: false,
      }),
      expect.objectContaining({
        attempt: 2,
        status: "candidate_rejected",
        acceptedAttempt: false,
        causedFinalFallback: true,
      }),
    ]);
  });

  it("does not let attempt evidence collection failures change extraction behavior", async () => {
    const longDream = buildLongDreamText();
    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildUndercoveredStructuredScene()),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildMeaningfullyRetainedEndingStructuredDream(longDream)),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
      onAttemptEvidence: () => {
        throw new Error("collector exploded");
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(2);
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
  });

  it("emits a source profile through the shadow hook without changing extraction output", async () => {
    const sourceAnalysisEvents: SourceAnalysisShadowResult[] = [];
    responsesCreateMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        dreamLanguage: "en",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "A guide leads the dreamer up a staircase.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "A guide leads the dreamer up a staircase.",
              spanStart: 0,
              spanEnd: 40,
              contextLabel: "scene",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "A guide leads the dreamer up a staircase.",
                evidence: [
                  {
                    snippet: "A guide leads the dreamer up a staircase.",
                    spanStart: 0,
                    spanEnd: 40,
                    contextLabel: "quoted_support",
                  },
                ],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [],
              locations: [],
              objects: [],
              interactions: [],
              affect: [],
              agency: [],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      }),
    });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      onSourceAnalysis: async (event) => {
        sourceAnalysisEvents.push(event);
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(1);
    expect(sourceAnalysisEvents).toEqual([
      expect.objectContaining({
        status: "available",
        profile: expect.objectContaining({
          sourceMetrics: expect.objectContaining({
            characterCount: "A guide leads the dreamer up a staircase.".length,
          }),
        }),
      }),
    ]);
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("emits a completeness report through the shadow hook without changing extraction output", async () => {
    const completenessEvents: CompletenessAnalysisShadowResult[] = [];
    responsesCreateMock.mockResolvedValueOnce({
      output_text: JSON.stringify({
        dreamLanguage: "en",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "A guide leads the dreamer up a staircase.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "A guide leads the dreamer up a staircase.",
              spanStart: 0,
              spanEnd: 40,
              contextLabel: "scene",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "A guide leads the dreamer up a staircase.",
                evidence: [
                  {
                    snippet: "A guide leads the dreamer up a staircase.",
                    spanStart: 0,
                    spanEnd: 40,
                    contextLabel: "quoted_support",
                  },
                ],
                uncertaintyNote: null,
              },
            ],
            derived: {
              actors: [],
              locations: [],
              objects: [],
              interactions: [],
              affect: [],
              agency: [],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      }),
    });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      onCompletenessAnalysis: async (event) => {
        completenessEvents.push(event);
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes).toHaveLength(1);
    expect(completenessEvents).toEqual([
      expect.objectContaining({
        status: "available",
        attemptNumber: 1,
        report: expect.objectContaining({
          adequacy: "adequate",
        }),
        equivalence: expect.objectContaining({
          classification: expect.any(String),
        }),
      }),
    ]);
    expect(responsesCreateMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed after a retry when repeated responses remain obviously over-merged", async () => {
    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildTransitionHeavyMacroScene()),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildTransitionHeavyMacroScene()),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: buildLongDreamText(),
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "overmerge_guard_failed_after_retry",
      diagnostics: {
        fallbackReason: "overmerge_guard_failed_after_retry",
      },
    });
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
  });

  it("fails closed after a retry when repeated responses keep a long-dream ending as a thin trace", async () => {
    const longDream = buildLongDreamText();

    responsesCreateMock
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildEndingCompressedStructuredDream(longDream)),
      })
      .mockResolvedValueOnce({
        output_text: JSON.stringify(buildEndingCompressedStructuredDream(longDream)),
      });

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: longDream,
    });

    expect(result).toMatchObject({
      mode: "fallback",
      reason: "late_section_guard_failed_after_retry",
      diagnostics: {
        fallbackReason: "late_section_guard_failed_after_retry",
      },
    });
    expect(responsesCreateMock).toHaveBeenCalledTimes(2);
  });

  it("logs timeout diagnostics and classifies aborted requests as provider timeouts", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    responsesCreateMock.mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), {
        name: "AbortError",
        code: "ABORT_ERR",
      }),
    );

    const result = await buildLlmSceneObservationExtraction({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
    });

    expect(result).toEqual({
      mode: "fallback",
      reason: "provider_timeout",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "llm_scene_observation_extraction_provider_error",
      expect.objectContaining({
        reflectiveObjectId: "object-1",
        dreamTextLength: "A guide leads the dreamer up a staircase.".length,
        errorName: "AbortError",
        errorCode: "ABORT_ERR",
        timeoutMs: 180000,
        elapsedMs: expect.any(Number),
      }),
    );
  });
});
