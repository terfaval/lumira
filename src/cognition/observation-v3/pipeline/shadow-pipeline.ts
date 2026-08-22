import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  analyzeComposedCandidateCompleteness,
  analyzeNativeC0Completeness,
  fingerprintCompletenessAnalysis,
  type CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis";
import {
  executeDescriptiveExtractionAttempt,
  projectNativeC0CandidateToExperimentalRegions,
  projectNativeC0CandidateToExperimentalUnits,
  projectNativeC0CandidateToObservationV2Bundle,
  type ObservationV3NativeC0Candidate,
  type StructuredDescriptiveExtractionProviderResult,
} from "@/src/cognition/observation-v3/descriptive-extraction";
import {
  fingerprintMemoryComposition,
  runShadowMemoryComposition,
  type MemoryCompositionRequest,
} from "@/src/cognition/observation-v3/memory-composition";
import {
  buildNativeAdmissionRequest,
  DEFAULT_AUTHORITY_ADMISSION_POLICY,
  fingerprintAuthorityAdmission,
  runShadowAuthorityAdmission,
} from "@/src/cognition/observation-v3/authority-admission";
import {
  fingerprintMemoryRealization,
  realizeCanonicalMemoryCandidate,
  type MemoryRealizationRequest,
  type SourceIdentity as MemoryRealizationSourceIdentity,
  runShadowMemoryRealization,
} from "@/src/cognition/observation-v3/memory-realization";
import {
  fingerprintSupplementalRealization,
  fingerprintSupplementalRealizationPlan,
  planSupplementalRealization,
  runShadowSupplementalRealization,
  type PlannedSupplementalGap,
  type SupplementalRealizationExecutionResponse,
  type SupplementalRealizationPackage,
  type SupplementalRealizationShadowRun,
} from "@/src/cognition/observation-v3/supplemental-realization";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import {
  isSupplementalReplayTargetCompatible,
  type LoadedSupplementalReplayTargetContract,
} from "@/src/cognition/observation-v3/pipeline/replay/preserved-case-loader";
import { runShadowSourceAnalysis } from "@/src/cognition/observation-v3/source-analysis";
import { fingerprintObservationV3Pipeline } from "@/src/cognition/observation-v3/pipeline/pipeline-fingerprint";
import {
  runObservationV3PipelineCore,
  type ObservationV3PipelineCoreInput,
  type ObservationV3PipelineRunResult,
} from "@/src/cognition/observation-v3/pipeline/pipeline-runner";
import { buildObservationV3PipelineArtifacts } from "@/src/cognition/observation-v3/pipeline/pipeline-artifacts";

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }
  return value;
}

async function hashFiles(filePaths: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    filePaths.map(async (filePath) => [filePath, sha256Hex(await fs.readFile(path.resolve(filePath)))] as const),
  );
  return Object.fromEntries(entries);
}

export interface ObservationV3PreservedReplayAdapterInput {
  adapterId: string;
  descriptiveExtraction: {
    attemptId: string;
    attemptNumber: 1 | 2;
    sourceArtifactRef: string;
    providerResult: StructuredDescriptiveExtractionProviderResult;
  };
  supplementalRealization?: {
    responses: Array<{
      physicalGapId: string;
      targetContract?: LoadedSupplementalReplayTargetContract | null;
      sourceArtifactRef: string;
      providerResult: SupplementalRealizationExecutionResponse;
    }>;
  };
}

export interface ObservationV3LiveProviderExecutionInput {
  descriptiveExtraction?: {
    attempt?: 1 | 2;
    contractVariant?: "control" | "no_derived";
    extractionRequestId?: string;
    retryParentAttemptIdentity?: string | null;
    onProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
    requestStructuredOutput?: (
      input: {
        dreamText: string;
        prompt: string;
        model: string;
        schemaName: string;
        schema: Record<string, unknown>;
        timeoutMs: number;
        startedAtMs: number;
      },
    ) => Promise<StructuredDescriptiveExtractionProviderResult | null>;
  };
  supplementalRealization?: {
    onProviderEvidence?: (evidence: SupplementalRealizationProviderEvidence) => void | Promise<void>;
    executeStructuredRealization?: (input: {
      prompt: string;
      schema: Record<string, unknown>;
      schemaName: string;
      timeoutMs: number;
      model: string;
      target: PlannedSupplementalGap;
    }) => Promise<SupplementalRealizationExecutionResponse>;
  };
  onDeterministicSubstageTiming?: (timing: {
    stage: "final_completeness";
    startedAt: string;
    completedAt: string;
    latencyMs: number;
    status: "success" | "failed";
  }) => void | Promise<void>;
}

interface ObservationV3ShadowPipelineBaseInput {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  sourceIdentity?: {
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
  };
}

type ObservationV3ShadowPipelineReplayInput = ObservationV3ShadowPipelineBaseInput & {
  replay: ObservationV3PreservedReplayAdapterInput;
  liveProviderExecution?: undefined;
};

type ObservationV3ShadowPipelineLiveInput = ObservationV3ShadowPipelineBaseInput & {
  replay?: undefined;
  liveProviderExecution: ObservationV3LiveProviderExecutionInput;
};

export type ObservationV3ShadowPipelineInput =
  | ObservationV3ShadowPipelineReplayInput
  | ObservationV3ShadowPipelineLiveInput;

export interface ObservationV3ShadowPipelineResult extends ObservationV3PipelineRunResult {
  artifacts: Record<string, unknown>;
  subsystemFingerprints: Record<string, unknown>;
}

function createSourceIdentity(input: ObservationV3ShadowPipelineInput): MemoryRealizationSourceIdentity {
  return input.sourceIdentity ?? {
    sourceId: `source-${sha256Hex(input.dreamText).slice(0, 12)}`,
    sourceHash: sha256Hex(input.dreamText),
    sourceLength: input.dreamText.length,
  };
}

function toCompositionRequest(
  dreamText: string,
  candidate: ObservationV3NativeC0Candidate,
  supplementalPackages: SupplementalRealizationPackage[],
  sourceIdentity: MemoryRealizationSourceIdentity,
  completeness?: CompletenessReport,
): MemoryCompositionRequest {
  return {
    dreamTextLength: dreamText.length,
    sourceIdentity,
    baselineIdentity: {
      candidateId: candidate.candidateId,
      candidateHash: completeness?.candidateIdentity.candidateHash ?? candidate.candidateHash,
    },
    supplementalIdentity: supplementalPackages.length > 0
      ? {
          candidateId: `supplemental-${sha256Hex(stableJson(supplementalPackages.map((pkg) => pkg.packageId).sort())).slice(0, 16)}`,
          candidateHash: sha256Hex(stableJson(
            supplementalPackages
              .map((pkg) => ({
                packageId: pkg.packageId,
                localityCount: pkg.regions.length,
                unitCount: pkg.observations.length,
              }))
              .sort((left, right) => left.packageId.localeCompare(right.packageId)),
          )),
        }
      : undefined,
    baseline: {
      regions: projectNativeC0CandidateToExperimentalRegions(candidate),
      units: projectNativeC0CandidateToExperimentalUnits(candidate),
    },
    supplemental: {
      regions: supplementalPackages.flatMap((pkg) => pkg.regions),
      units: supplementalPackages.flatMap((pkg) => pkg.observations),
    },
  };
}

function buildSupplementalIdentity(
  supplementalPackages: SupplementalRealizationPackage[],
): MemoryCompositionRequest["supplementalIdentity"] {
  return supplementalPackages.length > 0
    ? {
        candidateId: `supplemental-${sha256Hex(stableJson(supplementalPackages.map((pkg) => pkg.packageId).sort())).slice(0, 16)}`,
        candidateHash: sha256Hex(stableJson(
          supplementalPackages
            .map((pkg) => ({
              packageId: pkg.packageId,
              localityCount: pkg.regions.length,
              unitCount: pkg.observations.length,
            }))
            .sort((left, right) => left.packageId.localeCompare(right.packageId)),
        )),
      }
    : undefined;
}

function toIterativeCompositionRequest(input: {
  dreamText: string;
  sourceIdentity: MemoryRealizationSourceIdentity;
  baselineIdentity: {
    candidateId: string;
    candidateHash: string;
  };
  baseline: MemoryCompositionRequest["baseline"];
  supplementalPackages: SupplementalRealizationPackage[];
}): MemoryCompositionRequest {
  return {
    dreamTextLength: input.dreamText.length,
    sourceIdentity: input.sourceIdentity,
    baselineIdentity: input.baselineIdentity,
    supplementalIdentity: buildSupplementalIdentity(input.supplementalPackages),
    baseline: input.baseline,
    supplemental: {
      regions: input.supplementalPackages.flatMap((pkg) => pkg.regions),
      units: input.supplementalPackages.flatMap((pkg) => pkg.observations),
    },
  };
}

async function collectSubsystemFingerprints(): Promise<Record<string, unknown>> {
  const descriptiveExtractionFiles = await hashFiles([
    "src/cognition/observation-v3/descriptive-extraction/descriptive-extraction.ts",
    "src/cognition/observation-v3/descriptive-extraction/normalization.ts",
    "src/cognition/observation-v3/descriptive-extraction/parser.ts",
  ]);
  const sourceAnalysisFiles = await hashFiles([
    "src/cognition/observation-v3/source-analysis/source-analysis.ts",
    "src/cognition/observation-v3/source-analysis/shadow-source-analysis.ts",
    "src/cognition/observation-v3/source-analysis/source-analysis-contract.ts",
  ]);
  const supplementalFiles = await hashFiles([
    "src/cognition/observation-v3/supplemental-realization/shadow-supplemental-realization.ts",
    "src/cognition/observation-v3/supplemental-realization/realization-planner.ts",
    "src/cognition/observation-v3/supplemental-realization/package-builder.ts",
  ]);
  const compositionFiles = await hashFiles([
    "src/cognition/observation-v3/memory-composition/memory-composition.ts",
    "src/cognition/observation-v3/memory-composition/native-composition-engine.ts",
    "src/cognition/observation-v3/memory-composition/memory-composition-contract.ts",
  ]);

  return {
    source_analysis: sourceAnalysisFiles,
    descriptive_extraction: descriptiveExtractionFiles,
    completeness_analysis: await fingerprintCompletenessAnalysis(),
    supplemental_realization: supplementalFiles,
    memory_composition: compositionFiles,
    memory_realization: await fingerprintMemoryRealization(),
    authority_admission: await fingerprintAuthorityAdmission(),
  };
}

export async function runObservationV3ShadowPipeline(
  input: ObservationV3ShadowPipelineInput,
): Promise<ObservationV3ShadowPipelineResult> {
  const sourceIdentity = createSourceIdentity(input);
  const liveProviderExecution = input.liveProviderExecution;
  const descriptiveExecutionMode = liveProviderExecution ? "provider_backed" : "preserved_replay";
  const supplementalExecutionMode = liveProviderExecution ? "provider_backed" : "preserved_replay";
  const pipelineFingerprint = await fingerprintObservationV3Pipeline();
  const subsystemFingerprints = await collectSubsystemFingerprints();
  let supplementalRun: SupplementalRealizationShadowRun | null = null;
  let supplementalDisposition: string | null = null;

  const coreInput: ObservationV3PipelineCoreInput = {
    pipelineId: `observation-v3-shadow-${sourceIdentity.sourceHash.slice(0, 12)}`,
    sourceText: input.dreamText,
    sourceIdentity,
    fingerprintPipeline: async () => ({
      pipelineVersion: pipelineFingerprint.pipelineVersion,
      pipelineHash: pipelineFingerprint.pipelineHash,
    }),
    stages: {
      sourceAnalysis: async ({ sourceText }) => {
        const result = await runShadowSourceAnalysis({ dreamText: sourceText });
        if (result.status !== "available") {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "source-analysis.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.source_analysis)),
            inputHash: sha256Hex(sourceText),
            outputHash: null,
            failure: result.failure,
          };
        }
        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "source-analysis.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.source_analysis)),
          inputHash: sha256Hex(sourceText),
          outputHash: sha256Hex(stableJson(result.profile)),
          payload: {
            profile: result.profile,
          },
        };
      },
      descriptiveExtraction: async ({ sourceText }) => {
        const result = await executeDescriptiveExtractionAttempt({
          userId: input.userId,
          reflectiveObjectId: input.reflectiveObjectId,
          dreamText: sourceText,
          attempt: liveProviderExecution?.descriptiveExtraction?.attempt ?? input.replay?.descriptiveExtraction.attemptNumber ?? 1,
          contractVariant: liveProviderExecution?.descriptiveExtraction?.contractVariant,
          extractionRequestId: liveProviderExecution?.descriptiveExtraction?.extractionRequestId,
          retryParentAttemptIdentity: liveProviderExecution?.descriptiveExtraction?.retryParentAttemptIdentity,
          onProviderEvidence: liveProviderExecution?.descriptiveExtraction?.onProviderEvidence,
          requestStructuredOutput: liveProviderExecution?.descriptiveExtraction?.requestStructuredOutput
            ?? (input.replay
              ? async () => input.replay!.descriptiveExtraction.providerResult
              : undefined),
        });

        if (result.status !== "candidate_available" || !result.candidate) {
          return {
            status: "failed",
            executionMode: descriptiveExecutionMode,
            sourceArtifactRef: input.replay?.descriptiveExtraction.sourceArtifactRef ?? null,
            adapterFingerprint: input.replay?.adapterId ?? null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.descriptive_extraction)),
            inputHash: sha256Hex(sourceText),
            outputHash: null,
            failure: {
              code: result.status,
              message: "descriptive_extraction_candidate_unavailable",
            },
          };
        }

        return {
          status: "success",
          executionMode: descriptiveExecutionMode,
          sourceArtifactRef: input.replay?.descriptiveExtraction.sourceArtifactRef ?? null,
          adapterFingerprint: input.replay?.adapterId ?? null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.descriptive_extraction)),
          inputHash: sha256Hex(sourceText),
          outputHash: sha256Hex(stableJson(result.candidate)),
          payload: {
            attemptNumber: liveProviderExecution?.descriptiveExtraction?.attempt ?? input.replay?.descriptiveExtraction.attemptNumber ?? 1,
            attemptId: input.replay?.descriptiveExtraction.attemptId ?? null,
            candidate: result.candidate,
            diagnostics: result.diagnostics,
          },
        };
      },
      completenessAnalysis: async ({ sourceText, upstream }) => {
        const candidate = upstream.descriptive_extraction?.candidate as ObservationV3NativeC0Candidate | undefined;
        if (!candidate) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "completeness-report.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.completeness_analysis)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "candidate_unavailable",
              message: "descriptive_extraction_candidate_unavailable",
            },
          };
        }

        const report = analyzeNativeC0Completeness({
          dreamText: sourceText,
          candidate,
          sourceIdentity: {
            sourceHash: sourceIdentity.sourceHash,
            sourceLength: sourceIdentity.sourceLength,
          },
        });

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "completeness-report.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.completeness_analysis)),
          inputHash: sha256Hex(stableJson({ sourceText, candidateId: candidate.candidateId })),
          outputHash: sha256Hex(stableJson(report)),
          payload: report as unknown as Record<string, unknown>,
        };
      },
      supplementalRealization: async ({ sourceText, upstream }) => {
        const completeness = upstream.completeness_analysis as CompletenessReport | undefined;
        const candidate = upstream.descriptive_extraction?.candidate as ObservationV3NativeC0Candidate | undefined;
        if (!completeness || !candidate) {
          return {
            status: "failed",
            executionMode: supplementalExecutionMode,
            sourceArtifactRef: input.replay?.supplementalRealization?.responses[0]?.sourceArtifactRef ?? null,
            adapterFingerprint: input.replay?.adapterId ?? null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.supplemental_realization)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "supplemental_prerequisites_unavailable",
              message: "supplemental_prerequisites_unavailable",
            },
          };
        }

        const replayResponses = new Map<string, Array<{
          physicalGapId: string;
          targetContract?: LoadedSupplementalReplayTargetContract | null;
          sourceArtifactRef: string;
          providerResult: SupplementalRealizationExecutionResponse;
        }>>();
        for (const entry of input.replay?.supplementalRealization?.responses ?? []) {
          const existing = replayResponses.get(entry.physicalGapId) ?? [];
          existing.push(entry);
          replayResponses.set(entry.physicalGapId, existing);
        }
        const currentPlan = planSupplementalRealization({
          sourceText,
          completeness,
          baseline: {
            candidateId: candidate.candidateId,
            candidateHash: candidate.candidateHash,
            regions: projectNativeC0CandidateToExperimentalRegions(candidate),
            units: projectNativeC0CandidateToExperimentalUnits(candidate),
          },
          contextPadding: 260,
          maximumWindowLength: 3200,
        });
        const incompatibleReplayTarget = input.replay
          ? currentPlan.selectedGaps.find((target) => {
            const candidates = replayResponses.get(target.physicalGapId) ?? [];
            return candidates.length === 0 || !candidates.some((entry) =>
              isSupplementalReplayTargetCompatible({
                currentTarget: target,
                preservedTarget: entry.targetContract ?? null,
              }));
          })
          : null;
        if (incompatibleReplayTarget) {
          return {
            status: "failed",
            executionMode: supplementalExecutionMode,
            sourceArtifactRef: null,
            adapterFingerprint: input.replay?.adapterId ?? null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.supplemental_realization)),
            inputHash: sha256Hex(stableJson(completeness)),
            outputHash: null,
            failure: {
              code: "missing_preserved_replay",
              message: `incompatible_preserved_replay:${incompatibleReplayTarget.targetId}`,
            },
          };
        }
        supplementalRun = await runShadowSupplementalRealization({
          sourceText,
          sourceIdentity: sourceIdentity.sourceId,
          completeness,
          baseline: {
            candidateId: candidate.candidateId,
            candidateHash: candidate.candidateHash,
            regions: projectNativeC0CandidateToExperimentalRegions(candidate),
            units: projectNativeC0CandidateToExperimentalUnits(candidate),
          },
          contextPadding: 260,
          maximumWindowLength: 3200,
          onProviderEvidence: liveProviderExecution?.supplementalRealization?.onProviderEvidence,
          executeStructuredRealization: liveProviderExecution?.supplementalRealization?.executeStructuredRealization
            ?? (input.replay
              ? async ({ target }) => {
                  const replay = (replayResponses.get(target.physicalGapId) ?? []).find((entry) =>
                    isSupplementalReplayTargetCompatible({
                      currentTarget: target,
                      preservedTarget: entry.targetContract ?? null,
                    }));
                  if (!replay) {
                    return {
                      outputText: null,
                      providerStatus: "missing_preserved_replay",
                      providerIncompleteReason: "missing_preserved_replay",
                      tokenUsage: {
                        input: null,
                        output: null,
                        total: null,
                      },
                    } satisfies SupplementalRealizationExecutionResponse;
                  }
                  return replay.providerResult;
                }
              : undefined),
        });
        supplementalDisposition = supplementalRun.result.disposition;

        const missingReplayExecution = supplementalRun.result.execution.find(
          (entry) => entry.providerStatus === "missing_preserved_replay",
        );
        if (missingReplayExecution) {
          return {
            status: "failed",
            executionMode: supplementalExecutionMode,
            sourceArtifactRef: null,
            adapterFingerprint: input.replay?.adapterId ?? null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.supplemental_realization)),
            inputHash: sha256Hex(stableJson(completeness)),
            outputHash: null,
            failure: {
              code: "missing_preserved_replay",
              message: `missing_preserved_replay:${missingReplayExecution.targetId}`,
            },
          };
        }

        return {
          status: "success",
          executionMode: supplementalExecutionMode,
          sourceArtifactRef: input.replay?.supplementalRealization?.responses[0]?.sourceArtifactRef ?? null,
          adapterFingerprint: input.replay?.adapterId ?? null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.supplemental_realization)),
          inputHash: sha256Hex(stableJson(completeness)),
          outputHash: sha256Hex(stableJson(supplementalRun.result)),
          payload: {
            plan: supplementalRun.plan,
            result: supplementalRun.result,
            packages: supplementalRun.result.packages,
            planFingerprint: fingerprintSupplementalRealizationPlan(supplementalRun.plan),
            resultFingerprint: fingerprintSupplementalRealization(supplementalRun.result),
          },
        };
      },
      memoryComposition: async ({ sourceText, upstream }) => {
        const candidate = upstream.descriptive_extraction?.candidate as ObservationV3NativeC0Candidate | undefined;
        if (!candidate) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "composition-summary.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_composition)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "baseline_candidate_unavailable",
              message: "baseline_candidate_unavailable",
            },
          };
        }

        const packages = (upstream.supplemental_realization?.packages as SupplementalRealizationPackage[] | undefined) ?? [];
        const initialCompleteness = upstream.completeness_analysis as CompletenessReport | undefined;
        const compositionRequest = toCompositionRequest(sourceText, candidate, packages, sourceIdentity, initialCompleteness);
        const compositionRun = runShadowMemoryComposition(compositionRequest);
        const finalCompletenessStartedAtMs = Date.now();
        const finalCompleteness = analyzeComposedCandidateCompleteness({
          dreamText: sourceText,
          composedCandidate: compositionRun.result.composedCandidate,
          composedCandidateHash: compositionRun.result.composedCandidateIdentity.composedCandidateHash,
          sourceIdentity: {
            sourceHash: sourceIdentity.sourceHash,
            sourceLength: sourceIdentity.sourceLength,
          },
        });
        const finalCompletenessCompletedAtMs = Date.now();
        await liveProviderExecution?.onDeterministicSubstageTiming?.({
          stage: "final_completeness",
          startedAt: new Date(finalCompletenessStartedAtMs).toISOString(),
          completedAt: new Date(finalCompletenessCompletedAtMs).toISOString(),
          latencyMs: Math.max(0, finalCompletenessCompletedAtMs - finalCompletenessStartedAtMs),
          status: "success",
        });

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "composition-summary.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_composition)),
          inputHash: sha256Hex(stableJson(compositionRequest)),
          outputHash: sha256Hex(stableJson({
            composition: compositionRun.result,
            finalCompleteness,
          })),
          payload: {
            request: compositionRequest,
            result: compositionRun.result,
            finalCompleteness,
            artifacts: {
              ...compositionRun.artifacts,
              "initial-completeness-stage": "completeness_analysis",
              "final-completeness-stage": "memory_composition",
              "final-completeness-report": finalCompleteness,
            },
            fingerprint: fingerprintMemoryComposition(compositionRun.result),
          },
        };
      },
      memoryRealization: async ({ upstream }) => {
        const compositionResult = upstream.memory_composition?.result as ReturnType<typeof runShadowMemoryComposition>["result"] | undefined;
        if (!compositionResult?.composedCandidate || !compositionResult.composedCandidateIdentity) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "memory-realization-summary.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_realization)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "composition_result_unavailable",
              message: "native_composed_candidate_unavailable",
            },
          };
        }

        const composedCandidate = compositionResult.composedCandidate;
        const request: MemoryRealizationRequest = {
          requestId: `memory-realization-${sha256Hex(compositionResult.composedCandidateIdentity.composedCandidateId).slice(0, 12)}`,
          sourceIdentity,
          composedCandidateIdentity: compositionResult.composedCandidateIdentity,
          composedCandidate,
          compositionResultRef: `composition:${composedCandidate.provenance.provenanceId}`,
          realizationPolicyVersion: "observation-v3-shadow-pipeline-v1",
          realizationPolicyFingerprint: "observation-v3-shadow-pipeline-v1",
        };
        const realizationRun = runShadowMemoryRealization({ request });
        const result = realizationRun.result;

        if (!result.canonicalCandidate) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "memory-realization-summary.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_realization)),
            inputHash: sha256Hex(stableJson(request)),
            outputHash: null,
            failure: {
              code: result.disposition,
              message: result.failures.map((entry) => entry.code).join(",") || "memory_realization_failed",
            },
          };
        }

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "memory-realization-summary.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_realization)),
          inputHash: sha256Hex(stableJson(request)),
          outputHash: result.canonicalCandidate.canonicalHash,
          payload: {
            request,
            result,
            artifacts: realizationRun.artifacts,
            canonicalCandidateId: result.canonicalCandidate.canonicalCandidateId,
            canonicalHash: result.canonicalCandidate.canonicalHash,
          },
        };
      },
      authorityAdmission: async ({ upstream }) => {
        const memoryRealization = upstream.memory_realization?.result as ReturnType<typeof realizeCanonicalMemoryCandidate> | undefined;
        const finalCompleteness = upstream.memory_composition?.finalCompleteness as CompletenessReport | undefined;
        const compositionResult = upstream.memory_composition?.result as ReturnType<typeof runShadowMemoryComposition>["result"] | undefined;
        if (!memoryRealization || !finalCompleteness) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "native-admission-decision.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.authority_admission)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "admission_prerequisites_unavailable",
              message: "final_completeness_unavailable_for_admission",
            },
          };
        }

        const request = buildNativeAdmissionRequest({
          nativeResult: memoryRealization,
          completeness: {
            status: "available",
            reportId: `final-completeness:${sourceIdentity.sourceHash.slice(0, 12)}`,
            report: finalCompleteness,
          },
        });
        if (!request) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "native-admission-decision.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.authority_admission)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "canonical_candidate_unavailable",
              message: "canonical_candidate_unavailable",
            },
          };
        }

        const decision = runShadowAuthorityAdmission({
          request,
          policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
        });

        if (decision.failure) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "native-admission-decision.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.authority_admission)),
            inputHash: sha256Hex(stableJson(request)),
            outputHash: null,
            failure: decision.failure,
          };
        }

        let effectiveRequest = request;
        let effectiveDecision = decision.decision;
        let effectiveFinalCompleteness = finalCompleteness;
        let iterativeRecovery: Record<string, unknown> | null = null;

        const shouldAttemptIterativeRecovery =
          decision.decision.disposition === "deferred_for_supplemental_realization"
          && compositionResult?.composedCandidateIdentity
          && finalCompleteness.recoveryRecommendation.disposition === "required_before_admission"
          && finalCompleteness.recoveryRecommendation.targetedPhysicalGapIds.length > 0
          && Boolean(liveProviderExecution);

        if (shouldAttemptIterativeRecovery && compositionResult) {
          const liveExecution = liveProviderExecution;
          if (!liveExecution) {
            iterativeRecovery = {
              attempted: false,
              skippedReason: "live_execution_unavailable",
            };
          } else {
            const supplementalExecution = liveExecution.supplementalRealization;
            try {
            const iterativeSupplementalRun = await runShadowSupplementalRealization({
              sourceText: input.dreamText,
              sourceIdentity: sourceIdentity.sourceId,
              completeness: finalCompleteness,
              baseline: {
                candidateId: compositionResult.composedCandidateIdentity.composedCandidateId,
                candidateHash: compositionResult.composedCandidateIdentity.composedCandidateHash,
                regions: compositionResult.composedRegions,
                units: compositionResult.composedUnits,
              },
              contextPadding: 260,
              maximumWindowLength: 3200,
              onProviderEvidence: supplementalExecution?.onProviderEvidence,
              executeStructuredRealization: supplementalExecution?.executeStructuredRealization,
            });

            const iterativeCompositionRequest = toIterativeCompositionRequest({
              dreamText: input.dreamText,
              sourceIdentity,
              baselineIdentity: {
                candidateId: compositionResult.composedCandidateIdentity.composedCandidateId,
                candidateHash: compositionResult.composedCandidateIdentity.composedCandidateHash,
              },
              baseline: {
                regions: compositionResult.composedRegions,
                units: compositionResult.composedUnits,
              },
              supplementalPackages: iterativeSupplementalRun.result.packages,
            });
            const iterativeCompositionRun = runShadowMemoryComposition(iterativeCompositionRequest);

            const iterativeCompletenessStartedAtMs = Date.now();
            const iterativeFinalCompleteness = analyzeComposedCandidateCompleteness({
              dreamText: input.dreamText,
              composedCandidate: iterativeCompositionRun.result.composedCandidate,
              composedCandidateHash: iterativeCompositionRun.result.composedCandidateIdentity.composedCandidateHash,
              sourceIdentity: {
                sourceHash: sourceIdentity.sourceHash,
                sourceLength: sourceIdentity.sourceLength,
              },
            });
            const iterativeCompletenessCompletedAtMs = Date.now();
            await liveExecution.onDeterministicSubstageTiming?.({
              stage: "final_completeness",
              startedAt: new Date(iterativeCompletenessStartedAtMs).toISOString(),
              completedAt: new Date(iterativeCompletenessCompletedAtMs).toISOString(),
              latencyMs: Math.max(0, iterativeCompletenessCompletedAtMs - iterativeCompletenessStartedAtMs),
              status: "success",
            });

            const iterativeRealizationRequest: MemoryRealizationRequest = {
              requestId: `memory-realization-${sha256Hex(iterativeCompositionRun.result.composedCandidateIdentity.composedCandidateId).slice(0, 12)}`,
              sourceIdentity,
              composedCandidateIdentity: iterativeCompositionRun.result.composedCandidateIdentity,
              composedCandidate: iterativeCompositionRun.result.composedCandidate,
              compositionResultRef: `composition:${iterativeCompositionRun.result.composedCandidate.provenance.provenanceId}`,
              realizationPolicyVersion: "observation-v3-shadow-pipeline-v1",
              realizationPolicyFingerprint: "observation-v3-shadow-pipeline-v1",
            };
            const iterativeRealizationRun = runShadowMemoryRealization({ request: iterativeRealizationRequest });

            iterativeRecovery = {
              attempted: true,
              priorDisposition: decision.decision.disposition,
              supplementalDisposition: iterativeSupplementalRun.result.disposition,
              packageCount: iterativeSupplementalRun.result.packages.length,
            };

            if (iterativeRealizationRun.result.canonicalCandidate) {
              const iterativeRequest = buildNativeAdmissionRequest({
                nativeResult: iterativeRealizationRun.result,
                completeness: {
                  status: "available",
                  reportId: `final-completeness:${sourceIdentity.sourceHash.slice(0, 12)}:iterative`,
                  report: iterativeFinalCompleteness,
                },
              });

              if (iterativeRequest) {
                const iterativeDecision = runShadowAuthorityAdmission({
                  request: iterativeRequest,
                  policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
                });

                if (!iterativeDecision.failure) {
                  effectiveRequest = iterativeRequest;
                  effectiveDecision = iterativeDecision.decision;
                  effectiveFinalCompleteness = iterativeFinalCompleteness;
                  iterativeRecovery = {
                    ...iterativeRecovery,
                    finalDisposition: iterativeDecision.decision.disposition,
                  };
                } else {
                  iterativeRecovery = {
                    ...iterativeRecovery,
                    failure: iterativeDecision.failure,
                  };
                }
              }
            }
          } catch (error) {
            iterativeRecovery = {
              attempted: true,
              priorDisposition: decision.decision.disposition,
              failure: {
                code: "iterative_supplemental_recovery_failed",
                message: error instanceof Error ? error.message : "iterative_supplemental_recovery_failed",
              },
            };
          }
          }
        }

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "native-admission-decision.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.authority_admission)),
          inputHash: sha256Hex(stableJson(effectiveRequest)),
          outputHash: sha256Hex(stableJson(effectiveDecision)),
          payload: {
            request: effectiveRequest,
            decision: effectiveDecision,
            artifacts: {
              "admission-identity-input-comparison": effectiveRequest.admissionIdentityInputComparison,
              "final-completeness-report": effectiveFinalCompleteness,
            },
            disposition: effectiveDecision.disposition,
            authorityIdentity: effectiveDecision.authorityIdentity,
            receivedCanonicalCandidateId: effectiveRequest.canonicalCandidate.canonicalCandidateId,
            iterativeRecovery,
          },
        };
      },
    },
  };

  const result = await runObservationV3PipelineCore(coreInput);
  const artifacts = buildObservationV3PipelineArtifacts(result, {
    pipelineFiles: pipelineFingerprint.files,
    subsystemFingerprints,
  });

  if (supplementalDisposition) {
    artifacts["pipeline-governance.json"] = {
      ...(artifacts["pipeline-governance.json"] as Record<string, unknown>),
      supplementalDisposition,
    };
  }
  const extractionStage = result.stageResults.find((stage) => stage.stage === "descriptive_extraction");
  const completenessStage = result.stageResults.find((stage) => stage.stage === "completeness_analysis");
  const compositionStage = result.stageResults.find((stage) => stage.stage === "memory_composition");
  const nativeCandidate = (extractionStage?.payload as { candidate?: ObservationV3NativeC0Candidate } | null)?.candidate;
  const initialCompleteness = completenessStage?.payload as CompletenessReport | null;
  const compositionPayload = compositionStage?.payload as { request?: MemoryCompositionRequest } | null;
  if (nativeCandidate) {
    const projection = projectNativeC0CandidateToObservationV2Bundle(nativeCandidate);
    artifacts["native-c0-carrier-evidence.json"] = {
      nativeCandidateIdentity: {
        candidateId: nativeCandidate.candidateId,
        candidateHash: nativeCandidate.candidateHash,
        candidateVersion: nativeCandidate.candidateVersion,
      },
      initialCompleteness: initialCompleteness
        ? {
            candidateKind: initialCompleteness.candidateIdentity.candidateKind,
            candidateHash: initialCompleteness.candidateIdentity.candidateHash,
          }
        : null,
      supplementalBaseline: {
        baselineCarrierKind: "native_c0_candidate",
        candidateId: nativeCandidate.candidateId,
        candidateHash: nativeCandidate.candidateHash,
      },
      compositionBaseline: compositionPayload?.request?.baselineIdentity
        ? {
            baselineCarrierKind: "native_c0_candidate",
            candidateId: compositionPayload.request.baselineIdentity.candidateId,
            candidateHash: compositionPayload.request.baselineIdentity.candidateHash,
          }
        : null,
      v2ProjectionIdentity: {
        bundleId: projection.bundleId ?? null,
        runtimeVersion: projection.runtimeVersion ?? null,
      },
      projectionReconsumedByNativePipeline: false,
    };
  }

  return {
    ...result,
    artifacts,
    subsystemFingerprints,
  };
}
