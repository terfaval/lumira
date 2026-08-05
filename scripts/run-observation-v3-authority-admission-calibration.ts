import {
  DEFAULT_AUTHORITY_ADMISSION_CALIBRATION_OUTPUT_ROOT,
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT,
  runAuthorityAdmissionCalibrationReview,
} from "@/src/cognition/observation-v3/authority-admission";

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const shadowReviewRoot = readArg("--shadow-review-root") ?? DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT;
  const outputRoot = readArg("--output-root") ?? DEFAULT_AUTHORITY_ADMISSION_CALIBRATION_OUTPUT_ROOT;
  const calibrationId = readArg("--calibration-id");

  const result = await runAuthorityAdmissionCalibrationReview({
    shadowReviewRoot,
    outputRoot,
    calibrationId,
  });

  console.log(JSON.stringify({
    calibrationId: result.calibrationId,
    reviewRoot: result.reviewRoot,
    summary: result.summary,
  }, null, 2));
}

void main();
