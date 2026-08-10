import { describe, expect, it, vi } from "vitest";

import {
  executeDescriptiveExtractionAttempt,
  OBSERVATION_SCENE_EXTRACTION_MODEL,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "@/src/cognition/observation-v3/descriptive-extraction";

function buildStructuredScene() {
  return {
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
  };
}

describe("executeDescriptiveExtractionAttempt", () => {
  it("owns provider execution, prompt/schema application, parsing, normalization, and candidate construction", async () => {
    const requestStructuredOutput = vi.fn(async () => ({
      outputText: JSON.stringify(buildStructuredScene()),
      providerDiagnostics: {
        elapsedMs: 18,
        providerStatus: "completed",
        providerIncompleteReason: null,
        providerReturnedStructuredOutput: true,
        inputTokenUsage: 12,
        outputTokenUsage: 24,
        totalTokenUsage: 36,
      },
    }));

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      attempt: 1,
      requestStructuredOutput,
    });

    expect(requestStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        model: OBSERVATION_SCENE_EXTRACTION_MODEL,
        timeoutMs: OPENAI_REQUEST_TIMEOUT_MS,
        schemaName: "lumira_scene_observation_extraction",
        schema: expect.any(Object),
        prompt: expect.stringContaining("Dream text:\nA guide leads the dreamer up a staircase."),
      }),
    );
    expect(result).toMatchObject({
      status: "candidate_available",
      candidate: expect.objectContaining({
        localities: [
          expect.objectContaining({
            localityId: "scene-1",
          }),
        ],
        descriptiveUnits: [
          expect.objectContaining({
            unitId: "obs-1",
            localityId: "scene-1",
          }),
        ],
      }),
      diagnostics: expect.objectContaining({
        attempt: 1,
        providerStatus: "completed",
        providerReturnedStructuredOutput: true,
        normalizedSceneCount: 1,
        normalizedObservationCount: 1,
      }),
    });
  });

  it("fails closed inside the subsystem when structured extraction omits scenes", async () => {
    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [],
        }),
        providerDiagnostics: {
          elapsedMs: 11,
          providerStatus: "completed",
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: true,
          inputTokenUsage: 10,
          outputTokenUsage: 20,
          totalTokenUsage: 30,
        },
      }),
    });

    expect(result).toMatchObject({
      status: "missing_scenes",
      candidate: null,
      diagnostics: expect.objectContaining({
        attempt: 1,
        fallbackReason: "missing_scenes",
      }),
    });
  });

  it("emits canonical descriptive provider evidence without changing extraction semantics", async () => {
    const evidenceEvents: unknown[] = [];

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      attempt: 1,
      sourceIdentity: "OBS-A-001",
      extractionRequestId: "descriptive-request-1",
      onProviderEvidence: async (evidence) => {
        evidenceEvents.push(evidence);
      },
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify(buildStructuredScene()),
        providerDiagnostics: {
          elapsedMs: 18,
          providerStatus: "completed",
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: true,
          inputTokenUsage: 12,
          outputTokenUsage: 24,
          totalTokenUsage: 36,
        },
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(evidenceEvents).toEqual([
      expect.objectContaining({
        subsystem: "descriptive_extraction",
        sourceIdentity: "OBS-A-001",
        evidenceLifecycle: "complete",
        providerBoundary: expect.objectContaining({
          status: "completed",
          payloadHash: expect.any(String),
        }),
        parsing: expect.objectContaining({
          status: "parsed",
          structuredOutputHash: expect.any(String),
        }),
      }),
    ]);
  });

  it("supports an experiment-only derived-free provider contract without changing native candidate construction", async () => {
    const requestStructuredOutput = vi.fn(async () => ({
      outputText: JSON.stringify({
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
          },
        ],
      }),
      providerDiagnostics: {
        elapsedMs: 18,
        providerStatus: "completed",
        providerIncompleteReason: null,
        providerReturnedStructuredOutput: true,
        inputTokenUsage: 12,
        outputTokenUsage: 24,
        totalTokenUsage: 36,
      },
    }));

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: "A guide leads the dreamer up a staircase.",
      attempt: 1,
      contractVariant: "no_derived",
      requestStructuredOutput,
    });

    expect(requestStructuredOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaName: "lumira_scene_observation_extraction_without_derived",
        schema: expect.not.objectContaining({
          properties: expect.objectContaining({
            scenes: expect.objectContaining({
              items: expect.objectContaining({
                properties: expect.objectContaining({
                  derived: expect.anything(),
                }),
              }),
            }),
          }),
        }),
        prompt: expect.not.stringContaining("then Derived Structures"),
      }),
    );
    expect(result).toMatchObject({
      status: "candidate_available",
      candidate: expect.objectContaining({
        localities: [
          expect.objectContaining({
            localityId: "scene-1",
          }),
        ],
        descriptiveUnits: [
          expect.objectContaining({
            unitId: "obs-1",
          }),
        ],
      }),
    });
  });
});
