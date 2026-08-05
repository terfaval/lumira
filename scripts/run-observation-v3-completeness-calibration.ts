import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";

import {
  analyzeObservationCompleteness,
  analyzeObservationCompletenessPreCalibration,
} from "@/src/cognition/observation-v3/completeness-analysis";
import { stableStringify } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import { runObservationBenchmarks } from "@/src/cognition/observation/benchmark/observation-benchmark-runner";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import {
  buildAttemptReviewIndex,
  buildCompletenessCalibrationPlan,
  buildPreCalibrationRuleFreeze,
} from "@/src/cognition/observation-v3/completeness-analysis/calibration";

const CALIBRATION_OUTPUT_ROOT = ".validation/observation-v3/completeness-calibration";
const REPEAT_COUNT = 3;

interface CalibrationCliArgs {
  outputRoot?: string;
  existingRoot?: string;
}

interface AttemptReplayRecord {
  benchmarkId: string;
  repeat: number;
  runId: string;
  artifactDirectory: string;
  attemptNumber: number;
  acceptedByV2: boolean;
  candidateHash: string | null;
  sourceHash: string | null;
  preCalibration: {
    adequacy: string;
    recoveryDisposition: string;
    lateStatus: string;
    endingStatus: string;
    canonicalGapCount: number;
    diagnosticReasons: string[];
  } | null;
  postCalibration: {
    adequacy: string;
    recoveryDisposition: string;
    lateStatus: string;
    endingStatus: string;
    canonicalGapCount: number;
    diagnosticReasons: string[];
  } | null;
  status: "replayed" | "candidate_unavailable" | "report_unavailable";
}

function parseCliArgs(argv: string[]): CalibrationCliArgs {
  const args: CalibrationCliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (entry === "--output-root") {
      args.outputRoot = argv[index + 1];
      index += 1;
      continue;
    }

    if (entry === "--existing-root") {
      args.existingRoot = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function timestampLabel(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function mkdirp(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function writeJson(targetPath: string, value: unknown): Promise<void> {
  await mkdirp(path.dirname(targetPath));
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson<T>(targetPath: string): Promise<T> {
  return JSON.parse(await fs.readFile(targetPath, "utf8")) as T;
}

async function loadCorpusDreamTexts(): Promise<Record<string, string>> {
  const parsed = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });

  return Object.fromEntries(parsed.items.map((item) => [item.benchmarkId, item.dreamText]));
}

function buildCalibrationRoot(baseRoot: string): string {
  return path.join(baseRoot, `${timestampLabel(new Date())}-obs-v3-completeness-calibration`);
}

function buildReplaySummary(report: ReturnType<typeof analyzeObservationCompleteness> | ReturnType<typeof analyzeObservationCompletenessPreCalibration>) {
  return {
    adequacy: report.adequacy,
    recoveryDisposition: report.recoveryRecommendation.disposition,
    lateStatus: report.lateRetention.status,
    endingStatus: report.endingRetention.status,
    canonicalGapCount: report.gaps.canonicalGapCount,
    diagnosticReasons: report.diagnosticReasons,
  };
}

async function readAttemptDirectories(itemDirectory: string): Promise<string[]> {
  const attemptsDirectory = path.join(itemDirectory, "attempts");
  const entries = await fs.readdir(attemptsDirectory, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(attemptsDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

async function replayAttemptReports(input: {
  benchmarkId: string;
  dreamText: string;
  itemDirectory: string;
  runId: string;
  artifactDirectory: string;
  repeat: number;
}): Promise<AttemptReplayRecord[]> {
  const attemptDirectories = await readAttemptDirectories(input.itemDirectory);
  const itemSummary = await readJson<{ acceptedAttempt: number | null }>(path.join(input.itemDirectory, "item-summary.json"));

  const records: AttemptReplayRecord[] = [];
  for (const attemptDirectory of attemptDirectories) {
    const attemptMetadata = await readJson<{ attemptNumber: number }>(path.join(attemptDirectory, "attempt-metadata.json"));
    const bundlePath = path.join(attemptDirectory, "candidate-bundle.json");
    const bundleExists = await fs.access(bundlePath).then(() => true).catch(() => false);

    if (!bundleExists) {
      records.push({
        benchmarkId: input.benchmarkId,
        repeat: input.repeat,
        runId: input.runId,
        artifactDirectory: input.artifactDirectory,
        attemptNumber: attemptMetadata.attemptNumber,
        acceptedByV2: itemSummary.acceptedAttempt === attemptMetadata.attemptNumber,
        candidateHash: null,
        sourceHash: null,
        preCalibration: null,
        postCalibration: null,
        status: "candidate_unavailable",
      });
      continue;
    }

    const bundle = await readJson<ObservationV2Bundle>(bundlePath);
    const preCalibrationReport = analyzeObservationCompletenessPreCalibration({
      dreamText: input.dreamText,
      bundle,
    });
    const postCalibrationReport = analyzeObservationCompleteness({
      dreamText: input.dreamText,
      bundle,
    });

    records.push({
      benchmarkId: input.benchmarkId,
      repeat: input.repeat,
      runId: input.runId,
      artifactDirectory: input.artifactDirectory,
      attemptNumber: attemptMetadata.attemptNumber,
      acceptedByV2: itemSummary.acceptedAttempt === attemptMetadata.attemptNumber,
      candidateHash: preCalibrationReport.candidateIdentity.candidateHash,
      sourceHash: preCalibrationReport.sourceIdentity.sourceHash,
      preCalibration: buildReplaySummary(preCalibrationReport),
      postCalibration: buildReplaySummary(postCalibrationReport),
      status: "replayed",
    });
  }

  return records;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const outputBaseRoot = args.outputRoot ?? CALIBRATION_OUTPUT_ROOT;
  const calibrationRoot = args.existingRoot ?? buildCalibrationRoot(outputBaseRoot);
  const benchmarkOutputRoot = path.join(calibrationRoot, "benchmark-runs");
  const corpusDreamTexts = await loadCorpusDreamTexts();
  const plan = buildCompletenessCalibrationPlan();
  const ruleFreeze = buildPreCalibrationRuleFreeze();

  await mkdirp(calibrationRoot);
  await writeJson(path.join(calibrationRoot, "sample-plan.json"), plan);
  await writeJson(path.join(calibrationRoot, "rule-calibration-plan.json"), {
    frozenPreCalibrationRules: ruleFreeze,
    repeatCount: REPEAT_COUNT,
    measurementJudgmentSeparation: true,
  });

  const runRecords: Array<{
    benchmarkId: string;
    repeat: number;
    runId: string;
    artifactDirectory: string;
    runStatus: string | null;
    successCount: number;
    failureCount: number;
  }> = [];

  if (args.existingRoot) {
    const runDirectories = (await fs.readdir(benchmarkOutputRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(benchmarkOutputRoot, entry.name))
      .sort((left, right) => left.localeCompare(right));

    const groupedByBenchmark = new Map<string, string[]>();
    for (const directory of runDirectories) {
      const itemDirectories = await fs.readdir(path.join(directory, "items"), { withFileTypes: true }).catch(() => []);
      for (const itemDirectory of itemDirectories) {
        if (!itemDirectory.isDirectory()) {
          continue;
        }

        const benchmarkId = itemDirectory.name.toUpperCase();
        groupedByBenchmark.set(benchmarkId, [...(groupedByBenchmark.get(benchmarkId) ?? []), directory]);
      }
    }

    for (const benchmark of plan.benchmarks) {
      const benchmarkDirectories = (groupedByBenchmark.get(benchmark.benchmarkId) ?? []).sort((left, right) => left.localeCompare(right));
      benchmarkDirectories.forEach((directory, index) => {
        runRecords.push({
          benchmarkId: benchmark.benchmarkId,
          repeat: index + 1,
          runId: path.basename(directory),
          artifactDirectory: directory,
          runStatus: null,
          successCount: 0,
          failureCount: 0,
        });
      });
    }
  } else {
    for (const benchmark of plan.benchmarks) {
      const benchmarkId = benchmark.benchmarkId;
      for (let repeat = 1; repeat <= REPEAT_COUNT; repeat += 1) {
        const result = await runObservationBenchmarks({
          benchmarkIds: [benchmarkId],
          artifactOutputRoot: benchmarkOutputRoot,
          cliArgs: ["--id", benchmarkId, "--calibration-repeat", String(repeat)],
        });

        runRecords.push({
          benchmarkId,
          repeat,
          runId: result.runId ?? `${benchmarkId}-repeat-${repeat}`,
          artifactDirectory: result.artifactDirectory ?? "",
          runStatus: result.runStatus ?? null,
          successCount: result.successCount,
          failureCount: result.failureCount,
        });
      }
    }
  }

  const attemptReplays: AttemptReplayRecord[] = [];
  for (const run of runRecords) {
    if (!run.artifactDirectory) {
      continue;
    }

    const itemDirectory = path.join(run.artifactDirectory, "items", run.benchmarkId);
    const dreamText = corpusDreamTexts[run.benchmarkId];
    if (!dreamText) {
      continue;
    }

    attemptReplays.push(...await replayAttemptReports({
      benchmarkId: run.benchmarkId,
      dreamText,
      itemDirectory,
      runId: run.runId,
      artifactDirectory: run.artifactDirectory,
      repeat: run.repeat,
    }));
  }

  const reviewIndex = buildAttemptReviewIndex(
    runRecords.map((run) => ({
      phase: "post",
      benchmarkId: run.benchmarkId,
      runId: run.runId,
      repeatIndex: run.repeat,
      attempts: attemptReplays
        .filter((attempt) => attempt.runId === run.runId)
        .map((attempt) => ({
          attemptNumber: attempt.attemptNumber,
          candidateHash: attempt.candidateHash,
          sourceHash: attempt.sourceHash ?? "",
        })),
    })),
  );
  await writeJson(path.join(calibrationRoot, "attempt-review-index.json"), reviewIndex);

  await writeJson(path.join(calibrationRoot, "pre-vs-post-calibration.json"), {
    calibrationRoot,
    benchmarkRuns: runRecords,
    attempts: attemptReplays,
  });

  await writeJson(path.join(calibrationRoot, "measurement-validation.json"), {
    attempts: attemptReplays.map((attempt) => ({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      candidateHash: attempt.candidateHash,
      sourceHash: attempt.sourceHash,
      preCalibration: attempt.preCalibration,
      postCalibration: attempt.postCalibration,
    })),
  });

  await writeJson(path.join(calibrationRoot, "human-semantic-review.json"), {
    status: "pending_manual_review",
    procedure: "Blind review should use source text and preserved candidate bundles before consulting pre/post classifications.",
    attempts: attemptReplays.map((attempt) => ({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      attemptNumber: attempt.attemptNumber,
      runId: attempt.runId,
      acceptedByV2: attempt.acceptedByV2,
      semanticVerdict: null,
      confidence: null,
      decisiveEvidence: [],
    })),
  });

  await writeJson(path.join(calibrationRoot, "misclassification-analysis.json"), {
    status: "pending_review_classification",
    attempts: attemptReplays.map((attempt) => ({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      attemptNumber: attempt.attemptNumber,
      preCalibrationAdequacy: attempt.preCalibration?.adequacy ?? null,
      postCalibrationAdequacy: attempt.postCalibration?.adequacy ?? null,
      rootCause: null,
      notes: null,
    })),
  });

  await writeJson(path.join(calibrationRoot, "v2-v3-human-comparison.json"), {
    status: "pending_semantic_review_join",
    attempts: attemptReplays.map((attempt) => ({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      attemptNumber: attempt.attemptNumber,
      acceptedByV2: attempt.acceptedByV2,
      preCalibrationAdequacy: attempt.preCalibration?.adequacy ?? null,
      postCalibrationAdequacy: attempt.postCalibration?.adequacy ?? null,
      semanticVerdict: null,
    })),
  });

  await writeJson(path.join(calibrationRoot, "calibration-manifest.json"), {
    generatedAt: new Date().toISOString(),
    calibrationRoot,
    benchmarkOutputRoot,
    repeatCount: REPEAT_COUNT,
    benchmarkIds: plan.benchmarks.map((benchmark) => benchmark.benchmarkId),
    frozenPreCalibrationRules: ruleFreeze,
    benchmarkRuns: runRecords,
  });

  await writeJson(path.join(calibrationRoot, "calibration-summary.json"), {
    generatedAt: new Date().toISOString(),
    benchmarkCount: plan.benchmarks.length,
    repeatCount: REPEAT_COUNT,
    totalScheduledRuns: plan.benchmarks.length * REPEAT_COUNT,
    completedRuns: runRecords.length,
    runRecords,
  });

  console.log(`Calibration root: ${calibrationRoot}`);
  console.log(`Benchmark runs: ${runRecords.length}`);
  console.log(`Replay records: ${attemptReplays.length}`);
  console.log(stableStringify({
    calibrationRoot,
    benchmarkRuns: runRecords.length,
    replayRecords: attemptReplays.length,
  }));
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
