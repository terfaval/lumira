import { describe, expect, it } from "vitest";

import { runObservationV3ShadowPipeline } from "@/src/cognition/observation-v3/pipeline";

function buildAdequateExtractionReplay() {
  const dreamText = "A guide leads the dreamer up a staircase.";
  return {
    dreamText,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/adequate-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
                sceneId: "scene-1",
                position: 0,
                summary: "A guide leads the dreamer up a staircase.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: dreamText,
                  spanStart: 0,
                  spanEnd: dreamText.length,
                  contextLabel: "scene",
                },
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: "A guide leads the dreamer up a staircase.",
                    evidence: [
                      {
                        snippet: dreamText,
                        spanStart: 0,
                        spanEnd: dreamText.length,
                        contextLabel: "scene",
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
          providerDiagnostics: {
            elapsedMs: 10,
            providerStatus: "completed",
            providerIncompleteReason: null,
            providerReturnedStructuredOutput: true,
            inputTokenUsage: 1,
            outputTokenUsage: 1,
            totalTokenUsage: 2,
          },
        },
      },
    },
  };
}

function buildRecoverableReplay() {
  const dreamText = "The dreamer enters a city. Later the dreamer finds a hidden garden and wakes.";
  return {
    dreamText,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/recoverable-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
                sceneId: "scene-1",
                position: 0,
                summary: "The dreamer enters a city.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: "The dreamer enters a city.",
                  spanStart: 0,
                  spanEnd: 26,
                  contextLabel: "early",
                },
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: "The dreamer enters a city.",
                    evidence: [
                      {
                        snippet: "The dreamer enters a city.",
                        spanStart: 0,
                        spanEnd: 26,
                        contextLabel: "early",
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
          providerDiagnostics: {
            elapsedMs: 10,
            providerStatus: "completed",
            providerIncompleteReason: null,
            providerReturnedStructuredOutput: true,
            inputTokenUsage: 1,
            outputTokenUsage: 1,
            totalTokenUsage: 2,
          },
        },
      },
      supplementalRealization: {
        responses: [
          {
            physicalGapId: "gap-001",
            sourceArtifactRef: "fixtures/recoverable-supplemental.json",
            providerResult: {
              outputText: JSON.stringify({
                regions: [
                  {
                    regionId: "region-1",
                    heading: "Later",
                    spanStart: 27,
                    spanEnd: dreamText.length,
                    boundaryUncertainty: null,
                    transitionCues: ["later"],
                    observations: [
                      {
                        observationId: "supp-1",
                        statement: "Later the dreamer finds a hidden garden and wakes.",
                        uncertainty: null,
                        evidence: [
                          {
                            snippet: "Later the dreamer finds a hidden garden and wakes.",
                            spanStart: 27,
                            spanEnd: dreamText.length,
                            contextLabel: "late",
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
              providerStatus: "completed",
              providerIncompleteReason: null,
              tokenUsage: {
                input: 1,
                output: 1,
                total: 2,
              },
            },
          },
        ],
      },
    },
  };
}

describe("runObservationV3ShadowPipeline", () => {
  it("runs preserved replay extraction through native deterministic downstream stages", async () => {
    const replay = buildAdequateExtractionReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    expect(result.stageResults.map((stage) => [stage.stage, stage.status, stage.executionMode])).toEqual([
      ["source_analysis", "success", "native_deterministic"],
      ["descriptive_extraction", "success", "preserved_replay"],
      ["completeness_analysis", "success", "native_deterministic"],
      ["supplemental_realization", "success", "preserved_replay"],
      ["memory_composition", "success", "native_deterministic"],
      ["memory_realization", "success", "native_deterministic"],
      ["authority_admission", "success", "native_deterministic"],
    ]);
    expect(typeof result.summary.finalOutcome).toBe("string");
    expect(result.summary.finalOutcome.length).toBeGreaterThan(0);
    expect(result.artifacts["pipeline-stage-results.json"]).toBeDefined();
    expect(result.artifacts["native-identity-lineage-comparison.json"]).toEqual(
      expect.objectContaining({
        finalClassification: expect.any(String),
        transitions: expect.arrayContaining([
          expect.objectContaining({
            artifactRef: "provisional-identity-transition.json",
          }),
          expect.objectContaining({
            artifactRef: "canonical-identity-transition.json",
          }),
          expect.objectContaining({
            artifactRef: "admission-identity-input-comparison.json",
          }),
        ]),
      }),
    );
  });

  it("executes supplemental realization through preserved replay while keeping downstream stages native", async () => {
    const replay = buildRecoverableReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "success",
      executionMode: "preserved_replay",
      sourceArtifactRef: "fixtures/recoverable-supplemental.json",
    });
    expect(result.stageResults.find((stage) => stage.stage === "memory_composition")).toMatchObject({
      status: "success",
      executionMode: "native_deterministic",
    });
    expect(result.stageResults.find((stage) => stage.stage === "memory_realization")).toMatchObject({
      status: "success",
      executionMode: "native_deterministic",
    });
    expect(result.stageResults.find((stage) => stage.stage === "authority_admission")).toMatchObject({
      status: "success",
      executionMode: "native_deterministic",
    });
  });

  it("keeps initial completeness as the supplemental trigger while emitting final composed-candidate completeness", async () => {
    const replay = buildRecoverableReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    const initialCompleteness = result.stageResults.find((stage) => stage.stage === "completeness_analysis");
    const composition = result.stageResults.find((stage) => stage.stage === "memory_composition");

    expect(initialCompleteness).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        candidateIdentity: expect.objectContaining({
          candidateKind: "primary_extraction",
        }),
        adequacy: "inadequate_recoverable",
      }),
    });
    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "success",
    });
    expect(composition).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        finalCompleteness: expect.objectContaining({
          candidateIdentity: expect.objectContaining({
            candidateKind: "composed_candidate",
            candidateVersionLabel: "post_composition",
          }),
        }),
      }),
    });
    expect(
      (composition?.payload?.finalCompleteness as { candidateIdentity?: { candidateHash?: string } } | undefined)
        ?.candidateIdentity?.candidateHash,
    ).toBe(
      (composition?.payload?.result as { composedCandidateIdentity?: { composedCandidateHash?: string } } | undefined)
        ?.composedCandidateIdentity?.composedCandidateHash,
    );
  });

  it("routes final composed-candidate completeness into authority admission with authoritative source identity", async () => {
    const replay = buildRecoverableReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    const composition = result.stageResults.find((stage) => stage.stage === "memory_composition");
    const admission = result.stageResults.find((stage) => stage.stage === "authority_admission");
    const memoryRealization = result.stageResults.find((stage) => stage.stage === "memory_realization");

    expect(admission).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        request: expect.objectContaining({
          completeness: expect.objectContaining({
            status: "available",
            report: expect.objectContaining({
              candidateIdentity: expect.objectContaining({
                candidateKind: "composed_candidate",
                candidateVersionLabel: "post_composition",
              }),
            }),
          }),
        }),
      }),
    });
    expect(
      (admission?.payload?.request as { sourceIdentity?: { sourceHash?: string } } | undefined)?.sourceIdentity?.sourceHash,
    ).toBe(
      (admission?.payload?.request as { completeness?: { report?: { sourceIdentity?: { sourceHash?: string } } } } | undefined)
        ?.completeness?.report?.sourceIdentity?.sourceHash,
    );
    expect(
      (admission?.payload?.request as {
        completeness?: { report?: { candidateIdentity?: { candidateHash?: string } } };
      } | undefined)?.completeness?.report?.candidateIdentity?.candidateHash,
    ).toBe(
      (memoryRealization?.payload?.result as {
        canonicalCandidate?: { composedCandidateIdentity?: { composedCandidateHash?: string } };
      } | undefined)?.canonicalCandidate?.composedCandidateIdentity?.composedCandidateHash,
    );
    expect((composition?.payload?.artifacts as Record<string, unknown> | undefined)?.["final-completeness-report"]).toBeDefined();
  });

  it("fails supplemental realization explicitly when required preserved replay evidence is missing", async () => {
    const replay = buildRecoverableReplay();
    replay.replay.supplementalRealization = {
      responses: [],
    };

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "failed",
      executionMode: "preserved_replay",
      failure: {
        code: "missing_preserved_replay",
      },
    });
    expect(result.stageResults.find((stage) => stage.stage === "memory_composition")).toMatchObject({
      status: "skipped",
    });
    expect(result.summary.finalOutcome).toBe("failed_supplemental_realization");
  });
});
