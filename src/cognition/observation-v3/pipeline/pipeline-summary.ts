import type { ObservationV3PipelineRunResult } from "@/src/cognition/observation-v3/pipeline/pipeline-runner";

export function buildObservationV3PipelineSummary(
  result: ObservationV3PipelineRunResult,
): Record<string, unknown> {
  return {
    pipelineId: result.pipelineId,
    finalOutcome: result.summary.finalOutcome,
    skippedStages: result.summary.skippedStages,
    failureSourceStage: result.failurePropagation.failureSourceStage,
    stageOrder: result.stageResults.map((stage) => stage.stage),
    executionModes: result.stageResults.map((stage) => ({
      stage: stage.stage,
      executionMode: stage.executionMode,
    })),
  };
}
