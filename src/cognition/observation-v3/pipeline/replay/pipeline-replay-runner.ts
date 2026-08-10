import {
  loadObservationV3BenchmarkMatrix,
} from "@/src/cognition/observation-v3/pipeline/replay/benchmark-matrix-loader";
import {
  resolveObservationV3ReplayCase,
} from "@/src/cognition/observation-v3/pipeline/replay/pipeline-case-resolver";
import {
  fingerprintObservationV3CorpusReplay,
} from "@/src/cognition/observation-v3/pipeline/replay/pipeline-replay-fingerprint";
import {
  buildObservationV3CorpusReplayArtifacts,
  buildObservationV3ReplayCaseArtifacts,
} from "@/src/cognition/observation-v3/pipeline/replay/pipeline-replay-summary";
import type {
  ObservationV3CorpusReplayResult,
  ObservationV3ReplayCaseResult,
  ObservationV3ReplayFailure,
} from "@/src/cognition/observation-v3/pipeline/replay/replay-types";
import { runObservationV3ShadowPipeline } from "@/src/cognition/observation-v3/pipeline/shadow-pipeline";

export async function runObservationV3CorpusReplay(input: {
  corpusPath: string;
  expectedBenchmarkOrder: readonly string[];
  validationRoot: string;
}): Promise<ObservationV3CorpusReplayResult> {
  const matrix = await loadObservationV3BenchmarkMatrix(input);
  const replayFingerprint = await fingerprintObservationV3CorpusReplay();
  const results: ObservationV3ReplayCaseResult[] = [];

  for (const caseItem of matrix.cases) {
    const resolved = await resolveObservationV3ReplayCase({
      caseItem,
      baselineBenchmarkRoots: matrix.discovery.baselineBenchmarkRoots,
      completenessRoots: matrix.discovery.completenessRoots,
      topologyRoots: matrix.discovery.topologyExperimentRoots,
    });

    if (!resolved.pipelineInput) {
      const caseResult: ObservationV3ReplayCaseResult = {
        benchmarkId: caseItem.benchmarkId,
        classification: resolved.classification,
        executionStatus: "not_executed",
        selectedRunId: resolved.runId,
        selectionReason: resolved.selectionReason,
        failure: resolved.failure,
        lineage: resolved.lineage,
        compatibility: resolved.compatibility,
        pipelineResult: null,
        artifacts: {},
      };
      caseResult.artifacts = buildObservationV3ReplayCaseArtifacts(caseResult);
      results.push(caseResult);
      continue;
    }

    const pipelineResult = await runObservationV3ShadowPipeline(resolved.pipelineInput);
    const executionFailure: ObservationV3ReplayFailure | null =
      pipelineResult.summary.pipelineCompletionStatus === "failed"
        || pipelineResult.stageResults.some((stage) => stage.status === "failed")
        ? {
            classification: pipelineResult.stageResults.some((stage) => stage.stage === "authority_admission" && stage.status === "failed")
              ? "governance_failure"
              : "native_subsystem_failure",
            message: pipelineResult.summary.finalOutcome,
            sourceArtifactRef: null,
          }
      : null;

    const caseResult: ObservationV3ReplayCaseResult = {
      benchmarkId: caseItem.benchmarkId,
      classification: executionFailure ? "artifact_incomplete" : resolved.classification,
      executionStatus: "executed",
      selectedRunId: resolved.runId,
      selectionReason: resolved.selectionReason,
      failure: executionFailure,
      lineage: resolved.lineage,
      compatibility: {
        ...resolved.compatibility,
        replayFingerprint: replayFingerprint.fingerprint,
      },
      pipelineResult,
      artifacts: {},
    };
    caseResult.artifacts = buildObservationV3ReplayCaseArtifacts(caseResult);
    results.push(caseResult);
  }

  const replayResult: ObservationV3CorpusReplayResult = {
    discovery: matrix.discovery,
    results,
    artifacts: {},
  };
  replayResult.artifacts = {
    ...buildObservationV3CorpusReplayArtifacts(replayResult),
    "pipeline-replay-fingerprints.json": replayFingerprint,
  };
  return replayResult;
}
