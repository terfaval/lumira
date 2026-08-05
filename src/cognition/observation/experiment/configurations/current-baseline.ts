import { buildCompletenessFromObservationBundle } from "@/src/cognition/observation/benchmark/observation-topology-experiment-metrics";
import type { CompletenessAnalysisShadowResult } from "@/src/cognition/observation-v3/completeness-analysis";
import type { DescriptiveExtractionProviderEvidence } from "@/src/cognition/observation-v3/provider-evidence";
import type {
  ObservationTopologyConfigurationDefinition,
  ObservationTopologyConfigurationExecutionInput,
  ObservationTopologyExecutionResult,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { buildLlmSceneObservationExtraction } from "@/src/cognition/observation/llm-scene-observation-extractor";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import { buildExecutionSummary } from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";

export async function executeCurrentBaselineConfiguration(
  input: ObservationTopologyConfigurationExecutionInput,
): Promise<ObservationTopologyExecutionResult> {
  const startedAt = new Date();
  const attempts: ObservationExtractionAttemptEvidence[] = [];
  const completenessAnalysis: CompletenessAnalysisShadowResult[] = [];
  const descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[] = [];
  const reflectiveObjectId = `experiment-${input.benchmarkId.toLowerCase()}-${input.repeatIndex}`;
  const extraction = await buildLlmSceneObservationExtraction({
    userId: "benchmark-runner",
    reflectiveObjectId,
    dreamText: input.dreamText,
    sourceIdentity: input.benchmarkId,
    extractionRequestId: `${input.benchmarkId}:descriptive-extraction`,
    onAttemptEvidence(evidence) {
      attempts.push(evidence);
    },
    onDescriptiveProviderEvidence(evidence) {
      descriptiveProviderEvidence.push(evidence);
    },
    onCompletenessAnalysis(result) {
      completenessAnalysis.push(result);
    },
  });
  const completedAt = new Date();
  const finalRepresentation = extraction.mode === "validated_llm" && extraction.bundle
    ? {
        kind: "scene_bundle" as const,
        bundle: extraction.bundle,
      }
    : null;
  const completeness = extraction.mode === "validated_llm" && extraction.bundle
    ? buildCompletenessFromObservationBundle({
        bundle: extraction.bundle,
        dreamText: input.dreamText,
      })
    : null;

  const result: ObservationTopologyExecutionResult = {
    benchmarkId: input.benchmarkId,
    configurationId: "A_CURRENT_BASELINE",
    repeatIndex: input.repeatIndex,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    elapsedMs: completedAt.getTime() - startedAt.getTime(),
    success: extraction.mode === "validated_llm" && Boolean(extraction.bundle),
    provider: "openai",
    model: "gpt-4.1-mini",
    promptFingerprint: null,
    schemaFingerprint: null,
    topologyImplementationFingerprint: input.topologyImplementationFingerprint,
    sourceFingerprint: input.sourceFingerprint,
    stages: [],
    attempts,
    descriptiveProviderEvidence,
    finalRepresentation,
    completeness,
    diagnostics: {
      extractionMode: extraction.mode,
      reason: extraction.reason ?? null,
      diagnostics: extraction.diagnostics ?? null,
    },
    artifacts: completenessAnalysis.length > 0
      ? {
          "completeness-shadow": {
            attempts: completenessAnalysis,
          },
        }
      : undefined,
    summary: buildExecutionSummary({
      benchmarkId: input.benchmarkId,
      configurationId: "A_CURRENT_BASELINE",
      repeatIndex: input.repeatIndex,
      success: extraction.mode === "validated_llm" && Boolean(extraction.bundle),
      finalRepresentation,
      completeness,
      stages: [],
      attempts,
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
      failureReason: extraction.mode === "fallback" ? extraction.reason ?? "fallback" : null,
      anonymizedCandidateLabel: input.anonymizedCandidateLabel,
    }),
  };

  return result;
}

export const currentBaselineConfiguration: ObservationTopologyConfigurationDefinition = {
  configurationId: "A_CURRENT_BASELINE",
  execute: executeCurrentBaselineConfiguration,
};
