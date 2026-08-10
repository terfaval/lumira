import { describe, expect, it } from "vitest";

import type { ObservationV3PipelineRunResult } from "@/src/cognition/observation-v3/pipeline/pipeline-runner";
import { buildObservationV3PipelineSummary } from "@/src/cognition/observation-v3/pipeline/pipeline-summary";

function buildResult(input: {
  governanceDisposition: string | null;
  finalOutcome: string;
  pipelineCompletionStatus: "completed" | "failed" | "terminated_early";
  failureSourceStage: ObservationV3PipelineRunResult["failurePropagation"]["failureSourceStage"];
}): ObservationV3PipelineRunResult {
  return {
    pipelineId: "pipeline-1",
    pipelineFingerprint: {
      pipelineVersion: "1",
      pipelineHash: "hash-1",
    },
    stageResults: [
      {
        stage: "authority_admission",
        status: input.governanceDisposition ? "success" : "skipped",
        executionMode: input.governanceDisposition ? "native_deterministic" : "skipped",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: input.governanceDisposition ? null : "upstream_failure",
        startedAt: input.governanceDisposition ? "2026-08-10T12:00:00.000Z" : null,
        completedAt: input.governanceDisposition ? "2026-08-10T12:00:00.010Z" : null,
        latencyMs: input.governanceDisposition ? 10 : null,
        payload: input.governanceDisposition ? { disposition: input.governanceDisposition } : null,
        failure: null,
      },
    ],
    summary: {
      governanceDisposition: input.governanceDisposition,
      finalOutcome: input.finalOutcome,
      pipelineCompletionStatus: input.pipelineCompletionStatus,
      skippedStages: [],
      startedAt: "2026-08-10T12:00:00.000Z",
      completedAt: "2026-08-10T12:00:00.010Z",
      totalLatencyMs: 10,
    },
    failurePropagation: {
      failureSourceStage: input.failureSourceStage,
      skippedStages: [],
    },
  };
}

describe("buildObservationV3PipelineSummary", () => {
  it("emits execution completion separately from governance disposition", () => {
    const summary = buildObservationV3PipelineSummary(buildResult({
      governanceDisposition: "deferred_for_supplemental_realization",
      finalOutcome: "deferred_for_supplemental_realization",
      pipelineCompletionStatus: "completed",
      failureSourceStage: null,
    }));

    expect(summary).toEqual(expect.objectContaining({
      governanceDisposition: "deferred_for_supplemental_realization",
      finalOutcome: "deferred_for_supplemental_realization",
      pipelineCompletionStatus: "completed",
      failureSourceStage: null,
      startedAt: "2026-08-10T12:00:00.000Z",
      completedAt: "2026-08-10T12:00:00.010Z",
      totalLatencyMs: 10,
    }));
  });

  it("keeps failureSourceStage independent from governance disposition", () => {
    const summary = buildObservationV3PipelineSummary(buildResult({
      governanceDisposition: null,
      finalOutcome: "failed_source_analysis",
      pipelineCompletionStatus: "failed",
      failureSourceStage: "source_analysis",
    }));

    expect(summary).toEqual(expect.objectContaining({
      governanceDisposition: null,
      finalOutcome: "failed_source_analysis",
      pipelineCompletionStatus: "failed",
      failureSourceStage: "source_analysis",
    }));
  });
});
