import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  createObservationV3FullBenchmarkBaseline,
  DEFAULT_OBSERVATION_V3_FULL_BENCHMARK_BASELINE_OUTPUT_ROOT,
  persistObservationV3FullBenchmarkBaseline,
} from "@/src/cognition/observation-v3/validation";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const validationRoot = readArg("--validation-root") ?? ".validation";
  const outputRoot = readArg("--output-root") ?? DEFAULT_OBSERVATION_V3_FULL_BENCHMARK_BASELINE_OUTPUT_ROOT;
  const baselineId = readArg("--baseline-id");

  const created = await createObservationV3FullBenchmarkBaseline({
    validationRoot,
    outputRoot,
    baselineId,
  });
  const persisted = await persistObservationV3FullBenchmarkBaseline({
    outputRoot,
    result: created,
  });

  process.stdout.write(`${JSON.stringify({
    baselineId: persisted.baselineId,
    baselineRoot: persisted.baselineRoot,
    summary: persisted.summary,
  }, null, 2)}\n`);
}

void main();
