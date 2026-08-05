import type { ObservationBenchmarkItemExecution } from "@/src/cognition/observation/benchmark/observation-benchmark-runner";

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[midpoint - 1]! + sorted[midpoint]!) / 2;
  }

  return sorted[midpoint]!;
}

function histogram(values: number[]): Record<string, number> {
  return values.reduce<Record<string, number>>((accumulator, value) => {
    const key = String(value);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

export function buildObservationBenchmarkRunSummaryArtifact(input: {
  runId: string;
  runStatus: "completed" | "completed_with_failures" | "aborted";
  items: ObservationBenchmarkItemExecution[];
}): Record<string, unknown> {
  const summaries = input.items.map((item) => item.summary);
  const elapsedValues = summaries.map((item) => item.elapsedMs);
  const successfulItems = summaries.filter((item) => item.success);
  const failedItems = summaries.filter((item) => !item.success);
  const extractionFailures = failedItems.filter((item) => item.failureStage === "extraction").length;
  const derivedFailures = failedItems.filter((item) => item.failureStage === "derived_construction").length;
  const configurationFailures = failedItems.filter((item) => item.failureStage === "configuration").length;
  const attempts = input.items.flatMap((item) => item.attempts);
  const failedItemsWithReviewableRejectedBundles = input.items.filter((item) => {
    return item.status !== "success" && item.attempts.some((attempt) => attempt.status === "candidate_rejected" && attempt.candidateBundle);
  }).length;
  const failedItemsWithoutReviewableRejectedBundles = input.items.filter((item) => {
    return item.status !== "success" && !item.attempts.some((attempt) => attempt.status === "candidate_rejected" && attempt.candidateBundle);
  }).length;

  return {
    runId: input.runId,
    runStatus: input.runStatus,
    totalItems: summaries.length,
    successfulItems: successfulItems.length,
    failedItems: failedItems.length,
    extractionFailures,
    derivedExceptions: derivedFailures,
    configurationFailures,
    averageElapsedMs:
      elapsedValues.length === 0
        ? 0
        : elapsedValues.reduce((sum, value) => sum + value, 0) / elapsedValues.length,
    medianElapsedMs: median(elapsedValues),
    minimumElapsedMs: elapsedValues.length === 0 ? 0 : Math.min(...elapsedValues),
    maximumElapsedMs: elapsedValues.length === 0 ? 0 : Math.max(...elapsedValues),
    failedBenchmarkIds: failedItems.map((item) => item.benchmarkId),
    failureReasons: failedItems.reduce<Record<string, number>>((accumulator, item) => {
      const reason = item.failureReason ?? "unknown";
      accumulator[reason] = (accumulator[reason] ?? 0) + 1;
      return accumulator;
    }, {}),
    sceneCountDistribution: histogram(successfulItems.map((item) => item.sceneCount)),
    observationCountDistribution: histogram(successfulItems.map((item) => item.observationCount)),
    totalExtractionAttempts: attempts.length,
    acceptedAttempts: attempts.filter((attempt) => attempt.acceptedAttempt).length,
    rejectedCandidateAttempts: attempts.filter((attempt) => attempt.status === "candidate_rejected").length,
    providerFailures: attempts.filter((attempt) => attempt.status === "provider_failed").length,
    parseFailures: attempts.filter((attempt) => attempt.status === "parse_failed").length,
    schemaFailures: attempts.filter((attempt) => attempt.status === "schema_failed").length,
    attemptArtifactsComplete: input.items.filter((item) => item.attemptEvidenceCompleteness.status === "complete").length,
    attemptArtifactsPartial: input.items.filter((item) => item.attemptEvidenceCompleteness.status === "partial").length,
    failedItemsWithReviewableRejectedBundles,
    failedItemsWithoutReviewableRejectedBundles,
  };
}
