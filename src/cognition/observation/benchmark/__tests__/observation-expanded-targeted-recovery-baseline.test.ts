import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { writeJsonAtomic } from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import {
  buildExpandedBaselineRunMatrix,
  collectExpandedBaselineRunRecords,
  detectMeasurementDiscrepancies,
  refreshExpandedTargetedRecoveryBaselineArtifacts,
  screenExpandedBaselineRun,
  selectDeepReviewBenchmarks,
  validateExpandedBaselineSamplePlan,
  type ExpandedBaselineRunRecord,
  type ExpandedBaselineSamplePlan,
} from "@/src/cognition/observation/benchmark/observation-expanded-targeted-recovery-baseline";
import { generateObservationTopologyBlindReviewSet } from "@/src/cognition/observation/benchmark/observation-topology-blind-review-set";

function buildSamplePlan(): ExpandedBaselineSamplePlan {
  return {
    sampleVersion: "1",
    benchmarks: [
      {
        benchmarkId: "OBS-A-001",
        sourceLengthClass: "short",
        failureClasses: ["short_coherent", "recovery_negative_control"],
        benchmarkFamily: "A",
        endingSensitive: false,
        localityProfile: "short",
        reasonForInclusion: "control",
        expectedComparisonValue: "control",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-A-002",
        sourceLengthClass: "short",
        failureClasses: ["short_coherent", "recovery_negative_control", "ending_sensitive"],
        benchmarkFamily: "A",
        endingSensitive: true,
        localityProfile: "micro",
        reasonForInclusion: "control",
        expectedComparisonValue: "control",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-B-001",
        sourceLengthClass: "medium",
        failureClasses: ["internal_gap_risk"],
        benchmarkFamily: "B",
        endingSensitive: false,
        localityProfile: "multi",
        reasonForInclusion: "internal",
        expectedComparisonValue: "internal",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: false,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-C-001",
        sourceLengthClass: "long",
        failureClasses: ["long_tail_risk", "ending_sensitive"],
        benchmarkFamily: "C",
        endingSensitive: true,
        localityProfile: "long",
        reasonForInclusion: "tail",
        expectedComparisonValue: "tail",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-C-002",
        sourceLengthClass: "very_long",
        failureClasses: ["long_tail_risk", "ending_sensitive"],
        benchmarkFamily: "C",
        endingSensitive: true,
        localityProfile: "very_long",
        reasonForInclusion: "tail",
        expectedComparisonValue: "tail",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-D-001",
        sourceLengthClass: "medium",
        failureClasses: ["fragmented_multi_locality", "ending_sensitive"],
        benchmarkFamily: "D",
        endingSensitive: true,
        localityProfile: "fragmented",
        reasonForInclusion: "fragmented",
        expectedComparisonValue: "fragmented",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-D-002",
        sourceLengthClass: "long",
        failureClasses: ["fragmented_multi_locality", "internal_gap_risk"],
        benchmarkFamily: "D",
        endingSensitive: false,
        localityProfile: "fragmented",
        reasonForInclusion: "fragmented",
        expectedComparisonValue: "fragmented",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: false,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-E-002",
        sourceLengthClass: "medium",
        failureClasses: ["recovery_negative_control"],
        benchmarkFamily: "E",
        endingSensitive: false,
        localityProfile: "uncertain",
        reasonForInclusion: "negative",
        expectedComparisonValue: "negative",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
      {
        benchmarkId: "OBS-H-002",
        sourceLengthClass: "very_long",
        failureClasses: ["long_tail_risk", "ending_sensitive"],
        benchmarkFamily: "H",
        endingSensitive: true,
        localityProfile: "atmospheric",
        reasonForInclusion: "ending",
        expectedComparisonValue: "ending",
        priorExperimentalExposure: [],
        reliableHumanReferenceMaterial: true,
        authorityLimitations: [],
      },
    ],
  };
}

function buildRunRecord(input: Partial<ExpandedBaselineRunRecord> & Pick<ExpandedBaselineRunRecord, "runId" | "runDirectory" | "benchmarkId" | "configurationId" | "repeatIndex">): ExpandedBaselineRunRecord {
  return {
    success: true,
    finalStatus: "success",
    failureReason: null,
    attemptCount: 1,
    timeoutStatus: "none",
    parseability: "parsed",
    guardAcceptance: true,
    baselineAdmissionStatus: input.configurationId === "C_TARGETED_RECOVERY" ? "accepted" : null,
    rawGapCount: input.configurationId === "C_TARGETED_RECOVERY" ? 1 : null,
    canonicalGapCount: input.configurationId === "C_TARGETED_RECOVERY" ? 1 : null,
    rawWindowCount: input.configurationId === "C_TARGETED_RECOVERY" ? 1 : null,
    canonicalWindowCount: input.configurationId === "C_TARGETED_RECOVERY" ? 1 : null,
    recoveryActivation: input.configurationId === "C_TARGETED_RECOVERY",
    recoveryCallCount: input.configurationId === "C_TARGETED_RECOVERY" ? 1 : 0,
    sceneOrLocalityCount: 2,
    observationCount: 8,
    earliestRepresentedPosition: 0,
    latestRepresentedPosition: 900,
    uncoveredPrefix: 0,
    uncoveredTail: 0,
    internalUncoveredRegions: [],
    lateSectionRetention: true,
    endingRetention: true,
    duplicateCandidatePairs: 0,
    confirmedDuplicatesRemoved: 0,
    repeatedSourceSpanRealizationCount: 0,
    outOfOrderLocalityCount: 0,
    outOfOrderUnitCount: 0,
    latencyMs: 1000,
    tokenUsageTotal: 100,
    modelCallCount: 3,
    artifactCompleteness: "complete",
    sourceCoverageRatio: 1,
    structuralCompleteness: "complete",
    sourceLengthClass: "medium",
    failureClasses: [],
    endingSensitive: false,
    ...input,
  };
}

async function seedRunDirectory(input: {
  runId: string;
  benchmarkId: string;
  repeatIndex: number;
  configurationId: "A_CURRENT_BASELINE" | "C_TARGETED_RECOVERY";
  sourceRoot: string;
  candidateArtifact: Record<string, unknown>;
}): Promise<string> {
  const runDirectory = path.join(input.sourceRoot, input.runId);
  await fs.mkdir(path.join(runDirectory, "blind-review", "candidates"), { recursive: true });

  const candidateArtifactRef = path.join("blind-review", "candidates", `${input.runId}.json`);
  await writeJsonAtomic(path.join(runDirectory, candidateArtifactRef), input.candidateArtifact);
  await writeJsonAtomic(path.join(runDirectory, "blind-review-index.json"), [{
    benchmarkId: input.benchmarkId,
    repeatIndex: input.repeatIndex,
    candidateLabel: "Candidate X",
    candidateArtifactRef,
    candidateHash: `${input.configurationId === "A_CURRENT_BASELINE" ? "hash-a" : "hash-c"}-${input.repeatIndex}`,
  }]);
  await writeJsonAtomic(path.join(runDirectory, "blind-review-anonymization-map.json"), {
    [`${input.benchmarkId}:${input.repeatIndex}:${input.configurationId}`]: {
      candidateLabel: "Candidate X",
      configurationId: input.configurationId,
    },
  });

  return runDirectory;
}

describe("validateExpandedBaselineSamplePlan", () => {
  it("accepts a sample that satisfies all required strata", () => {
    expect(() => validateExpandedBaselineSamplePlan(buildSamplePlan())).not.toThrow();
  });

  it("fails when a required stratum is missing", () => {
    const plan = buildSamplePlan();
    plan.benchmarks = plan.benchmarks.map((item) =>
      item.benchmarkId === "OBS-B-001"
        ? { ...item, failureClasses: [] }
        : item.benchmarkId === "OBS-D-002"
          ? { ...item, failureClasses: ["fragmented_multi_locality"] }
          : item,
    );

    expect(() => validateExpandedBaselineSamplePlan(plan)).toThrow(/internal_gap_risk/);
  });
});

describe("buildExpandedBaselineRunMatrix", () => {
  it("creates a three-run matrix for A and repaired C", () => {
    const matrix = buildExpandedBaselineRunMatrix({
      samplePlan: buildSamplePlan(),
      repeatPerConfiguration: 3,
      configurationIds: ["A_CURRENT_BASELINE", "C_TARGETED_RECOVERY"],
    });

    expect(matrix.scheduledRuns).toHaveLength(9 * 2 * 3);
    expect(matrix.scheduledRuns.filter((run) => run.configurationId === "A_CURRENT_BASELINE")).toHaveLength(27);
    expect(matrix.scheduledRuns.filter((run) => run.configurationId === "C_TARGETED_RECOVERY")).toHaveLength(27);
  });
});

describe("screenExpandedBaselineRun", () => {
  it("flags unnecessary recovery on recovery-negative controls", () => {
    const screening = screenExpandedBaselineRun(buildRunRecord({
      runId: "run-1",
      runDirectory: "C:/tmp/run-1",
      benchmarkId: "OBS-A-001",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      failureClasses: ["short_coherent", "recovery_negative_control"],
      sourceLengthClass: "short",
    }));

    expect(screening.verdict).toBe("PASS WITH OBSERVATION");
    expect(screening.observations).toContain("unnecessary_recovery_activation");
  });

  it("fails obvious chronology defects", () => {
    const screening = screenExpandedBaselineRun(buildRunRecord({
      runId: "run-2",
      runDirectory: "C:/tmp/run-2",
      benchmarkId: "OBS-D-001",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      outOfOrderLocalityCount: 1,
      failureClasses: ["fragmented_multi_locality"],
    }));

    expect(screening.verdict).toBe("FAIL");
    expect(screening.observations).toContain("source_order_failure");
  });
});

describe("detectMeasurementDiscrepancies", () => {
  it("detects coverage and uncovered-range mismatches and ending false negatives", () => {
    const records = [
      buildRunRecord({
        runId: "run-1",
        runDirectory: "C:/tmp/run-1",
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        sourceCoverageRatio: 1,
        uncoveredPrefix: 35,
        uncoveredTail: 880,
        endingRetention: false,
        failureClasses: ["long_tail_risk", "ending_sensitive"],
      }),
    ];
    const screenings = [{
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY" as const,
      repeatIndex: 1,
      verdict: "PASS WITH OBSERVATION" as const,
      observations: [],
      criticalInformationSurvival: "uncertain" as const,
      endingPresence: "present" as const,
      recoveryNecessity: "activated" as const,
      usability: "usable_with_observations" as const,
    }];

    const discrepancies = detectMeasurementDiscrepancies({ records, screenings });

    expect(discrepancies.map((entry) => entry.discrepancyType)).toEqual(
      expect.arrayContaining(["coverage_vs_uncovered_ranges", "ending_metric_false_negative"]),
    );
  });
});

describe("selectDeepReviewBenchmarks", () => {
  it("includes required strata and variance-triggered benchmarks", () => {
    const samplePlan = buildSamplePlan();
    const records = [
      buildRunRecord({
        runId: "run-a1",
        runDirectory: "C:/tmp/run-a1",
        benchmarkId: "OBS-A-001",
        configurationId: "A_CURRENT_BASELINE",
        repeatIndex: 1,
        failureClasses: ["short_coherent", "recovery_negative_control"],
        sourceLengthClass: "short",
      }),
      buildRunRecord({
        runId: "run-c1",
        runDirectory: "C:/tmp/run-c1",
        benchmarkId: "OBS-A-001",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        failureClasses: ["short_coherent", "recovery_negative_control"],
        sourceLengthClass: "short",
      }),
      buildRunRecord({
        runId: "run-c2",
        runDirectory: "C:/tmp/run-c2",
        benchmarkId: "OBS-C-002",
        configurationId: "A_CURRENT_BASELINE",
        repeatIndex: 1,
        observationCount: 2,
        failureClasses: ["long_tail_risk", "ending_sensitive"],
      }),
      buildRunRecord({
        runId: "run-c3",
        runDirectory: "C:/tmp/run-c3",
        benchmarkId: "OBS-C-002",
        configurationId: "A_CURRENT_BASELINE",
        repeatIndex: 2,
        observationCount: 20,
        failureClasses: ["long_tail_risk", "ending_sensitive"],
      }),
      buildRunRecord({
        runId: "run-d1",
        runDirectory: "C:/tmp/run-d1",
        benchmarkId: "OBS-D-001",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        failureClasses: ["fragmented_multi_locality", "ending_sensitive"],
      }),
      buildRunRecord({
        runId: "run-b1",
        runDirectory: "C:/tmp/run-b1",
        benchmarkId: "OBS-B-001",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        failureClasses: ["internal_gap_risk"],
      }),
    ];
    const screenings = records.map((record) => screenExpandedBaselineRun(record));

    const selection = selectDeepReviewBenchmarks({
      samplePlan,
      records,
      screenings,
    });

    expect(selection.benchmarkIds).toEqual(
      expect.arrayContaining(["OBS-A-001", "OBS-C-002", "OBS-D-001", "OBS-B-001", "OBS-A-002"]),
    );
    expect(selection.reasonsByBenchmark["OBS-C-002"]).toContain("high_run_to_run_variance");
  });
});

describe("generateObservationTopologyBlindReviewSet", () => {
  it("keeps run numbers and run IDs out of the public cross-run review set", async () => {
    const sourceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-expanded-review-source-"));
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "obs-expanded-review-output-"));
    const baselineRun = await seedRunDirectory({
      runId: "20260731T101010Z-baseline-r1",
      benchmarkId: "OBS-C-002",
      repeatIndex: 2,
      configurationId: "A_CURRENT_BASELINE",
      sourceRoot,
      candidateArtifact: { kind: "scene_bundle", bundle: { scenes: [] } },
    });
    const recoveryRun = await seedRunDirectory({
      runId: "20260731T101015Z-recovery-r1",
      benchmarkId: "OBS-C-002",
      repeatIndex: 2,
      configurationId: "C_TARGETED_RECOVERY",
      sourceRoot,
      candidateArtifact: { kind: "scene_bundle", bundle: { scenes: [{ sceneId: "scene-1" }] } },
    });

    const result = await generateObservationTopologyBlindReviewSet({
      outputRoot,
      spec: {
        reviewLabel: "expanded-review",
        benchmarks: [{
          benchmarkId: "OBS-C-002",
          candidateSources: [
            {
              runDirectory: baselineRun,
              benchmarkId: "OBS-C-002",
              repeatIndex: 2,
              configurationId: "A_CURRENT_BASELINE",
              comparatorLabel: "baseline_r02",
            },
            {
              runDirectory: recoveryRun,
              benchmarkId: "OBS-C-002",
              repeatIndex: 2,
              configurationId: "C_TARGETED_RECOVERY",
              comparatorLabel: "recovery_r02",
            },
          ],
        }],
      },
    });

    const publicIndex = JSON.parse(
      await fs.readFile(path.join(result.reviewSetDirectory, "blind-review-index.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const serialized = JSON.stringify(publicIndex);

    expect(publicIndex).toHaveLength(2);
    expect(serialized).not.toContain("A_CURRENT_BASELINE");
    expect(serialized).not.toContain("C_TARGETED_RECOVERY");
    expect(serialized).not.toContain("20260731T101010Z");
    expect(serialized).not.toContain("20260731T101015Z");
    expect(serialized).not.toContain("repeatIndex");
    expect(serialized).not.toContain("r02");
  });
});

describe("collectExpandedBaselineRunRecords", () => {
  it("derives baseline model calls from retryOrStageCount when stage files are absent", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "obs-expanded-run-records-"));
    const runDirectory = path.join(root, "20260731T000000Z-baseline");
    const itemDirectory = path.join(
      runDirectory,
      "items",
      "OBS-A-001",
      "A_CURRENT_BASELINE",
      "repeat-01",
    );

    await fs.mkdir(itemDirectory, { recursive: true });
    await writeJsonAtomic(path.join(runDirectory, "experiment-summary.json"), {
      summaries: [{
        benchmarkId: "OBS-A-001",
        configurationId: "A_CURRENT_BASELINE",
        repeatIndex: 1,
        success: true,
        finalStatus: "success",
        failureReason: null,
        sceneOrRegionCount: 2,
        observationCount: 6,
        elapsedMs: 1200,
        tokenUsageTotal: null,
        endingRetention: false,
        lateSectionRetention: true,
        retryOrStageCount: 2,
      }],
    });
    await writeJsonAtomic(path.join(itemDirectory, "diagnostics.json"), {});
    await writeJsonAtomic(path.join(itemDirectory, "completeness.json"), {
      sourceCoverageRatio: 0.8,
      structuralCompleteness: "partial",
    });
    await writeJsonAtomic(path.join(itemDirectory, "attempt-evidence.json"), [
      { acceptedAttempt: false, parseStatus: "parsed" },
      { acceptedAttempt: true, parseStatus: "parsed" },
    ]);
    await writeJsonAtomic(path.join(itemDirectory, "final-representation.json"), {
      kind: "scene_bundle",
    });

    const [record] = await collectExpandedBaselineRunRecords({
      samplePlan: buildSamplePlan(),
      runDirectory,
    });

    expect(record?.modelCallCount).toBe(2);
  });
});

describe("refreshExpandedTargetedRecoveryBaselineArtifacts", () => {
  it("rewrites group summaries from existing run directories without exposing identity", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "obs-expanded-refresh-"));
    const runGroupDirectory = path.join(root, "group");
    const baselineRunDirectory = path.join(root, "baseline-run");
    const targetedRunDirectory = path.join(root, "targeted-run");
    const reviewSetDirectory = path.join(root, "review-set");
    const itemPath = (runDirectory: string, configurationId: string) =>
      path.join(runDirectory, "items", "OBS-A-001", configurationId, "repeat-01");

    await fs.mkdir(runGroupDirectory, { recursive: true });
    await fs.mkdir(reviewSetDirectory, { recursive: true });
    await writeJsonAtomic(path.join(runGroupDirectory, "run-manifest.json"), {
      runGroupId: "group-1",
    });
    await writeJsonAtomic(path.join(runGroupDirectory, "sample-plan.json"), {
      sampleVersion: "1",
      benchmarks: [buildSamplePlan().benchmarks[0]],
    });
    await writeJsonAtomic(path.join(reviewSetDirectory, "blind-review-index.json"), [{
      benchmarkId: "OBS-A-001",
      candidateLabel: "Candidate X",
      candidateArtifactRef: "candidates/candidate-a.json",
      candidateHash: "hash-a",
    }]);
    await writeJsonAtomic(path.join(reviewSetDirectory, "blind-review-anonymization-map.json"), {
      private: true,
    });

    for (const [runDirectory, configurationId, retryOrStageCount] of [
      [baselineRunDirectory, "A_CURRENT_BASELINE", 2],
      [targetedRunDirectory, "C_TARGETED_RECOVERY", 3],
    ] as const) {
      const itemDirectory = itemPath(runDirectory, configurationId);
      await fs.mkdir(itemDirectory, { recursive: true });
      if (configurationId === "C_TARGETED_RECOVERY") {
        await fs.mkdir(path.join(itemDirectory, "stages"), { recursive: true });
        await writeJsonAtomic(path.join(itemDirectory, "source-order-assembly.json"), {
          outOfOrderLocalityCount: 0,
          outOfOrderUnitCount: 0,
          repeatedSourceSpanRealizationCount: 0,
        });
      }
      await writeJsonAtomic(path.join(runDirectory, "experiment-summary.json"), {
        summaries: [{
          benchmarkId: "OBS-A-001",
          configurationId,
          repeatIndex: 1,
          success: true,
          finalStatus: "success",
          failureReason: null,
          sceneOrRegionCount: 2,
          observationCount: 6,
          elapsedMs: 1200,
          tokenUsageTotal: 100,
          endingRetention: false,
          lateSectionRetention: true,
          retryOrStageCount,
        }],
      });
      await writeJsonAtomic(path.join(itemDirectory, "diagnostics.json"), {
        canonicalRecoveryWindowCount: configurationId === "C_TARGETED_RECOVERY" ? 1 : 0,
      });
      await writeJsonAtomic(path.join(itemDirectory, "completeness.json"), {
        sourceCoverageRatio: 0.8,
        structuralCompleteness: "partial",
      });
      await writeJsonAtomic(path.join(itemDirectory, "attempt-evidence.json"), Array.from(
        { length: retryOrStageCount },
        () => ({ acceptedAttempt: true, parseStatus: "parsed" }),
      ));
      await writeJsonAtomic(path.join(itemDirectory, "final-representation.json"), {
        kind: "scene_bundle",
      });
    }

    await refreshExpandedTargetedRecoveryBaselineArtifacts({
      runGroupDirectory,
      baselineRunDirectory,
      baselineRunId: "baseline-id",
      targetedRecoveryRunDirectory: targetedRunDirectory,
      targetedRecoveryRunId: "targeted-id",
      reviewSetDirectory,
    });

    const costSummary = JSON.parse(
      await fs.readFile(path.join(runGroupDirectory, "cost-latency-summary.json"), "utf8"),
    ) as {
      byConfiguration: Array<{ configurationId: string; totalModelCalls: number }>;
    };

    expect(costSummary.byConfiguration).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          configurationId: "A_CURRENT_BASELINE",
          totalModelCalls: 2,
        }),
        expect.objectContaining({
          configurationId: "C_TARGETED_RECOVERY",
          totalModelCalls: 3,
        }),
      ]),
    );
  });
});
