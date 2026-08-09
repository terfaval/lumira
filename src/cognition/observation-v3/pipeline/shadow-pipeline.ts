import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  analyzeComposedCandidateCompleteness,
  analyzeObservationCompleteness,
  fingerprintCompletenessAnalysis,
  type CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis";
import {
  executeDescriptiveExtractionAttempt,
  type StructuredDescriptiveExtractionProviderResult,
} from "@/src/cognition/observation-v3/descriptive-extraction";
import {
  fingerprintMemoryComposition,
  runShadowMemoryComposition,
  type MemoryCompositionRequest,
} from "@/src/cognition/observation-v3/memory-composition";
import {
  DEFAULT_AUTHORITY_ADMISSION_POLICY,
  fingerprintAuthorityAdmission,
  runShadowAuthorityAdmission,
} from "@/src/cognition/observation-v3/authority-admission";
import { buildNativeShadowAdmissionRequest } from "@/src/cognition/observation-v3/authority-admission/shadow-authority-admission";
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
  runShadowSupplementalRealization,
  type SupplementalRealizationExecutionResponse,
  type SupplementalRealizationPackage,
  type SupplementalRealizationShadowRun,
} from "@/src/cognition/observation-v3/supplemental-realization";
import { runShadowSourceAnalysis } from "@/src/cognition/observation-v3/source-analysis";
import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
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
      sourceArtifactRef: string;
      providerResult: SupplementalRealizationExecutionResponse;
    }>;
  };
}

export interface ObservationV3ShadowPipelineInput {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  sourceIdentity?: {
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
  };
  replay: ObservationV3PreservedReplayAdapterInput;
}

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

function toExperimentalRegion(bundle: ObservationV2Bundle): ExperimentalRegion[] {
  return bundle.scenes.map((scene, index) => ({
    regionId: scene.sceneId,
    order: scene.position ?? index,
    heading: scene.summary,
    spanStart: scene.evidenceContext.spanStart,
    spanEnd: scene.evidenceContext.spanEnd,
    evidence: [scene.evidenceContext],
    boundaryConfidence: "medium",
    uncertainty: scene.uncertaintyNotes?.[0] ?? null,
    transitionCues: [],
  }));
}

function toExperimentalUnits(bundle: ObservationV2Bundle): ExperimentalObservationUnit[] {
  return bundle.scenes.flatMap((scene) =>
    scene.observations.map((observation, index) => ({
      observationId: observation.observationId,
      regionId: scene.sceneId,
      order: observation.position ?? index,
      statement: observation.text,
      evidence: observation.evidence,
      uncertainty: observation.uncertaintyNote,
      source: "baseline" as const,
      recoveryProvenance: null,
    })),
  );
}

function toCompositionRequest(
  dreamText: string,
  bundle: ObservationV2Bundle,
  supplementalPackages: SupplementalRealizationPackage[],
  sourceIdentity: MemoryRealizationSourceIdentity,
  completeness?: CompletenessReport,
): MemoryCompositionRequest {
  return {
    dreamTextLength: dreamText.length,
    sourceIdentity,
    baselineIdentity: {
      candidateId: bundle.bundleId ?? "legacy-v2-bundle",
      candidateHash: completeness?.candidateIdentity.candidateHash ?? sha256Hex(stableJson(bundle)),
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
      regions: toExperimentalRegion(bundle),
      units: toExperimentalUnits(bundle),
    },
    supplemental: {
      regions: supplementalPackages.flatMap((pkg) => pkg.regions),
      units: supplementalPackages.flatMap((pkg) => pkg.observations),
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
          attempt: input.replay.descriptiveExtraction.attemptNumber,
          requestStructuredOutput: async () => input.replay.descriptiveExtraction.providerResult,
        });

        if (result.status !== "candidate_available" || !result.bundle) {
          return {
            status: "failed",
            executionMode: "preserved_replay",
            sourceArtifactRef: input.replay.descriptiveExtraction.sourceArtifactRef,
            adapterFingerprint: input.replay.adapterId,
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
          executionMode: "preserved_replay",
          sourceArtifactRef: input.replay.descriptiveExtraction.sourceArtifactRef,
          adapterFingerprint: input.replay.adapterId,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.descriptive_extraction)),
          inputHash: sha256Hex(sourceText),
          outputHash: sha256Hex(stableJson(result.bundle)),
          payload: {
            attemptNumber: input.replay.descriptiveExtraction.attemptNumber,
            attemptId: input.replay.descriptiveExtraction.attemptId,
            bundle: result.bundle,
            diagnostics: result.diagnostics,
          },
        };
      },
      completenessAnalysis: async ({ sourceText, upstream }) => {
        const bundle = upstream.descriptive_extraction?.bundle as ObservationV2Bundle | undefined;
        if (!bundle) {
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
              message: "descriptive_extraction_bundle_unavailable",
            },
          };
        }

        const report = analyzeObservationCompleteness({
          dreamText: sourceText,
          bundle,
        });

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "completeness-report.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.completeness_analysis)),
          inputHash: sha256Hex(stableJson({ sourceText, bundleId: bundle.bundleId })),
          outputHash: sha256Hex(stableJson(report)),
          payload: report as unknown as Record<string, unknown>,
        };
      },
      supplementalRealization: async ({ sourceText, upstream }) => {
        const completeness = upstream.completeness_analysis as CompletenessReport | undefined;
        const bundle = upstream.descriptive_extraction?.bundle as ObservationV2Bundle | undefined;
        if (!completeness || !bundle) {
          return {
            status: "failed",
            executionMode: "preserved_replay",
            sourceArtifactRef: input.replay.supplementalRealization?.responses[0]?.sourceArtifactRef ?? null,
            adapterFingerprint: input.replay.adapterId,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.supplemental_realization)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "supplemental_prerequisites_unavailable",
              message: "supplemental_prerequisites_unavailable",
            },
          };
        }

        const replayResponses = new Map(
          (input.replay.supplementalRealization?.responses ?? []).map((entry) => [entry.physicalGapId, entry]),
        );
        supplementalRun = await runShadowSupplementalRealization({
          sourceText,
          completeness,
          baseline: {
            candidateId: bundle.bundleId ?? "bundle",
            candidateHash: completeness.candidateIdentity.candidateHash,
            regions: toExperimentalRegion(bundle),
            units: toExperimentalUnits(bundle),
          },
          contextPadding: 260,
          maximumWindowLength: 3200,
          executeStructuredRealization: async ({ target }) => {
            const replay = replayResponses.get(target.physicalGapId);
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
          },
        });
        supplementalDisposition = supplementalRun.result.disposition;

        const missingReplayExecution = supplementalRun.result.execution.find(
          (entry) => entry.providerStatus === "missing_preserved_replay",
        );
        if (missingReplayExecution) {
          return {
            status: "failed",
            executionMode: "preserved_replay",
            sourceArtifactRef: null,
            adapterFingerprint: input.replay.adapterId,
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
          executionMode: "preserved_replay",
          sourceArtifactRef: input.replay.supplementalRealization?.responses[0]?.sourceArtifactRef ?? null,
          adapterFingerprint: input.replay.adapterId,
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
        const bundle = upstream.descriptive_extraction?.bundle as ObservationV2Bundle | undefined;
        if (!bundle) {
          return {
            status: "failed",
            executionMode: "native_deterministic",
            sourceArtifactRef: "composition-summary.json",
            adapterFingerprint: null,
            subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.memory_composition)),
            inputHash: null,
            outputHash: null,
            failure: {
              code: "baseline_bundle_unavailable",
              message: "baseline_bundle_unavailable",
            },
          };
        }

        const packages = (upstream.supplemental_realization?.packages as SupplementalRealizationPackage[] | undefined) ?? [];
        const initialCompleteness = upstream.completeness_analysis as CompletenessReport | undefined;
        const compositionRequest = toCompositionRequest(sourceText, bundle, packages, sourceIdentity, initialCompleteness);
        const compositionRun = runShadowMemoryComposition(compositionRequest);
        const finalCompleteness = analyzeComposedCandidateCompleteness({
          dreamText: sourceText,
          composedCandidate: compositionRun.result.composedCandidate,
          composedCandidateHash: compositionRun.result.composedCandidateIdentity.composedCandidateHash,
          sourceIdentity: {
            sourceHash: sourceIdentity.sourceHash,
            sourceLength: sourceIdentity.sourceLength,
          },
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

        const request = buildNativeShadowAdmissionRequest({
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

        return {
          status: "success",
          executionMode: "native_deterministic",
          sourceArtifactRef: "native-admission-decision.json",
          adapterFingerprint: null,
          subsystemFingerprint: sha256Hex(stableJson(subsystemFingerprints.authority_admission)),
          inputHash: sha256Hex(stableJson(request)),
          outputHash: sha256Hex(stableJson(decision.decision)),
          payload: {
            request,
            artifacts: {
              "admission-identity-input-comparison": request.admissionIdentityInputComparison,
              "final-completeness-report": finalCompleteness,
            },
            disposition: decision.decision.disposition,
            authorityIdentity: decision.decision.authorityIdentity,
            receivedCanonicalCandidateId: request.canonicalCandidate.canonicalCandidateId,
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

  return {
    ...result,
    artifacts,
    subsystemFingerprints,
  };
}
