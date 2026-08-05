import type {
  ObservationTopologyConfigurationDefinition,
  ObservationTopologyConfigurationExecutionInput,
  ObservationTopologyExecutionResult,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import {
  EXPERIMENT_MODEL,
  buildExecutionSummary,
  buildLayeredBundle,
  nowIso,
  sha256Hex,
} from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";
import { executeHierarchicalLocalExtractionConfiguration } from "@/src/cognition/observation/experiment/configurations/hierarchical-local-extraction";
import { hashObservationBenchmarkDreamText } from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";

export async function executeLayeredOutputConfiguration(
  input: ObservationTopologyConfigurationExecutionInput,
): Promise<ObservationTopologyExecutionResult> {
  const startedAt = new Date();
  const hierarchical = await executeHierarchicalLocalExtractionConfiguration(input);
  const completedAt = new Date();

  if (hierarchical.finalRepresentation?.kind !== "scene_bundle") {
    return {
      ...hierarchical,
      configurationId: "F_LAYERED_OUTPUT",
      startedAt: nowIso(startedAt),
      completedAt: nowIso(completedAt),
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
      success: false,
      finalRepresentation: null,
      completeness: null,
      summary: buildExecutionSummary({
        benchmarkId: input.benchmarkId,
        configurationId: "F_LAYERED_OUTPUT",
        repeatIndex: input.repeatIndex,
        success: false,
        finalRepresentation: null,
        completeness: null,
        stages: hierarchical.stages,
        attempts: [],
        elapsedMs: completedAt.getTime() - startedAt.getTime(),
        failureReason: "layered_output_missing_hierarchical_bundle",
        anonymizedCandidateLabel: input.anonymizedCandidateLabel,
      }),
    };
  }

  const sceneBundle = hierarchical.finalRepresentation.bundle;
  const regions = sceneBundle.scenes.map((scene) => ({
    regionId: scene.sceneId,
    order: scene.position,
    heading: scene.summary,
    spanStart: scene.evidenceContext.spanStart,
    spanEnd: scene.evidenceContext.spanEnd,
    evidence: scene.observations.flatMap((observation) => observation.evidence).map((evidence) => ({
      snippet: evidence.snippet,
      spanStart: evidence.spanStart,
      spanEnd: evidence.spanEnd,
      contextLabel: evidence.contextLabel,
    })),
    boundaryConfidence: scene.boundaryReasoning.length > 0 ? "medium" as const : "low" as const,
    uncertainty: scene.uncertaintyNotes?.[0] ?? null,
    transitionCues: scene.boundaryReasoning.map((reason) => reason.note),
  }));
  const observations = sceneBundle.scenes.flatMap((scene) =>
    scene.observations.map((observation) => ({
      observationId: observation.observationId,
      regionId: scene.sceneId,
      order: observation.position,
      statement: observation.text,
      evidence: observation.evidence.map((evidence) => ({
        snippet: evidence.snippet,
        spanStart: evidence.spanStart,
        spanEnd: evidence.spanEnd,
        contextLabel: evidence.contextLabel,
      })),
      uncertainty: observation.uncertaintyNote,
      source: "layered" as const,
    })),
  );
  const transitions = regions
    .slice(1)
    .map((region, index) => ({
      transitionId: `transition-${index + 1}`,
      fromRegionId: regions[index]?.regionId ?? null,
      toRegionId: region.regionId,
      order: index,
      statement: region.transitionCues[0] ?? `Transition into ${region.heading ?? region.regionId}`,
      evidence: region.evidence.slice(0, 1),
      uncertainty: region.boundaryConfidence === "low" ? "boundary_uncertain" : null,
    }))
    .filter((transition) => transition.evidence.length > 0);

  const layeredBundle = buildLayeredBundle({
    bundleId: `experimental-layered-${input.benchmarkId.toLowerCase()}-${input.repeatIndex}`,
    sourceDreamHash: hashObservationBenchmarkDreamText(input.dreamText),
    configurationId: "F_LAYERED_OUTPUT",
    sourceFingerprint: input.sourceFingerprint,
    provider: "openai",
    model: EXPERIMENT_MODEL,
    regions,
    observations,
    transitions,
    uncertainty: [
      ...sceneBundle.uncertaintyNotes ?? [],
      ...observations.map((observation) => observation.uncertainty).filter((value): value is string => Boolean(value)),
    ],
    dreamText: input.dreamText,
  });
  const finalRepresentation = {
    kind: "layered_bundle" as const,
    bundle: layeredBundle,
  };

  return {
    ...hierarchical,
    configurationId: "F_LAYERED_OUTPUT",
    startedAt: nowIso(startedAt),
    completedAt: nowIso(completedAt),
    elapsedMs: completedAt.getTime() - startedAt.getTime(),
    success: layeredBundle.transitions.every((transition) => transition.evidence.length > 0) && observations.length > 0,
    promptFingerprint: hierarchical.promptFingerprint ? hierarchical.promptFingerprint : sha256Hex("layered_output_wrapper"),
    schemaFingerprint: sha256Hex("layered_output_wrapper_schema"),
    finalRepresentation,
    completeness: layeredBundle.completeness,
    diagnostics: {
      ...hierarchical.diagnostics,
      layeredRegionCount: layeredBundle.regions.length,
      layeredObservationCount: layeredBundle.observations.length,
      layeredTransitionCount: layeredBundle.transitions.length,
    },
    summary: buildExecutionSummary({
      benchmarkId: input.benchmarkId,
      configurationId: "F_LAYERED_OUTPUT",
      repeatIndex: input.repeatIndex,
      success: layeredBundle.transitions.every((transition) => transition.evidence.length > 0) && observations.length > 0,
      finalRepresentation,
      completeness: layeredBundle.completeness,
      stages: hierarchical.stages,
      attempts: [],
      elapsedMs: completedAt.getTime() - startedAt.getTime(),
      failureReason: observations.length > 0 ? null : "layered_output_empty",
      anonymizedCandidateLabel: input.anonymizedCandidateLabel,
    }),
  };
}

export const layeredOutputConfiguration: ObservationTopologyConfigurationDefinition = {
  configurationId: "F_LAYERED_OUTPUT",
  execute: executeLayeredOutputConfiguration,
};
