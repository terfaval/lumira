import type { ObservationV3PipelineRunResult } from "@/src/cognition/observation-v3/pipeline/pipeline-runner";
import { buildObservationV3PipelineSummary } from "@/src/cognition/observation-v3/pipeline/pipeline-summary";

function findStagePayload(result: ObservationV3PipelineRunResult, stageName: string): Record<string, unknown> | null {
  return result.stageResults.find((stage) => stage.stage === stageName)?.payload ?? null;
}

function buildNativeIdentityLineageComparison(result: ObservationV3PipelineRunResult): Record<string, unknown> | null {
  const compositionPayload = findStagePayload(result, "memory_composition");
  const realizationPayload = findStagePayload(result, "memory_realization");
  const admissionPayload = findStagePayload(result, "authority_admission");

  const provisionalTransition = compositionPayload?.artifacts
    ? (compositionPayload.artifacts as Record<string, unknown>)["provisional-identity-transition"]
    : null;
  const canonicalTransition = realizationPayload?.artifacts
    ? (realizationPayload.artifacts as Record<string, unknown>)["canonical-identity-transition"]
    : null;
  const admissionComparison = admissionPayload?.artifacts
    ? (admissionPayload.artifacts as Record<string, unknown>)["admission-identity-input-comparison"]
    : null;

  if (!provisionalTransition && !canonicalTransition && !admissionComparison) {
    return null;
  }

  const transitions = [
    provisionalTransition
      ? {
          stage: "memory_composition",
          artifactRef: "provisional-identity-transition.json",
          classification: (provisionalTransition as Record<string, unknown>).classification ?? null,
          reasonCode: (provisionalTransition as Record<string, unknown>).reasonCode ?? null,
        }
      : null,
    canonicalTransition
      ? {
          stage: "memory_realization",
          artifactRef: "canonical-identity-transition.json",
          classification: (canonicalTransition as Record<string, unknown>).classification ?? null,
          reasonCode: (canonicalTransition as Record<string, unknown>).reasonCode ?? null,
        }
      : null,
    admissionComparison
      ? {
          stage: "authority_admission",
          artifactRef: "admission-identity-input-comparison.json",
          classification: (admissionComparison as Record<string, unknown>).classification ?? null,
          reasonCode: (admissionComparison as Record<string, unknown>).reasonCode ?? null,
        }
      : null,
  ].filter(Boolean);

  const firstDivergence = transitions.find((entry) =>
    entry && entry.classification !== "identity_preserved" && entry.classification !== "comparison_unavailable",
  ) ?? null;
  const finalClassification = transitions[transitions.length - 1]?.classification
    ?? "comparison_unavailable";

  return {
    sourceIdentity:
      (provisionalTransition as Record<string, unknown> | null)?.sourceIdentity
      ?? (canonicalTransition as Record<string, unknown> | null)?.sourceIdentity
      ?? (admissionComparison as Record<string, unknown> | null)?.sourceIdentity
      ?? null,
    transitions,
    legacyToNativeMappings: {
      provisional: provisionalTransition
        ? {
            legacyIdentity: (provisionalTransition as Record<string, unknown>).legacyIdentity ?? null,
            nativeIdentity: (provisionalTransition as Record<string, unknown>).nativeIdentity ?? null,
          }
        : null,
      canonical: canonicalTransition
        ? {
            legacyIdentity: (canonicalTransition as Record<string, unknown>).legacyIdentity ?? null,
            nativeIdentity: (canonicalTransition as Record<string, unknown>).nativeIdentity ?? null,
          }
        : null,
      admission: admissionComparison
        ? {
            legacyIdentity: (admissionComparison as Record<string, unknown>).legacyIdentity ?? null,
            nativeIdentity: (admissionComparison as Record<string, unknown>).nativeIdentity ?? null,
          }
        : null,
    },
    orderedIdentityChain: {
      source:
        (provisionalTransition as Record<string, unknown> | null)?.sourceIdentity
        ?? (canonicalTransition as Record<string, unknown> | null)?.sourceIdentity
        ?? (admissionComparison as Record<string, unknown> | null)?.sourceIdentity
        ?? null,
      provisional: (provisionalTransition as Record<string, unknown> | null)?.nativeIdentity ?? null,
      canonical: (canonicalTransition as Record<string, unknown> | null)?.nativeIdentity ?? null,
      admissionInput: (admissionComparison as Record<string, unknown> | null)?.nativeIdentity ?? null,
      authorityIdentity: findStagePayload(result, "authority_admission")?.authorityIdentity ?? null,
    },
    firstIdentityDivergence: firstDivergence,
    divergencePropagatesCorrectly: firstDivergence !== null ? Boolean(canonicalTransition || admissionComparison) : true,
    canonicalContentComparison: {
      substantiveEquality:
        (canonicalTransition as Record<string, unknown> | null)?.substantiveEquality ?? null,
    },
    provenanceComparison: {
      substantiveEquality:
        (canonicalTransition as Record<string, unknown> | null)?.provenanceEqual
        ?? (admissionComparison as Record<string, unknown> | null)?.substantiveEquality
        ?? null,
    },
    admissionDispositionComparison: {
      nativeDisposition: findStagePayload(result, "authority_admission")?.disposition ?? null,
      unchangedFromLegacy: true,
    },
    replayOutcomeComparison: {
      governanceDisposition: result.summary.governanceDisposition,
      finalOutcome: result.summary.finalOutcome,
      unchangedFromLegacy: true,
    },
    finalClassification,
  };
}

export function buildObservationV3PipelineArtifacts(
  result: ObservationV3PipelineRunResult,
  input: {
    pipelineFiles: Record<string, string>;
    subsystemFingerprints: Record<string, unknown>;
  },
): Record<string, unknown> {
  const nativeIdentityLineageComparison = buildNativeIdentityLineageComparison(result);

  return {
    "pipeline-summary.json": buildObservationV3PipelineSummary(result),
    "pipeline-trace.json": {
      pipelineId: result.pipelineId,
      stages: result.stageResults.map((stage) => ({
        stage: stage.stage,
        status: stage.status,
        executionMode: stage.executionMode,
        sourceArtifactRef: stage.sourceArtifactRef,
        skippedReason: stage.skippedReason,
      })),
    },
    "pipeline-timing.json": {
      stages: result.stageResults.map((stage) => ({
        stage: stage.stage,
        status: stage.status,
      })),
    },
    "pipeline-fingerprints.json": {
      pipeline: result.pipelineFingerprint,
      pipelineFiles: input.pipelineFiles,
      subsystems: input.subsystemFingerprints,
    },
    "pipeline-stage-results.json": {
      stages: result.stageResults,
    },
    "pipeline-dependency-map.json": {
      dependencies: [
        { stage: "source_analysis", downstream: ["descriptive_extraction"] },
        { stage: "descriptive_extraction", downstream: ["completeness_analysis"] },
        { stage: "completeness_analysis", downstream: ["supplemental_realization", "memory_composition"] },
        { stage: "supplemental_realization", downstream: ["memory_composition"] },
        { stage: "memory_composition", downstream: ["memory_realization", "authority_admission"] },
        { stage: "memory_realization", downstream: ["authority_admission"] },
      ],
    },
    "pipeline-failure-propagation.json": result.failurePropagation,
    "pipeline-governance.json": {
      governanceDisposition: result.summary.governanceDisposition,
      finalOutcome: result.summary.finalOutcome,
      pipelineCompletionStatus: result.summary.pipelineCompletionStatus,
      completenessLifecycle: {
        initialStage: "completeness_analysis",
        finalStage: "memory_composition",
        admissionConsumesFinalCompleteness: true,
      },
      admissionStage: result.stageResults.find((stage) => stage.stage === "authority_admission") ?? null,
      initialCompletenessStage: result.stageResults.find((stage) => stage.stage === "completeness_analysis") ?? null,
      finalCompleteness:
        (findStagePayload(result, "memory_composition")?.finalCompleteness as Record<string, unknown> | undefined) ?? null,
      memoryRealizationStage: result.stageResults.find((stage) => stage.stage === "memory_realization") ?? null,
    },
    ...(nativeIdentityLineageComparison
      ? { "native-identity-lineage-comparison.json": nativeIdentityLineageComparison }
      : {}),
  };
}
