import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  allocateObservationBenchmarkRunDirectory,
  DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT,
  hashStableJson,
  type ObservationBenchmarkRunStatus,
  writeJsonAtomic,
} from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import {
  captureObservationBenchmarkFingerprints,
  type ObservationBenchmarkFingerprintSet,
  type ObservationBenchmarkRepositoryState,
  readObservationBenchmarkRepositoryState,
} from "@/src/cognition/observation/benchmark/observation-benchmark-fingerprint";
import { constructDerivedStructuresFromObservationBundle } from "@/src/cognition/observation/llm-derived-structure-constructor";
import { countBundleObservations } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import {
  buildLlmSceneObservationExtraction,
  type LlmSceneObservationExtractionResult,
} from "@/src/cognition/observation/llm-scene-observation-extractor";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import {
  COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
  COMPLETENESS_ANALYZER_VERSION,
  type CompletenessAnalysisShadowResult,
} from "@/src/cognition/observation-v3/completeness-analysis";
import {
  persistProviderEvidenceArtifact,
  type DescriptiveExtractionProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import {
  SOURCE_ANALYSIS_SCHEMA_VERSION,
  SOURCE_ANALYZER_VERSION,
  type SourceAnalysisShadowResult,
} from "@/src/cognition/observation-v3/source-analysis";
import {
  countObservationBenchmarkDreamTextBytes,
  hashObservationBenchmarkDreamText,
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  type ObservationBenchmarkCorpusManifest,
  type ObservationBenchmarkCorpusManifestItem,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";
import { buildObservationBenchmarkRunSummaryArtifact } from "@/src/cognition/observation/benchmark/observation-benchmark-run-summary";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const BENCHMARK_RUNNER_USER_ID = "benchmark-runner";
const BENCHMARK_RUNNER_REFLECTIVE_OBJECT_PREFIX = "benchmark";
const RUNNER_VERSION = "2";

type BenchmarkSelectionMode = "single" | "all";
type ObservationBenchmarkItemStatus =
  | "success"
  | "extraction_failed"
  | "derived_failed"
  | "configuration_failed"
  | "unexpected_error";

interface ParsedBenchmarkAuthorityItem {
  benchmarkId: string;
  dreamText: string;
}

interface LoadedBenchmarkRunnerItem {
  manifest: ObservationBenchmarkCorpusManifestItem;
  dreamText: string;
}

interface ObservationBenchmarkDerivedArtifact {
  derivedStatus: "output_changed" | "output_unchanged" | "not_invoked" | "threw_error";
  providerApplicationConfirmed: boolean;
  preDerivedInputBundleHash: string | null;
  postDerivedOutputBundleHash: string | null;
  bytewiseChanged: boolean;
  structurallyChanged: boolean;
  elapsedMs: number;
  outputBundle: ObservationV2Bundle | null;
  errorMessage: string | null;
}

export interface ObservationBenchmarkItemExecution {
  benchmarkId: string;
  status: ObservationBenchmarkItemStatus;
  summary: ObservationBenchmarkRunSummary;
  extractionResult: LlmSceneObservationExtractionResult | null;
  diagnostics: LlmSceneObservationExtractionResult["diagnostics"] | null;
  derivedArtifact: ObservationBenchmarkDerivedArtifact;
  syntheticIdentifiers: {
    userId: string;
    reflectiveObjectId: string;
  };
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  attemptNumber: number | null;
  artifactFiles: string[];
  attempts: ObservationExtractionAttemptEvidence[];
  sourceAnalysis: SourceAnalysisShadowResult | null;
  completenessAnalysis: CompletenessAnalysisShadowResult[];
  descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[];
  attemptEvidenceCompleteness: {
    status: "complete" | "partial" | "unavailable" | "write_failed";
    expectedAttemptCount: number;
    preservedAttemptCount: number;
    candidateBundlesPreserved: number;
    candidateBundlesUnavailable: number;
    evidenceWriteErrors: string[];
  };
}

interface ObservationBenchmarkRunContext {
  runId: string;
  runDirectory: string;
  itemsDirectory: string;
  manifestPath: string;
  summaryPath: string;
  benchmarkIndexPath: string;
  startedAt: Date;
}

export interface ObservationBenchmarkRunCliArgs {
  mode: BenchmarkSelectionMode;
  benchmarkIds: string[] | null;
  outputRoot?: string;
}

export interface ObservationBenchmarkRunSummary {
  benchmarkId: string;
  success: boolean;
  extraction: {
    status: "success" | "failed";
    reason?: string;
  };
  derivedStructures: {
    status: "applied" | "skipped" | "failed";
    reason?: string;
  };
  sceneCount: number;
  observationCount: number;
  diagnosticsLabel: string;
  elapsedMs: number;
  failureStage?: "configuration" | "extraction" | "derived_construction";
  failureReason?: string;
}

export interface ObservationBenchmarkRunResult {
  runId?: string;
  runStatus?: ObservationBenchmarkRunStatus;
  artifactDirectory?: string;
  items: ObservationBenchmarkRunSummary[];
  totalCount: number;
  successCount: number;
  failureCount: number;
  averageElapsedMs: number;
}

interface RunObservationBenchmarksInput {
  benchmarkIds: string[] | null;
  sourcePath?: string;
  manifestPath?: string;
  expectedBenchmarkOrder?: readonly string[];
  hasOpenAiApiKey?: boolean;
  extractor?: (input: {
    userId: string;
    reflectiveObjectId: string;
    dreamText: string;
    sourceIdentity?: string;
    extractionRequestId?: string;
    onAttemptEvidence?: (evidence: ObservationExtractionAttemptEvidence) => void | Promise<void>;
    onDescriptiveProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
    onSourceAnalysis?: (result: SourceAnalysisShadowResult) => void | Promise<void>;
    onCompletenessAnalysis?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
  }) => Promise<LlmSceneObservationExtractionResult>;
  derivedConstructor?: (bundle: ObservationV2Bundle) => Promise<ObservationV2Bundle>;
  artifactOutputRoot?: string;
  repositoryState?: ObservationBenchmarkRepositoryState;
  fingerprints?: ObservationBenchmarkFingerprintSet;
  cliArgs?: string[];
  now?: () => Date;
  runnerVersion?: string;
  forceTopLevelArtifactFailureAfterRun?: boolean;
}

function buildDefaultAttemptEvidenceCompleteness(): ObservationBenchmarkItemExecution["attemptEvidenceCompleteness"] {
  return {
    status: "unavailable",
    expectedAttemptCount: 0,
    preservedAttemptCount: 0,
    candidateBundlesPreserved: 0,
    candidateBundlesUnavailable: 0,
    evidenceWriteErrors: [],
  };
}

function sortAttemptEvidence(
  attempts: ObservationExtractionAttemptEvidence[],
): ObservationExtractionAttemptEvidence[] {
  return [...attempts].sort((left, right) => left.attempt - right.attempt);
}

function readExpectedAttemptCount(execution: {
  extractionResult: LlmSceneObservationExtractionResult | null;
  attempts: ObservationExtractionAttemptEvidence[];
}): number {
  const diagnosticAttemptCount = execution.extractionResult?.diagnostics?.attempts.length ?? 0;
  return Math.max(diagnosticAttemptCount, execution.attempts.length);
}

function buildAttemptEvidenceCompleteness(input: {
  extractionResult: LlmSceneObservationExtractionResult | null;
  attempts: ObservationExtractionAttemptEvidence[];
  evidenceWriteErrors?: string[];
}): ObservationBenchmarkItemExecution["attemptEvidenceCompleteness"] {
  const expectedAttemptCount = readExpectedAttemptCount(input);
  const preservedAttemptCount = input.attempts.length;
  const candidateBundlesPreserved = input.attempts.filter((attempt) => attempt.candidateBundle !== null).length;
  const candidateBundlesUnavailable = preservedAttemptCount - candidateBundlesPreserved;
  const evidenceWriteErrors = input.evidenceWriteErrors ?? [];

  let status: ObservationBenchmarkItemExecution["attemptEvidenceCompleteness"]["status"] = "unavailable";
  if (preservedAttemptCount > 0 && evidenceWriteErrors.length === 0 && preservedAttemptCount >= expectedAttemptCount) {
    status = "complete";
  } else if (preservedAttemptCount > 0 && evidenceWriteErrors.length === 0) {
    status = "partial";
  } else if (evidenceWriteErrors.length > 0) {
    status = "write_failed";
  }

  return {
    status,
    expectedAttemptCount,
    preservedAttemptCount,
    candidateBundlesPreserved,
    candidateBundlesUnavailable,
    evidenceWriteErrors,
  };
}

function defaultExpectedBenchmarkOrder(): readonly string[] {
  return OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER;
}

function defaultSourcePath(): string {
  return OBSERVATION_BENCHMARK_CORPUS_V1_PATH;
}

function defaultManifestPath(): string {
  return OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH;
}

function defaultHasOpenAiApiKey(): boolean {
  return Boolean(readRuntimeEnvironment().openAiApiKey);
}

function normalizeBenchmarkId(value: string): string {
  return value.trim().toUpperCase();
}

function buildUsageMessage(): string {
  return [
    "Usage:",
    "npm run benchmark:observation:run -- --id OBS-A-001",
    "npm run benchmark:observation:run -- --all",
    "npm run benchmark:observation:run -- --all --output-root C:\\path\\to\\runs",
  ].join("\n");
}

function nowIso(now: Date): string {
  return now.toISOString();
}

function readAverageElapsedMs(items: ObservationBenchmarkRunSummary[]): number {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((sum, item) => sum + item.elapsedMs, 0) / items.length;
}

function readDiagnosticsLabel(extraction: LlmSceneObservationExtractionResult): string {
  if (extraction.mode === "validated_llm" && extraction.diagnostics?.acceptedAttempt) {
    return `accepted_after_attempt_${extraction.diagnostics.acceptedAttempt}`;
  }

  return extraction.reason ?? extraction.diagnostics?.fallbackReason ?? "unknown";
}

function readAttemptNumber(extraction: LlmSceneObservationExtractionResult | null): number | null {
  if (!extraction?.diagnostics) {
    return null;
  }

  return extraction.diagnostics.acceptedAttempt ?? extraction.diagnostics.attempts.at(-1)?.attempt ?? null;
}

function buildReflectiveObjectId(benchmarkId: string): string {
  return `${BENCHMARK_RUNNER_REFLECTIVE_OBJECT_PREFIX}-${benchmarkId.toLowerCase()}-${crypto.randomUUID()}`;
}

function readSelectionLabel(benchmarkIds: string[] | null): string {
  if (benchmarkIds === null) {
    return "all";
  }

  if (benchmarkIds.length === 1) {
    return benchmarkIds[0]!;
  }

  return `subset-${benchmarkIds.length}`;
}

function indexParsedAuthorityItems(items: Array<ParsedBenchmarkAuthorityItem>): Map<string, ParsedBenchmarkAuthorityItem> {
  return new Map(items.map((item) => [item.benchmarkId, item]));
}

async function readObservationBenchmarkManifest(manifestPath: string): Promise<ObservationBenchmarkCorpusManifest> {
  const raw = await fs.readFile(path.resolve(manifestPath), "utf8");
  return JSON.parse(raw) as ObservationBenchmarkCorpusManifest;
}

async function loadObservationBenchmarkRunnerItems(input: {
  sourcePath: string;
  manifestPath: string;
  expectedBenchmarkOrder: readonly string[];
  benchmarkIds: string[] | null;
}): Promise<LoadedBenchmarkRunnerItem[]> {
  const manifest = await readObservationBenchmarkManifest(input.manifestPath);
  const parsedAuthority = await parseObservationBenchmarkCorpusFile({
    sourcePath: input.sourcePath,
    expectedBenchmarkOrder: input.expectedBenchmarkOrder,
  });
  const authorityById = indexParsedAuthorityItems(
    parsedAuthority.items.map((item) => ({
      benchmarkId: item.benchmarkId,
      dreamText: item.dreamText,
    })),
  );

  const selectedIds = input.benchmarkIds ?? manifest.benchmarkOrder;
  const manifestById = new Map(manifest.items.map((item) => [item.benchmarkId, item]));

  return selectedIds.map((benchmarkId) => {
    const manifestItem = manifestById.get(benchmarkId);
    if (!manifestItem) {
      throw new Error(`Benchmark ID ${benchmarkId} is missing from the generated manifest.`);
    }

    const authorityItem = authorityById.get(benchmarkId);
    if (!authorityItem) {
      throw new Error(`Benchmark ID ${benchmarkId} is missing from the authoritative corpus.`);
    }

    const dreamTextHash = hashObservationBenchmarkDreamText(authorityItem.dreamText);
    const dreamTextByteLength = countObservationBenchmarkDreamTextBytes(authorityItem.dreamText);
    if (
      manifestItem.dreamTextHash !== dreamTextHash ||
      manifestItem.dreamTextByteLength !== dreamTextByteLength ||
      manifestItem.dreamTextCharacterLength !== authorityItem.dreamText.length
    ) {
      throw new Error(
        `Manifest-authority drift detected for ${benchmarkId}. Regenerate the manifest before running benchmarks.`,
      );
    }

    return {
      manifest: manifestItem,
      dreamText: authorityItem.dreamText,
    };
  });
}

function buildRunManifest(input: {
  runId: string;
  runStatus: ObservationBenchmarkRunStatus;
  startedAt: string;
  completedAt: string | null;
  selection: string;
  benchmarkIds: string[];
  artifactRoot: string;
  repositoryState: ObservationBenchmarkRepositoryState;
  fingerprints: ObservationBenchmarkFingerprintSet;
  cliArgs: string[];
  runnerVersion: string;
  topLevelError?: { message: string } | null;
  hasOpenAiApiKey: boolean;
}): Record<string, unknown> {
  const env = readRuntimeEnvironment();

  return {
    schemaVersion: "2",
    runId: input.runId,
    runStatus: input.runStatus,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    selection: input.selection,
    benchmarkIds: input.benchmarkIds,
    benchmarkCount: input.benchmarkIds.length,
    executionMode: "native_isolated",
    persistenceMode: "none",
    artifactRoot: input.artifactRoot,
    repositoryCommitSha: input.repositoryState.commitSha,
    repositoryShortCommitSha: input.repositoryState.shortCommitSha,
    repositoryDirtyState: input.repositoryState.isDirty,
    changedPaths: input.repositoryState.changedPaths,
    hasUntrackedFiles: input.repositoryState.hasUntrackedFiles,
    corpusAuthorityPath: input.fingerprints.corpus.authorityPath,
    corpusManifestPath: input.fingerprints.corpus.manifestPath,
    corpusAuthorityHash: input.fingerprints.corpus.authorityHash,
    corpusManifestHash: input.fingerprints.corpus.manifestHash,
    runnerVersion: input.runnerVersion,
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      host: os.hostname(),
      utcTimestamps: true,
    },
    environment: {
      nodeEnv: env.nodeEnv,
      hasOpenAiApiKey: input.hasOpenAiApiKey,
      cliArgs: input.cliArgs,
    },
    fingerprints: input.fingerprints,
    topLevelError: input.topLevelError ?? null,
  };
}

async function initializeRunArtifacts(input: {
  outputRoot: string;
  startedAt: Date;
  selectionLabel: string;
  benchmarkIds: string[];
  repositoryState: ObservationBenchmarkRepositoryState;
  fingerprints: ObservationBenchmarkFingerprintSet;
  cliArgs: string[];
  runnerVersion: string;
  hasOpenAiApiKey: boolean;
}): Promise<ObservationBenchmarkRunContext> {
  const allocated = await allocateObservationBenchmarkRunDirectory({
    outputRoot: input.outputRoot,
    startedAt: input.startedAt,
    shortRepositorySha: input.repositoryState.shortCommitSha,
    selectionLabel: input.selectionLabel,
  });

  const itemsDirectory = path.join(allocated.runDirectory, "items");
  await fs.mkdir(itemsDirectory, { recursive: true });

  const context: ObservationBenchmarkRunContext = {
    runId: allocated.runId,
    runDirectory: allocated.runDirectory,
    itemsDirectory,
    manifestPath: path.join(allocated.runDirectory, "run-manifest.json"),
    summaryPath: path.join(allocated.runDirectory, "run-summary.json"),
    benchmarkIndexPath: path.join(allocated.runDirectory, "benchmark-index.json"),
    startedAt: input.startedAt,
  };

  await writeJsonAtomic(
    context.manifestPath,
    buildRunManifest({
      runId: context.runId,
      runStatus: "running",
      startedAt: nowIso(input.startedAt),
      completedAt: null,
      selection: input.selectionLabel,
      benchmarkIds: input.benchmarkIds,
      artifactRoot: context.runDirectory,
      repositoryState: input.repositoryState,
      fingerprints: input.fingerprints,
      cliArgs: input.cliArgs,
      runnerVersion: input.runnerVersion,
      hasOpenAiApiKey: input.hasOpenAiApiKey,
    }),
  );

  return context;
}

async function finalizeRunArtifacts(input: {
  context: ObservationBenchmarkRunContext;
  runStatus: ObservationBenchmarkRunStatus;
  loadedItems: LoadedBenchmarkRunnerItem[];
  items: ObservationBenchmarkItemExecution[];
  repositoryState: ObservationBenchmarkRepositoryState;
  fingerprints: ObservationBenchmarkFingerprintSet;
  cliArgs: string[];
  runnerVersion: string;
  selectionLabel: string;
  benchmarkIds: string[];
  hasOpenAiApiKey: boolean;
  topLevelError?: { message: string } | null;
}): Promise<void> {
  const completedAt = new Date();
  const loadedItemsById = new Map(input.loadedItems.map((item) => [item.manifest.benchmarkId, item]));

  const benchmarkIndex = Object.fromEntries(
    input.items.map((item) => [
      item.benchmarkId,
      {
        status: item.status,
        artifactDirectory: path.join("items", item.benchmarkId),
        sourceTextHash: loadedItemsById.get(item.benchmarkId)?.manifest.dreamTextHash ?? null,
        extractionReason: item.summary.extraction.reason ?? null,
        sceneCount: item.summary.sceneCount,
        observationCount: item.summary.observationCount,
        elapsedMs: item.summary.elapsedMs,
      },
    ]),
  );

  await writeJsonAtomic(input.context.benchmarkIndexPath, benchmarkIndex);
  await writeJsonAtomic(
    input.context.summaryPath,
    buildObservationBenchmarkRunSummaryArtifact({
      runId: input.context.runId,
      runStatus: input.runStatus === "running" ? "aborted" : input.runStatus,
      items: input.items,
    }),
  );
  await writeJsonAtomic(
    input.context.manifestPath,
    buildRunManifest({
      runId: input.context.runId,
      runStatus: input.runStatus,
      startedAt: nowIso(input.context.startedAt),
      completedAt: nowIso(completedAt),
      selection: input.selectionLabel,
      benchmarkIds: input.benchmarkIds,
      artifactRoot: input.context.runDirectory,
      repositoryState: input.repositoryState,
      fingerprints: input.fingerprints,
      cliArgs: input.cliArgs,
      runnerVersion: input.runnerVersion,
      topLevelError: input.topLevelError,
      hasOpenAiApiKey: input.hasOpenAiApiKey,
    }),
  );
}

function buildConfigurationFailureItem(input: {
  item: LoadedBenchmarkRunnerItem;
  startedAt: Date;
  completedAt: Date;
}): ObservationBenchmarkItemExecution {
  const elapsedMs = input.completedAt.getTime() - input.startedAt.getTime();
  const summary: ObservationBenchmarkRunSummary = {
    benchmarkId: input.item.manifest.benchmarkId,
    success: false,
    extraction: {
      status: "failed",
      reason: "missing_openai_api_key",
    },
    derivedStructures: {
      status: "skipped",
      reason: "extraction_failed",
    },
    sceneCount: 0,
    observationCount: 0,
    diagnosticsLabel: "missing_openai_api_key",
    elapsedMs,
    failureStage: "configuration",
    failureReason: "missing_openai_api_key",
  };

  return {
    benchmarkId: input.item.manifest.benchmarkId,
    status: "configuration_failed",
    summary,
    extractionResult: null,
    diagnostics: null,
    derivedArtifact: {
      derivedStatus: "not_invoked",
      providerApplicationConfirmed: false,
      preDerivedInputBundleHash: null,
      postDerivedOutputBundleHash: null,
      bytewiseChanged: false,
      structurallyChanged: false,
      elapsedMs: 0,
      outputBundle: null,
      errorMessage: null,
    },
    syntheticIdentifiers: {
      userId: BENCHMARK_RUNNER_USER_ID,
      reflectiveObjectId: buildReflectiveObjectId(input.item.manifest.benchmarkId),
    },
    startedAt: nowIso(input.startedAt),
    completedAt: nowIso(input.completedAt),
    elapsedMs,
    attemptNumber: null,
    artifactFiles: [],
    attempts: [],
    sourceAnalysis: null,
    completenessAnalysis: [],
    descriptiveProviderEvidence: [],
    attemptEvidenceCompleteness: buildDefaultAttemptEvidenceCompleteness(),
  };
}

async function runSingleObservationBenchmark(input: {
  item: LoadedBenchmarkRunnerItem;
  extractor: NonNullable<RunObservationBenchmarksInput["extractor"]>;
  derivedConstructor: NonNullable<RunObservationBenchmarksInput["derivedConstructor"]>;
}): Promise<ObservationBenchmarkItemExecution> {
  const startedAt = new Date();
  const attempts: ObservationExtractionAttemptEvidence[] = [];
  let sourceAnalysis: SourceAnalysisShadowResult | null = null;
  const completenessAnalysis: CompletenessAnalysisShadowResult[] = [];
  const descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[] = [];
  const syntheticIdentifiers = {
    userId: BENCHMARK_RUNNER_USER_ID,
    reflectiveObjectId: buildReflectiveObjectId(input.item.manifest.benchmarkId),
  };

  try {
    const extraction = await input.extractor({
      userId: syntheticIdentifiers.userId,
      reflectiveObjectId: syntheticIdentifiers.reflectiveObjectId,
      dreamText: input.item.dreamText,
      sourceIdentity: input.item.manifest.benchmarkId,
      extractionRequestId: `${input.item.manifest.benchmarkId}:descriptive-extraction`,
      onAttemptEvidence: async (evidence) => {
        attempts.push(structuredClone(evidence));
      },
      onDescriptiveProviderEvidence: async (evidence) => {
        descriptiveProviderEvidence.push(structuredClone(evidence));
      },
      onSourceAnalysis: async (result) => {
        sourceAnalysis = structuredClone(result);
      },
      onCompletenessAnalysis: async (result) => {
        completenessAnalysis.push(structuredClone(result));
      },
    });

    if (extraction.mode !== "validated_llm" || !extraction.bundle) {
      const completedAt = new Date();
      const elapsedMs = completedAt.getTime() - startedAt.getTime();
      const summary: ObservationBenchmarkRunSummary = {
        benchmarkId: input.item.manifest.benchmarkId,
        success: false,
        extraction: {
          status: "failed",
          reason: extraction.reason ?? "unknown_extraction_failure",
        },
        derivedStructures: {
          status: "skipped",
          reason: "extraction_failed",
        },
        sceneCount: 0,
        observationCount: 0,
        diagnosticsLabel: readDiagnosticsLabel(extraction),
        elapsedMs,
        failureStage: extraction.reason === "missing_openai_api_key" ? "configuration" : "extraction",
        failureReason: extraction.reason ?? "unknown_extraction_failure",
      };

      return {
        benchmarkId: input.item.manifest.benchmarkId,
        status: extraction.reason === "missing_openai_api_key" ? "configuration_failed" : "extraction_failed",
        summary,
        extractionResult: extraction,
        diagnostics: extraction.diagnostics ?? null,
        derivedArtifact: {
          derivedStatus: "not_invoked",
          providerApplicationConfirmed: false,
          preDerivedInputBundleHash: null,
          postDerivedOutputBundleHash: null,
          bytewiseChanged: false,
          structurallyChanged: false,
          elapsedMs: 0,
          outputBundle: null,
          errorMessage: null,
        },
        syntheticIdentifiers,
        startedAt: nowIso(startedAt),
        completedAt: nowIso(completedAt),
        elapsedMs,
        attemptNumber: readAttemptNumber(extraction),
        artifactFiles: [],
        attempts: sortAttemptEvidence(attempts),
        sourceAnalysis,
        completenessAnalysis,
        descriptiveProviderEvidence,
        attemptEvidenceCompleteness: buildAttemptEvidenceCompleteness({
          extractionResult: extraction,
          attempts,
        }),
      };
    }

    const derivedStartedAt = new Date();
    try {
      const derivedBundle = await input.derivedConstructor(extraction.bundle);
      const derivedElapsedMs = new Date().getTime() - derivedStartedAt.getTime();
      const preHash = hashStableJson(extraction.bundle);
      const postHash = hashStableJson(derivedBundle);
      const completedAt = new Date();
      const elapsedMs = completedAt.getTime() - startedAt.getTime();
      const derivedStatus = preHash === postHash ? "output_unchanged" : "output_changed";
      const summary: ObservationBenchmarkRunSummary = {
        benchmarkId: input.item.manifest.benchmarkId,
        success: true,
        extraction: {
          status: "success",
        },
        derivedStructures: {
          status: "applied",
          reason: derivedStatus,
        },
        sceneCount: derivedBundle.scenes.length,
        observationCount: countBundleObservations(derivedBundle),
        diagnosticsLabel: readDiagnosticsLabel(extraction),
        elapsedMs,
      };

      return {
        benchmarkId: input.item.manifest.benchmarkId,
        status: "success",
        summary,
        extractionResult: extraction,
        diagnostics: extraction.diagnostics ?? null,
        derivedArtifact: {
          derivedStatus,
          providerApplicationConfirmed: false,
          preDerivedInputBundleHash: preHash,
          postDerivedOutputBundleHash: postHash,
          bytewiseChanged: preHash !== postHash,
          structurallyChanged: preHash !== postHash,
          elapsedMs: derivedElapsedMs,
          outputBundle: derivedBundle,
          errorMessage: null,
        },
        syntheticIdentifiers,
        startedAt: nowIso(startedAt),
        completedAt: nowIso(completedAt),
        elapsedMs,
        attemptNumber: readAttemptNumber(extraction),
        artifactFiles: [],
        attempts: sortAttemptEvidence(attempts),
        sourceAnalysis,
        completenessAnalysis,
        descriptiveProviderEvidence,
        attemptEvidenceCompleteness: buildAttemptEvidenceCompleteness({
          extractionResult: extraction,
          attempts,
        }),
      };
    } catch (error) {
      const completedAt = new Date();
      const elapsedMs = completedAt.getTime() - startedAt.getTime();
      const derivedElapsedMs = completedAt.getTime() - derivedStartedAt.getTime();
      const summary: ObservationBenchmarkRunSummary = {
        benchmarkId: input.item.manifest.benchmarkId,
        success: false,
        extraction: {
          status: "success",
        },
        derivedStructures: {
          status: "failed",
          reason: error instanceof Error ? error.message : "unknown_error",
        },
        sceneCount: extraction.bundle.scenes.length,
        observationCount: countBundleObservations(extraction.bundle),
        diagnosticsLabel: readDiagnosticsLabel(extraction),
        elapsedMs,
        failureStage: "derived_construction",
        failureReason: error instanceof Error ? error.message : "unknown_error",
      };

      return {
        benchmarkId: input.item.manifest.benchmarkId,
        status: "derived_failed",
        summary,
        extractionResult: extraction,
        diagnostics: extraction.diagnostics ?? null,
        derivedArtifact: {
          derivedStatus: "threw_error",
          providerApplicationConfirmed: false,
          preDerivedInputBundleHash: hashStableJson(extraction.bundle),
          postDerivedOutputBundleHash: null,
          bytewiseChanged: false,
          structurallyChanged: false,
          elapsedMs: derivedElapsedMs,
          outputBundle: null,
          errorMessage: error instanceof Error ? error.message : "unknown_error",
        },
        syntheticIdentifiers,
        startedAt: nowIso(startedAt),
        completedAt: nowIso(completedAt),
        elapsedMs,
        attemptNumber: readAttemptNumber(extraction),
        artifactFiles: [],
        attempts: sortAttemptEvidence(attempts),
        sourceAnalysis,
        completenessAnalysis,
        descriptiveProviderEvidence,
        attemptEvidenceCompleteness: buildAttemptEvidenceCompleteness({
          extractionResult: extraction,
          attempts,
        }),
      };
    }
  } catch (error) {
    const completedAt = new Date();
    const elapsedMs = completedAt.getTime() - startedAt.getTime();
    const summary: ObservationBenchmarkRunSummary = {
      benchmarkId: input.item.manifest.benchmarkId,
      success: false,
      extraction: {
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown_error",
      },
      derivedStructures: {
        status: "skipped",
        reason: "extraction_failed",
      },
      sceneCount: 0,
      observationCount: 0,
      diagnosticsLabel: "unexpected_error",
      elapsedMs,
      failureStage: "extraction",
      failureReason: error instanceof Error ? error.message : "unknown_error",
    };

    return {
      benchmarkId: input.item.manifest.benchmarkId,
      status: "unexpected_error",
      summary,
      extractionResult: null,
      diagnostics: null,
      derivedArtifact: {
        derivedStatus: "not_invoked",
        providerApplicationConfirmed: false,
        preDerivedInputBundleHash: null,
        postDerivedOutputBundleHash: null,
        bytewiseChanged: false,
        structurallyChanged: false,
        elapsedMs: 0,
        outputBundle: null,
        errorMessage: null,
      },
      syntheticIdentifiers,
      startedAt: nowIso(startedAt),
      completedAt: nowIso(completedAt),
      elapsedMs,
      attemptNumber: null,
      artifactFiles: [],
      attempts: sortAttemptEvidence(attempts),
      sourceAnalysis,
      completenessAnalysis,
      descriptiveProviderEvidence,
      attemptEvidenceCompleteness: buildAttemptEvidenceCompleteness({
        extractionResult: null,
        attempts,
      }),
    };
  }
}

async function writeItemArtifacts(input: {
  context: ObservationBenchmarkRunContext;
  item: LoadedBenchmarkRunnerItem;
  execution: ObservationBenchmarkItemExecution;
  fingerprints: ObservationBenchmarkFingerprintSet;
}): Promise<void> {
  const itemDirectory = path.join(input.context.itemsDirectory, input.item.manifest.benchmarkId);
  await fs.mkdir(itemDirectory, { recursive: true });

  const itemMetadata = {
    benchmarkId: input.item.manifest.benchmarkId,
    benchmarkFamily: input.item.manifest.benchmarkFamily,
    sourceDate: input.item.manifest.sourceDate,
    stressTargets: input.item.manifest.stressTargets,
    secondaryTags: input.item.manifest.secondaryTags,
    sourceTextHash: input.item.manifest.dreamTextHash,
    sourceTextByteLength: input.item.manifest.dreamTextByteLength,
    sourceTextCharacterLength: input.item.manifest.dreamTextCharacterLength,
    sourceHeading: input.item.manifest.source.heading,
    sourceLineRange: {
      startLine: input.item.manifest.source.startLine,
      endLine: input.item.manifest.source.endLine,
      dreamTextStartLine: input.item.manifest.source.dreamTextStartLine,
      dreamTextEndLine: input.item.manifest.source.dreamTextEndLine,
    },
    syntheticIdentifiers: input.execution.syntheticIdentifiers,
    startedAt: input.execution.startedAt,
    completedAt: input.execution.completedAt,
    elapsedMs: input.execution.elapsedMs,
    attemptNumber: input.execution.attemptNumber,
    status: input.execution.status,
  };
  const extractionResult = input.execution.extractionResult;
  const diagnostics = input.execution.diagnostics;
  const derivedResult = input.execution.derivedArtifact;
  const attemptsDirectory = path.join(itemDirectory, "attempts");
  const attemptArtifactFiles: string[] = [];
  const completenessArtifactFiles: string[] = [];
  const providerEvidenceByAttempt = new Map(
    input.execution.descriptiveProviderEvidence.map((evidence) => [evidence.attemptIdentity.attemptNumber, evidence] as const),
  );
  const sourceProfileArtifact =
    input.execution.sourceAnalysis ??
    ({
      schemaVersion: SOURCE_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: SOURCE_ANALYZER_VERSION,
      generatedAt: input.execution.startedAt,
      elapsedMs: 0,
      status: "unavailable",
      failure: {
        code: "not_emitted",
        message: "source_analysis_not_emitted_by_extractor",
      },
    } satisfies SourceAnalysisShadowResult);

  const itemSummary = {
    benchmarkId: input.execution.benchmarkId,
    finalStatus: input.execution.status,
    extractionStatus: input.execution.summary.extraction.status,
    extractionReason: input.execution.summary.extraction.reason ?? null,
    derivedStatus: derivedResult.derivedStatus,
    sceneCount: input.execution.summary.sceneCount,
    observationCount: input.execution.summary.observationCount,
    diagnosticVerdict: input.execution.summary.diagnosticsLabel,
    elapsedMs: input.execution.summary.elapsedMs,
    attemptEvidenceCompleteness: input.execution.attemptEvidenceCompleteness,
    attemptCount: input.execution.attempts.length,
    acceptedAttempt: input.execution.attempts.find((attempt) => attempt.acceptedAttempt)?.attempt ?? null,
    finalExtractionMode: extractionResult?.mode ?? null,
    finalFailureReason: extractionResult?.reason ?? null,
    attemptArtifacts: input.execution.attempts.map((attempt) => path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`)),
    artifactFiles: [
      "item-metadata.json",
      "source-profile.json",
      "completeness-report.json",
      "extraction-result.json",
      "diagnostics.json",
      "derived-result.json",
      "item-summary.json",
    ],
  };

  await writeJsonAtomic(path.join(itemDirectory, "item-metadata.json"), itemMetadata);
  await writeJsonAtomic(path.join(itemDirectory, "source-profile.json"), {
    schemaVersion: sourceProfileArtifact.schemaVersion,
    analyzerVersion: sourceProfileArtifact.analyzerVersion,
    sourceHash: input.item.manifest.dreamTextHash,
    analyzerFingerprint: input.fingerprints.sourceAnalysis.analyzerHash,
    contractFingerprint: input.fingerprints.sourceAnalysis.contractHash,
    generatedAt: sourceProfileArtifact.generatedAt,
    elapsedMs: sourceProfileArtifact.elapsedMs,
    status: sourceProfileArtifact.status,
    profile: sourceProfileArtifact.status === "available" ? sourceProfileArtifact.profile : undefined,
    failure: sourceProfileArtifact.status === "unavailable" ? sourceProfileArtifact.failure : undefined,
  });
  const completenessByAttempt = new Map(
    input.execution.completenessAnalysis.map((result) => [result.attemptNumber, result]),
  );
  const completenessAttempts = input.execution.attempts
    .filter((attempt) => attempt.parseStatus === "parsed" && attempt.candidateBundle !== null)
    .map((attempt) => completenessByAttempt.get(attempt.attempt) ?? {
      schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
      generatedAt: input.execution.startedAt,
      elapsedMs: 0,
      attemptNumber: attempt.attempt,
      status: "unavailable" as const,
      v2DiagnosticReference: attempt.diagnostics
        ? {
            guardVerdict: attempt.guardVerdict,
            fallbackReason: attempt.diagnostics.fallbackReason,
            coverageRatio: attempt.diagnostics.coverageRatio,
            uncoveredTailChars: attempt.diagnostics.uncoveredTailChars,
            lateSectionObservationCount: attempt.diagnostics.lateSectionObservationCount,
            overmergeMatchedCueGroups: attempt.diagnostics.overmergeMatchedCueGroups,
            overmergeTotalCueMatches: attempt.diagnostics.overmergeTotalCueMatches,
          }
        : null,
      equivalence: {
        classification: "comparison_unavailable" as const,
        reasons: ["completeness_analysis_not_emitted_by_extractor"],
        discrepancies: [],
      },
      failure: {
        code: "not_emitted" as const,
        message: "completeness_analysis_not_emitted_by_extractor",
      },
    });
  await writeJsonAtomic(path.join(itemDirectory, "completeness-report.json"), {
    schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
    analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
    sourceHash: input.item.manifest.dreamTextHash,
    attempts: completenessAttempts.map((result) => ({
      attemptNumber: result.attemptNumber,
      status: result.status,
      report: result.status === "available" ? result.report : undefined,
      v2DiagnosticReference: result.v2DiagnosticReference,
      equivalence: result.equivalence,
      failure: result.status === "unavailable" ? result.failure : undefined,
    })),
  });
  await writeJsonAtomic(path.join(itemDirectory, "extraction-result.json"), extractionResult);
  await writeJsonAtomic(path.join(itemDirectory, "diagnostics.json"), diagnostics);
  await writeJsonAtomic(path.join(itemDirectory, "derived-result.json"), derivedResult);

  if (input.execution.attempts.length > 0) {
    await fs.mkdir(attemptsDirectory, { recursive: true });
  }

  try {
    for (const attempt of input.execution.attempts) {
      const attemptDirectory = path.join(attemptsDirectory, `attempt-${String(attempt.attempt).padStart(2, "0")}`);
      await fs.mkdir(attemptDirectory, { recursive: true });

      const guardResults = {
        guardVerdict: attempt.guardVerdict,
        rejectionReasons: attempt.rejectionReasons,
        retryReason: attempt.retryReason,
        acceptedAttempt: attempt.acceptedAttempt,
        causedFinalFallback: attempt.causedFinalFallback,
        causedRetry: attempt.causedRetry,
      };

      const attemptSummary = {
        attemptNumber: attempt.attempt,
        status: attempt.status,
        candidateBundleAvailable: attempt.candidateBundle !== null,
        sceneCount: attempt.sceneCount,
        observationCount: attempt.observationCount,
        guardAcceptance: attempt.guardVerdict === "pass",
        rejectionReasons: attempt.rejectionReasons,
        coverageRatio: attempt.diagnostics?.coverageRatio ?? null,
        lateSectionObservationCount: attempt.diagnostics?.lateSectionObservationCount ?? null,
        uncoveredTailChars: attempt.diagnostics?.uncoveredTailChars ?? null,
        overmergeVerdict: attempt.guardVerdict === "overmerge_guard_failed",
        acceptedAttempt: attempt.acceptedAttempt,
        retryInitiated: attempt.causedRetry,
        causedFinalFallback: attempt.causedFinalFallback,
        elapsedMs: attempt.elapsedMs,
      };

      await writeJsonAtomic(path.join(attemptDirectory, "attempt-metadata.json"), {
        attemptNumber: attempt.attempt,
        status: attempt.status,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        elapsedMs: attempt.elapsedMs,
        parseStatus: attempt.parseStatus,
        schemaValidationStatus: attempt.schemaValidationStatus,
        providerStatus: attempt.providerStatus,
        providerIncompleteReason: attempt.providerIncompleteReason,
        providerReturnedStructuredOutput: attempt.providerReturnedStructuredOutput,
        sceneCount: attempt.sceneCount,
        observationCount: attempt.observationCount,
        evidenceSpanCount: attempt.evidenceSpanCount,
        inputTokenUsage: attempt.inputTokenUsage,
        outputTokenUsage: attempt.outputTokenUsage,
        totalTokenUsage: attempt.totalTokenUsage,
        rawProviderResponsePreserved: attempt.rawProviderResponsePreserved,
        errorMessage: attempt.errorMessage,
      });
      await writeJsonAtomic(path.join(attemptDirectory, "candidate-bundle.json"), attempt.candidateBundle);
      await writeJsonAtomic(path.join(attemptDirectory, "diagnostics.json"), attempt.diagnostics);
      await writeJsonAtomic(path.join(attemptDirectory, "guard-results.json"), guardResults);
      const completenessResult = completenessAttempts.find((result) => result.attemptNumber === attempt.attempt) ?? null;
      await writeJsonAtomic(path.join(attemptDirectory, "completeness-report.json"), completenessResult
        ? {
            schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
            analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
            sourceHash: input.item.manifest.dreamTextHash,
            candidateHash: completenessResult.status === "available"
              ? completenessResult.report.candidateIdentity.candidateHash
              : null,
            analyzerFingerprint: input.fingerprints.completenessAnalysis.analyzerHash,
            contractFingerprint: input.fingerprints.completenessAnalysis.contractHash,
            rulesFingerprint: input.fingerprints.completenessAnalysis.rulesHash,
            equivalenceFingerprint: input.fingerprints.completenessAnalysis.equivalenceHash,
            generatedAt: completenessResult.generatedAt,
            elapsedMs: completenessResult.elapsedMs,
            attemptNumber: completenessResult.attemptNumber,
            acceptedAttemptContext: attempt.acceptedAttempt,
            status: completenessResult.status,
            report: completenessResult.status === "available" ? completenessResult.report : undefined,
            v2DiagnosticReference: completenessResult.v2DiagnosticReference,
            equivalence: completenessResult.equivalence,
            failure: completenessResult.status === "unavailable" ? completenessResult.failure : undefined,
          }
        : null);
      await writeJsonAtomic(path.join(attemptDirectory, "attempt-summary.json"), attemptSummary);
      const providerEvidence = providerEvidenceByAttempt.get(attempt.attempt);
      if (providerEvidence) {
        const persistedEvidence = await persistProviderEvidenceArtifact({
          destinationPath: path.join(attemptDirectory, "descriptive-provider-evidence.json"),
          evidence: providerEvidence,
        });
        await writeJsonAtomic(
          path.join(attemptDirectory, "descriptive-provider-evidence.receipt.json"),
          persistedEvidence.receipt,
        );
        attemptArtifactFiles.push(
          path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "descriptive-provider-evidence.json"),
          path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "descriptive-provider-evidence.receipt.json"),
        );
      }

      attemptArtifactFiles.push(
        path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "attempt-metadata.json"),
        path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "candidate-bundle.json"),
        path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "diagnostics.json"),
        path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "guard-results.json"),
        path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "attempt-summary.json"),
      );
      if (completenessResult) {
        completenessArtifactFiles.push(
          path.join("attempts", `attempt-${String(attempt.attempt).padStart(2, "0")}`, "completeness-report.json"),
        );
      }
    }
  } catch (error) {
    input.execution.attemptEvidenceCompleteness = buildAttemptEvidenceCompleteness({
      extractionResult: input.execution.extractionResult,
      attempts: input.execution.attempts,
      evidenceWriteErrors: [error instanceof Error ? error.message : "unknown_error"],
    });
    itemSummary.attemptEvidenceCompleteness = input.execution.attemptEvidenceCompleteness;
  }

  itemSummary.artifactFiles.push(...attemptArtifactFiles, ...completenessArtifactFiles);
  await writeJsonAtomic(path.join(itemDirectory, "item-summary.json"), itemSummary);

  input.execution.artifactFiles = itemSummary.artifactFiles;
}

export function parseObservationBenchmarkRunCliArgs(args: string[]): ObservationBenchmarkRunCliArgs {
  let runAll = false;
  let benchmarkId: string | null = null;
  let outputRoot: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--all") {
      runAll = true;
      continue;
    }

    if (argument === "--id") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing benchmark ID after --id.\n${buildUsageMessage()}`);
      }

      benchmarkId = normalizeBenchmarkId(next);
      index += 1;
      continue;
    }

    if (argument === "--output-root") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing path after --output-root.\n${buildUsageMessage()}`);
      }

      outputRoot = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}\n${buildUsageMessage()}`);
  }

  if ((runAll && benchmarkId) || (!runAll && !benchmarkId)) {
    throw new Error(`Choose exactly one of --all or --id <BENCHMARK_ID>.\n${buildUsageMessage()}`);
  }

  if (benchmarkId) {
    return {
      mode: "single",
      benchmarkIds: [benchmarkId],
      outputRoot,
    };
  }

  return {
    mode: "all",
    benchmarkIds: null,
    outputRoot,
  };
}

function formatStatusLine(prefix: string, label: string): string {
  return `${prefix} ${label}`;
}

function formatElapsedMs(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(1)} s`;
}

export function formatObservationBenchmarkRunSummary(summary: ObservationBenchmarkRunSummary): string {
  const lines = [
    summary.benchmarkId,
    "",
    "Extraction:",
    summary.extraction.status === "success"
      ? formatStatusLine("[OK]", "Success")
      : formatStatusLine("[FAIL]", `Failed (${summary.extraction.reason ?? "unknown"})`),
    "",
    "Derived structures:",
    summary.derivedStructures.status === "applied"
      ? formatStatusLine("[OK]", "Applied")
      : summary.derivedStructures.status === "skipped"
        ? formatStatusLine("[SKIP]", `Skipped (${summary.derivedStructures.reason ?? "not_run"})`)
        : formatStatusLine("[FAIL]", `Failed (${summary.derivedStructures.reason ?? "unknown"})`),
    "",
    "Scene count:",
    String(summary.sceneCount),
    "",
    "Observation count:",
    String(summary.observationCount),
    "",
    "Diagnostics:",
    summary.diagnosticsLabel,
    "",
    "Elapsed:",
    formatElapsedMs(summary.elapsedMs),
  ];

  if (!summary.success) {
    lines.push("", "Failure stage:", summary.failureStage ?? "unknown");
    lines.push("", "Failure reason:", summary.failureReason ?? "unknown");
  }

  return lines.join("\n");
}

export async function runObservationBenchmarks(
  input: RunObservationBenchmarksInput,
): Promise<ObservationBenchmarkRunResult> {
  const sourcePath = input.sourcePath ?? defaultSourcePath();
  const manifestPath = input.manifestPath ?? defaultManifestPath();
  const expectedBenchmarkOrder = input.expectedBenchmarkOrder ?? defaultExpectedBenchmarkOrder();
  const hasOpenAiApiKey = input.hasOpenAiApiKey ?? defaultHasOpenAiApiKey();
  const extractor = input.extractor ?? buildLlmSceneObservationExtraction;
  const derivedConstructor = input.derivedConstructor ?? constructDerivedStructuresFromObservationBundle;
  const now = input.now ?? (() => new Date());
  const cliArgs = input.cliArgs ?? [];
  const runnerVersion = input.runnerVersion ?? RUNNER_VERSION;

  const items = await loadObservationBenchmarkRunnerItems({
    sourcePath,
    manifestPath,
    expectedBenchmarkOrder,
    benchmarkIds: input.benchmarkIds,
  });

  const artifactOutputRoot = input.artifactOutputRoot;
  const benchmarkIds = items.map((item) => item.manifest.benchmarkId);
  const selectionLabel = readSelectionLabel(input.benchmarkIds);

  let context: ObservationBenchmarkRunContext | undefined;
  let repositoryState = input.repositoryState;
  let fingerprints = input.fingerprints;
  const executedItems: ObservationBenchmarkItemExecution[] = [];

  if (artifactOutputRoot) {
    repositoryState = repositoryState ?? await readObservationBenchmarkRepositoryState();
    fingerprints = fingerprints ?? await captureObservationBenchmarkFingerprints({
      corpusAuthorityPath: sourcePath,
      corpusManifestPath: manifestPath,
    });
    context = await initializeRunArtifacts({
      outputRoot: artifactOutputRoot,
      startedAt: now(),
      selectionLabel,
      benchmarkIds,
      repositoryState,
      fingerprints,
      cliArgs,
      runnerVersion,
      hasOpenAiApiKey,
    });
  }

  try {
    if (!hasOpenAiApiKey) {
      for (const item of items) {
        const startedAt = now();
        const completedAt = now();
        const execution = buildConfigurationFailureItem({
          item,
          startedAt,
          completedAt,
        });
        executedItems.push(execution);
        if (context) {
          await writeItemArtifacts({
            context,
            item,
            execution,
            fingerprints: fingerprints!,
          });
        }
      }
    } else {
      for (const item of items) {
        const execution = await runSingleObservationBenchmark({
          item,
          extractor,
          derivedConstructor,
        });
        executedItems.push(execution);
        if (context) {
          await writeItemArtifacts({
            context,
            item,
            execution,
            fingerprints: fingerprints!,
          });
        }
      }
    }

    if (input.forceTopLevelArtifactFailureAfterRun) {
      throw new Error("forced_top_level_artifact_failure");
    }

    const summaries = executedItems.map((item) => item.summary);
    const successCount = summaries.filter((item) => item.success).length;
    const failureCount = summaries.length - successCount;
    const runStatus: ObservationBenchmarkRunStatus = failureCount > 0 ? "completed_with_failures" : "completed";

    if (context && repositoryState && fingerprints) {
      await finalizeRunArtifacts({
        context,
        runStatus,
        loadedItems: items,
        items: executedItems,
        repositoryState,
        fingerprints,
        cliArgs,
        runnerVersion,
        selectionLabel,
        benchmarkIds,
        hasOpenAiApiKey,
      });
    }

    return {
      runId: context?.runId,
      runStatus,
      artifactDirectory: context?.runDirectory,
      items: summaries,
      totalCount: summaries.length,
      successCount,
      failureCount,
      averageElapsedMs: readAverageElapsedMs(summaries),
    };
  } catch (error) {
    if (context && repositoryState && fingerprints) {
      await finalizeRunArtifacts({
        context,
        runStatus: "aborted",
        loadedItems: items,
        items: executedItems,
        repositoryState,
        fingerprints,
        cliArgs,
        runnerVersion,
        selectionLabel,
        benchmarkIds,
        hasOpenAiApiKey,
        topLevelError: {
          message: error instanceof Error ? error.message : "unknown_error",
        },
      });
    }

    throw error;
  }
}

export {
  DEFAULT_OBSERVATION_BENCHMARK_OUTPUT_ROOT,
  type ObservationBenchmarkFingerprintSet,
  type ObservationBenchmarkRepositoryState,
};
