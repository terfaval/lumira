import path from "node:path";

import {
  OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
  type ObservationBenchmarkCorpusManifest,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";
import {
  hashObservationBenchmarkDreamText,
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  allocateObservationTopologyExperimentRunDirectory,
  finalizeObservationTopologyExperimentRunFromCheckpoint,
  loadObservationTopologyExperimentCompletedExecutions,
  loadObservationTopologyExperimentRunCheckpoint,
  writeObservationTopologyExperimentRunCheckpoint,
  writeObservationTopologyExperimentArtifacts,
  writeObservationTopologyExperimentRunArtifacts,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-artifact-writer";
import { captureObservationTopologyExperimentFingerprints } from "@/src/cognition/observation/benchmark/observation-topology-experiment-fingerprint";
import {
  OBSERVATION_TOPOLOGY_EXPERIMENT_OUTPUT_ROOT,
  type ObservationTopologyConfigurationId,
  type ObservationTopologyExecutionResult,
  type ObservationTopologyRunStatus,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { readObservationBenchmarkRepositoryState } from "@/src/cognition/observation/benchmark/observation-benchmark-fingerprint";
import { currentBaselineConfiguration } from "@/src/cognition/observation/experiment/configurations/current-baseline";
import { hierarchicalLocalExtractionConfiguration } from "@/src/cognition/observation/experiment/configurations/hierarchical-local-extraction";
import { layeredOutputConfiguration } from "@/src/cognition/observation/experiment/configurations/layered-output";
import { targetedRecoveryConfiguration } from "@/src/cognition/observation/experiment/configurations/targeted-recovery";
import { sha256Hex } from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";

const CONFIGURATIONS = {
  A_CURRENT_BASELINE: currentBaselineConfiguration,
  C_TARGETED_RECOVERY: targetedRecoveryConfiguration,
  D_HIERARCHICAL_LOCAL_EXTRACTION: hierarchicalLocalExtractionConfiguration,
  F_LAYERED_OUTPUT: layeredOutputConfiguration,
} as const;

const CANDIDATE_LABELS = ["Candidate X", "Candidate Y", "Candidate Z", "Candidate W"] as const;

export interface ObservationTopologyExperimentCliArgs {
  benchmarkIds: string[];
  benchmarkClass: string | null;
  configurationIds: ObservationTopologyConfigurationId[];
  repeat: number;
  outputRoot: string;
  resumeRunDirectory?: string;
}

export interface ObservationTopologyExperimentRunResult {
  runId: string;
  artifactDirectory: string;
  runStatus: ObservationTopologyRunStatus;
  executions: ObservationTopologyExecutionResult[];
}

function normalizeBenchmarkId(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeConfigurationId(value: string): ObservationTopologyConfigurationId {
  const normalized = value.trim().toUpperCase() as ObservationTopologyConfigurationId;
  if (!(normalized in CONFIGURATIONS)) {
    throw new Error(`Unknown configuration: ${value}`);
  }

  return normalized;
}

function buildUsage(): string {
  return [
    "Usage:",
    "npm run benchmark:observation:experiment -- --benchmark OBS-C-002 --configuration A_CURRENT_BASELINE",
    "npm run benchmark:observation:experiment -- --benchmark-class C --configuration D_HIERARCHICAL_LOCAL_EXTRACTION --repeat 2",
    "npm run benchmark:observation:experiment -- --benchmark OBS-C-002 --benchmark OBS-A-002 --configuration A_CURRENT_BASELINE --configuration C_TARGETED_RECOVERY",
  ].join("\n");
}

export function parseObservationTopologyExperimentCliArgs(args: string[]): ObservationTopologyExperimentCliArgs {
  const benchmarkIds: string[] = [];
  const configurationIds: ObservationTopologyConfigurationId[] = [];
  let benchmarkClass: string | null = null;
  let repeat = 1;
  let outputRoot = OBSERVATION_TOPOLOGY_EXPERIMENT_OUTPUT_ROOT;
  let resumeRunDirectory: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--benchmark") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing benchmark after --benchmark.\n${buildUsage()}`);
      }
      benchmarkIds.push(normalizeBenchmarkId(next));
      index += 1;
      continue;
    }

    if (argument === "--benchmark-class") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing class after --benchmark-class.\n${buildUsage()}`);
      }
      benchmarkClass = next.trim().toUpperCase();
      index += 1;
      continue;
    }

    if (argument === "--configuration") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing configuration after --configuration.\n${buildUsage()}`);
      }
      configurationIds.push(normalizeConfigurationId(next));
      index += 1;
      continue;
    }

    if (argument === "--repeat") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing number after --repeat.\n${buildUsage()}`);
      }
      repeat = Number(next);
      if (!Number.isInteger(repeat) || repeat < 1) {
        throw new Error(`Repeat must be a positive integer.\n${buildUsage()}`);
      }
      index += 1;
      continue;
    }

    if (argument === "--output-root") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing path after --output-root.\n${buildUsage()}`);
      }
      outputRoot = next;
      index += 1;
      continue;
    }

    if (argument === "--resume-run") {
      const next = args[index + 1];
      if (!next) {
        throw new Error(`Missing path after --resume-run.\n${buildUsage()}`);
      }
      resumeRunDirectory = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}\n${buildUsage()}`);
  }

  if (benchmarkIds.length === 0 && !benchmarkClass) {
    throw new Error(`Provide at least one --benchmark or one --benchmark-class.\n${buildUsage()}`);
  }
  if (configurationIds.length === 0) {
    throw new Error(`Provide at least one --configuration.\n${buildUsage()}`);
  }

  return {
    benchmarkIds,
    benchmarkClass,
    configurationIds,
    repeat,
    outputRoot,
    resumeRunDirectory,
  };
}

async function readManifest(manifestPath: string): Promise<ObservationBenchmarkCorpusManifest> {
  const fs = await import("node:fs/promises");
  return JSON.parse(await fs.readFile(path.resolve(manifestPath), "utf8")) as ObservationBenchmarkCorpusManifest;
}

async function resolveSelectedBenchmarkIds(input: {
  benchmarkIds: string[];
  benchmarkClass: string | null;
}): Promise<string[]> {
  const manifest = await readManifest(OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH);
  const selected = new Set<string>(input.benchmarkIds);
  if (input.benchmarkClass) {
    for (const item of manifest.items) {
      if (item.benchmarkFamily.startsWith(input.benchmarkClass)) {
        selected.add(item.benchmarkId);
      }
    }
  }

  const ordered = OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER.filter((benchmarkId) => selected.has(benchmarkId));
  if (ordered.length === 0) {
    throw new Error("No benchmark IDs matched the provided selection.");
  }

  return ordered;
}

function buildSelectionLabel(benchmarkIds: string[], configurationIds: ObservationTopologyConfigurationId[], repeat: number): string {
  const benchmarkLabel = benchmarkIds.length === 1 ? benchmarkIds[0]! : `subset-${benchmarkIds.length}`;
  const configurationLabel = configurationIds.length === 1 ? configurationIds[0]! : `configs-${configurationIds.length}`;
  return `${benchmarkLabel}-${configurationLabel}-r${repeat}`;
}

export function buildAnonymizedLabelMap(input: {
  runId: string;
  benchmarkIds: string[];
  configurationIds: ObservationTopologyConfigurationId[];
  repeat: number;
}): Record<string, { candidateLabel: string; configurationId: ObservationTopologyConfigurationId }> {
  const mapping: Record<string, { candidateLabel: string; configurationId: ObservationTopologyConfigurationId }> = {};

  for (const benchmarkId of input.benchmarkIds) {
    for (let repeatIndex = 1; repeatIndex <= input.repeat; repeatIndex += 1) {
      const ordered = [...input.configurationIds].sort((left, right) => {
        const leftHash = sha256Hex(`${input.runId}:${benchmarkId}:${repeatIndex}:${left}`);
        const rightHash = sha256Hex(`${input.runId}:${benchmarkId}:${repeatIndex}:${right}`);
        return leftHash.localeCompare(rightHash);
      });
      ordered.forEach((configurationId, index) => {
        mapping[`${benchmarkId}:${repeatIndex}:${configurationId}`] = {
          candidateLabel: CANDIDATE_LABELS[index] ?? `Candidate ${index + 1}`,
          configurationId,
        };
      });
    }
  }

  return mapping;
}

export async function runObservationTopologyExperiment(args: ObservationTopologyExperimentCliArgs): Promise<ObservationTopologyExperimentRunResult> {
  const parsedCorpus = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });
  const corpusById = new Map(parsedCorpus.items.map((item) => [item.benchmarkId, item]));
  const repositoryState = await readObservationBenchmarkRepositoryState();
  const fingerprints = await captureObservationTopologyExperimentFingerprints();
  const startedAt = new Date();
  const resumeRunDirectory = args.resumeRunDirectory;
  const benchmarkIds = resumeRunDirectory
    ? []
    : await resolveSelectedBenchmarkIds({
      benchmarkIds: args.benchmarkIds,
      benchmarkClass: args.benchmarkClass,
    });

  const runContext = resumeRunDirectory
    ? await (async () => {
      const resolvedResumeRunDirectory = path.resolve(resumeRunDirectory);
      const checkpoint = await loadObservationTopologyExperimentRunCheckpoint(resolvedResumeRunDirectory);
      const existingExecutions = await loadObservationTopologyExperimentCompletedExecutions(resolvedResumeRunDirectory);
      return {
        runId: String(checkpoint.manifest.runId ?? path.basename(resolvedResumeRunDirectory)),
        runDirectory: resolvedResumeRunDirectory,
        benchmarkIds: checkpoint.benchmarkIds,
        configurationIds: checkpoint.configurationIds,
        repeat: checkpoint.repeat,
        manifest: checkpoint.manifest,
        anonymizationMap: checkpoint.anonymizationMap,
        executions: existingExecutions,
      };
    })()
    : await (async () => {
      const selectionLabel = buildSelectionLabel(benchmarkIds, args.configurationIds, args.repeat);
      const allocated = await allocateObservationTopologyExperimentRunDirectory({
        outputRoot: args.outputRoot,
        startedAt,
        shortRepositorySha: repositoryState.shortCommitSha,
        selectionLabel,
      });
      const anonymizationMap = buildAnonymizedLabelMap({
        runId: allocated.runId,
        benchmarkIds,
        configurationIds: args.configurationIds,
        repeat: args.repeat,
      });
      const manifest = {
        schemaVersion: "1",
        runId: allocated.runId,
        benchmarkIds,
        configurationIds: args.configurationIds,
        repeat: args.repeat,
        repositoryState,
        sharedBenchmarkInfrastructure: fingerprints.sharedBenchmarkInfrastructure,
        configurationFingerprints: fingerprints.configurations,
      };
      await writeObservationTopologyExperimentRunCheckpoint({
        runDirectory: allocated.runDirectory,
        checkpoint: {
          schemaVersion: "1",
          manifest,
          benchmarkIds,
          configurationIds: args.configurationIds,
          repeat: args.repeat,
          anonymizationMap,
        },
      });
      return {
        runId: allocated.runId,
        runDirectory: allocated.runDirectory,
        benchmarkIds,
        configurationIds: args.configurationIds,
        repeat: args.repeat,
        manifest,
        anonymizationMap,
        executions: [] as ObservationTopologyExecutionResult[],
      };
    })();

  const executionMap = new Map(
    runContext.executions.map((execution) => [executionKey(execution.benchmarkId, execution.repeatIndex, execution.configurationId), execution] as const),
  );

  try {
    for (const benchmarkId of runContext.benchmarkIds) {
      const corpusItem = corpusById.get(benchmarkId);
      if (!corpusItem) {
        throw new Error(`Benchmark ${benchmarkId} is missing from the corpus.`);
      }

      const sourceFingerprint = hashObservationBenchmarkDreamText(corpusItem.dreamText);
      for (let repeatIndex = 1; repeatIndex <= runContext.repeat; repeatIndex += 1) {
        for (const configurationId of runContext.configurationIds) {
          const key = executionKey(benchmarkId, repeatIndex, configurationId);
          if (executionMap.has(key)) {
            continue;
          }
          const anonymizationEntry = runContext.anonymizationMap[`${benchmarkId}:${repeatIndex}:${configurationId}`] as {
            candidateLabel?: string;
          } | undefined;
          const anonymizedCandidateLabel = anonymizationEntry?.candidateLabel ?? "Candidate";
          const execution = await CONFIGURATIONS[configurationId].execute({
            benchmarkId,
            repeatIndex,
            dreamText: corpusItem.dreamText,
            sourceFingerprint,
            topologyImplementationFingerprint: fingerprints.configurations[configurationId].fileHash,
            anonymizedCandidateLabel,
          });
          execution.promptFingerprint = fingerprints.configurations[configurationId].promptFingerprint;
          execution.schemaFingerprint = fingerprints.configurations[configurationId].schemaFingerprint;
          execution.provider ??= "openai";
          execution.model ??= fingerprints.sharedBenchmarkInfrastructure.extractor.modelIdentifier;
          execution.summary.anonymizedCandidateLabel = anonymizedCandidateLabel;
          executionMap.set(key, execution);
          await writeObservationTopologyExperimentArtifacts({
            runDirectory: runContext.runDirectory,
            execution,
          });
        }
      }
    }

    const executions = buildOrderedExecutions({
      benchmarkIds: runContext.benchmarkIds,
      configurationIds: runContext.configurationIds,
      repeat: runContext.repeat,
      executionMap,
    });
    const runStatus: ObservationTopologyRunStatus = executions.every((execution) => execution.success)
      ? "completed"
      : "completed_with_failures";

    await writeObservationTopologyExperimentRunArtifacts({
      runDirectory: runContext.runDirectory,
      runStatus,
      manifest: runContext.manifest,
      executions,
      anonymizationMap: runContext.anonymizationMap,
    });

    return {
      runId: runContext.runId,
      artifactDirectory: runContext.runDirectory,
      runStatus,
      executions,
    };
  } catch (error) {
    await finalizeObservationTopologyExperimentRunFromCheckpoint({
      runDirectory: runContext.runDirectory,
      runStatus: "aborted",
      topLevelError: {
        message: error instanceof Error ? error.message : "unknown_error",
      },
    });
    throw error;
  }
}

function executionKey(
  benchmarkId: string,
  repeatIndex: number,
  configurationId: ObservationTopologyConfigurationId,
): string {
  return `${benchmarkId}:${repeatIndex}:${configurationId}`;
}

function buildOrderedExecutions(input: {
  benchmarkIds: string[];
  configurationIds: ObservationTopologyConfigurationId[];
  repeat: number;
  executionMap: Map<string, ObservationTopologyExecutionResult>;
}): ObservationTopologyExecutionResult[] {
  const executions: ObservationTopologyExecutionResult[] = [];

  for (const benchmarkId of input.benchmarkIds) {
    for (let repeatIndex = 1; repeatIndex <= input.repeat; repeatIndex += 1) {
      for (const configurationId of input.configurationIds) {
        const execution = input.executionMap.get(executionKey(benchmarkId, repeatIndex, configurationId));
        if (execution) {
          executions.push(execution);
        }
      }
    }
  }

  return executions;
}
