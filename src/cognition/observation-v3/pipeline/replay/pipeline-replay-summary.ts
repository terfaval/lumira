import type {
  ObservationV3CorpusReplayResult,
  ObservationV3ReplayCaseResult,
} from "@/src/cognition/observation-v3/pipeline/replay/replay-types";

function countBy<T extends string>(values: T[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildObservationV3ReplayCaseArtifacts(result: ObservationV3ReplayCaseResult): Record<string, unknown> {
  return {
    "case-summary.json": {
      benchmarkId: result.benchmarkId,
      classification: result.classification,
      executionStatus: result.executionStatus,
      selectedRunId: result.selectedRunId,
      selectionReason: result.selectionReason,
      failure: result.failure,
    },
    "lineage.json": result.lineage,
    "stage-trace.json": result.pipelineResult?.stageResults ?? [],
    "compatibility.json": result.compatibility,
  };
}

export function buildObservationV3CorpusReplayArtifacts(result: ObservationV3CorpusReplayResult): Record<string, unknown> {
  const classifications = countBy(result.results.map((entry) => entry.classification));
  const failures = countBy(
    result.results
      .map((entry) => entry.failure?.classification)
      .filter((value): value is NonNullable<typeof value> => Boolean(value)),
  );

  return {
    "pipeline-replay-summary.json": {
      benchmarkCount: result.results.length,
      executionCount: result.results.filter((entry) => entry.executionStatus === "executed").length,
      classifications,
      failures,
    },
    "pipeline-replay-results.json": result.results.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      classification: entry.classification,
      executionStatus: entry.executionStatus,
      selectedRunId: entry.selectedRunId,
      selectionReason: entry.selectionReason,
    })),
    "pipeline-replay-lineage.json": Object.fromEntries(result.results.map((entry) => [entry.benchmarkId, entry.lineage])),
    "pipeline-replay-compatibility.json": Object.fromEntries(result.results.map((entry) => [entry.benchmarkId, entry.compatibility])),
    "pipeline-replay-failures.json": result.results
      .filter((entry) => entry.failure !== null)
      .map((entry) => ({
        benchmarkId: entry.benchmarkId,
        failure: entry.failure,
      })),
  };
}
