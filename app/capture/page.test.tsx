import type { ReactNode } from "react";
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const requireAuthenticatedUserIdMock = vi.fn();
const createReflectiveObjectMock = vi.fn();
const updateReflectiveObjectMock = vi.fn();
const createObservationFromBundleMock = vi.fn();
const generateObservationForReflectiveObjectMock = vi.fn();
const persistGeneratedObservationForReflectiveObjectMock = vi.fn();
const generateGlossaryCandidatesForReflectiveObjectMock = vi.fn();
const resolveObservationCaptureAuthorityModeMock = vi.fn();
const buildLlmSceneObservationExtractionMock = vi.fn();
const constructDerivedStructuresFromObservationBundleMock = vi.fn();
const generateDreamTitleSuggestionMock = vi.fn();
const randomUuidMock = vi.fn();
const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/src/ui/shared/require-authenticated-user", () => ({
  requireAuthenticatedUserId: requireAuthenticatedUserIdMock,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    create: createReflectiveObjectMock,
    update: updateReflectiveObjectMock,
  }),
}));

vi.mock("@/src/infrastructure/persistence/observation-v2-write-store", () => ({
  createObservationV2WriteStore: () => ({
    createFromBundle: createObservationFromBundleMock,
  }),
}));

vi.mock("@/src/runtime/orchestration/generate-observation-for-reflective-object", () => ({
  generateObservationForReflectiveObject: generateObservationForReflectiveObjectMock,
  persistGeneratedObservationForReflectiveObject: persistGeneratedObservationForReflectiveObjectMock,
}));

vi.mock("@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object", () => ({
  generateGlossaryCandidatesForReflectiveObject: generateGlossaryCandidatesForReflectiveObjectMock,
}));

vi.mock("@/src/runtime/orchestration/resolve-observation-capture-authority-mode", () => ({
  resolveObservationCaptureAuthorityMode: resolveObservationCaptureAuthorityModeMock,
}));

vi.mock("@/src/cognition/observation/llm-scene-observation-extractor", () => ({
  buildLlmSceneObservationExtraction: buildLlmSceneObservationExtractionMock,
}));

vi.mock("@/src/cognition/observation/llm-derived-structure-constructor", () => ({
  constructDerivedStructuresFromObservationBundle: constructDerivedStructuresFromObservationBundleMock,
}));

vi.mock("@/src/cognition/title/llm-dream-title-generator", () => ({
  generateDreamTitleSuggestion: generateDreamTitleSuggestionMock,
}));

function findFormAction(node: ReactNode): ((formData: FormData) => Promise<void>) | null {
  if (isValidElement<{ action?: unknown; children?: ReactNode }>(node)) {
    if (typeof node.props.action === "function") {
      return node.props.action as (formData: FormData) => Promise<void>;
    }

    return findFormAction(node.props.children);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const action = findFormAction(child);

      if (action) {
        return action;
      }
    }
  }

  return null;
}

function findElement(
  node: ReactNode,
  predicate: (element: { type: unknown; props: Record<string, unknown> }) => boolean,
): { type: unknown; props: Record<string, unknown> } | null {
  if (isValidElement<Record<string, unknown>>(node)) {
    const element = { type: node.type, props: node.props };
    if (predicate(element)) {
      return element;
    }

    return findElement(node.props.children as ReactNode, predicate);
  }

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("CapturePage", () => {
  beforeEach(() => {
    redirectMock.mockReset();
    requireAuthenticatedUserIdMock.mockReset();
    createReflectiveObjectMock.mockReset();
    updateReflectiveObjectMock.mockReset();
    createObservationFromBundleMock.mockReset();
    generateObservationForReflectiveObjectMock.mockReset();
    persistGeneratedObservationForReflectiveObjectMock.mockReset();
    generateGlossaryCandidatesForReflectiveObjectMock.mockReset();
    resolveObservationCaptureAuthorityModeMock.mockReset();
    buildLlmSceneObservationExtractionMock.mockReset();
    constructDerivedStructuresFromObservationBundleMock.mockReset();
    generateDreamTitleSuggestionMock.mockReset();
    randomUuidMock.mockReset();
    consoleWarnSpy.mockClear();

    requireAuthenticatedUserIdMock.mockResolvedValue("user-1");
    createReflectiveObjectMock.mockResolvedValue({ id: "obj-123" });
    updateReflectiveObjectMock.mockResolvedValue({ id: "obj-123", title: "The Lantern House" });
    buildLlmSceneObservationExtractionMock.mockResolvedValue({
      mode: "validated_llm",
      bundle: {
        reflectiveObjectId: "obj-123",
        userId: "user-1",
        source: "system_llm_extract",
        scenes: [],
      },
    });
    constructDerivedStructuresFromObservationBundleMock.mockImplementation(async (bundle) => ({
      ...bundle,
      runtimeVersion: "observation_v2_phase1",
    }));
    generateDreamTitleSuggestionMock.mockResolvedValue({
      mode: "generated",
      title: "The Lantern House",
    });
    createObservationFromBundleMock.mockResolvedValue({
      bundleId: "bundle-1",
      reflectiveObjectId: "obj-123",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [],
    });
    generateObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "generated_v2",
      family: "v2",
      bundle: {
        reflectiveObjectId: "obj-123",
        userId: "user-1",
        source: "system_llm_extract",
        scenes: [],
      },
    });
    persistGeneratedObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "persisted_v2",
      family: "v2",
      persistedBundle: {
        bundleId: "bundle-1",
        reflectiveObjectId: "obj-123",
        userId: "user-1",
        source: "system_llm_extract",
        scenes: [],
      },
    });
    generateGlossaryCandidatesForReflectiveObjectMock.mockResolvedValue([]);
    resolveObservationCaptureAuthorityModeMock.mockReturnValue({
      mode: "v2",
      observationResolution: "default_v2",
    });
    vi.stubGlobal("crypto", { randomUUID: randomUuidMock });
    randomUuidMock.mockReturnValue("obj-123");
  });

  it("redirects a successful capture submit to the object orientation route first", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    expect(submitCapture).not.toBeNull();

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });

  it("submits successfully without a separate title field", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(createReflectiveObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "I was inside a house with water under the floorboards.",
      }),
    );
    expect(updateReflectiveObjectMock).toHaveBeenCalledWith({
      id: "obj-123",
      userId: "user-1",
      title: "The Lantern House",
    });
    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });

  it("keeps the deterministic fallback title when ai title generation does not succeed", async () => {
    generateDreamTitleSuggestionMock.mockResolvedValue({
      mode: "fallback",
      reason: "provider_error",
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(updateReflectiveObjectMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/objects/obj-123");
  });

  it("routes validated capture generation through the scene-first extractor and V2 write seam", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(generateObservationForReflectiveObjectMock).toHaveBeenCalledWith({
      dreamText: "I was inside a house with water under the floorboards.",
      observationResolution: "default_v2",
      reflectiveObjectId: "obj-123",
      userId: "user-1",
    });
    expect(createReflectiveObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "obj-123",
      }),
    );
    expect(persistGeneratedObservationForReflectiveObjectMock).toHaveBeenCalledWith({
      observation: {
        mode: "generated_v2",
        family: "v2",
        bundle: {
          reflectiveObjectId: "obj-123",
          userId: "user-1",
          source: "system_llm_extract",
          scenes: [],
        },
      },
    });
    expect(generateGlossaryCandidatesForReflectiveObjectMock).toHaveBeenCalledWith({
      reflectiveObjectId: "obj-123",
      userId: "user-1",
      observationResolution: "default_v2",
    });
  });

  it("constructs derived structures after extraction, then persists before glossary generation and redirect", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "My father pressed a button and slurry came through a door.");

    await submitCapture?.(formData);

    expect(generateObservationForReflectiveObjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      createReflectiveObjectMock.mock.invocationCallOrder[0],
    );
    expect(createReflectiveObjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      persistGeneratedObservationForReflectiveObjectMock.mock.invocationCallOrder[0],
    );
    expect(persistGeneratedObservationForReflectiveObjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      generateGlossaryCandidatesForReflectiveObjectMock.mock.invocationCallOrder[0],
    );
    expect(generateGlossaryCandidatesForReflectiveObjectMock.mock.invocationCallOrder[0]).toBeLessThan(
      redirectMock.mock.invocationCallOrder[0],
    );
  });

  it("logs a structured persistence diagnostic after the native V2 bundle is rehydrated", async () => {
    persistGeneratedObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "persisted_v2",
      family: "v2",
      diagnostics: {
        acceptedAttempt: 2,
      },
      persistedBundle: {
      bundleId: "bundle-1",
      reflectiveObjectId: "obj-123",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "An ending shoreline scene.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "At the end they reach the shoreline",
            spanStart: 4200,
            spanEnd: 4260,
            contextLabel: "scene",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "At the end they reach the shoreline.",
              evidence: [
                {
                  snippet: "At the end they reach the shoreline",
                  spanStart: 4200,
                  spanEnd: 4260,
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
      },
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "At the end they reach the shoreline and a helper appears.");

    await submitCapture?.(formData);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "observation_v2_capture_diagnostic",
      expect.objectContaining({
        reflectiveObjectId: "obj-123",
        attempt: 2,
        selectedMode: "v2",
        observationResolution: "default_v2",
        stage: "persistence",
        persistedSceneCount: 1,
        persistedObservationCount: 1,
      }),
    );
  });

  it("uses configured V3 capture authority without duplicating the runtime path", async () => {
    resolveObservationCaptureAuthorityModeMock.mockReturnValue({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
    generateObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "generated_v3",
      family: "v3",
      authorityRecord: {
        authorityId: "authority-1",
      },
      pipelineResult: {
        summary: {
          governanceDisposition: "admitted",
          pipelineCompletionStatus: "completed",
        },
      },
    });
    persistGeneratedObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "persisted_v3",
      family: "v3",
      persistedAuthority: {
        authorityId: "authority-1",
        admissionDecision: {
          disposition: "admitted",
        },
      },
      pipelineResult: {
        summary: {
          governanceDisposition: "admitted",
          pipelineCompletionStatus: "completed",
        },
      },
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "A bright room opens into a corridor.");

    await submitCapture?.(formData);

    expect(generateObservationForReflectiveObjectMock).toHaveBeenCalledWith({
      dreamText: "A bright room opens into a corridor.",
      observationResolution: "explicit_v3",
      reflectiveObjectId: "obj-123",
      userId: "user-1",
    });
    expect(generateGlossaryCandidatesForReflectiveObjectMock).toHaveBeenCalledWith({
      reflectiveObjectId: "obj-123",
      userId: "user-1",
      observationResolution: "explicit_v3",
    });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "observation_v3_capture_diagnostic",
      expect.objectContaining({
        reflectiveObjectId: "obj-123",
        selectedMode: "v3",
        observationResolution: "explicit_v3",
        authorityId: "authority-1",
        disposition: "admitted",
      }),
    );
  });

  it("fails capture without saving when llm extraction is unsafe", async () => {
    generateObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "failed",
      family: "v2",
      stage: "generation",
      reason: "invalid_json",
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("title", "Lantern House");
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    await submitCapture?.(formData);

    expect(createReflectiveObjectMock).not.toHaveBeenCalled();
    expect(persistGeneratedObservationForReflectiveObjectMock).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledWith("/capture?error=analysis");
  });

  it("logs iterative V3 deferral diagnostics when explicit V3 capture remains non-authoritative", async () => {
    resolveObservationCaptureAuthorityModeMock.mockReturnValue({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
    generateObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "failed",
      family: "v3",
      stage: "generation",
      reason: "deferred_for_supplemental_realization",
      pipelineResult: {
        summary: {
          governanceDisposition: "deferred_for_supplemental_realization",
          pipelineCompletionStatus: "completed",
        },
        failurePropagation: {
          failureSourceStage: "authority_admission",
        },
        stageResults: [
          {
            stage: "supplemental_realization",
            status: "success",
            payload: {
              plan: {
                selectedGaps: [
                  {
                    targetId: "target-001",
                    physicalGapId: "gap-001",
                    kind: "tail",
                    sourceStart: 144,
                    sourceEnd: 188,
                    contextStart: 120,
                    contextEnd: 220,
                  },
                ],
              },
              result: {
                disposition: "completed",
                diagnostics: {
                  requestCount: 1,
                  targetCount: 1,
                  packageCount: 1,
                  realizedRegionCount: 1,
                  realizedObservationCount: 2,
                  abstainedTargetCount: 0,
                },
                execution: [
                  {
                    targetId: "target-001",
                    packageId: "supplemental-package-1-gap-001",
                    providerStatus: "completed",
                    providerIncompleteReason: null,
                    latencyMs: 250,
                    tokenUsage: {
                      input: 100,
                      output: 50,
                      total: 150,
                    },
                    structured: {
                      regions: [
                        {
                          regionId: "region-1",
                          observations: [
                            { observationId: "obs-r1-1", statement: "Recovered ending beat." },
                            { observationId: "obs-r1-2", statement: "Recovered final state." },
                          ],
                        },
                      ],
                    },
                  },
                ],
              },
              packages: [
                {
                  packageId: "supplemental-package-1-gap-001",
                  physicalGapId: "gap-001",
                  observations: [
                    { observationId: "obs-r1-1", statement: "Recovered ending beat." },
                    { observationId: "obs-r1-2", statement: "Recovered final state." },
                  ],
                },
              ],
              summary: {
                disposition: "completed",
                packageCount: 1,
                targetCount: 1,
                realizedObservationCount: 2,
              },
            },
          },
          {
            stage: "authority_admission",
            status: "success",
            payload: {
              disposition: "deferred_for_supplemental_realization",
              request: {
                completeness: {
                  status: "available",
                  reportId: "final-completeness:abc123",
                },
              },
              decision: {
                disposition: "deferred_for_supplemental_realization",
                decisionReasons: [
                  "candidate_recoverable_inadequacy_deferred",
                  "recovery_route_available",
                ],
                blockingFindings: [
                  {
                    signalId: "coverage.uncovered_tail",
                    reasonCode: "admission_with_observations",
                  },
                ],
                nonBlockingObservations: [
                  {
                    signalId: "ending.not_retained",
                    reasonCode: "admission_with_observations",
                  },
                ],
                requiredNextAction: "request_supplemental_realization",
              },
              iterativeRecovery: {
                attempted: true,
                priorDisposition: "deferred_for_supplemental_realization",
                supplementalDisposition: "completed",
                finalDisposition: "deferred_for_supplemental_realization",
                packageCount: 1,
              },
              artifacts: {
                "final-completeness-report": {
                  adequacy: "inadequate_recoverable",
                  coverage: {
                    uncoveredTail: {
                      start: 144,
                      end: 188,
                    },
                  },
                  gaps: {
                    gaps: [
                      {
                        id: "gap-001",
                        kind: "tail",
                        sourceStart: 144,
                        sourceEnd: 188,
                      },
                    ],
                  },
                  recoveryRecommendation: {
                    disposition: "required_before_admission",
                    targetedPhysicalGapIds: ["gap-001"],
                    reasons: ["physical_gap_detected", "ending_not_retained"],
                  },
                  diagnosticReasons: ["coverage_tail_loss_detected", "ending_not_retained"],
                },
              },
            },
          },
        ],
      },
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "A dream that still defers after supplemental recovery.");

    await submitCapture?.(formData);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const [eventName, serializedPayload] = consoleWarnSpy.mock.calls[0] ?? [];
    expect(eventName).toBe("llm_observation_extraction_failed");
    expect(typeof serializedPayload).toBe("string");
    const parsed = JSON.parse(serializedPayload as string) as Record<string, unknown>;
    expect(parsed).toEqual(expect.objectContaining({
      reflectiveObjectId: "obj-123",
      selectedMode: "v3",
      observationResolution: "explicit_v3",
      reason: "deferred_for_supplemental_realization",
      family: "v3",
      stage: "generation",
      governanceDisposition: "deferred_for_supplemental_realization",
      pipelineCompletionStatus: "completed",
      failureSourceStage: "authority_admission",
      failedStage: expect.objectContaining({
        status: "available",
        stage: "authority_admission",
        stageStatus: "success",
      }),
      failedStageFailure: {
        status: "unavailable",
      },
      supplementalRealization: {
        status: "available",
        stageStatus: "success",
        plannedTargets: [
          expect.objectContaining({
            targetId: "target-001",
            physicalGapId: "gap-001",
            kind: "tail",
          }),
        ],
        summary: expect.objectContaining({
          disposition: "completed",
          targetCount: 1,
          packageCount: 1,
          realizedObservationCount: 2,
        }),
        packageSummary: expect.objectContaining({
          packageCount: 1,
          realizedObservationCount: 2,
        }),
        execution: [
          expect.objectContaining({
            targetId: "target-001",
            packageId: "supplemental-package-1-gap-001",
          }),
        ],
        droppedOrRejectedObservations: [],
      },
      authorityAdmission: expect.objectContaining({
        status: "available",
        stageStatus: "success",
        disposition: "deferred_for_supplemental_realization",
        decisionReasons: [
          "candidate_recoverable_inadequacy_deferred",
          "recovery_route_available",
        ],
        blockingFindings: [
          expect.objectContaining({
            signalId: "coverage.uncovered_tail",
          }),
        ],
        nonBlockingObservations: [
          expect.objectContaining({
            signalId: "ending.not_retained",
          }),
        ],
        requiredNextAction: "request_supplemental_realization",
      }),
      iterativeRecovery: {
        status: "available",
        value: expect.objectContaining({
          attempted: true,
          priorDisposition: "deferred_for_supplemental_realization",
          supplementalDisposition: "completed",
          finalDisposition: "deferred_for_supplemental_realization",
        }),
      },
      finalCompleteness: {
        status: "available",
        value: expect.objectContaining({
          adequacy: "inadequate_recoverable",
          coverage: expect.objectContaining({
            uncoveredTail: {
              start: 144,
              end: 188,
            },
          }),
          gaps: expect.objectContaining({
            gaps: [
              expect.objectContaining({
                id: "gap-001",
                kind: "tail",
              }),
            ],
          }),
          targetedPhysicalGapIds: ["gap-001"],
          recoveryRecommendation: expect.objectContaining({
            disposition: "required_before_admission",
            targetedPhysicalGapIds: ["gap-001"],
          }),
          diagnosticReasons: ["coverage_tail_loss_detected", "ending_not_retained"],
        }),
      },
    }));
  });

  it("distinguishes failed stages from later stages that were never reached in failed V3 capture diagnostics", async () => {
    resolveObservationCaptureAuthorityModeMock.mockReturnValue({
      mode: "v3",
      observationResolution: "explicit_v3",
    });
    generateObservationForReflectiveObjectMock.mockResolvedValue({
      mode: "failed",
      family: "v3",
      stage: "generation",
      reason: "failed",
      pipelineResult: {
        summary: {
          governanceDisposition: null,
          pipelineCompletionStatus: "failed",
        },
        failurePropagation: {
          failureSourceStage: "memory_realization",
        },
        stageResults: [
          {
            stage: "source_analysis",
            status: "success",
            payload: {
              profile: "simple",
            },
            failure: null,
          },
          {
            stage: "descriptive_extraction",
            status: "success",
            payload: {
              candidateCount: 12,
            },
            failure: null,
          },
          {
            stage: "completeness_analysis",
            status: "success",
            payload: {
              artifacts: {
                "final-completeness-report": {
                  adequacy: "inadequate_recoverable",
                  recoveryRecommendation: {
                    disposition: "required_before_admission",
                    targetedPhysicalGapIds: ["gap-101", "gap-102"],
                  },
                  diagnosticReasons: ["coverage_tail_loss_detected"],
                },
              },
            },
            failure: null,
          },
          {
            stage: "supplemental_realization",
            status: "success",
            skippedReason: null,
            payload: {
              summary: {
                disposition: "completed",
                packageCount: 2,
                targetCount: 2,
                realizedObservationCount: 4,
              },
            },
            failure: null,
          },
          {
            stage: "memory_realization",
            status: "failed",
            payload: null,
            failure: {
              code: "canonical_hash_mismatch",
              message: "Canonical candidate hash changed during realization.",
              meta: {
                expectedHash: "hash-a",
                actualHash: "hash-b",
              },
            },
          },
        ],
      },
    });

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "A dream that fails during memory realization after supplemental recovery.");

    await submitCapture?.(formData);

    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    const [eventName, serializedPayload] = consoleWarnSpy.mock.calls[0] ?? [];
    expect(eventName).toBe("llm_observation_extraction_failed");
    expect(typeof serializedPayload).toBe("string");
    const parsed = JSON.parse(serializedPayload as string) as Record<string, unknown>;
    expect(parsed).toEqual(expect.objectContaining({
      reflectiveObjectId: "obj-123",
      selectedMode: "v3",
      observationResolution: "explicit_v3",
      reason: "failed",
      family: "v3",
      stage: "generation",
      governanceDisposition: null,
      pipelineCompletionStatus: "failed",
      failureSourceStage: "memory_realization",
      failedStage: expect.objectContaining({
        status: "available",
        stage: "memory_realization",
        stageStatus: "failed",
      }),
      failedStageFailure: {
        status: "available",
        value: {
          code: "canonical_hash_mismatch",
          message: "Canonical candidate hash changed during realization.",
          meta: {
            expectedHash: "hash-a",
            actualHash: "hash-b",
          },
        },
      },
      supplementalRealization: expect.objectContaining({
        status: "available",
        stageStatus: "success",
        summary: {
          disposition: "completed",
          packageCount: 2,
          targetCount: 2,
          realizedObservationCount: 4,
        },
      }),
      authorityAdmission: {
        status: "not_reached",
      },
      iterativeRecovery: {
        status: "not_reached",
      },
      finalCompleteness: {
        status: "unavailable",
      },
    }));
  });

  it("starts observation extraction before title generation finishes", async () => {
    const titleDeferred = createDeferred<{ mode: "generated"; title: string }>();
    generateDreamTitleSuggestionMock.mockReturnValue(titleDeferred.promise);

    const pageModule = await import("./page");
    const page = await pageModule.default();
    const submitCapture = findFormAction(page);

    const formData = new FormData();
    formData.set("dreamText", "I was inside a house with water under the floorboards.");

    const submissionPromise = submitCapture?.(formData);

    await vi.waitFor(() => {
      expect(generateObservationForReflectiveObjectMock).toHaveBeenCalledWith({
        dreamText: "I was inside a house with water under the floorboards.",
        observationResolution: "default_v2",
        reflectiveObjectId: "obj-123",
        userId: "user-1",
      });
    });

    expect(createReflectiveObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "obj-123",
        userId: "user-1",
      }),
    );
    expect(persistGeneratedObservationForReflectiveObjectMock).not.toHaveBeenCalled();

    titleDeferred.resolve({
      mode: "generated",
      title: "The Lantern House",
    });

    await submissionPromise;
  });

  it("renders the minimal capture space contract", async () => {
    const pageModule = await import("./page");
    const page = await pageModule.default();
    const markup = renderToStaticMarkup(page);

    const titleInput = findElement(page, (element) => element.type === "input" && element.props.name === "title");

    expect(markup).toContain("Új álom rögzítése");
    expect(markup).not.toContain("Write one dream to begin reflection.");
    expect(markup).not.toContain("A minimal entry path");
    expect(markup).not.toContain("Capture");
    expect(titleInput).toBeNull();
    expect(markup).toContain("Írd le az álmot úgy, ahogy és amennyire emlékszel rá.");
    expect(markup).toContain("Rögzítés");
    expect(markup).toContain("0 szó · 0 karakter");
  });
});
