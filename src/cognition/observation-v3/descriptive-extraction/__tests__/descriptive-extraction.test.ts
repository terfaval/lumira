import { describe, expect, it, vi } from "vitest";

import {
  buildSceneExtractionJsonSchema,
  executeDescriptiveExtractionAttempt,
  OBSERVATION_SCENE_EXTRACTION_MODEL,
  OPENAI_REQUEST_TIMEOUT_MS,
} from "@/src/cognition/observation-v3/descriptive-extraction";
import { buildDescriptiveExtractionPrompt } from "@/src/cognition/observation-v3/descriptive-extraction/parser";

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

function buildDerived(): Record<string, never[]> {
  return {
    actors: [],
    locations: [],
    objects: [],
    interactions: [],
    affect: [],
    agency: [],
    phenomenology: [],
    metacognition: [],
  };
}

describe("executeDescriptiveExtractionAttempt", () => {
  it("hardens the prompt against overlapping broad-and-fine observation restatement", () => {
    const prompt = buildDescriptiveExtractionPrompt("Emma returns home and an argument turns into kissing.");

    expect(prompt).toContain(
      "Do not restate the same underlying scene material once as a broad observation and again as overlapping finer observations unless the finer observations add genuinely distinct descriptive evidence.",
    );
    expect(prompt).toContain(
      "Split one scene into multiple observations only when each resulting observation preserves a materially distinct descriptive fact.",
    );
    expect(prompt).toContain(
      "Do not multiply unresolved or ambiguous material into competing observations merely to increase granularity.",
    );
  });

  it("hardens the schema contract around distinct-evidence observation splitting", () => {
    const schema = buildSceneExtractionJsonSchema("control");
    const observations = schema.properties.scenes.items.properties.observations;
    const observationItem = observations.items;

    expect(observations.description).toBe(
      "Use multiple observations only when each one preserves genuinely distinct descriptive evidence within the scene. Do not restate the same underlying scene chain at both broader and narrower granularities.",
    );
    expect(observationItem.properties.text.description).toBe(
      "One evidence-linked descriptive unit. Do not summarize a broader scene chain here if the same material is already represented by overlapping finer observations, and do not split unless the resulting observations contain materially distinct descriptive facts.",
    );
    expect(observationItem.properties.uncertaintyNote.description).toBe(
      "Preserve real uncertainty when needed, but do not multiply one unresolved ambiguity into competing overlapping observations merely to increase granularity.",
    );
  });

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
            groundingDegradation: undefined,
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

  it("preserves valid source-absolute spans when they exactly match the source snippet", async () => {
    const dreamText = "A guide leads the dreamer up a staircase. Later the dreamer wakes.";
    const earlySnippet = "A guide leads the dreamer up a staircase.";
    const lateSnippet = "Later the dreamer wakes.";
    const earlyStart = dreamText.indexOf(earlySnippet);
    const lateStart = dreamText.indexOf(lateSnippet);

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "A guide leads the dreamer upward before waking.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: earlySnippet,
              spanStart: earlyStart,
              spanEnd: earlyStart + earlySnippet.length,
              contextLabel: "scene",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "The dreamer is guided up a staircase.",
              evidence: [{
                snippet: earlySnippet,
                spanStart: earlyStart,
                spanEnd: earlyStart + earlySnippet.length,
                contextLabel: "quoted_support",
              }],
              uncertaintyNote: null,
            }, {
              observationId: "obs-2",
              position: 1,
              text: "Later the dreamer wakes.",
              evidence: [{
                snippet: lateSnippet,
                spanStart: lateStart,
                spanEnd: lateStart + lateSnippet.length,
                contextLabel: "quoted_support",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.descriptiveUnits[0]?.evidenceRefs[0]).toMatchObject({
      snippet: earlySnippet,
      spanStart: earlyStart,
      spanEnd: earlyStart + earlySnippet.length,
    });
    expect(result.candidate?.descriptiveUnits[1]?.evidenceRefs[0]).toMatchObject({
      snippet: lateSnippet,
      spanStart: lateStart,
      spanEnd: lateStart + lateSnippet.length,
    });
  });

  it("corrects provider-local spans through unique snippet grounding against the original source", async () => {
    const dreamText = [
      "Opening scene.",
      "Emma leans in close to inspect it.",
      "I try to give her more space.",
      "Then she turns toward me and we start kissing.",
      "Later we move to the bedroom.",
    ].join(" ");
    const localSnippet = "Then she turns toward me and we start kissing.";
    const expectedStart = dreamText.indexOf(localSnippet);

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "The interaction turns intimate.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: localSnippet,
              spanStart: 0,
              spanEnd: localSnippet.length,
              contextLabel: "window",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "They start kissing.",
              evidence: [{
                snippet: localSnippet,
                spanStart: 0,
                spanEnd: localSnippet.length,
                contextLabel: "window",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.localities[0]?.evidenceContext.spanStart).toBe(expectedStart);
    expect(result.candidate?.localities[0]?.evidenceContext.spanEnd).toBe(expectedStart + localSnippet.length);
    expect(result.candidate?.descriptiveUnits[0]?.evidenceRefs[0]?.spanStart).toBe(expectedStart);
    expect(result.candidate?.descriptiveUnits[0]?.evidenceRefs[0]?.spanEnd).toBe(expectedStart + localSnippet.length);
  });

  it("fails closed when provider evidence snippets are ambiguous in the original source", async () => {
    const repeatedSnippet = "Repeated line appears here.";
    const dreamText = [
      "Intro material.",
      repeatedSnippet,
      "Separator.",
      repeatedSnippet,
      "Ending.",
    ].join(" ");

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "A repeated line matters.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: repeatedSnippet,
              spanStart: 0,
              spanEnd: repeatedSnippet.length,
              contextLabel: "window",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "The repeated line appears.",
              evidence: [{
                snippet: repeatedSnippet,
                spanStart: 0,
                spanEnd: repeatedSnippet.length,
                contextLabel: "window",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result).toMatchObject({
      status: "missing_scenes",
      candidate: null,
      diagnostics: expect.objectContaining({
        fallbackReason: "missing_scenes",
      }),
    });
  });

  it("uses grounded scene locality to disambiguate duplicate observation snippets deterministically", async () => {
    const repeatedSnippet = "The lamp flickers.";
    const sceneSnippet = "Inside the room, the lamp flickers. A chair scrapes the floor. The lamp flickers.";
    const dreamText = [
      "Outside, the lamp flickers.",
      sceneSnippet,
      "Afterward everything goes dark.",
    ].join(" ");
    const sceneStart = dreamText.indexOf(sceneSnippet);

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "Inside the room, a repeated flicker accompanies a scraping chair.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: sceneSnippet,
              spanStart: 0,
              spanEnd: sceneSnippet.length,
              contextLabel: "window",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "The lamp flickers inside the room.",
              evidence: [{
                snippet: repeatedSnippet,
                spanStart: 0,
                spanEnd: repeatedSnippet.length,
                contextLabel: "window",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.localities[0]?.evidenceContext.spanStart).toBe(sceneStart);
    expect(result.candidate?.descriptiveUnits[0]?.evidenceRefs[0]).toMatchObject({
      spanStart: dreamText.indexOf(repeatedSnippet, sceneStart),
    });
  });

  it("reconciles safe punctuation and whitespace variance in baseline grounding", async () => {
    const dreamText = "The machine whirs loudly.\nEmma leans in close to inspect it.";

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "Emma inspects the machine closely.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "the machine whirs loudly emma leans in close to inspect it",
              spanStart: null,
              spanEnd: null,
              contextLabel: "quoted_support",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "Emma leans in close to inspect the machine.",
              evidence: [{
                snippet: "the machine whirs loudly emma leans in close to inspect it",
                spanStart: null,
                spanEnd: null,
                contextLabel: "quoted_support",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.descriptiveUnits[0]?.evidenceRefs[0]).toMatchObject({
      spanStart: 0,
      spanEnd: dreamText.length,
    });
  });

  it("fails closed when provider evidence snippets cannot be grounded to the source", async () => {
    const dreamText = "A guide leads the dreamer up a staircase.";

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "A missing snippet is returned.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "This snippet does not exist.",
              spanStart: 0,
              spanEnd: 27,
              contextLabel: "window",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "The missing snippet is described.",
              evidence: [{
                snippet: "This snippet does not exist.",
                spanStart: 0,
                spanEnd: 27,
                contextLabel: "window",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result).toMatchObject({
      status: "missing_scenes",
      candidate: null,
      diagnostics: expect.objectContaining({
        fallbackReason: "missing_scenes",
      }),
    });
  });

  it("salvages grounded descriptive units into a provisional locality when scene evidence cannot be grounded", async () => {
    const dreamText = [
      "A guide leads the dreamer up a staircase.",
      "Later the dreamer wakes in a bright room.",
    ].join(" ");
    const groundedSnippet = "Later the dreamer wakes in a bright room.";
    const groundedStart = dreamText.indexOf(groundedSnippet);

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "The dream ends with a wake-up in a bright room.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "This scene snippet does not exist in the source.",
              spanStart: 0,
              spanEnd: 43,
              contextLabel: "window",
            },
            observations: [{
              observationId: "obs-1",
              position: 0,
              text: "Later the dreamer wakes in a bright room.",
              evidence: [{
                snippet: groundedSnippet,
                spanStart: groundedStart,
                spanEnd: groundedStart + groundedSnippet.length,
                contextLabel: "quoted_support",
              }],
              uncertaintyNote: null,
            }],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate).toMatchObject({
      localities: [
        expect.objectContaining({
          localityId: "scene-1",
          label: "The dream ends with a wake-up in a bright room.",
          groundingDegradation: {
            status: "partial_scene_salvage",
            sceneGroundingFailed: true,
            salvageMethod: "observation_level_grounding",
            originalObservationCount: 1,
            retainedObservationCount: 1,
            removedObservationCount: 0,
          },
          evidenceContext: expect.objectContaining({
            snippet: groundedSnippet,
            spanStart: groundedStart,
            spanEnd: groundedStart + groundedSnippet.length,
          }),
        }),
      ],
      descriptiveUnits: [
        expect.objectContaining({
          localityId: "scene-1",
          evidenceRefs: [
            expect.objectContaining({
              snippet: groundedSnippet,
              spanStart: groundedStart,
              spanEnd: groundedStart + groundedSnippet.length,
            }),
          ],
        }),
      ],
    });
  });

  it("retains explicit grounding degradation when observation-level salvage drops ungroundable material", async () => {
    const dreamText = [
      "The dreamer enters a city.",
      "Later the dreamer wakes in a bright room.",
    ].join(" ");
    const retainedSnippet = "Later the dreamer wakes in a bright room.";
    const retainedStart = dreamText.indexOf(retainedSnippet);

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "The scene ends with waking in a bright room.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "This scene snippet does not exist in the source.",
              spanStart: 0,
              spanEnd: 43,
              contextLabel: "window",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "The dreamer enters a city.",
                evidence: [{
                  snippet: "This observation snippet is not in the source.",
                  spanStart: 0,
                  spanEnd: 41,
                  contextLabel: "window",
                }],
                uncertaintyNote: null,
              },
              {
                observationId: "obs-2",
                position: 1,
                text: retainedSnippet,
                evidence: [{
                  snippet: retainedSnippet,
                  spanStart: retainedStart,
                  spanEnd: retainedStart + retainedSnippet.length,
                  contextLabel: "quoted_support",
                }],
                uncertaintyNote: null,
              },
            ],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.localities[0]).toMatchObject({
      localityId: "scene-1",
      groundingDegradation: {
        status: "partial_scene_salvage",
        sceneGroundingFailed: true,
        salvageMethod: "observation_level_grounding",
        originalObservationCount: 2,
        retainedObservationCount: 1,
        removedObservationCount: 1,
      },
      evidenceContext: {
        snippet: retainedSnippet,
        spanStart: retainedStart,
        spanEnd: retainedStart + retainedSnippet.length,
        contextLabel: "derived_locality",
      },
    });
    expect(result.candidate?.descriptiveUnits).toEqual([
      expect.objectContaining({
        unitId: "obs-2",
        localityId: "scene-1",
        evidenceRefs: [
          expect.objectContaining({
            snippet: retainedSnippet,
            spanStart: retainedStart,
            spanEnd: retainedStart + retainedSnippet.length,
            contextLabel: "quoted_support",
          }),
        ],
      }),
    ]);
  });

  it("continues to fail closed when scene grounding and observation salvage both lose all candidate material", async () => {
    const dreamText = "The dreamer enters a city.";

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "en",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "Nothing grounds.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "This scene snippet does not exist in the source.",
              spanStart: 0,
              spanEnd: 43,
              contextLabel: "window",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "Ungroundable first observation.",
                evidence: [{
                  snippet: "This observation snippet does not exist either.",
                  spanStart: 0,
                  spanEnd: 44,
                  contextLabel: "window",
                }],
                uncertaintyNote: null,
              },
            ],
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result).toMatchObject({
      status: "missing_scenes",
      candidate: null,
      diagnostics: expect.objectContaining({
        fallbackReason: "missing_scenes",
      }),
    });
  });

  it("corrects the Emma regression geometry to original-source absolute coordinates before native C0 construction", async () => {
    const dreamText = "emmáról álmodtam. kevés előzménye van meg a történetnek, de úgy tűnt mintha jobban össze lettünk volna melegedve, mint a valóságban. legalábbis jártam már a lakásán és jobban ismertem a hobbijait meg a mindennapjait. viszont egy jó ideje már nem találkoztunk, több hónapja. aztán valahova utaztunk anyámmal és valami hiányzott, ezért elmentem emma lakására, mert biztos voltam benne, hogy nála lesz. emma viszont nem volt otthon pedig éjszaka volt. én valamiért úgy döntöttem, hogy lepihenek az ágyában - nem ez volt az első alkalom, hogy az ágyában aludtam, ezért nem zavartattam magam különösebben.. amikor felébredtem elkezdtem összeszedni a cuccaimat. gondoltam ha már itt vagyok, akkor összeszedek mindent. több szobában is voltak és egy zsákot is el kellett vennem, mert ennyi dolgot már nem tudtam kézben vinni. az igazat megvallva azt hiszem, hogy nem csak a saját cuccaimat raktam el, de emlékeket is. amikor mindent összepakoltam, akkor elkezdtem visszaállítani a szobáját, utoljára az ágyat hagytam, de amikor elkezdtem megágyazni és szépen visszarendezni olyanra, amilyen az emlékezetemben volt, akkor hazaért. hangosan köszönt az üres lakásnak - azt egyáltalán nem tudhatta, hogy én ott vagyok - majd sokkolta a meglepetés, hogy ott vagyok. teljesen érthető haragra gerjedt, amivel én nem is vitatkoztam, csak próbáltam elcsatornázni azzal, hogy kimagyarázom magam a helyzetből. aztán hamar téma lett, hogy ki nem keresett kit, és akkor már nem fogtam vissza magam és én is kiabáltam, mert úgy éreztem, hogy ő hagyott ott engem, ő nem keresett soha. de ő is így érezte. szerinte nekem kellett volna keresnem őt és nagyon csalódott volt, hogy nem tettem. amikor megértettük, hogy egyikőnk ellen sem szólt a csend, akkor szépen lassan elcsendesedtünk, de kicsit feszült csend volt ez.. megmutogatta hogy milyen szerszámgépeket szerzett (valami kézműves dolog lehetett, de nem igazán tudom megmondani, hogy mi. agyagra és kerámiázásra hasonlított a környezet, de az eszközök meg sokkal nagyobbak voltak és inkább famunkához illettek). aztán mutatott valami régi gépet, amit sehogy sem tudott beindítani. valami szűk ki helyre kellett benyúlnom és ott rántani a motorindítóját, de kérte hogy vigyázzak, mert ha beindul a motor, akkor könnyen levághatja az ujjam. sikerült beindítani, valamit meg akart nézni közelebbről és bár eddig is közel voltunk, most még közelebb hajolt - persze csak a géphez, de a gép és közte voltam én is - próbáltam több helyet adni neki, valahogy megkerülve átadni neki a helyemet, hogy meg tudja nézni, de akkor felém fordult és csókolózni kezdtünk. minden feszültség elszállt, ahogy átadtuk magunkat egymásnak, felkaptam az ölembe és átmentem vele a hálószobájába. lefektettem az ágyára, és csak akkor vettem észre, hogy máshogy van a szobája, két ajtaja is van.. mondta, hogy régen is kettő volt, csak le volt takarva valami függönnyel az ajtó, de valamiért ki kellett nyitnia teret és azóta így van. ez az új ajtó közvetlenül az ágya mellett volt, de nem volt rögzítve, csak egyszerűen a falnak volt támasztva. mivel az előző pillanatban még szeretkezni készültünk, ezért gondoltam, hogy becsukom ezt az ajtót, de akkor vettem észre, hogy nincs rögzítve és sehogy sem sikerült becsuknom. végül elmagyarázta, hogy valahogy a fejfához kell illesztenem, de így sem sikerült, csak amikor felállt segíteni. kiderült h felül szögek vannak és ezekre kell ügyesen akasztani az ajtót. aztán felébredtem.";
    const snippets = [
      "próbáltam több helyet adni neki, valahogy megkerülve átadni neki a helyemet, hogy meg tudja nézni, de akkor felém fordult és csókolózni kezdtünk",
      "felkaptam az ölembe és átmentem vele a hálószobájába. lefektettem az ágyára",
      "csak akkor vettem észre, hogy máshogy van a szobája, két ajtaja is van.. mondta, hogy régen is kettő volt, csak le volt takarva valami függönnyel az ajtó, de valamiért ki kellett nyitnia teret és azóta így van",
      "ez az új ajtó közvetlenül az ágya mellett volt, de nem volt rögzítve, csak egyszerűen a falnak volt támasztva",
      "mivel az előző pillanatban még szeretkezni készültünk, ezért gondoltam, hogy becsukom ezt az ajtót, de akkor vettem észre, hogy nincs rögzítve és sehogy sem sikerült becsuknom",
      "végül elmagyarázta, hogy valahogy a fejfához kell illesztenem, de így sem sikerült, csak amikor felállt segíteni. kiderült h felül szögek vannak és ezekre kell ügyesen akasztani az ajtót",
      "aztán felébredtem",
    ];

    const result = await executeDescriptiveExtractionAttempt({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText,
      attempt: 1,
      requestStructuredOutput: async () => ({
        outputText: JSON.stringify({
          dreamLanguage: "hu",
          scenes: [{
            sceneId: "scene-1",
            position: 0,
            summary: "Emma and the dreamer become intimate and move into the bedroom.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: snippets[0],
              spanStart: 314,
              spanEnd: 314 + snippets[0]!.length,
              contextLabel: "window",
            },
            observations: snippets.map((snippet, index) => ({
              observationId: `obs-${index + 1}`,
              position: index,
              text: `Recovered ${index + 1}`,
              evidence: [{
                snippet,
                spanStart: 314 + (index * 80),
                spanEnd: 314 + (index * 80) + snippet.length,
                contextLabel: "window",
              }],
              uncertaintyNote: null,
            })),
            derived: buildDerived(),
          }],
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
      }),
    });

    expect(result.status).toBe("candidate_available");
    expect(result.candidate?.descriptiveUnits.map((unit) => unit.evidenceRefs[0]?.spanStart)).toEqual(
      snippets.map((snippet) => dreamText.indexOf(snippet)),
    );
    expect(result.candidate?.descriptiveUnits.map((unit) => unit.evidenceRefs[0]?.spanStart)).not.toEqual([
      314,
      394,
      474,
      554,
      634,
      714,
      794,
    ]);
  });
});
