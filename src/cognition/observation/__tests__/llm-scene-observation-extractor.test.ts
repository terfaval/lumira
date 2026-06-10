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

describe("buildSceneObservationExtractionFromStructuredResult", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
  });

  it("parses a scene-first structured payload into a V2 bundle and V1 projection", async () => {
    const result = await buildSceneObservationExtractionFromStructuredResult({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase, then the interaction becomes unwanted.",
      structured: {
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "The dreamer follows a guide.",
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
            ],
            derived: {
              actors: [{ label: "young male", observationIds: ["obs-1"] }],
              locations: [{ label: "spiral staircase", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [{ label: "guidance", observationIds: ["obs-1"] }],
              affect: [],
              agency: [{ label: "following", observationIds: ["obs-1"] }],
              phenomenology: [],
              metacognition: [],
            },
          },
        ],
      },
    });

    expect(result.mode).toBe("validated_llm");
    expect(result.bundle?.scenes[0].observations[0].text).toContain("spiral staircase");
    expect(result.payload?.fragments.length).toBeGreaterThan(0);
  });

  it("calls the provider with a scene-first schema and returns a validated scene bundle", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
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
              actors: [{ label: "young male", observationIds: ["obs-1"] }],
              locations: [{ label: "spiral staircase", observationIds: ["obs-1"] }],
              objects: [],
              interactions: [{ label: "guidance", observationIds: ["obs-1"] }],
              affect: [],
              agency: [{ label: "following", observationIds: ["obs-1"] }],
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
    expect(requestBody.text.format.schema.required).toEqual(["scenes"]);
    expect(requestBody.input).toContain("Extract scene-first dream observations only.");
    expect(requestBody.input).toContain("Observation boundaries are based on distinct observable units, not sentence boundaries.");
  });
});
