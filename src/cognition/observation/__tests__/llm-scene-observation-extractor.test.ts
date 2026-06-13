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
        dreamLanguage: "en",
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
    expect(result.bundle?.scenes[0].observations[0].text).toContain("spiral staircase");
    expect(result.payload?.fragments.length).toBeGreaterThan(0);
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
    expect(requestBody.text.format.schema.required).toEqual(["dreamLanguage", "scenes"]);
    expect(requestBody.text.format.schema.$defs.derivedItem.required).toEqual([
      "identityKey",
      "displayLabel",
      "sourceLanguage",
      "label",
      "observationIds",
    ]);
    expect(requestBody.input).toContain("Extract scene-first dream observations only.");
    expect(requestBody.input).toContain("Observation boundaries are based on distinct observable units, not sentence boundaries.");
    expect(requestBody.input).toContain("Set dreamLanguage to hu, en, or unknown.");
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
        errorName: "AbortError",
        errorCode: "ABORT_ERR",
        timeoutMs: 40000,
      }),
    );
  });
});
