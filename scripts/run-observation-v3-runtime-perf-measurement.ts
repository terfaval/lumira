import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  createObservationV3RuntimePerfMeasurement,
  DEFAULT_OBSERVATION_V3_RUNTIME_PERF_OUTPUT_ROOT,
  persistObservationV3RuntimePerfMeasurement,
} from "@/src/cognition/observation-v3/validation";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const outputRoot = readArg("--output-root") ?? DEFAULT_OBSERVATION_V3_RUNTIME_PERF_OUTPUT_ROOT;
  const measurementId = readArg("--measurement-id");
  const corpusPath = readArg("--corpus-path");

  const created = await createObservationV3RuntimePerfMeasurement({
    outputRoot,
    measurementId,
    corpusPath,
  });
  const persisted = await persistObservationV3RuntimePerfMeasurement({
    outputRoot,
    result: created,
  });

  process.stdout.write(`${JSON.stringify({
    measurementId: persisted.measurementId,
    measurementRoot: persisted.measurementRoot,
    selectedCaseIds: persisted.selectedCaseIds,
    cases: persisted.cases.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      totalLatencyMs: entry.totalLatencyMs,
      supplementalExecuted: entry.supplementalExecuted,
      pipelineCompletionStatus: entry.pipelineCompletionStatus,
      governanceDisposition: entry.governanceDisposition,
    })),
  }, null, 2)}\n`);
}

void main();
