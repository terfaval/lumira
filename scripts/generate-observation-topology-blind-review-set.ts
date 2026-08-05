import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });

import {
  generateObservationTopologyBlindReviewSet,
  type ObservationTopologyBlindReviewSetSpec,
} from "../src/cognition/observation/benchmark/observation-topology-blind-review-set";

const DEFAULT_OUTPUT_ROOT = ".validation/observation-topology-experiments/review-sets";

function buildUsage(): string {
  return [
    "Usage:",
    "npx tsx scripts/generate-observation-topology-blind-review-set.ts --spec .validation/observation-topology-experiments/review-set-spec.json",
    "npx tsx scripts/generate-observation-topology-blind-review-set.ts --spec review-set.json --output-root .validation/observation-topology-experiments/review-sets",
  ].join("\n");
}

async function main() {
  const args = process.argv.slice(2);
  let specPath: string | null = null;
  let outputRoot = DEFAULT_OUTPUT_ROOT;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--spec") {
      specPath = args[index + 1] ?? null;
      index += 1;
      continue;
    }
    if (argument === "--output-root") {
      outputRoot = args[index + 1] ?? outputRoot;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}\n${buildUsage()}`);
  }

  if (!specPath) {
    throw new Error(`Missing required --spec.\n${buildUsage()}`);
  }

  const resolvedSpecPath = path.resolve(specPath);
  const spec = JSON.parse(
    await fs.readFile(resolvedSpecPath, "utf8"),
  ) as ObservationTopologyBlindReviewSetSpec;
  const result = await generateObservationTopologyBlindReviewSet({
    spec,
    outputRoot,
  });

  console.log(`Review set ID: ${result.reviewSetId}`);
  console.log(`Review set directory: ${result.reviewSetDirectory}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "unknown_error");
  process.exit(1);
});
