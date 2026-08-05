import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  parseObservationTopologyExperimentCliArgs,
  runObservationTopologyExperiment,
} from "../src/cognition/observation/benchmark/observation-topology-experiment-runner";

async function main() {
  const args = parseObservationTopologyExperimentCliArgs(process.argv.slice(2));
  const result = await runObservationTopologyExperiment(args);
  console.log(`Run ID: ${result.runId}`);
  console.log(`Artifact directory: ${result.artifactDirectory}`);
  console.log(`Run status: ${result.runStatus}`);
  console.log(`Executions: ${result.executions.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "unknown_error");
  process.exit(1);
});
