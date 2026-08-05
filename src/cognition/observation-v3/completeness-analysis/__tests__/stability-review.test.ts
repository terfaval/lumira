import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  classifyBenchmarkSourceShape,
  DEFAULT_COMPLETENESS_REVIEW_INPUT_ROOT,
  loadAttemptCandidates,
  runCompletenessStabilityReview,
  runtimeDependencyGuard,
  validateReviewArtifactSet,
} from "@/src/cognition/observation-v3/completeness-analysis/stability-review";

describe("observation v3 completeness stability review", () => {
  it("classifies preserved benchmarks into the expected source-shape groups", () => {
    expect(classifyBenchmarkSourceShape("OBS-A-001")).toBe("short_coherent");
    expect(classifyBenchmarkSourceShape("OBS-B-001")).toBe("medium_multi_scene");
    expect(classifyBenchmarkSourceShape("OBS-D-002")).toBe("fragmented_discontinuous");
    expect(classifyBenchmarkSourceShape("OBS-E-002")).toBe("uncertainty_heavy");
    expect(classifyBenchmarkSourceShape("OBS-H-002")).toBe("known_severe_failures");
    expect(classifyBenchmarkSourceShape("OBS-Z-999")).toBeNull();
  });

  it("loads the preserved 30 replayable attempt candidates from the calibration root", async () => {
    const attempts = await loadAttemptCandidates(DEFAULT_COMPLETENESS_REVIEW_INPUT_ROOT);

    expect(attempts).toHaveLength(30);
    expect(new Set(attempts.map((entry) => entry.benchmarkId))).toEqual(new Set([
      "OBS-A-001",
      "OBS-A-002",
      "OBS-B-001",
      "OBS-C-002",
      "OBS-D-001",
      "OBS-D-002",
      "OBS-E-002",
      "OBS-H-002",
    ]));
  });

  it("builds the full required artifact set and keeps deterministic replay equality stable", async () => {
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-v3-completeness-stability-"));
    const reviewId = "test-review";

    const result = await runCompletenessStabilityReview({
      calibrationRoot: DEFAULT_COMPLETENESS_REVIEW_INPUT_ROOT,
      outputRoot,
      reviewId,
    });

    const fileNames = await fs.readdir(result.reviewRoot);
    expect(validateReviewArtifactSet(fileNames)).toBe(true);

    const deterministicReplay = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "deterministic-replay-results.json"), "utf8"),
    ) as {
      replayCountPerCandidate: number;
      attempts: Array<{
        benchmarkId: string;
        classification: string;
        metadataIgnored: string[];
        substantiveEquality: boolean;
      }>;
    };

    expect(deterministicReplay.replayCountPerCandidate).toBe(3);
    expect(deterministicReplay.attempts).toHaveLength(30);
    expect(deterministicReplay.attempts.every((entry) => entry.classification === "EXPECTED_METADATA_VARIANCE")).toBe(true);
    expect(deterministicReplay.attempts.every((entry) => entry.substantiveEquality)).toBe(true);
    expect(deterministicReplay.attempts.every((entry) => entry.metadataIgnored.join(",") === "generatedAt,elapsedMs")).toBe(true);
  });

  it("records cross-run variance, recovery review, and stability summary without fresh runs", async () => {
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-v3-completeness-stability-"));
    const result = await runCompletenessStabilityReview({
      calibrationRoot: DEFAULT_COMPLETENESS_REVIEW_INPUT_ROOT,
      outputRoot,
      reviewId: "summary-review",
    });

    const crossRun = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "cross-run-stability.json"), "utf8"),
    ) as {
      benchmarks: Array<{
        benchmarkId: string;
        classification: string;
      }>;
    };
    const summary = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "stability-review-summary.json"), "utf8"),
    ) as {
      governanceReadiness: string;
      behavioralInvariance: Record<string, string>;
      recommendedNextTicket: string;
    };
    const freshConfirmation = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "fresh-confirmation-results.json"), "utf8"),
    ) as {
      status: string;
    };

    expect(crossRun.benchmarks).toHaveLength(8);
    expect(crossRun.benchmarks.some((entry) => entry.benchmarkId === "OBS-A-001" && entry.classification === "STABLE WITH ADEQUACY VARIANCE")).toBe(true);
    expect(crossRun.benchmarks.some((entry) => entry.benchmarkId === "OBS-C-002")).toBe(true);
    expect(summary.governanceReadiness).toBe("READY WITH GOVERNANCE LIMITATIONS");
    expect(summary.recommendedNextTicket).toBe("OBS-V3-06A - Authority Admission Contract Design");
    expect(Object.values(summary.behavioralInvariance).every((value) => value === "unchanged")).toBe(true);
    expect(freshConfirmation.status).toBe("not_performed");
  });

  it("keeps the review helper independent from runtime guard inputs, admission activation, and recovery execution", () => {
    expect(runtimeDependencyGuard()).toEqual({
      benchmarkIdDependency: false,
      humanLabelDependency: false,
      v2GuardInputDependency: false,
      admissionActivation: false,
      recoveryExecution: false,
    });
  });
});
