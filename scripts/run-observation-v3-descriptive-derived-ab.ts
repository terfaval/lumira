import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import {
  createObservationV3DescriptiveDerivedAbExperiment,
  DEFAULT_OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_OUTPUT_ROOT,
  persistObservationV3DescriptiveDerivedAbExperiment,
} from "@/src/cognition/observation-v3/validation";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const outputRoot = readArg("--output-root") ?? DEFAULT_OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_OUTPUT_ROOT;
  const experimentId = readArg("--experiment-id");
  const corpusPath = readArg("--corpus-path");

  const created = await createObservationV3DescriptiveDerivedAbExperiment({
    outputRoot,
    experimentId,
    corpusPath,
  });
  const persisted = await persistObservationV3DescriptiveDerivedAbExperiment({
    outputRoot,
    result: created,
  });

  process.stdout.write(`${JSON.stringify({
    experimentId: persisted.experimentId,
    experimentRoot: persisted.experimentRoot,
    selectedCaseIds: persisted.selectedCaseIds,
    aggregate: persisted.aggregate,
    cases: persisted.cases.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      semanticVerdict: entry.comparison.semanticVerdict,
      latencyMsDelta: entry.comparison.tokens.latencyMsDelta,
      outputTokenDelta: entry.comparison.tokens.outputDelta,
      totalTokenDelta: entry.comparison.tokens.totalDelta,
    })),
  }, null, 2)}\n`);
}

void main();
