import path from "node:path";

import {
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_OUTPUT_ROOT,
  runAuthorityAdmissionShadowReview,
} from "@/src/cognition/observation-v3/authority-admission";

interface CliArgs {
  calibrationRoot: string;
  outputRoot: string;
  reviewId?: string;
  replayCount?: number;
}

function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    calibrationRoot: DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
    outputRoot: DEFAULT_AUTHORITY_ADMISSION_SHADOW_OUTPUT_ROOT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--calibration-root") {
      args.calibrationRoot = argv[index + 1] ?? args.calibrationRoot;
      index += 1;
      continue;
    }

    if (entry === "--output-root") {
      args.outputRoot = argv[index + 1] ?? args.outputRoot;
      index += 1;
      continue;
    }

    if (entry === "--review-id") {
      args.reviewId = argv[index + 1];
      index += 1;
      continue;
    }

    if (entry === "--replay-count") {
      const raw = argv[index + 1];
      const parsed = raw ? Number(raw) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) {
        args.replayCount = Math.floor(parsed);
      }
      index += 1;
    }
  }

  return args;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await runAuthorityAdmissionShadowReview(args);

  process.stdout.write(
    `${JSON.stringify({
      reviewId: result.reviewId,
      reviewRoot: path.resolve(result.reviewRoot),
      decisionCount: result.decisionCount,
      replayCount: result.replayCount,
      expectedArtifacts: result.expectedArtifacts,
    }, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
