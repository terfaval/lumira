import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT,
  runAuthorityAdmissionCalibrationReview,
} from "@/src/cognition/observation-v3/authority-admission";

describe("runAuthorityAdmissionCalibrationReview", () => {
  it("replays the preserved shadow review and writes the full calibration artifact set", async () => {
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "authority-admission-calibration-"));

    const result = await runAuthorityAdmissionCalibrationReview({
      shadowReviewRoot: DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT,
      outputRoot,
      calibrationId: "20260802T111500Z-obs-v3-authority-admission-calibration",
      replayCount: 3,
    });

    expect(result.summary.candidateCount).toBe(30);
    expect(result.summary.benchmarkCount).toBe(8);
    expect(result.replayResults).toHaveLength(30);
    expect(result.replayResults.every((entry) => entry.substantiveEquality)).toBe(true);

    const summary = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "calibration-summary.json"), "utf8"),
    ) as {
      changedCandidateCount: number;
      postDispositionCounts: Record<string, number>;
      preDispositionCounts: Record<string, number>;
    };
    const severe = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "severe-failure-regression.json"), "utf8"),
    ) as {
      attempts: Array<{
        benchmarkId: string;
        stillAuthorityBlocked: boolean;
      }>;
    };

    expect(summary.changedCandidateCount).toBeGreaterThan(0);
    expect(summary.preDispositionCounts.deferred_for_supplemental_realization).toBeGreaterThan(0);
    expect(summary.postDispositionCounts.admitted_with_observations).toBeGreaterThan(0);
    expect(severe.attempts.every((entry) => entry.stillAuthorityBlocked)).toBe(true);
  }, 15000);
});
