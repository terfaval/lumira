import fs from "node:fs/promises";
import path from "node:path";

import {
  buildObservationBenchmarkRunId,
  hashStableJson,
  writeJsonAtomic,
} from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import { persistProviderEvidenceArtifact } from "@/src/cognition/observation-v3/provider-evidence";
import type {
  ObservationTopologyConfigurationId,
  ObservationTopologyExecutionResult,
  ObservationTopologyExecutionSummary,
  ObservationTopologyRunStatus,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";

function resolveSupplementalReplayIdentity(entry: NonNullable<ObservationTopologyExecutionResult["supplementalProviderEvidence"]>[number]): {
  targetId: string;
  physicalGapId: string | null;
} {
  const providerMetadata = entry.evidence.providerBoundary.providerMetadata as {
    targetId?: string;
    physicalGapId?: string;
  } | null;

  return {
    targetId: entry.evidence.attemptIdentity.targetId
      ?? providerMetadata?.targetId
      ?? entry.targetId,
    physicalGapId: entry.physicalGapId
      ?? providerMetadata?.physicalGapId
      ?? null,
  };
}

export interface ObservationTopologyExperimentRunCheckpoint {
  schemaVersion: "1";
  manifest: Record<string, unknown>;
  benchmarkIds: string[];
  configurationIds: ObservationTopologyConfigurationId[];
  repeat: number;
  anonymizationMap: Record<string, unknown>;
}

export async function allocateObservationTopologyExperimentRunDirectory(input: {
  outputRoot: string;
  startedAt: Date;
  shortRepositorySha: string;
  selectionLabel: string;
}): Promise<{ runId: string; runDirectory: string }> {
  const resolvedOutputRoot = path.resolve(input.outputRoot);
  await fs.mkdir(resolvedOutputRoot, { recursive: true });

  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const runId = buildObservationBenchmarkRunId({
      startedAt: input.startedAt,
      shortRepositorySha: input.shortRepositorySha,
      selectionLabel: input.selectionLabel,
      attempt,
    });
    const runDirectory = path.join(resolvedOutputRoot, runId);

    try {
      await fs.mkdir(runDirectory);
      return { runId, runDirectory };
    } catch (error) {
      const errorRecord = error as NodeJS.ErrnoException;
      if (errorRecord.code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new Error("Unable to allocate a unique observation topology experiment run directory.");
}

export async function writeObservationTopologyExperimentArtifacts(input: {
  runDirectory: string;
  execution: ObservationTopologyExecutionResult;
}): Promise<void> {
  const configurationDirectory = path.join(
    input.runDirectory,
    "items",
    input.execution.benchmarkId,
    input.execution.configurationId,
    `repeat-${String(input.execution.repeatIndex).padStart(2, "0")}`,
  );
  const stagesDirectory = path.join(configurationDirectory, "stages");

  await fs.mkdir(stagesDirectory, { recursive: true });

  await writeJsonAtomic(path.join(configurationDirectory, "summary.json"), input.execution.summary);
  await writeJsonAtomic(path.join(configurationDirectory, "diagnostics.json"), input.execution.diagnostics);
  await writeJsonAtomic(path.join(configurationDirectory, "completeness.json"), input.execution.completeness);
  await writeJsonAtomic(path.join(configurationDirectory, "fingerprints.json"), {
    provider: input.execution.provider,
    model: input.execution.model,
    promptFingerprint: input.execution.promptFingerprint,
    schemaFingerprint: input.execution.schemaFingerprint,
    topologyImplementationFingerprint: input.execution.topologyImplementationFingerprint,
    sourceFingerprint: input.execution.sourceFingerprint,
  });
  await writeJsonAtomic(path.join(configurationDirectory, "attempt-evidence.json"), input.execution.attempts);
  await writeJsonAtomic(path.join(configurationDirectory, "final-representation.json"), input.execution.finalRepresentation);

  for (const evidence of input.execution.descriptiveProviderEvidence ?? []) {
    const attemptDirectory = path.join(
      configurationDirectory,
      "attempts",
      `attempt-${String(evidence.attemptIdentity.attemptNumber).padStart(2, "0")}`,
    );
    await fs.mkdir(attemptDirectory, { recursive: true });
    const persisted = await persistProviderEvidenceArtifact({
      destinationPath: path.join(attemptDirectory, "descriptive-provider-evidence.json"),
      evidence,
    });
    await writeJsonAtomic(
      path.join(attemptDirectory, "descriptive-provider-evidence.receipt.json"),
      persisted.receipt,
    );
  }

  if ((input.execution.supplementalProviderEvidence ?? []).length > 0) {
    const supplementalDirectory = path.join(configurationDirectory, "supplemental-provider-evidence");
    await fs.mkdir(supplementalDirectory, { recursive: true });
    const supplementalIndex = [];

    for (const entry of input.execution.supplementalProviderEvidence ?? []) {
      const replayIdentity = resolveSupplementalReplayIdentity(entry);
      const artifactFileName = `${replayIdentity.targetId}-attempt-${String(entry.providerAttemptNumber).padStart(2, "0")}.json`;
      const receiptFileName = `${replayIdentity.targetId}-attempt-${String(entry.providerAttemptNumber).padStart(2, "0")}.receipt.json`;
      const persisted = await persistProviderEvidenceArtifact({
        destinationPath: path.join(supplementalDirectory, artifactFileName),
        evidence: entry.evidence,
      });
      await writeJsonAtomic(path.join(supplementalDirectory, receiptFileName), persisted.receipt);
      const indexEntry: Record<string, unknown> = {
        requestId: entry.requestId,
        targetId: replayIdentity.targetId,
        providerAttemptNumber: entry.providerAttemptNumber,
        retryParentAttemptIdentity: entry.retryParentAttemptIdentity,
        evidenceArtifactRef: path.join("supplemental-provider-evidence", artifactFileName),
        evidenceReceiptRef: path.join("supplemental-provider-evidence", receiptFileName),
        captureCompleteness: entry.evidence.evidenceLifecycle,
        replayCompatibility: entry.evidence.compatibility,
      };
      if (replayIdentity.physicalGapId) {
        indexEntry.physicalGapId = replayIdentity.physicalGapId;
      }
      supplementalIndex.push(indexEntry);
    }

    await writeJsonAtomic(
      path.join(configurationDirectory, "supplemental-provider-evidence-index.json"),
      supplementalIndex,
    );
  }

  for (const [artifactName, artifactValue] of Object.entries(input.execution.artifacts ?? {})) {
    await writeJsonAtomic(path.join(configurationDirectory, `${artifactName}.json`), artifactValue);
  }

  for (const stage of input.execution.stages) {
    const label = `${String(stage.order).padStart(2, "0")}-${stage.stageType}.json`;
    await writeJsonAtomic(path.join(stagesDirectory, label), stage);
  }
}

export async function writeObservationTopologyExperimentRunArtifacts(input: {
  runDirectory: string;
  runStatus: ObservationTopologyRunStatus;
  manifest: Record<string, unknown>;
  executions: ObservationTopologyExecutionResult[];
  topLevelError?: { message: string } | null;
  anonymizationMap: Record<string, unknown>;
}): Promise<void> {
  const benchmarkIndex: Record<string, unknown> = {};
  const flatSummary: ObservationTopologyExecutionSummary[] = [];
  const blindReviewDirectory = path.join(input.runDirectory, "blind-review", "candidates");

  await fs.mkdir(blindReviewDirectory, { recursive: true });

  for (const execution of input.executions) {
    const key = `${execution.benchmarkId}:${execution.configurationId}:repeat-${execution.repeatIndex}`;
    benchmarkIndex[key] = {
      benchmarkId: execution.benchmarkId,
      configurationId: execution.configurationId,
      repeatIndex: execution.repeatIndex,
      finalStatus: execution.summary.finalStatus,
      artifactDirectory: path.join(
        "items",
        execution.benchmarkId,
        execution.configurationId,
        `repeat-${String(execution.repeatIndex).padStart(2, "0")}`,
      ),
      summaryHash: hashStableJson(execution.summary),
      sourceFingerprint: execution.sourceFingerprint,
    };
    flatSummary.push(execution.summary);
  }

  await writeJsonAtomic(path.join(input.runDirectory, "experiment-manifest.json"), {
    ...input.manifest,
    runStatus: input.runStatus,
    topLevelError: input.topLevelError ?? null,
  });
  await writeJsonAtomic(path.join(input.runDirectory, "benchmark-index.json"), benchmarkIndex);
  await writeJsonAtomic(path.join(input.runDirectory, "experiment-summary.json"), {
    runStatus: input.runStatus,
    totalExecutions: flatSummary.length,
    successfulExecutions: flatSummary.filter((summary) => summary.success).length,
    failedExecutions: flatSummary.filter((summary) => !summary.success).length,
    summaries: flatSummary,
  });
  const blindReviewIndex = [];
  for (const summary of flatSummary) {
    const matchingExecution = input.executions.find((execution) =>
      execution.benchmarkId === summary.benchmarkId &&
      execution.repeatIndex === summary.repeatIndex &&
      execution.summary.anonymizedCandidateLabel === summary.anonymizedCandidateLabel,
    );

    const candidateArtifactId = `candidate-${hashStableJson({
      benchmarkId: summary.benchmarkId,
      repeatIndex: summary.repeatIndex,
      candidateLabel: summary.anonymizedCandidateLabel,
    }).slice(0, 16)}`;
    await writeJsonAtomic(
      path.join(blindReviewDirectory, `${candidateArtifactId}.json`),
      matchingExecution?.finalRepresentation,
    );
    blindReviewIndex.push({
      benchmarkId: summary.benchmarkId,
      repeatIndex: summary.repeatIndex,
      candidateLabel: summary.anonymizedCandidateLabel,
      candidateArtifactRef: path.join("blind-review", "candidates", `${candidateArtifactId}.json`),
      candidateHash: matchingExecution?.finalRepresentation
        ? hashStableJson(matchingExecution.finalRepresentation)
        : hashStableJson(matchingExecution?.summary ?? summary),
    });
  }
  await writeJsonAtomic(path.join(input.runDirectory, "blind-review-index.json"), blindReviewIndex);
  await writeJsonAtomic(path.join(input.runDirectory, "blind-review-anonymization-map.json"), input.anonymizationMap);
}

export async function writeObservationTopologyExperimentRunCheckpoint(input: {
  runDirectory: string;
  checkpoint: ObservationTopologyExperimentRunCheckpoint;
}): Promise<void> {
  await writeJsonAtomic(
    path.join(input.runDirectory, "run-plan.json"),
    input.checkpoint,
  );
}

export async function loadObservationTopologyExperimentRunCheckpoint(runDirectory: string): Promise<ObservationTopologyExperimentRunCheckpoint> {
  return JSON.parse(
    await fs.readFile(path.join(runDirectory, "run-plan.json"), "utf8"),
  ) as ObservationTopologyExperimentRunCheckpoint;
}

export async function loadObservationTopologyExperimentCompletedExecutions(runDirectory: string): Promise<ObservationTopologyExecutionResult[]> {
  const itemsRoot = path.join(runDirectory, "items");
  try {
    const benchmarkEntries = await fs.readdir(itemsRoot, { withFileTypes: true });
    const executions: ObservationTopologyExecutionResult[] = [];

    for (const benchmarkEntry of benchmarkEntries.filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
      const benchmarkDirectory = path.join(itemsRoot, benchmarkEntry.name);
      const configurationEntries = await fs.readdir(benchmarkDirectory, { withFileTypes: true });

      for (const configurationEntry of configurationEntries.filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
        const configurationDirectory = path.join(benchmarkDirectory, configurationEntry.name);
        const repeatEntries = await fs.readdir(configurationDirectory, { withFileTypes: true });

        for (const repeatEntry of repeatEntries.filter((entry) => entry.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
          const repeatDirectory = path.join(configurationDirectory, repeatEntry.name);
          executions.push(await loadObservationTopologyExecutionResultFromArtifacts(repeatDirectory));
        }
      }
    }

    return executions;
  } catch (error) {
    const errorRecord = error as NodeJS.ErrnoException;
    if (errorRecord.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function finalizeObservationTopologyExperimentRunFromCheckpoint(input: {
  runDirectory: string;
  runStatus?: ObservationTopologyRunStatus;
  topLevelError?: { message: string } | null;
}): Promise<ObservationTopologyExecutionResult[]> {
  const [checkpoint, executions] = await Promise.all([
    loadObservationTopologyExperimentRunCheckpoint(input.runDirectory),
    loadObservationTopologyExperimentCompletedExecutions(input.runDirectory),
  ]);
  const runStatus = input.runStatus
    ?? (executions.every((execution) => execution.success) ? "completed" : "completed_with_failures");

  await writeObservationTopologyExperimentRunArtifacts({
    runDirectory: input.runDirectory,
    runStatus,
    manifest: checkpoint.manifest,
    executions,
    topLevelError: input.topLevelError ?? null,
    anonymizationMap: checkpoint.anonymizationMap,
  });

  return executions;
}

async function loadObservationTopologyExecutionResultFromArtifacts(
  repeatDirectory: string,
): Promise<ObservationTopologyExecutionResult> {
  const [
    summary,
    diagnostics,
    completeness,
    fingerprints,
    attempts,
    finalRepresentation,
    stages,
  ] = await Promise.all([
    readJsonIfExists<ObservationTopologyExecutionSummary>(path.join(repeatDirectory, "summary.json")),
    readJsonIfExists<Record<string, unknown>>(path.join(repeatDirectory, "diagnostics.json"), {}),
    readJsonIfExists<ObservationTopologyExecutionResult["completeness"]>(path.join(repeatDirectory, "completeness.json"), null),
    readJsonIfExists<{
      provider?: string | null;
      model?: string | null;
      promptFingerprint?: string | null;
      schemaFingerprint?: string | null;
      topologyImplementationFingerprint?: string;
      sourceFingerprint?: string;
    }>(path.join(repeatDirectory, "fingerprints.json"), {}),
    readJsonIfExists<ObservationTopologyExecutionResult["attempts"]>(path.join(repeatDirectory, "attempt-evidence.json"), []),
    readJsonIfExists<ObservationTopologyExecutionResult["finalRepresentation"]>(path.join(repeatDirectory, "final-representation.json"), null),
    readObservationTopologyStages(path.join(repeatDirectory, "stages")),
  ]);

  const pathParts = repeatDirectory.split(path.sep);
  const repeatSegment = pathParts[pathParts.length - 1] ?? "repeat-01";
  const configurationId = pathParts[pathParts.length - 2] as ObservationTopologyConfigurationId;
  const benchmarkId = pathParts[pathParts.length - 3] ?? "UNKNOWN";
  const repeatIndex = Number(repeatSegment.replace(/^repeat-/, "")) || 1;
  const startedAt = stages[0]?.startedAt ?? "1970-01-01T00:00:00.000Z";
  const completedAt = stages[stages.length - 1]?.completedAt ?? startedAt;

  return {
    benchmarkId,
    configurationId,
    repeatIndex,
    startedAt,
    completedAt,
    elapsedMs: summary?.elapsedMs ?? 0,
    success: summary?.success ?? false,
    provider: fingerprints.provider ?? null,
    model: fingerprints.model ?? null,
    promptFingerprint: fingerprints.promptFingerprint ?? null,
    schemaFingerprint: fingerprints.schemaFingerprint ?? null,
    topologyImplementationFingerprint: fingerprints.topologyImplementationFingerprint ?? "",
    sourceFingerprint: fingerprints.sourceFingerprint ?? "",
    stages,
    attempts,
    finalRepresentation,
    completeness,
    diagnostics,
    summary: summary ?? {
      benchmarkId,
      configurationId,
      repeatIndex,
      success: false,
      sceneOrRegionCount: 0,
      observationCount: 0,
      transitionCount: 0,
      evidenceSpanCoverage: null,
      lateSectionRetention: false,
      endingRetention: false,
      retryOrStageCount: 0,
      tokenUsageTotal: null,
      elapsedMs: 0,
      structuralCompleteness: "incomplete",
      artifactAvailable: false,
      finalStatus: "failed",
      failureReason: "missing_summary",
      anonymizedCandidateLabel: "Candidate",
    },
  };
}

async function readJsonIfExists<T>(filePath: string, fallback?: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch (error) {
    const errorRecord = error as NodeJS.ErrnoException;
    if (errorRecord.code === "ENOENT" && arguments.length > 1) {
      return fallback as T;
    }
    throw error;
  }
}

async function readObservationTopologyStages(stagesDirectory: string): Promise<ObservationTopologyExecutionResult["stages"]> {
  try {
    const entries = await fs.readdir(stagesDirectory, { withFileTypes: true });
    const stageFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
    return Promise.all(stageFiles.map((fileName) =>
      readJsonIfExists<ObservationTopologyExecutionResult["stages"][number]>(path.join(stagesDirectory, fileName)),
    ));
  } catch (error) {
    const errorRecord = error as NodeJS.ErrnoException;
    if (errorRecord.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
