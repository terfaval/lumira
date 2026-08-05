import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT,
  formatObservationBenchmarkRunSummary,
  parseObservationBenchmarkRunCliArgs,
  runObservationBenchmarks,
} from "../src/cognition/observation/benchmark/observation-benchmark-runner";

function installRunnerWarningFilter(): () => void {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (args[0] === "llm_scene_observation_extraction_diagnostic") {
      return;
    }

    originalWarn(...args);
  };

  return () => {
    console.warn = originalWarn;
  };
}

async function main() {
  const restoreWarnings = installRunnerWarningFilter();
  const args = parseObservationBenchmarkRunCliArgs(process.argv.slice(2));
  try {
    const result = await runObservationBenchmarks({
      benchmarkIds: args.benchmarkIds,
      artifactOutputRoot: args.outputRoot ?? DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT,
      cliArgs: process.argv.slice(2),
    });

    if (result.runId) {
      console.log(`Run ID: ${result.runId}`);
    }
    if (result.artifactDirectory) {
      console.log(`Artifact directory: ${result.artifactDirectory}`);
    }
    console.log("");

    for (const item of result.items) {
      console.log(formatObservationBenchmarkRunSummary(item));
      console.log("");
    }

    console.log("Run summary");
    console.log(`Run status: ${result.runStatus ?? "unknown"}`);
    console.log(`Successful items: ${result.successCount}`);
    console.log(`Failed items: ${result.failureCount}`);
    console.log(`Average elapsed: ${(result.averageElapsedMs / 1000).toFixed(1)} s`);

    if (result.failureCount > 0) {
      process.exit(1);
    }
  } finally {
    restoreWarnings();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Observation benchmark runner failed: ${message}`);
  process.exit(1);
});
