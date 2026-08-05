import fs from "node:fs/promises";
import path from "node:path";

import {
  buildObservationBenchmarkRunId,
  writeJsonAtomic,
} from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import {
  OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  type ObservationBenchmarkCorpusManifest,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";
import {
  generateObservationTopologyBlindReviewSet,
  type ObservationTopologyBlindReviewSetSpec,
} from "@/src/cognition/observation/benchmark/observation-topology-blind-review-set";
import {
  runObservationTopologyExperiment,
  type ObservationTopologyExperimentRunResult,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-runner";
import type {
  ObservationTopologyConfigurationId,
  ObservationTopologyExecutionSummary,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { readObservationBenchmarkRepositoryState } from "@/src/cognition/observation/benchmark/observation-benchmark-fingerprint";

export const OBSERVATION_EXPANDED_BASELINE_OUTPUT_ROOT =
  ".validation/observation-topology-experiments/expanded-baseline";

export type ExpandedBaselineSourceLengthClass = "short" | "medium" | "long" | "very_long";

export type ExpandedBaselineFailureClass =
  | "short_coherent"
  | "recovery_negative_control"
  | "long_tail_risk"
  | "fragmented_multi_locality"
  | "internal_gap_risk"
  | "ending_sensitive";

export type ExpandedBaselineScreeningVerdict =
  | "PASS"
  | "PASS WITH OBSERVATION"
  | "FAIL";

export type ExpandedBaselineBenchmarkClassification =
  | "CONSISTENT ADVANTAGE"
  | "PROVISIONAL ADVANTAGE"
  | "NO MATERIAL DIFFERENCE"
  | "MIXED / RUN-DEPENDENT"
  | "CONSISTENT REGRESSION"
  | "NOT ASSESSABLE";

export interface ExpandedBaselineSamplePlanItem {
  benchmarkId: string;
  sourceLengthClass: ExpandedBaselineSourceLengthClass;
  failureClasses: ExpandedBaselineFailureClass[];
  benchmarkFamily: string;
  endingSensitive: boolean;
  localityProfile: string;
  reasonForInclusion: string;
  expectedComparisonValue: string;
  priorExperimentalExposure: string[];
  reliableHumanReferenceMaterial: boolean;
  authorityLimitations: string[];
}

export interface ExpandedBaselineSamplePlan {
  sampleVersion: "1";
  benchmarks: ExpandedBaselineSamplePlanItem[];
}

export interface ExpandedBaselineScheduledRun {
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  sourceLengthClass: ExpandedBaselineSourceLengthClass;
  failureClasses: ExpandedBaselineFailureClass[];
}

export interface ExpandedBaselineRunMatrix {
  repeatPerConfiguration: number;
  configurationIds: ObservationTopologyConfigurationId[];
  scheduledRuns: ExpandedBaselineScheduledRun[];
}

export interface ExpandedBaselineRunRecord {
  runId: string;
  runDirectory: string;
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  success: boolean;
  finalStatus: "success" | "failed";
  failureReason: string | null;
  attemptCount: number;
  timeoutStatus: "none" | "possible_timeout";
  parseability: "parsed" | "not_parsed" | "unknown";
  guardAcceptance: boolean | null;
  baselineAdmissionStatus: "accepted" | "rejected_parseable" | null;
  rawGapCount: number | null;
  canonicalGapCount: number | null;
  rawWindowCount: number | null;
  canonicalWindowCount: number | null;
  recoveryActivation: boolean;
  recoveryCallCount: number;
  sceneOrLocalityCount: number;
  observationCount: number;
  earliestRepresentedPosition: number | null;
  latestRepresentedPosition: number | null;
  uncoveredPrefix: number | null;
  uncoveredTail: number | null;
  internalUncoveredRegions: Array<{ start: number; end: number }>;
  lateSectionRetention: boolean;
  endingRetention: boolean;
  duplicateCandidatePairs: number | null;
  confirmedDuplicatesRemoved: number | null;
  repeatedSourceSpanRealizationCount: number | null;
  outOfOrderLocalityCount: number | null;
  outOfOrderUnitCount: number | null;
  latencyMs: number;
  tokenUsageTotal: number | null;
  modelCallCount: number;
  artifactCompleteness: "complete" | "partial";
  sourceCoverageRatio: number | null;
  structuralCompleteness: "complete" | "partial" | "incomplete";
  sourceLengthClass: ExpandedBaselineSourceLengthClass;
  failureClasses: ExpandedBaselineFailureClass[];
  endingSensitive: boolean;
}

export interface ExpandedBaselineScreeningRecord {
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  verdict: ExpandedBaselineScreeningVerdict;
  observations: string[];
  criticalInformationSurvival: "likely_preserved" | "uncertain" | "failed";
  endingPresence: "present" | "absent" | "uncertain";
  recoveryNecessity: "not_applicable" | "abstained" | "activated" | "missed";
  usability: "usable" | "usable_with_observations" | "unusable";
}

export interface ExpandedBaselineMeasurementDiscrepancy {
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  runId: string;
  metricValues: {
    sourceCoverageRatio: number | null;
    uncoveredPrefix: number | null;
    uncoveredTail: number | null;
    internalUncoveredRegionCount: number;
    lateSectionRetention: boolean;
    endingRetention: boolean;
    structuralCompleteness: "complete" | "partial" | "incomplete";
  };
  humanFinding: {
    screeningVerdict: ExpandedBaselineScreeningVerdict;
    endingPresence: string;
    criticalInformationSurvival: string;
  };
  discrepancyType:
    | "coverage_vs_uncovered_ranges"
    | "ending_metric_false_negative"
    | "screening_vs_structural_completeness"
    | "late_retention_vs_tail_gap";
  likelyCause: string;
  severity: "low" | "medium" | "high";
  affectedArchitecturalJudgment: boolean;
}

export interface ExpandedBaselineDeepReviewSelection {
  benchmarkIds: string[];
  reasonsByBenchmark: Record<string, string[]>;
}

export interface ExpandedBaselineExecutionResult {
  runGroupId: string;
  runGroupDirectory: string;
  baselineRun: ObservationTopologyExperimentRunResult;
  targetedRecoveryRun: ObservationTopologyExperimentRunResult;
  reviewSetId: string;
  reviewSetDirectory: string;
  selectedBenchmarks: string[];
}

export interface ExpandedBaselineAggregationRefreshResult {
  runGroupId: string;
  runGroupDirectory: string;
  reviewSetId: string;
  reviewSetDirectory: string;
}

function classifyLength(length: number): ExpandedBaselineSourceLengthClass {
  if (length < 500) {
    return "short";
  }
  if (length < 1800) {
    return "medium";
  }
  if (length < 3000) {
    return "long";
  }
  return "very_long";
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8")) as T;
}

async function readManifest(): Promise<ObservationBenchmarkCorpusManifest> {
  return readJson<ObservationBenchmarkCorpusManifest>(
    OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function variance(values: number[]): number | null {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) {
    return (ordered[midpoint - 1]! + ordered[midpoint]!) / 2;
  }
  return ordered[midpoint]!;
}

function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function deriveModelCallCount(input: {
  attemptsLength: number;
  retryOrStageCount: number | null;
  stageFileCount: number;
}): number {
  return Math.max(
    input.stageFileCount,
    input.attemptsLength,
    input.retryOrStageCount ?? 0,
  );
}

function buildSamplePlanItemIndex(samplePlan: ExpandedBaselineSamplePlan): Map<string, ExpandedBaselineSamplePlanItem> {
  return new Map(samplePlan.benchmarks.map((item) => [item.benchmarkId, item]));
}

export async function buildDefaultExpandedBaselineSamplePlan(): Promise<ExpandedBaselineSamplePlan> {
  const manifest = await readManifest();
  const byId = new Map(manifest.items.map((item) => [item.benchmarkId, item]));
  const selected = [
    {
      benchmarkId: "OBS-A-001",
      failureClasses: ["short_coherent", "recovery_negative_control"] as ExpandedBaselineFailureClass[],
      endingSensitive: false,
      localityProfile: "single short coherent arc",
      reasonForInclusion: "Short coherent negative control with prior successful human review.",
      expectedComparisonValue: "Verifies recovery abstention, over-structuring resistance, and cost neutrality.",
      priorExperimentalExposure: ["human_evaluation_pilot_only"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-A-002",
      failureClasses: ["short_coherent", "recovery_negative_control", "ending_sensitive"] as ExpandedBaselineFailureClass[],
      endingSensitive: true,
      localityProfile: "single micro-dream with one critical transition",
      reasonForInclusion: "Short no-recovery benchmark already used in targeted-recovery comparative review.",
      expectedComparisonValue: "Confirms repaired C remains neutral when recovery is unnecessary and does not reintroduce duplication.",
      priorExperimentalExposure: ["human_evaluation_pilot", "topology_review", "refinement_review", "repair_review"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-B-001",
      failureClasses: ["internal_gap_risk"] as ExpandedBaselineFailureClass[],
      endingSensitive: false,
      localityProfile: "medium multi-scene with naturally connected locality changes",
      reasonForInclusion: "Introduces a non-fragmented multi-scene benchmark where recovery could target interior transitions rather than only a tail.",
      expectedComparisonValue: "Tests internal-gap behavior, locality integration, and recovery-window discipline outside extreme tail loss.",
      priorExperimentalExposure: ["none"],
      reliableHumanReferenceMaterial: false,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-C-001",
      failureClasses: ["long_tail_risk", "ending_sensitive"] as ExpandedBaselineFailureClass[],
      endingSensitive: true,
      localityProfile: "long transition-dense pursuit with narrated ending",
      reasonForInclusion: "Long-form control with prior human review showing mostly successful baseline behavior.",
      expectedComparisonValue: "Checks whether repaired C preserves or degrades a long benchmark that already had acceptable baseline coverage.",
      priorExperimentalExposure: ["human_evaluation_pilot_only"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-C-002",
      failureClasses: ["long_tail_risk", "ending_sensitive"] as ExpandedBaselineFailureClass[],
      endingSensitive: true,
      localityProfile: "very long transition-dense lucid dream with strong late arc",
      reasonForInclusion: "Primary known omission benchmark and established targeted-recovery win case.",
      expectedComparisonValue: "Measures whether repaired gains recur across repeated runs on the original long-tail failure class.",
      priorExperimentalExposure: ["human_evaluation_pilot", "topology_review", "refinement_review", "repair_review"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-D-001",
      failureClasses: ["fragmented_multi_locality", "ending_sensitive"] as ExpandedBaselineFailureClass[],
      endingSensitive: true,
      localityProfile: "fragmented episodes separated by awakening and return to sleep",
      reasonForInclusion: "Established fragmentation-risk benchmark from refinement and repair reviews.",
      expectedComparisonValue: "Tests source-order assembly, additive recovery, and appended-layer redundancy under episode discontinuity.",
      priorExperimentalExposure: ["topology_review", "refinement_review", "repair_review"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-D-002",
      failureClasses: ["fragmented_multi_locality", "internal_gap_risk"] as ExpandedBaselineFailureClass[],
      endingSensitive: false,
      localityProfile: "long loose fragments with mixed consciousness and false-continuity risk",
      reasonForInclusion: "Extends fragmentation testing to a looser, more ambiguity-prone benchmark than OBS-D-001.",
      expectedComparisonValue: "Tests whether recovery keeps distinct internal fragments separate and avoids inappropriate window merging.",
      priorExperimentalExposure: ["none"],
      reliableHumanReferenceMaterial: false,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-E-002",
      failureClasses: ["recovery_negative_control"] as ExpandedBaselineFailureClass[],
      endingSensitive: false,
      localityProfile: "medium uncertainty-heavy ontological transition",
      reasonForInclusion: "Medium-length control with prior successful human review and preserved ambiguity demands.",
      expectedComparisonValue: "Checks whether repaired C avoids unnecessary recovery and semantic inflation on non-omission uncertainty content.",
      priorExperimentalExposure: ["human_evaluation_pilot_only"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
    {
      benchmarkId: "OBS-H-002",
      failureClasses: ["long_tail_risk", "ending_sensitive"] as ExpandedBaselineFailureClass[],
      endingSensitive: true,
      localityProfile: "very long atmosphere-heavy benchmark with subtle late emotional ending",
      reasonForInclusion: "Known baseline failure with severe late and ending loss from pilot review.",
      expectedComparisonValue: "Tests whether repaired targeted recovery generalizes beyond high-plot long dreams into atmosphere-heavy late-loss cases.",
      priorExperimentalExposure: ["human_evaluation_pilot_only"],
      reliableHumanReferenceMaterial: true,
      authorityLimitations: [],
    },
  ];

  return {
    sampleVersion: "1",
    benchmarks: selected.map((entry) => {
      const manifestItem = byId.get(entry.benchmarkId);
      if (!manifestItem) {
        throw new Error(`Sample benchmark ${entry.benchmarkId} is missing from the manifest.`);
      }

      return {
        benchmarkId: entry.benchmarkId,
        sourceLengthClass: classifyLength(manifestItem.dreamTextCharacterLength),
        failureClasses: entry.failureClasses,
        benchmarkFamily: manifestItem.benchmarkFamily,
        endingSensitive: entry.endingSensitive,
        localityProfile: entry.localityProfile,
        reasonForInclusion: entry.reasonForInclusion,
        expectedComparisonValue: entry.expectedComparisonValue,
        priorExperimentalExposure: entry.priorExperimentalExposure,
        reliableHumanReferenceMaterial: entry.reliableHumanReferenceMaterial,
        authorityLimitations: entry.authorityLimitations,
      } satisfies ExpandedBaselineSamplePlanItem;
    }),
  };
}

export function validateExpandedBaselineSamplePlan(samplePlan: ExpandedBaselineSamplePlan): void {
  if (samplePlan.benchmarks.length < 8 || samplePlan.benchmarks.length > 12) {
    throw new Error("Expanded baseline sample must contain 8-12 benchmark items.");
  }

  const counts = new Map<ExpandedBaselineFailureClass, number>();
  for (const item of samplePlan.benchmarks) {
    for (const failureClass of item.failureClasses) {
      counts.set(failureClass, (counts.get(failureClass) ?? 0) + 1);
    }
  }

  const requirements: Array<[ExpandedBaselineFailureClass, number]> = [
    ["short_coherent", 2],
    ["long_tail_risk", 2],
    ["fragmented_multi_locality", 2],
    ["internal_gap_risk", 1],
    ["ending_sensitive", 2],
    ["recovery_negative_control", 2],
  ];

  for (const [failureClass, minimum] of requirements) {
    if ((counts.get(failureClass) ?? 0) < minimum) {
      throw new Error(`Expanded baseline sample is missing required stratum coverage for ${failureClass}.`);
    }
  }
}

export function buildExpandedBaselineRunMatrix(input: {
  samplePlan: ExpandedBaselineSamplePlan;
  repeatPerConfiguration: number;
  configurationIds: ObservationTopologyConfigurationId[];
}): ExpandedBaselineRunMatrix {
  const scheduledRuns: ExpandedBaselineScheduledRun[] = [];

  for (const item of input.samplePlan.benchmarks) {
    for (const configurationId of input.configurationIds) {
      for (let repeatIndex = 1; repeatIndex <= input.repeatPerConfiguration; repeatIndex += 1) {
        scheduledRuns.push({
          benchmarkId: item.benchmarkId,
          configurationId,
          repeatIndex,
          sourceLengthClass: item.sourceLengthClass,
          failureClasses: [...item.failureClasses],
        });
      }
    }
  }

  return {
    repeatPerConfiguration: input.repeatPerConfiguration,
    configurationIds: [...input.configurationIds],
    scheduledRuns,
  };
}

export function screenExpandedBaselineRun(record: ExpandedBaselineRunRecord): ExpandedBaselineScreeningRecord {
  const observations: string[] = [];
  let verdict: ExpandedBaselineScreeningVerdict = "PASS";

  if (!record.success || record.finalStatus === "failed") {
    verdict = "FAIL";
    observations.push("run_failed");
  }
  if ((record.outOfOrderLocalityCount ?? 0) > 0 || (record.outOfOrderUnitCount ?? 0) > 0) {
    verdict = "FAIL";
    observations.push("source_order_failure");
  }
  if ((record.repeatedSourceSpanRealizationCount ?? 0) > 0) {
    verdict = verdict === "FAIL" ? "FAIL" : "PASS WITH OBSERVATION";
    observations.push("repeated_source_span_realization");
  }
  if (record.failureClasses.includes("recovery_negative_control") && record.recoveryActivation) {
    verdict = verdict === "FAIL" ? "FAIL" : "PASS WITH OBSERVATION";
    observations.push("unnecessary_recovery_activation");
  }
  if (record.failureClasses.includes("ending_sensitive") && !record.endingRetention) {
    verdict = verdict === "FAIL" ? "FAIL" : "PASS WITH OBSERVATION";
    observations.push("ending_not_retained");
  }
  if (
    record.failureClasses.includes("long_tail_risk") &&
    record.configurationId === "C_TARGETED_RECOVERY" &&
    !record.recoveryActivation &&
    record.success
  ) {
    verdict = verdict === "FAIL" ? "FAIL" : "PASS WITH OBSERVATION";
    observations.push("potential_missed_recovery");
  }
  if (record.sceneOrLocalityCount >= 8 && record.sourceLengthClass !== "very_long") {
    verdict = verdict === "FAIL" ? "FAIL" : "PASS WITH OBSERVATION";
    observations.push("possible_overfragmentation");
  }

  return {
    benchmarkId: record.benchmarkId,
    configurationId: record.configurationId,
    repeatIndex: record.repeatIndex,
    verdict,
    observations,
    criticalInformationSurvival: verdict === "FAIL" ? "failed" : verdict === "PASS" ? "likely_preserved" : "uncertain",
    endingPresence: record.endingRetention ? "present" : record.failureClasses.includes("ending_sensitive") ? "absent" : "uncertain",
    recoveryNecessity: record.configurationId === "A_CURRENT_BASELINE"
      ? "not_applicable"
      : record.failureClasses.includes("recovery_negative_control")
        ? (record.recoveryActivation ? "activated" : "abstained")
        : (record.recoveryActivation ? "activated" : "missed"),
    usability: verdict === "FAIL" ? "unusable" : verdict === "PASS" ? "usable" : "usable_with_observations",
  };
}

export function detectMeasurementDiscrepancies(input: {
  records: ExpandedBaselineRunRecord[];
  screenings: ExpandedBaselineScreeningRecord[];
}): ExpandedBaselineMeasurementDiscrepancy[] {
  const screeningByKey = new Map(
    input.screenings.map((screening) => [
      `${screening.benchmarkId}:${screening.configurationId}:${screening.repeatIndex}`,
      screening,
    ]),
  );
  const discrepancies: ExpandedBaselineMeasurementDiscrepancy[] = [];

  for (const record of input.records) {
    const screening = screeningByKey.get(
      `${record.benchmarkId}:${record.configurationId}:${record.repeatIndex}`,
    );
    if (!screening) {
      continue;
    }

    const base = {
      benchmarkId: record.benchmarkId,
      configurationId: record.configurationId,
      repeatIndex: record.repeatIndex,
      runId: record.runId,
      metricValues: {
        sourceCoverageRatio: record.sourceCoverageRatio,
        uncoveredPrefix: record.uncoveredPrefix,
        uncoveredTail: record.uncoveredTail,
        internalUncoveredRegionCount: record.internalUncoveredRegions.length,
        lateSectionRetention: record.lateSectionRetention,
        endingRetention: record.endingRetention,
        structuralCompleteness: record.structuralCompleteness,
      },
      humanFinding: {
        screeningVerdict: screening.verdict,
        endingPresence: screening.endingPresence,
        criticalInformationSurvival: screening.criticalInformationSurvival,
      },
    };

    if (
      record.sourceCoverageRatio === 1 &&
      ((record.uncoveredPrefix ?? 0) > 0 || (record.uncoveredTail ?? 0) > 0)
    ) {
      discrepancies.push({
        ...base,
        discrepancyType: "coverage_vs_uncovered_ranges",
        likelyCause: "Coverage is derived from farthest span end while uncovered-range diagnostics use absolute boundary accounting.",
        severity: "medium",
        affectedArchitecturalJudgment: false,
      });
    }

    if (
      screening.endingPresence === "present" &&
      !record.endingRetention
    ) {
      discrepancies.push({
        ...base,
        discrepancyType: "ending_metric_false_negative",
        likelyCause: "Ending semantics likely survive without meeting the span-end threshold used by endingRetention.",
        severity: "medium",
        affectedArchitecturalJudgment: true,
      });
    }

    if (
      screening.verdict === "PASS" &&
      record.structuralCompleteness === "incomplete"
    ) {
      discrepancies.push({
        ...base,
        discrepancyType: "screening_vs_structural_completeness",
        likelyCause: "Structural completeness is stricter than high-level usability screening for this run.",
        severity: "low",
        affectedArchitecturalJudgment: false,
      });
    }

    if (
      record.lateSectionRetention &&
      (record.uncoveredTail ?? 0) > 0 &&
      record.failureClasses.includes("ending_sensitive")
    ) {
      discrepancies.push({
        ...base,
        discrepancyType: "late_retention_vs_tail_gap",
        likelyCause: "Late-section presence is triggered by one retained late span while uncoveredTail still reports remaining trailing loss.",
        severity: "low",
        affectedArchitecturalJudgment: false,
      });
    }
  }

  return discrepancies;
}

export function selectDeepReviewBenchmarks(input: {
  samplePlan: ExpandedBaselineSamplePlan;
  records: ExpandedBaselineRunRecord[];
  screenings: ExpandedBaselineScreeningRecord[];
}): ExpandedBaselineDeepReviewSelection {
  const reasonsByBenchmark: Record<string, string[]> = {};
  const selected = new Set<string>();

  function ensureBenchmarkByPredicate(reason: string, predicate: (item: ExpandedBaselineSamplePlanItem) => boolean) {
    const match = input.samplePlan.benchmarks.find((item) => predicate(item));
    if (!match) {
      return;
    }
    selected.add(match.benchmarkId);
    reasonsByBenchmark[match.benchmarkId] = uniqueStrings([
      ...(reasonsByBenchmark[match.benchmarkId] ?? []),
      reason,
    ]);
  }

  ensureBenchmarkByPredicate("required_short_recovery_negative_item", (item) =>
    item.failureClasses.includes("short_coherent") &&
    item.failureClasses.includes("recovery_negative_control"));
  ensureBenchmarkByPredicate("required_long_tail_risk_item", (item) =>
    item.failureClasses.includes("long_tail_risk"));
  ensureBenchmarkByPredicate("required_fragmented_item", (item) =>
    item.failureClasses.includes("fragmented_multi_locality"));
  ensureBenchmarkByPredicate("required_internal_gap_item", (item) =>
    item.failureClasses.includes("internal_gap_risk"));
  ensureBenchmarkByPredicate("required_ending_sensitive_item", (item) =>
    item.failureClasses.includes("ending_sensitive"));

  const recordsByBenchmark = new Map<string, ExpandedBaselineRunRecord[]>();
  for (const record of input.records) {
    const bucket = recordsByBenchmark.get(record.benchmarkId) ?? [];
    bucket.push(record);
    recordsByBenchmark.set(record.benchmarkId, bucket);
  }

  for (const [benchmarkId, records] of recordsByBenchmark.entries()) {
    const coverageValues = records
      .map((record) => record.sourceCoverageRatio)
      .filter((value): value is number => typeof value === "number");
    const observationCounts = records.map((record) => record.observationCount);
    const recoveryActivations = new Set(
      records
        .filter((record) => record.configurationId === "C_TARGETED_RECOVERY")
        .map((record) => String(record.recoveryActivation)),
    );
    const screeningValues = new Set(
      input.screenings
        .filter((screening) => screening.benchmarkId === benchmarkId)
        .map((screening) => screening.verdict),
    );

    if ((variance(observationCounts) ?? 0) > 4 || (variance(coverageValues) ?? 0) > 0.01) {
      selected.add(benchmarkId);
      reasonsByBenchmark[benchmarkId] = uniqueStrings([
        ...(reasonsByBenchmark[benchmarkId] ?? []),
        "high_run_to_run_variance",
      ]);
    }

    if (recoveryActivations.size > 1) {
      selected.add(benchmarkId);
      reasonsByBenchmark[benchmarkId] = uniqueStrings([
        ...(reasonsByBenchmark[benchmarkId] ?? []),
        "recovery_trigger_variance",
      ]);
    }

    if (screeningValues.has("FAIL") && (screeningValues.has("PASS") || screeningValues.has("PASS WITH OBSERVATION"))) {
      selected.add(benchmarkId);
      reasonsByBenchmark[benchmarkId] = uniqueStrings([
        ...(reasonsByBenchmark[benchmarkId] ?? []),
        "screening_conflict_or_regression",
      ]);
    }
  }

  return {
    benchmarkIds: [...selected].sort((left, right) => left.localeCompare(right)),
    reasonsByBenchmark,
  };
}

function compareConfigurationRecords(
  baselineRecords: ExpandedBaselineRunRecord[],
  targetedRecoveryRecords: ExpandedBaselineRunRecord[],
): ExpandedBaselineBenchmarkClassification {
  if (baselineRecords.length === 0 || targetedRecoveryRecords.length === 0) {
    return "NOT ASSESSABLE";
  }

  const baselinePasses = baselineRecords.filter((record) => record.success).length;
  const recoveryPasses = targetedRecoveryRecords.filter((record) => record.success).length;
  const baselineEnding = baselineRecords.filter((record) => record.endingRetention).length;
  const recoveryEnding = targetedRecoveryRecords.filter((record) => record.endingRetention).length;
  const baselineOrderDefects = baselineRecords.reduce((sum, record) => sum + (record.outOfOrderLocalityCount ?? 0), 0);
  const recoveryOrderDefects = targetedRecoveryRecords.reduce((sum, record) => sum + (record.outOfOrderLocalityCount ?? 0), 0);

  if (recoveryPasses > baselinePasses && recoveryEnding >= baselineEnding && recoveryOrderDefects <= baselineOrderDefects) {
    return recoveryPasses === targetedRecoveryRecords.length ? "CONSISTENT ADVANTAGE" : "PROVISIONAL ADVANTAGE";
  }
  if (recoveryPasses < baselinePasses && recoveryOrderDefects >= baselineOrderDefects) {
    return "CONSISTENT REGRESSION";
  }
  if (recoveryPasses === baselinePasses && recoveryEnding === baselineEnding && recoveryOrderDefects === baselineOrderDefects) {
    return "NO MATERIAL DIFFERENCE";
  }
  return "MIXED / RUN-DEPENDENT";
}

function summarizeRunRecordsByBenchmark(records: ExpandedBaselineRunRecord[]) {
  const benchmarkIds = uniqueStrings(records.map((record) => record.benchmarkId));
  return benchmarkIds.map((benchmarkId) => {
    const benchmarkRecords = records.filter((record) => record.benchmarkId === benchmarkId);
    const baselineRecords = benchmarkRecords.filter((record) => record.configurationId === "A_CURRENT_BASELINE");
    const targetedRecoveryRecords = benchmarkRecords.filter((record) => record.configurationId === "C_TARGETED_RECOVERY");
    return {
      benchmarkId,
      classification: compareConfigurationRecords(baselineRecords, targetedRecoveryRecords),
    };
  });
}

function buildOpaqueComparatorLabel(configurationId: ObservationTopologyConfigurationId, repeatIndex: number): string {
  return `${configurationId.toLowerCase()}_r${String(repeatIndex).padStart(2, "0")}`;
}

export async function collectExpandedBaselineRunRecords(input: {
  samplePlan: ExpandedBaselineSamplePlan;
  runDirectory: string;
}): Promise<ExpandedBaselineRunRecord[]> {
  const sampleById = buildSamplePlanItemIndex(input.samplePlan);
  const summary = await readJson<{ summaries: ObservationTopologyExecutionSummary[] }>(
    path.join(input.runDirectory, "experiment-summary.json"),
  );
  const runId = path.basename(path.resolve(input.runDirectory));
  const records: ExpandedBaselineRunRecord[] = [];

  for (const entry of summary.summaries) {
    const itemDirectory = path.join(
      input.runDirectory,
      "items",
      entry.benchmarkId,
      entry.configurationId,
      `repeat-${String(entry.repeatIndex).padStart(2, "0")}`,
    );
    const diagnostics = await readJson<Record<string, unknown>>(path.join(itemDirectory, "diagnostics.json"));
    const completeness = await readJson<Record<string, unknown> | null>(path.join(itemDirectory, "completeness.json"));
    const attempts = await readJson<Array<Record<string, unknown>>>(path.join(itemDirectory, "attempt-evidence.json"));
    const finalRepresentation = await readJson<unknown>(path.join(itemDirectory, "final-representation.json"));
    const sourceOrderAssembly = await readJson<Record<string, unknown> | null>(
      path.join(itemDirectory, "source-order-assembly.json"),
    ).catch(() => null);
    const internalGaps = await readJson<Array<{ start: number; end: number }>>(
      path.join(itemDirectory, "gap-analysis.json"),
    ).catch(() => []);
    const stagesDirectory = path.join(itemDirectory, "stages");
    const stageFiles = await fs.readdir(stagesDirectory).catch(() => []);
    const sampleItem = sampleById.get(entry.benchmarkId);
    if (!sampleItem) {
      throw new Error(`Benchmark ${entry.benchmarkId} is missing from the expanded sample plan.`);
    }

    const anyAcceptedAttempt = attempts.some((attempt) => attempt.acceptedAttempt === true);
    const anyParsedAttempt = attempts.some((attempt) => attempt.parseStatus === "parsed");
    const possibleTimeout = stageFiles.some((file) => file.includes("recovery_extraction"));
    const recoveryCallCount = stageFiles.filter((file) => file.includes("recovery_extraction")).length;
    const rawGapCount = typeof diagnostics.rawGapCount === "number" ? diagnostics.rawGapCount : null;
    const canonicalGapCount = typeof diagnostics.canonicalPhysicalGapCount === "number"
      ? diagnostics.canonicalPhysicalGapCount
      : null;
    const rawWindowCount = typeof diagnostics.rawRecoveryWindowCount === "number" ? diagnostics.rawRecoveryWindowCount : null;
    const canonicalWindowCount = typeof diagnostics.canonicalRecoveryWindowCount === "number"
      ? diagnostics.canonicalRecoveryWindowCount
      : null;

    records.push({
      runId,
      runDirectory: path.resolve(input.runDirectory),
      benchmarkId: entry.benchmarkId,
      configurationId: entry.configurationId,
      repeatIndex: entry.repeatIndex,
      success: entry.success,
      finalStatus: entry.finalStatus,
      failureReason: entry.failureReason,
      attemptCount: attempts.length,
      timeoutStatus: possibleTimeout && !entry.success ? "possible_timeout" : "none",
      parseability: anyParsedAttempt ? "parsed" : attempts.length > 0 ? "not_parsed" : "unknown",
      guardAcceptance: attempts.length > 0 ? anyAcceptedAttempt : null,
      baselineAdmissionStatus: diagnostics.baselineAdmissionStatus === "accepted" || diagnostics.baselineAdmissionStatus === "rejected_parseable"
        ? diagnostics.baselineAdmissionStatus
        : null,
      rawGapCount,
      canonicalGapCount,
      rawWindowCount,
      canonicalWindowCount,
      recoveryActivation: (canonicalWindowCount ?? 0) > 0,
      recoveryCallCount,
      sceneOrLocalityCount: entry.sceneOrRegionCount,
      observationCount: entry.observationCount,
      earliestRepresentedPosition: typeof diagnostics.earliestRepresentedPosition === "number"
        ? diagnostics.earliestRepresentedPosition
        : null,
      latestRepresentedPosition: typeof diagnostics.latestRepresentedPosition === "number"
        ? diagnostics.latestRepresentedPosition
        : null,
      uncoveredPrefix: typeof diagnostics.uncoveredPrefix === "number" ? diagnostics.uncoveredPrefix : null,
      uncoveredTail: typeof diagnostics.uncoveredTail === "number" ? diagnostics.uncoveredTail : null,
      internalUncoveredRegions: Array.isArray(diagnostics.internalGaps)
        ? diagnostics.internalGaps as Array<{ start: number; end: number }>
        : internalGaps,
      lateSectionRetention: entry.lateSectionRetention,
      endingRetention: entry.endingRetention,
      duplicateCandidatePairs: typeof diagnostics.duplicateCandidatePairs === "number"
        ? diagnostics.duplicateCandidatePairs
        : null,
      confirmedDuplicatesRemoved: typeof diagnostics.confirmedDuplicatesRemoved === "number"
        ? diagnostics.confirmedDuplicatesRemoved
        : null,
      repeatedSourceSpanRealizationCount: typeof diagnostics.repeatedSourceSpanRealizationCount === "number"
        ? diagnostics.repeatedSourceSpanRealizationCount
        : (typeof sourceOrderAssembly?.repeatedSourceSpanRealizationCount === "number"
          ? sourceOrderAssembly.repeatedSourceSpanRealizationCount
          : null),
      outOfOrderLocalityCount: typeof diagnostics.outOfOrderLocalityCount === "number"
        ? diagnostics.outOfOrderLocalityCount
        : (typeof sourceOrderAssembly?.outOfOrderLocalityCount === "number"
          ? sourceOrderAssembly.outOfOrderLocalityCount
          : null),
      outOfOrderUnitCount: typeof diagnostics.outOfOrderUnitCount === "number"
        ? diagnostics.outOfOrderUnitCount
        : (typeof sourceOrderAssembly?.outOfOrderUnitCount === "number"
          ? sourceOrderAssembly.outOfOrderUnitCount
          : null),
      latencyMs: entry.elapsedMs,
      tokenUsageTotal: entry.tokenUsageTotal,
      modelCallCount: deriveModelCallCount({
        attemptsLength: attempts.length,
        retryOrStageCount: typeof entry.retryOrStageCount === "number" ? entry.retryOrStageCount : null,
        stageFileCount: stageFiles.length,
      }),
      artifactCompleteness: finalRepresentation === null ? "partial" : "complete",
      sourceCoverageRatio: typeof completeness?.sourceCoverageRatio === "number" ? completeness.sourceCoverageRatio : null,
      structuralCompleteness: completeness?.structuralCompleteness === "complete" || completeness?.structuralCompleteness === "partial"
        ? completeness.structuralCompleteness
        : "incomplete",
      sourceLengthClass: sampleItem.sourceLengthClass,
      failureClasses: [...sampleItem.failureClasses],
      endingSensitive: sampleItem.endingSensitive,
    });
  }

  return records.sort((left, right) => {
    const benchmarkOrder = left.benchmarkId.localeCompare(right.benchmarkId);
    if (benchmarkOrder !== 0) {
      return benchmarkOrder;
    }
    const configOrder = left.configurationId.localeCompare(right.configurationId);
    if (configOrder !== 0) {
      return configOrder;
    }
    return left.repeatIndex - right.repeatIndex;
  });
}

function buildStabilitySummary(records: ExpandedBaselineRunRecord[]) {
  const benchmarkIds = uniqueStrings(records.map((record) => record.benchmarkId));
  return benchmarkIds.flatMap((benchmarkId) => {
    const benchmarkRecords = records.filter((record) => record.benchmarkId === benchmarkId);
    return uniqueStrings(benchmarkRecords.map((record) => record.configurationId)).map((configurationId) => {
      const scoped = benchmarkRecords.filter((record) => record.configurationId === configurationId);
      return {
        benchmarkId,
        configurationId,
        successRate: scoped.filter((record) => record.success).length / scoped.length,
        acceptedCandidateRate: scoped.filter((record) => record.guardAcceptance === true).length / scoped.length,
        sceneCountVariance: variance(scoped.map((record) => record.sceneOrLocalityCount)),
        observationCountVariance: variance(scoped.map((record) => record.observationCount)),
        coverageVariance: variance(
          scoped
            .map((record) => record.sourceCoverageRatio)
            .filter((value): value is number => typeof value === "number"),
        ),
        endingRetentionVariance: variance(scoped.map((record) => Number(record.endingRetention))),
        recoveryTriggerVariance: variance(scoped.map((record) => Number(record.recoveryActivation))),
        localityOrderVariance: variance(scoped.map((record) => record.outOfOrderLocalityCount ?? 0)),
        semanticVarianceProxy: variance(scoped.map((record) => record.observationCount + record.sceneOrLocalityCount)),
      };
    });
  });
}

function buildRecoveryStability(records: ExpandedBaselineRunRecord[]) {
  const targeted = records.filter((record) => record.configurationId === "C_TARGETED_RECOVERY");
  return uniqueStrings(targeted.map((record) => record.benchmarkId)).map((benchmarkId) => {
    const scoped = targeted.filter((record) => record.benchmarkId === benchmarkId);
    return {
      benchmarkId,
      recoveryActivationRate: scoped.filter((record) => record.recoveryActivation).length / scoped.length,
      canonicalGapCountValues: uniqueStrings(scoped.map((record) => String(record.canonicalGapCount ?? "null"))),
      canonicalWindowCountValues: uniqueStrings(scoped.map((record) => String(record.canonicalWindowCount ?? "null"))),
      repeatedSourceSpanValues: uniqueStrings(scoped.map((record) => String(record.repeatedSourceSpanRealizationCount ?? "null"))),
      appendedLayerObservation: scoped.some((record) => (record.repeatedSourceSpanRealizationCount ?? 0) > 0),
      recoveredMajorPhaseProxyStable: (variance(scoped.map((record) => record.observationCount)) ?? 0) <= 9,
    };
  });
}

function buildBaselineDependencyAnalysis(records: ExpandedBaselineRunRecord[]) {
  const targeted = records.filter((record) => record.configurationId === "C_TARGETED_RECOVERY");
  return uniqueStrings(targeted.map((record) => record.benchmarkId)).map((benchmarkId) => {
    const scoped = targeted.filter((record) => record.benchmarkId === benchmarkId);
    return {
      benchmarkId,
      baselineAdmissionStatuses: uniqueStrings(scoped.map((record) => record.baselineAdmissionStatus ?? "null")),
      rawGapCountValues: uniqueStrings(scoped.map((record) => String(record.rawGapCount ?? "null"))),
      canonicalGapCountValues: uniqueStrings(scoped.map((record) => String(record.canonicalGapCount ?? "null"))),
      provisionalBaselineAdmissionObserved: scoped.some((record) => record.baselineAdmissionStatus === "rejected_parseable"),
      consistencyOfSuccess: uniqueStrings(scoped.map((record) => String(record.success))).length === 1,
      consistencyOfRecoveryActivation: uniqueStrings(scoped.map((record) => String(record.recoveryActivation))).length === 1,
    };
  });
}

function buildMetricSummary(records: ExpandedBaselineRunRecord[]) {
  return {
    runCount: records.length,
    byConfiguration: uniqueStrings(records.map((record) => record.configurationId)).map((configurationId) => {
      const scoped = records.filter((record) => record.configurationId === configurationId);
      return {
        configurationId,
        meanCoverage: mean(scoped
          .map((record) => record.sourceCoverageRatio)
          .filter((value): value is number => typeof value === "number")),
        meanObservationCount: mean(scoped.map((record) => record.observationCount)),
        meanLocalityCount: mean(scoped.map((record) => record.sceneOrLocalityCount)),
        endingRetentionRate: scoped.filter((record) => record.endingRetention).length / scoped.length,
        lateSectionRetentionRate: scoped.filter((record) => record.lateSectionRetention).length / scoped.length,
      };
    }),
  };
}

function buildFailureSummary(records: ExpandedBaselineRunRecord[]) {
  return {
    failureCount: records.filter((record) => !record.success).length,
    timeoutCount: records.filter((record) => record.timeoutStatus === "possible_timeout").length,
    failuresByConfiguration: uniqueStrings(records.map((record) => record.configurationId)).map((configurationId) => {
      const scoped = records.filter((record) => record.configurationId === configurationId);
      return {
        configurationId,
        failedRuns: scoped.filter((record) => !record.success).length,
        timedOutRuns: scoped.filter((record) => record.timeoutStatus === "possible_timeout").length,
        failureReasons: uniqueStrings(
          scoped
            .map((record) => record.failureReason)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      };
    }),
  };
}

function buildCostLatencySummary(records: ExpandedBaselineRunRecord[]) {
  const configurationIds = uniqueStrings(records.map((record) => record.configurationId));
  const byConfiguration = configurationIds.map((configurationId) => {
    const scoped = records.filter((record) => record.configurationId === configurationId);
    const tokenValues = scoped
      .map((record) => record.tokenUsageTotal)
      .filter((value): value is number => typeof value === "number");
    const latencyValues = scoped.map((record) => record.latencyMs);
    return {
      configurationId,
      totalModelCalls: scoped.reduce((sum, record) => sum + record.modelCallCount, 0),
      meanModelCallsPerItem: mean(scoped.map((record) => record.modelCallCount)),
      recoveryActivationRate: configurationId === "C_TARGETED_RECOVERY"
        ? scoped.filter((record) => record.recoveryActivation).length / scoped.length
        : 0,
      totalTokens: tokenValues.reduce((sum, value) => sum + value, 0),
      meanTokens: mean(tokenValues),
      medianTokens: median(tokenValues),
      totalLatencyMs: latencyValues.reduce((sum, value) => sum + value, 0),
      meanLatencyMs: mean(latencyValues),
      medianLatencyMs: median(latencyValues),
      timeoutCount: scoped.filter((record) => record.timeoutStatus === "possible_timeout").length,
      failureCount: scoped.filter((record) => !record.success).length,
      successfulFinalCandidateRate: scoped.filter((record) => record.success).length / scoped.length,
    };
  });

  const strata = uniqueStrings(records.flatMap((record) => record.failureClasses));
  const byStratum = strata.map((stratum) => ({
    stratum,
    configurations: configurationIds.map((configurationId) => {
      const scoped = records.filter((record) =>
        record.configurationId === configurationId && record.failureClasses.includes(stratum as ExpandedBaselineFailureClass));
      const tokens = scoped
        .map((record) => record.tokenUsageTotal)
        .filter((value): value is number => typeof value === "number");
      return {
        configurationId,
        runCount: scoped.length,
        meanTokens: mean(tokens),
        meanLatencyMs: mean(scoped.map((record) => record.latencyMs)),
        recoveryActivationRate: configurationId === "C_TARGETED_RECOVERY" && scoped.length > 0
          ? scoped.filter((record) => record.recoveryActivation).length / scoped.length
          : 0,
      };
    }),
  }));

  return {
    byConfiguration,
    byStratum,
  };
}

async function allocateExpandedBaselineRunGroupDirectory(input: {
  outputRoot: string;
  selectionLabel: string;
}) {
  const repositoryState = await readObservationBenchmarkRepositoryState();
  const startedAt = new Date();
  const resolvedOutputRoot = path.resolve(input.outputRoot);
  await fs.mkdir(resolvedOutputRoot, { recursive: true });

  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const runGroupId = buildObservationBenchmarkRunId({
      startedAt,
      shortRepositorySha: repositoryState.shortCommitSha,
      selectionLabel: input.selectionLabel,
      attempt,
    });
    const runGroupDirectory = path.join(resolvedOutputRoot, runGroupId);
    try {
      await fs.mkdir(runGroupDirectory);
      return { runGroupId, runGroupDirectory, repositoryState, startedAt };
    } catch (error) {
      const errorRecord = error as NodeJS.ErrnoException;
      if (errorRecord.code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new Error("Unable to allocate a unique expanded-baseline run group directory.");
}

function buildBlindReviewSpec(input: {
  deepReviewSelection: ExpandedBaselineDeepReviewSelection;
  baselineRunDirectory: string;
  targetedRecoveryRunDirectory: string;
}): ObservationTopologyBlindReviewSetSpec {
  return {
    reviewLabel: "expanded-targeted-recovery-baseline",
    benchmarks: input.deepReviewSelection.benchmarkIds.map((benchmarkId) => ({
      benchmarkId,
      candidateSources: [
        ...[1, 2, 3].map((repeatIndex) => ({
          runDirectory: input.baselineRunDirectory,
          benchmarkId,
          repeatIndex,
          configurationId: "A_CURRENT_BASELINE" as const,
          comparatorLabel: buildOpaqueComparatorLabel("A_CURRENT_BASELINE", repeatIndex),
        })),
        ...[1, 2, 3].map((repeatIndex) => ({
          runDirectory: input.targetedRecoveryRunDirectory,
          benchmarkId,
          repeatIndex,
          configurationId: "C_TARGETED_RECOVERY" as const,
          comparatorLabel: buildOpaqueComparatorLabel("C_TARGETED_RECOVERY", repeatIndex),
        })),
      ],
    })),
  };
}

export async function refreshExpandedTargetedRecoveryBaselineArtifacts(input: {
  runGroupDirectory: string;
  baselineRunDirectory: string;
  baselineRunId: string;
  targetedRecoveryRunDirectory: string;
  targetedRecoveryRunId: string;
  reviewSetDirectory?: string;
}): Promise<ExpandedBaselineAggregationRefreshResult> {
  const runGroupDirectory = path.resolve(input.runGroupDirectory);
  const runManifest = await readJson<{
    runGroupId: string;
  }>(path.join(runGroupDirectory, "run-manifest.json"));
  const samplePlan = await readJson<ExpandedBaselineSamplePlan>(
    path.join(runGroupDirectory, "sample-plan.json"),
  );

  const records = [
    ...await collectExpandedBaselineRunRecords({
      samplePlan,
      runDirectory: path.resolve(input.baselineRunDirectory),
    }),
    ...await collectExpandedBaselineRunRecords({
      samplePlan,
      runDirectory: path.resolve(input.targetedRecoveryRunDirectory),
    }),
  ];
  const screenings = records.map((record) => screenExpandedBaselineRun(record));
  const deepReviewSelection = selectDeepReviewBenchmarks({
    samplePlan,
    records,
    screenings,
  });
  const discrepancyLedger = detectMeasurementDiscrepancies({
    records,
    screenings,
  });
  const reviewSet = input.reviewSetDirectory
    ? {
        reviewSetDirectory: path.resolve(input.reviewSetDirectory),
        reviewSetId: path.basename(path.resolve(input.reviewSetDirectory)),
      }
    : await generateObservationTopologyBlindReviewSet({
        outputRoot: ".validation/observation-topology-experiments/review-sets",
        spec: buildBlindReviewSpec({
          deepReviewSelection,
          baselineRunDirectory: path.resolve(input.baselineRunDirectory),
          targetedRecoveryRunDirectory: path.resolve(input.targetedRecoveryRunDirectory),
        }),
      });

  await writeJsonAtomic(path.join(runGroupDirectory, "all-run-screening.json"), screenings);
  await writeJsonAtomic(path.join(runGroupDirectory, "stability-summary.json"), buildStabilitySummary(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "recovery-stability.json"), buildRecoveryStability(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "baseline-dependency-analysis.json"), buildBaselineDependencyAnalysis(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "metric-summary.json"), buildMetricSummary(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "measurement-discrepancy-ledger.json"), discrepancyLedger);
  await writeJsonAtomic(path.join(runGroupDirectory, "cost-latency-summary.json"), buildCostLatencySummary(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "failure-summary.json"), buildFailureSummary(records));
  await writeJsonAtomic(path.join(runGroupDirectory, "deep-review-selection.json"), deepReviewSelection);
  await writeJsonAtomic(
    path.join(runGroupDirectory, "blind-review-index.json"),
    await readJson(path.join(reviewSet.reviewSetDirectory, "blind-review-index.json")),
  );
  await writeJsonAtomic(
    path.join(runGroupDirectory, "blind-review-anonymization-map.json"),
    await readJson(path.join(reviewSet.reviewSetDirectory, "blind-review-anonymization-map.json")),
  );
  await writeJsonAtomic(path.join(runGroupDirectory, "expanded-baseline-summary.json"), {
    runGroupId: runManifest.runGroupId,
    selectedBenchmarks: samplePlan.benchmarks.map((item) => item.benchmarkId),
    sampleSize: samplePlan.benchmarks.length,
    baselineRunId: input.baselineRunId,
    targetedRecoveryRunId: input.targetedRecoveryRunId,
    deepReviewBenchmarkIds: deepReviewSelection.benchmarkIds,
    benchmarkDispositions: summarizeRunRecordsByBenchmark(records),
    discrepancyCount: discrepancyLedger.length,
    failureCount: records.filter((record) => !record.success).length,
    refreshedAt: new Date().toISOString(),
  });

  return {
    runGroupId: runManifest.runGroupId,
    runGroupDirectory,
    reviewSetId: reviewSet.reviewSetId,
    reviewSetDirectory: reviewSet.reviewSetDirectory,
  };
}

export async function runExpandedTargetedRecoveryBaselineExperiment(): Promise<ExpandedBaselineExecutionResult> {
  const samplePlan = await buildDefaultExpandedBaselineSamplePlan();
  validateExpandedBaselineSamplePlan(samplePlan);
  const matrix = buildExpandedBaselineRunMatrix({
    samplePlan,
    repeatPerConfiguration: 3,
    configurationIds: ["A_CURRENT_BASELINE", "C_TARGETED_RECOVERY"],
  });
  const allocation = await allocateExpandedBaselineRunGroupDirectory({
    outputRoot: OBSERVATION_EXPANDED_BASELINE_OUTPUT_ROOT,
    selectionLabel: `subset-${samplePlan.benchmarks.length}-A-vs-C-r3`,
  });

  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "sample-plan.json"), samplePlan);
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "run-matrix.json"), matrix);
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "run-manifest.json"), {
    runGroupId: allocation.runGroupId,
    generatedAt: allocation.startedAt.toISOString(),
    benchmarkIds: samplePlan.benchmarks.map((item) => item.benchmarkId),
    configurationIds: ["A_CURRENT_BASELINE", "C_TARGETED_RECOVERY"],
    repeatPerConfiguration: 3,
    repositoryState: allocation.repositoryState,
    sampleVersion: samplePlan.sampleVersion,
  });

  const benchmarkIds = samplePlan.benchmarks.map((item) => item.benchmarkId);
  const baselineRun = await runObservationTopologyExperiment({
    benchmarkIds,
    benchmarkClass: null,
    configurationIds: ["A_CURRENT_BASELINE"],
    repeat: 3,
    outputRoot: ".validation/observation-topology-experiments/runs",
  });
  const targetedRecoveryRun = await runObservationTopologyExperiment({
    benchmarkIds,
    benchmarkClass: null,
    configurationIds: ["C_TARGETED_RECOVERY"],
    repeat: 3,
    outputRoot: ".validation/observation-topology-experiments/runs",
  });

  const records = [
    ...await collectExpandedBaselineRunRecords({
      samplePlan,
      runDirectory: baselineRun.artifactDirectory,
    }),
    ...await collectExpandedBaselineRunRecords({
      samplePlan,
      runDirectory: targetedRecoveryRun.artifactDirectory,
    }),
  ];
  const screenings = records.map((record) => screenExpandedBaselineRun(record));
  const deepReviewSelection = selectDeepReviewBenchmarks({
    samplePlan,
    records,
    screenings,
  });
  const discrepancyLedger = detectMeasurementDiscrepancies({
    records,
    screenings,
  });
  const blindReviewSpec = buildBlindReviewSpec({
    deepReviewSelection,
    baselineRunDirectory: baselineRun.artifactDirectory,
    targetedRecoveryRunDirectory: targetedRecoveryRun.artifactDirectory,
  });
  const reviewSet = await generateObservationTopologyBlindReviewSet({
    outputRoot: ".validation/observation-topology-experiments/review-sets",
    spec: blindReviewSpec,
  });

  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "all-run-screening.json"), screenings);
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "stability-summary.json"), buildStabilitySummary(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "recovery-stability.json"), buildRecoveryStability(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "baseline-dependency-analysis.json"), buildBaselineDependencyAnalysis(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "metric-summary.json"), buildMetricSummary(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "measurement-discrepancy-ledger.json"), discrepancyLedger);
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "cost-latency-summary.json"), buildCostLatencySummary(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "failure-summary.json"), buildFailureSummary(records));
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "deep-review-selection.json"), deepReviewSelection);
  await writeJsonAtomic(
    path.join(allocation.runGroupDirectory, "blind-review-index.json"),
    await readJson(path.join(reviewSet.reviewSetDirectory, "blind-review-index.json")),
  );
  await writeJsonAtomic(
    path.join(allocation.runGroupDirectory, "blind-review-anonymization-map.json"),
    await readJson(path.join(reviewSet.reviewSetDirectory, "blind-review-anonymization-map.json")),
  );
  await writeJsonAtomic(path.join(allocation.runGroupDirectory, "expanded-baseline-summary.json"), {
    runGroupId: allocation.runGroupId,
    selectedBenchmarks: benchmarkIds,
    sampleSize: benchmarkIds.length,
    baselineRunId: baselineRun.runId,
    targetedRecoveryRunId: targetedRecoveryRun.runId,
    deepReviewBenchmarkIds: deepReviewSelection.benchmarkIds,
    benchmarkDispositions: summarizeRunRecordsByBenchmark(records),
    discrepancyCount: discrepancyLedger.length,
    failureCount: records.filter((record) => !record.success).length,
  });

  return {
    runGroupId: allocation.runGroupId,
    runGroupDirectory: allocation.runGroupDirectory,
    baselineRun,
    targetedRecoveryRun,
    reviewSetId: reviewSet.reviewSetId,
    reviewSetDirectory: reviewSet.reviewSetDirectory,
    selectedBenchmarks: benchmarkIds,
  };
}
