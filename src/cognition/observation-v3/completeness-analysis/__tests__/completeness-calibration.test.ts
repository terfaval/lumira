import { describe, expect, it } from "vitest";

import {
  buildAttemptReviewIndex,
  buildCompletenessCalibrationPlan,
  buildPreCalibrationRuleFreeze,
} from "@/src/cognition/observation-v3/completeness-analysis/calibration";

describe("observation v3 completeness calibration plan", () => {
  it("builds the approved 8-item validation matrix with OBS-B-001 as the eighth benchmark", () => {
    const plan = buildCompletenessCalibrationPlan();

    expect(plan.repeatCount).toBe(3);
    expect(plan.benchmarks.map((benchmark) => benchmark.benchmarkId)).toEqual([
      "OBS-A-001",
      "OBS-A-002",
      "OBS-B-001",
      "OBS-C-002",
      "OBS-D-001",
      "OBS-D-002",
      "OBS-E-002",
      "OBS-H-002",
    ]);
    expect(plan.benchmarks.find((benchmark) => benchmark.benchmarkId === "OBS-B-001")).toEqual(
      expect.objectContaining({
        role: "untouched_control",
        strata: expect.arrayContaining(["accepted_multi_scene_control"]),
      }),
    );
  });

  it("freezes the pre-calibration rules explicitly before comparison", () => {
    const frozen = buildPreCalibrationRuleFreeze();

    expect(frozen.boundaryGapThreshold).toEqual({
      floorChars: 8,
      ratio: 0.08,
    });
    expect(frozen.internalGapThreshold).toEqual({
      floorChars: 24,
      ratio: 0.05,
    });
    expect(frozen.lateRetention.specialRetainedCase).toBe(true);
    expect(frozen.adequacy.inadequateRecoverableTriggers).toEqual([
      "any_physical_gap",
      "late_thin",
      "late_missing",
      "ending_not_retained",
    ]);
  });

  it("creates stable blind attempt review identities without dropping benchmark provenance", () => {
    const index = buildAttemptReviewIndex([
      {
        phase: "pre",
        benchmarkId: "OBS-C-002",
        runId: "run-pre-1",
        repeatIndex: 1,
        attempts: [
          { attemptNumber: 1, candidateHash: "candidate-a", sourceHash: "source-c" },
          { attemptNumber: 2, candidateHash: "candidate-b", sourceHash: "source-c" },
        ],
      },
      {
        phase: "pre",
        benchmarkId: "OBS-A-001",
        runId: "run-pre-2",
        repeatIndex: 2,
        attempts: [
          { attemptNumber: 1, candidateHash: "candidate-c", sourceHash: "source-a" },
        ],
      },
    ]);

    expect(index.map((entry) => entry.blindReviewId)).toEqual([
      "review-001",
      "review-002",
      "review-003",
    ]);
    expect(index[0]).toEqual(
      expect.objectContaining({
        blindReviewId: "review-001",
        benchmarkId: "OBS-A-001",
        attemptNumber: 1,
      }),
    );
    expect(index[2]).toEqual(
      expect.objectContaining({
        blindReviewId: "review-003",
        benchmarkId: "OBS-C-002",
        attemptNumber: 2,
      }),
    );
  });
});
