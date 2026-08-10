import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
  type ParsedObservationBenchmarkCorpus,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  runObservationV3ShadowPipeline,
  type ObservationV3ShadowPipelineResult,
} from "@/src/cognition/observation-v3/pipeline";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";

export const DEFAULT_OBSERVATION_V3_RUNTIME_PERF_OUTPUT_ROOT =
  ".validation/observation-v3/runtime-perf-measurement";

export const OBSERVATION_V3_RUNTIME_PERF_CASE_IDS = [
  "OBS-A-002",
  "OBS-C-003",
  "OBS-E-002",
  "OBS-H-002",
] as const;

export type ObservationV3RuntimePerfCaseId = typeof OBSERVATION_V3_RUNTIME_PERF_CASE_IDS[number];

export interface ObservationV3RuntimePerfStageTiming {
  stage:
    | "source_analysis"
    | "descriptive_extraction"
    | "initial_completeness"
    | "supplemental_realization"
    | "memory_composition"
    | "final_completeness"
    | "memory_realization"
    | "authority_admission";
  status: "success" | "failed" | "skipped";
  executionMode: "native_deterministic" | "provider_backed" | "preserved_replay" | "skipped";
  startedAt: string | null;
  completedAt: string | null;
  latencyMs: number | null;
}

interface ObservationV3RuntimePerfProviderAttemptSummary {
  sourceIdentity: string;
  attemptIdentity: string;
  targetId: string | null;
  attemptNumber: number;
  retryParentAttemptIdentity: string | null;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  latencyMs: number | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  } | null;
}

interface ObservationV3RuntimePerfProviderStageBreakdown {
  executed: boolean;
  callCount: number;
  retryCount: number;
  totalLatencyMs: number;
  totalTokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  } | null;
  attempts: ObservationV3RuntimePerfProviderAttemptSummary[];
}

export interface ObservationV3RuntimePerfCaseResult {
  benchmarkId: ObservationV3RuntimePerfCaseId;
  sourceLength: number;
  startedAt: string;
  completedAt: string;
  totalLatencyMs: number;
  pipelineCompletionStatus: ObservationV3ShadowPipelineResult["summary"]["pipelineCompletionStatus"];
  governanceDisposition: string | null;
  recoveryDisposition: string | null;
  finalAdequacy: string | null;
  admissionDisposition: string | null;
  supplementalExecuted: boolean;
  stageTimings: ObservationV3RuntimePerfStageTiming[];
  providerBreakdown: {
    descriptiveExtraction: ObservationV3RuntimePerfProviderStageBreakdown;
    supplementalRealization: ObservationV3RuntimePerfProviderStageBreakdown;
  };
  pipelineResult: ObservationV3ShadowPipelineResult;
  providerEvidence: {
    descriptiveExtraction: DescriptiveExtractionProviderEvidence[];
    supplementalRealization: SupplementalRealizationProviderEvidence[];
  };
}

export interface ObservationV3RuntimePerfMeasurementResult {
  measurementId: string;
  measurementRoot: string;
  corpusPath: string;
  selectedCaseIds: ObservationV3RuntimePerfCaseId[];
  cases: ObservationV3RuntimePerfCaseResult[];
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function timestampLabel(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
    "T",
    date.getUTCHours().toString().padStart(2, "0"),
    date.getUTCMinutes().toString().padStart(2, "0"),
    date.getUTCSeconds().toString().padStart(2, "0"),
    "Z",
  ].join("");
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortForJson(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortForJson(entry)]),
    );
  }

  return value;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(sortForJson(value), null, 2)}\n`, "utf8");
}

function sumNullable(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function toNullableNumber(value: number): number | null {
  return value > 0 ? value : null;
}

function summarizeProviderEvidence(
  evidence: Array<DescriptiveExtractionProviderEvidence | SupplementalRealizationProviderEvidence>,
): ObservationV3RuntimePerfProviderStageBreakdown {
  const attempts = evidence.map((entry) => ({
    sourceIdentity: entry.sourceIdentity,
    attemptIdentity: entry.attemptIdentity.identity,
    targetId: entry.attemptIdentity.targetId ?? null,
    attemptNumber: entry.attemptIdentity.targetExecutionAttempt ?? entry.attemptIdentity.attemptNumber,
    retryParentAttemptIdentity: entry.attemptIdentity.retryParentAttemptIdentity,
    providerStatus: typeof entry.providerBoundary.providerMetadata?.providerStatus === "string"
      ? entry.providerBoundary.providerMetadata.providerStatus
      : null,
    providerIncompleteReason: entry.providerBoundary.incompleteReason,
    latencyMs: entry.providerBoundary.latencyMs,
    tokenUsage: entry.providerBoundary.tokenUsage,
  }));
  const totalInputTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.input));
  const totalOutputTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.output));
  const totalTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.total));

  return {
    executed: attempts.length > 0,
    callCount: attempts.length,
    retryCount: attempts.filter((entry) => entry.retryParentAttemptIdentity !== null).length,
    totalLatencyMs: sumNullable(attempts.map((entry) => entry.latencyMs)),
    totalTokenUsage: attempts.some((entry) => entry.tokenUsage !== null)
      ? {
          input: toNullableNumber(totalInputTokens),
          output: toNullableNumber(totalOutputTokens),
          total: toNullableNumber(totalTokens),
        }
      : null,
    attempts,
  };
}

function buildStageTimings(input: {
  pipelineResult: ObservationV3ShadowPipelineResult;
  finalCompletenessTiming: ObservationV3RuntimePerfStageTiming | null;
}): ObservationV3RuntimePerfStageTiming[] {
  const mapped = input.pipelineResult.stageResults.flatMap((stage): ObservationV3RuntimePerfStageTiming[] => {
    if (stage.stage === "completeness_analysis") {
      return [{
        stage: "initial_completeness",
        status: stage.status,
        executionMode: stage.executionMode,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
        latencyMs: stage.latencyMs,
      }];
    }

    return [{
      stage: stage.stage,
      status: stage.status,
      executionMode: stage.executionMode,
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
      latencyMs: stage.latencyMs,
    }];
  });

  const insertAfterMemoryComposition = mapped.findIndex((entry) => entry.stage === "memory_composition");
  if (input.finalCompletenessTiming && insertAfterMemoryComposition >= 0) {
    mapped.splice(insertAfterMemoryComposition + 1, 0, input.finalCompletenessTiming);
  }

  return mapped;
}

async function defaultRunPipeline(input: {
  benchmarkId: ObservationV3RuntimePerfCaseId;
  dreamText: string;
  onDescriptiveProviderEvidence: (evidence: DescriptiveExtractionProviderEvidence) => void;
  onSupplementalProviderEvidence: (evidence: SupplementalRealizationProviderEvidence) => void;
  onDeterministicSubstageTiming: (timing: ObservationV3RuntimePerfStageTiming) => void;
}): Promise<ObservationV3ShadowPipelineResult> {
  return runObservationV3ShadowPipeline({
    userId: "observation-v3-runtime-perf-validation",
    reflectiveObjectId: input.benchmarkId,
    dreamText: input.dreamText,
    sourceIdentity: {
      sourceId: input.benchmarkId,
      sourceHash: sha256Hex(input.dreamText),
      sourceLength: input.dreamText.length,
    },
    liveProviderExecution: {
      descriptiveExtraction: {
        attempt: 1,
        extractionRequestId: `${input.benchmarkId}:descriptive-extraction`,
        onProviderEvidence: async (evidence) => {
          input.onDescriptiveProviderEvidence(evidence);
        },
      },
      supplementalRealization: {
        onProviderEvidence: async (evidence) => {
          input.onSupplementalProviderEvidence(evidence);
        },
      },
      onDeterministicSubstageTiming: async (timing) => {
        input.onDeterministicSubstageTiming({
          stage: "final_completeness",
          status: timing.status,
          executionMode: "native_deterministic",
          startedAt: timing.startedAt,
          completedAt: timing.completedAt,
          latencyMs: timing.latencyMs,
        });
      },
    },
  });
}

export async function createObservationV3RuntimePerfMeasurement(input?: {
  outputRoot?: string;
  measurementId?: string;
  corpusPath?: string;
  expectedBenchmarkOrder?: readonly string[];
  now?: () => Date;
  parseCorpus?: () => Promise<ParsedObservationBenchmarkCorpus>;
  runPipeline?: (input: {
    benchmarkId: ObservationV3RuntimePerfCaseId;
    dreamText: string;
    onDescriptiveProviderEvidence: (evidence: DescriptiveExtractionProviderEvidence) => void;
    onSupplementalProviderEvidence: (evidence: SupplementalRealizationProviderEvidence) => void;
    onDeterministicSubstageTiming: (timing: ObservationV3RuntimePerfStageTiming) => void;
  }) => Promise<ObservationV3ShadowPipelineResult>;
}): Promise<ObservationV3RuntimePerfMeasurementResult> {
  const now = input?.now ?? (() => new Date());
  const measurementId = input?.measurementId ?? `${timestampLabel(now())}-obs-v3-runtime-perf-measurement`;
  const outputRoot = input?.outputRoot ?? DEFAULT_OBSERVATION_V3_RUNTIME_PERF_OUTPUT_ROOT;
  const measurementRoot = path.join(outputRoot, measurementId);
  const corpusPath = input?.corpusPath ?? OBSERVATION_BENCHMARK_CORPUS_V1_PATH;
  const parseCorpus = input?.parseCorpus ?? (() => parseObservationBenchmarkCorpusFile({
    sourcePath: corpusPath,
    expectedBenchmarkOrder: input?.expectedBenchmarkOrder ?? OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  }));
  const runPipeline = input?.runPipeline ?? defaultRunPipeline;
  const parsedCorpus = await parseCorpus();

  const selectedItems = OBSERVATION_V3_RUNTIME_PERF_CASE_IDS.map((benchmarkId) => {
    const item = parsedCorpus.items.find((entry) => entry.benchmarkId === benchmarkId);
    if (!item) {
      throw new Error(`Missing benchmark corpus entry for ${benchmarkId}.`);
    }
    return item;
  });

  const cases: ObservationV3RuntimePerfCaseResult[] = [];
  for (const item of selectedItems) {
    const descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[] = [];
    const supplementalProviderEvidence: SupplementalRealizationProviderEvidence[] = [];
    let finalCompletenessTiming: ObservationV3RuntimePerfStageTiming | null = null;

    const pipelineResult = await runPipeline({
      benchmarkId: item.benchmarkId as ObservationV3RuntimePerfCaseId,
      dreamText: item.dreamText,
      onDescriptiveProviderEvidence: (evidence) => {
        descriptiveProviderEvidence.push(evidence);
      },
      onSupplementalProviderEvidence: (evidence) => {
        supplementalProviderEvidence.push(evidence);
      },
      onDeterministicSubstageTiming: (timing) => {
        finalCompletenessTiming = timing.stage === "final_completeness" ? timing : finalCompletenessTiming;
      },
    });

    const completenessPayload = pipelineResult.stageResults.find((stage) => stage.stage === "completeness_analysis")?.payload as
      | { adequacy?: string; recoveryRecommendation?: { disposition?: string } }
      | null
      | undefined;
    const compositionPayload = pipelineResult.stageResults.find((stage) => stage.stage === "memory_composition")?.payload as
      | { finalCompleteness?: { adequacy?: string } }
      | null
      | undefined;
    const admissionPayload = pipelineResult.stageResults.find((stage) => stage.stage === "authority_admission")?.payload as
      | { disposition?: string }
      | null
      | undefined;
    const supplementalStage = pipelineResult.stageResults.find((stage) => stage.stage === "supplemental_realization");

    cases.push({
      benchmarkId: item.benchmarkId as ObservationV3RuntimePerfCaseId,
      sourceLength: item.dreamText.length,
      startedAt: pipelineResult.summary.startedAt,
      completedAt: pipelineResult.summary.completedAt,
      totalLatencyMs: pipelineResult.summary.totalLatencyMs,
      pipelineCompletionStatus: pipelineResult.summary.pipelineCompletionStatus,
      governanceDisposition: pipelineResult.summary.governanceDisposition,
      recoveryDisposition: completenessPayload?.recoveryRecommendation?.disposition ?? null,
      finalAdequacy: compositionPayload?.finalCompleteness?.adequacy ?? null,
      admissionDisposition: admissionPayload?.disposition ?? null,
      supplementalExecuted: supplementalStage?.status === "success",
      stageTimings: buildStageTimings({
        pipelineResult,
        finalCompletenessTiming,
      }),
      providerBreakdown: {
        descriptiveExtraction: summarizeProviderEvidence(descriptiveProviderEvidence),
        supplementalRealization: summarizeProviderEvidence(supplementalProviderEvidence),
      },
      pipelineResult,
      providerEvidence: {
        descriptiveExtraction: descriptiveProviderEvidence,
        supplementalRealization: supplementalProviderEvidence,
      },
    });
  }

  return {
    measurementId,
    measurementRoot,
    corpusPath,
    selectedCaseIds: [...OBSERVATION_V3_RUNTIME_PERF_CASE_IDS],
    cases,
  };
}

export async function persistObservationV3RuntimePerfMeasurement(input: {
  outputRoot: string;
  result: ObservationV3RuntimePerfMeasurementResult;
}): Promise<ObservationV3RuntimePerfMeasurementResult> {
  const measurementRoot = path.join(input.outputRoot, input.result.measurementId);

  await writeJson(path.join(measurementRoot, "measurement-manifest.json"), {
    measurementId: input.result.measurementId,
    measurementRoot,
    corpusPath: input.result.corpusPath,
    caseCount: input.result.cases.length,
    selectedCaseIds: input.result.selectedCaseIds,
  });
  await writeJson(path.join(measurementRoot, "measurement-summary.json"), {
    measurementId: input.result.measurementId,
    cases: input.result.cases.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      totalLatencyMs: entry.totalLatencyMs,
      supplementalExecuted: entry.supplementalExecuted,
      pipelineCompletionStatus: entry.pipelineCompletionStatus,
      governanceDisposition: entry.governanceDisposition,
    })),
  });

  for (const caseResult of input.result.cases) {
    const caseRoot = path.join(measurementRoot, "cases", caseResult.benchmarkId);
    await writeJson(path.join(caseRoot, "measurement-summary.json"), {
      benchmarkId: caseResult.benchmarkId,
      sourceLength: caseResult.sourceLength,
      startedAt: caseResult.startedAt,
      completedAt: caseResult.completedAt,
      totalLatencyMs: caseResult.totalLatencyMs,
      pipelineCompletionStatus: caseResult.pipelineCompletionStatus,
      governanceDisposition: caseResult.governanceDisposition,
      recoveryDisposition: caseResult.recoveryDisposition,
      finalAdequacy: caseResult.finalAdequacy,
      admissionDisposition: caseResult.admissionDisposition,
      supplementalExecuted: caseResult.supplementalExecuted,
      stageTimings: caseResult.stageTimings,
      providerBreakdown: caseResult.providerBreakdown,
    });
    await writeJson(path.join(caseRoot, "pipeline-result.json"), caseResult.pipelineResult);
    await writeJson(path.join(caseRoot, "descriptive-provider-evidence.json"), caseResult.providerEvidence.descriptiveExtraction);
    await writeJson(path.join(caseRoot, "supplemental-provider-evidence.json"), caseResult.providerEvidence.supplementalRealization);
  }

  return {
    ...input.result,
    measurementRoot,
  };
}
