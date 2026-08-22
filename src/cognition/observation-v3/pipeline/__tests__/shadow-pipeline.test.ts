import { describe, expect, it, vi } from "vitest";

import { runObservationV3ShadowPipeline } from "@/src/cognition/observation-v3/pipeline";
import * as authorityAdmissionModule from "@/src/cognition/observation-v3/authority-admission";
import * as supplementalProviderAdapterModule from "@/src/cognition/observation-v3/supplemental-realization/provider-adapter";

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
            targetContract: {
              targetId: "target-1-gap-001",
              physicalGapId: "gap-001",
              kind: "tail" as const,
              sourceStart: 26,
              sourceEnd: dreamText.length,
              contextStart: 0,
              contextEnd: dreamText.length,
            },
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

function buildPrimaryGroundingReplay() {
  const dreamText = [
    "Opening material before the turn.",
    "Then she turns toward me and we start kissing.",
  ].join(" ");
  const earlySnippet = "Opening material.";
  const earlyStart = dreamText.indexOf(earlySnippet);
  const lateSnippet = "Then she turns toward me and we start kissing.";
  const lateStart = dreamText.indexOf(lateSnippet);

  return {
    dreamText,
    earlySnippet,
    earlyStart,
    lateSnippet,
    lateStart,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/primary-grounding-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
                sceneId: "scene-early",
                position: 0,
                summary: "The dream opens.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: earlySnippet,
                  spanStart: earlyStart,
                  spanEnd: earlyStart + earlySnippet.length,
                  contextLabel: "source",
                },
                observations: [
                  {
                    observationId: "obs-early",
                    position: 0,
                    text: "The dream opens.",
                    evidence: [
                      {
                        snippet: earlySnippet,
                        spanStart: earlyStart,
                        spanEnd: earlyStart + earlySnippet.length,
                        contextLabel: "source",
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
                sceneId: "scene-late",
                position: 1,
                summary: "The interaction turns intimate.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: lateSnippet,
                  spanStart: 0,
                  spanEnd: lateSnippet.length,
                  contextLabel: "window",
                },
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: "They start kissing.",
                    evidence: [
                      {
                        snippet: lateSnippet,
                        spanStart: 0,
                        spanEnd: lateSnippet.length,
                        contextLabel: "window",
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

function buildProvisionalLocalityReplay() {
  const dreamText = "Later the dreamer wakes in a bright room.";
  const groundedSnippet = dreamText;
  const groundedStart = dreamText.indexOf(groundedSnippet);

  return {
    dreamText,
    groundedSnippet,
    groundedStart,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/provisional-locality-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
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
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: groundedSnippet,
                    evidence: [
                      {
                        snippet: groundedSnippet,
                        spanStart: groundedStart,
                        spanEnd: groundedStart + groundedSnippet.length,
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

function buildLiveIterativeRecoveryInput() {
  const dreamText = [
    "The dreamer enters a city.",
    "Later the dreamer finds a hidden garden.",
    "The garden opens into a long corridor filled with mirrors.",
    "Finally the dreamer wakes at the end of the corridor.",
  ].join(" ");
  const firstSentence = "The dreamer enters a city.";
  const secondSentence = "Later the dreamer finds a hidden garden.";
  const thirdSentence = "The garden opens into a long corridor filled with mirrors.";
  const fourthSentence = "Finally the dreamer wakes at the end of the corridor.";
  const firstStart = dreamText.indexOf(firstSentence);
  const secondStart = dreamText.indexOf(secondSentence);
  const thirdStart = dreamText.indexOf(thirdSentence);
  const fourthStart = dreamText.indexOf(fourthSentence);

  return {
    dreamText,
    firstSentence,
    secondSentence,
    thirdSentence,
    fourthSentence,
    firstStart,
    secondStart,
    thirdStart,
    fourthStart,
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
      ["supplemental_realization", "skipped", "skipped"],
      ["memory_composition", "success", "native_deterministic"],
      ["memory_realization", "success", "native_deterministic"],
      ["authority_admission", "success", "native_deterministic"],
    ]);
    expect(typeof result.summary.finalOutcome).toBe("string");
    expect(result.summary.finalOutcome.length).toBeGreaterThan(0);
    expect(result.summary.governanceDisposition).toBe(result.summary.finalOutcome);
    expect(result.summary.pipelineCompletionStatus).toBe("completed");
    expect(result.artifacts["pipeline-stage-results.json"]).toBeDefined();
    expect(result.stageResults.find((stage) => stage.stage === "descriptive_extraction")).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        candidate: expect.objectContaining({
          candidateId: expect.any(String),
          candidateHash: expect.any(String),
        }),
      }),
    });
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

  it("skips supplemental realization when completeness is observational and recovery is not required", async () => {
    const replay = buildAdequateExtractionReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    expect(result.stageResults.find((stage) => stage.stage === "completeness_analysis")).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        adequacy: "adequate",
        recoveryRecommendation: expect.objectContaining({
          disposition: "not_required",
          eligibility: "eligible",
        }),
      }),
    });
    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "skipped",
      skippedReason: "not_required",
    });
    expect(result.stageResults.find((stage) => stage.stage === "memory_composition")).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        finalCompleteness: expect.any(Object),
      }),
    });
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
    expect(result.artifacts["native-c0-carrier-evidence.json"]).toEqual(
      expect.objectContaining({
        projectionReconsumedByNativePipeline: false,
        initialCompleteness: expect.objectContaining({
          candidateKind: "primary_extraction",
        }),
        supplementalBaseline: expect.objectContaining({
          baselineCarrierKind: "native_c0_candidate",
        }),
        compositionBaseline: expect.objectContaining({
          baselineCarrierKind: "native_c0_candidate",
        }),
      }),
    );
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
    expect(result.summary.governanceDisposition).toBeNull();
    expect(result.summary.pipelineCompletionStatus).toBe("failed");
    expect(result.summary.finalOutcome).toBe("failed_supplemental_realization");
  });

  it("fails preserved supplemental replay before package construction when the preserved target contract is incompatible", async () => {
    const replay = buildRecoverableReplay();
    replay.replay.supplementalRealization = {
      responses: [
        {
          physicalGapId: "gap-001",
          sourceArtifactRef: "fixtures/stale-tail-supplemental.json",
          targetContract: {
            targetId: "target-1-gap-001",
            physicalGapId: "gap-001",
            kind: "tail" as const,
            sourceStart: 27,
            sourceEnd: replay.dreamText.length,
            contextStart: 0,
            contextEnd: replay.dreamText.length,
          },
          providerResult: {
            outputText: JSON.stringify({
              regions: [
                {
                  regionId: "region-1",
                  heading: "Later",
                  spanStart: 27,
                  spanEnd: replay.dreamText.length,
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
                          spanEnd: replay.dreamText.length,
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
    expect(result.summary.pipelineCompletionStatus).toBe("failed");
    expect(result.summary.finalOutcome).toBe("failed_supplemental_realization");
  });

  it("uses the neutral authority-admission surface for native request construction", async () => {
    expect("buildNativeAdmissionRequest" in authorityAdmissionModule).toBe(true);

    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/cognition/observation-v3/pipeline/shadow-pipeline.ts", "utf8"),
    );

    expect(source).toContain('from "@/src/cognition/observation-v3/authority-admission"');
    expect(source).not.toContain('from "@/src/cognition/observation-v3/authority-admission/shadow-authority-admission"');
    expect(source).not.toContain("buildNativeShadowAdmissionRequest");
  });

  it("passes corrected absolute primary spans into downstream completeness and composition stages", async () => {
    const replay = buildPrimaryGroundingReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    const extraction = result.stageResults.find((stage) => stage.stage === "descriptive_extraction");
    const completeness = result.stageResults.find((stage) => stage.stage === "completeness_analysis");
    const composition = result.stageResults.find((stage) => stage.stage === "memory_composition");

    expect(extraction).toMatchObject({
      status: "success",
      payload: {
        candidate: {
          localities: expect.arrayContaining([
            expect.objectContaining({
              evidenceContext: expect.objectContaining({
                spanStart: replay.lateStart,
                spanEnd: replay.lateStart + replay.lateSnippet.length,
              }),
            }),
          ]),
          descriptiveUnits: expect.arrayContaining([
            expect.objectContaining({
              evidenceRefs: [
                expect.objectContaining({
                  spanStart: replay.lateStart,
                  spanEnd: replay.lateStart + replay.lateSnippet.length,
                }),
              ],
            }),
          ]),
        },
      },
    });
    expect(completeness).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        coverage: expect.objectContaining({
          largestCoveredSpanEnd: replay.lateStart + replay.lateSnippet.length,
        }),
      }),
    });
    expect(composition).toMatchObject({
      status: "success",
      payload: {
        request: {
          baseline: {
            units: expect.arrayContaining([
              expect.objectContaining({
                evidence: [
                  expect.objectContaining({
                    spanStart: replay.lateStart,
                    spanEnd: replay.lateStart + replay.lateSnippet.length,
                  }),
                ],
              }),
            ]),
          },
        },
      },
    });
  });

  it("continues through the native pipeline when extraction salvages a provisional locality from grounded units", async () => {
    const replay = buildProvisionalLocalityReplay();

    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    expect(result.stageResults.find((stage) => stage.stage === "descriptive_extraction")).toMatchObject({
      status: "success",
      payload: expect.objectContaining({
        candidate: expect.objectContaining({
          localities: [
            expect.objectContaining({
              evidenceContext: expect.objectContaining({
                spanStart: replay.groundedStart,
                spanEnd: replay.groundedStart + replay.groundedSnippet.length,
              }),
            }),
          ],
        }),
      }),
    });
    expect(result.stageResults.find((stage) => stage.stage === "completeness_analysis")).toMatchObject({
      status: "success",
    });
    expect(result.stageResults.find((stage) => stage.stage === "memory_realization")).toMatchObject({
      status: "success",
    });
    expect(result.stageResults.find((stage) => stage.stage === "authority_admission")).toMatchObject({
      status: "success",
    });
  });

  it("retries a deferred live V3 admission with one additional bounded supplemental pass before failing closed", async () => {
    const input = buildLiveIterativeRecoveryInput();
    const supplementalExecutorMock = vi.spyOn(
      supplementalProviderAdapterModule,
      "executeOpenAiSupplementalRealization",
    );
    supplementalExecutorMock
      .mockResolvedValueOnce({
        outputText: JSON.stringify({
          regions: [
            {
              regionId: "region-supp-1",
              heading: "Later",
              spanStart: input.secondStart,
              spanEnd: input.secondStart + input.secondSentence.length,
              boundaryUncertainty: null,
              transitionCues: ["later"],
              observations: [
                {
                  observationId: "supp-1",
                  statement: input.secondSentence,
                  uncertainty: null,
                  evidence: [
                    {
                      snippet: input.secondSentence,
                      spanStart: input.secondStart,
                      spanEnd: input.secondStart + input.secondSentence.length,
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
      })
      .mockResolvedValueOnce({
        outputText: JSON.stringify({
          regions: [
            {
              regionId: "region-supp-2",
              heading: "Corridor",
              spanStart: input.thirdStart,
              spanEnd: input.fourthStart + input.fourthSentence.length,
              boundaryUncertainty: null,
              transitionCues: ["finally"],
              observations: [
                {
                  observationId: "supp-2",
                  statement: input.thirdSentence,
                  uncertainty: null,
                  evidence: [
                    {
                      snippet: input.thirdSentence,
                      spanStart: input.thirdStart,
                      spanEnd: input.thirdStart + input.thirdSentence.length,
                      contextLabel: "corridor",
                    },
                  ],
                },
                {
                  observationId: "supp-3",
                  statement: input.fourthSentence,
                  uncertainty: null,
                  evidence: [
                    {
                      snippet: input.fourthSentence,
                      spanStart: input.fourthStart,
                      spanEnd: input.fourthStart + input.fourthSentence.length,
                      contextLabel: "ending",
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
      });

    try {
      const result = await runObservationV3ShadowPipeline({
        userId: "user-1",
        reflectiveObjectId: "object-1",
        dreamText: input.dreamText,
        liveProviderExecution: {
          descriptiveExtraction: {
            requestStructuredOutput: async () => ({
              outputText: JSON.stringify({
                dreamLanguage: "en",
                scenes: [
                  {
                    sceneId: "scene-1",
                    position: 0,
                    summary: input.firstSentence,
                    boundaryReasoning: [],
                    evidenceContext: {
                      snippet: input.firstSentence,
                      spanStart: input.firstStart,
                      spanEnd: input.firstStart + input.firstSentence.length,
                      contextLabel: "early",
                    },
                    observations: [
                      {
                        observationId: "obs-1",
                        position: 0,
                        text: input.firstSentence,
                        evidence: [
                          {
                            snippet: input.firstSentence,
                            spanStart: input.firstStart,
                            spanEnd: input.firstStart + input.firstSentence.length,
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
            }),
          },
        },
      });

      expect(supplementalExecutorMock).toHaveBeenCalledTimes(2);
      expect(result.summary.governanceDisposition).toMatch(/admitted/);
      expect(result.stageResults.find((stage) => stage.stage === "authority_admission")).toMatchObject({
        status: "success",
        payload: expect.objectContaining({
          disposition: expect.stringMatching(/admitted/),
        }),
      });
    } finally {
      supplementalExecutorMock.mockRestore();
    }
  });
});
