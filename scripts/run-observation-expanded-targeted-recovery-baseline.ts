import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

import {
  refreshExpandedTargetedRecoveryBaselineArtifacts,
  runExpandedTargetedRecoveryBaselineExperiment,
} from "../src/cognition/observation/benchmark/observation-expanded-targeted-recovery-baseline";

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--refresh") {
    const [runGroupDirectory, baselineRunDirectory, baselineRunId, targetedRecoveryRunDirectory, targetedRecoveryRunId, reviewSetDirectory] = args.slice(1);
    if (!runGroupDirectory || !baselineRunDirectory || !baselineRunId || !targetedRecoveryRunDirectory || !targetedRecoveryRunId) {
      throw new Error(
        "usage: --refresh <runGroupDirectory> <baselineRunDirectory> <baselineRunId> <targetedRecoveryRunDirectory> <targetedRecoveryRunId> [reviewSetDirectory]",
      );
    }

    const result = await refreshExpandedTargetedRecoveryBaselineArtifacts({
      runGroupDirectory,
      baselineRunDirectory,
      baselineRunId,
      targetedRecoveryRunDirectory,
      targetedRecoveryRunId,
      reviewSetDirectory,
    });
    console.log(`Refreshed run group ID: ${result.runGroupId}`);
    console.log(`Run group directory: ${result.runGroupDirectory}`);
    console.log(`Deep review set ID: ${result.reviewSetId}`);
    console.log(`Deep review set directory: ${result.reviewSetDirectory}`);
    return;
  }

  const result = await runExpandedTargetedRecoveryBaselineExperiment();
  console.log(`Run group ID: ${result.runGroupId}`);
  console.log(`Run group directory: ${result.runGroupDirectory}`);
  console.log(`Baseline run ID: ${result.baselineRun.runId}`);
  console.log(`Targeted recovery run ID: ${result.targetedRecoveryRun.runId}`);
  console.log(`Deep review set ID: ${result.reviewSetId}`);
  console.log(`Deep review set directory: ${result.reviewSetDirectory}`);
  console.log(`Selected benchmarks: ${result.selectedBenchmarks.join(", ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "unknown_error");
  process.exit(1);
});
