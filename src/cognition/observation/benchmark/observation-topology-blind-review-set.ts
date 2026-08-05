import fs from "node:fs/promises";
import path from "node:path";

import {
  buildObservationBenchmarkRunId,
  hashStableJson,
  writeJsonAtomic,
} from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import { sha256Hex } from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";
import type { ObservationTopologyConfigurationId } from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";

const CANDIDATE_LABELS = ["Candidate X", "Candidate Y", "Candidate Z", "Candidate W"] as const;

interface SourceBlindReviewIndexEntry {
  benchmarkId: string;
  repeatIndex: number;
  candidateLabel: string;
  candidateArtifactRef?: string;
  candidateHash?: string;
  artifactDirectory?: string;
}

interface SourceAnonymizationMapEntry {
  candidateLabel: string;
  configurationId: ObservationTopologyConfigurationId;
}

export interface ObservationTopologyBlindReviewCandidateSource {
  runDirectory: string;
  benchmarkId: string;
  repeatIndex: number;
  configurationId: ObservationTopologyConfigurationId;
  comparatorLabel: string;
}

export interface ObservationTopologyBlindReviewBenchmarkSpec {
  benchmarkId: string;
  candidateSources: ObservationTopologyBlindReviewCandidateSource[];
}

export interface ObservationTopologyBlindReviewSetSpec {
  reviewLabel: string;
  benchmarks: ObservationTopologyBlindReviewBenchmarkSpec[];
}

export interface ObservationTopologyBlindReviewSetResult {
  reviewSetId: string;
  reviewSetDirectory: string;
}

function normalizeRunDirectory(runDirectory: string): string {
  return path.resolve(runDirectory);
}

async function allocateBlindReviewSetDirectory(input: {
  outputRoot: string;
  startedAt: Date;
  reviewLabel: string;
}): Promise<{ reviewSetId: string; reviewSetDirectory: string }> {
  const resolvedOutputRoot = path.resolve(input.outputRoot);
  await fs.mkdir(resolvedOutputRoot, { recursive: true });

  for (let attempt = 1; attempt <= 99; attempt += 1) {
    const reviewSetId = buildObservationBenchmarkRunId({
      startedAt: input.startedAt,
      shortRepositorySha: "reviewset",
      selectionLabel: input.reviewLabel,
      attempt,
    });
    const reviewSetDirectory = path.join(resolvedOutputRoot, reviewSetId);

    try {
      await fs.mkdir(reviewSetDirectory);
      return { reviewSetId, reviewSetDirectory };
    } catch (error) {
      const errorRecord = error as NodeJS.ErrnoException;
      if (errorRecord.code !== "EEXIST") {
        throw error;
      }
    }
  }

  throw new Error("Unable to allocate a unique observation topology blind review set directory.");
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function resolveCandidateSource(
  source: ObservationTopologyBlindReviewCandidateSource,
): Promise<{
  sourceRunId: string;
  sourceCandidateLabel: string;
  sourceCandidateHash: string;
  sourceArtifact: unknown;
  sourceCandidateArtifactRef: string;
}> {
  const runDirectory = normalizeRunDirectory(source.runDirectory);
  const sourceRunId = path.basename(runDirectory);
  const sourceAnonymizationMap = await readJsonFile<Record<string, SourceAnonymizationMapEntry>>(
    path.join(runDirectory, "blind-review-anonymization-map.json"),
  );
  const sourceIndex = await readJsonFile<SourceBlindReviewIndexEntry[]>(
    path.join(runDirectory, "blind-review-index.json"),
  );
  const mapKey = `${source.benchmarkId}:${source.repeatIndex}:${source.configurationId}`;
  const anonymizedEntry = sourceAnonymizationMap[mapKey];

  if (!anonymizedEntry) {
    throw new Error(`Missing anonymization entry for ${mapKey} in ${runDirectory}.`);
  }

  const matchingIndexEntry = sourceIndex.find((entry) =>
    entry.benchmarkId === source.benchmarkId &&
    entry.repeatIndex === source.repeatIndex &&
    entry.candidateLabel === anonymizedEntry.candidateLabel,
  );

  if (!matchingIndexEntry) {
    throw new Error(`Missing blind review index entry for ${mapKey} in ${runDirectory}.`);
  }

  const sourceCandidateArtifactRef = matchingIndexEntry.candidateArtifactRef
    ?? (matchingIndexEntry.artifactDirectory
      ? path.join(matchingIndexEntry.artifactDirectory, "final-representation.json")
      : null);
  if (!sourceCandidateArtifactRef) {
    throw new Error(`Missing candidate artifact reference for ${mapKey} in ${runDirectory}.`);
  }

  const sourceArtifactPath = path.join(runDirectory, sourceCandidateArtifactRef);
  const sourceArtifact = await readJsonFile<unknown>(sourceArtifactPath);
  const sourceCandidateHash = matchingIndexEntry.candidateHash ?? hashStableJson(sourceArtifact);

  return {
    sourceRunId,
    sourceCandidateLabel: anonymizedEntry.candidateLabel,
    sourceCandidateHash,
    sourceArtifact,
    sourceCandidateArtifactRef,
  };
}

function buildBenchmarkCandidateOrder(input: {
  benchmarkId: string;
  candidateSources: ObservationTopologyBlindReviewCandidateSource[];
}): ObservationTopologyBlindReviewCandidateSource[] {
  return [...input.candidateSources].sort((left, right) => {
    const leftKey = sha256Hex([
      input.benchmarkId,
      normalizeRunDirectory(left.runDirectory),
      left.repeatIndex,
      left.configurationId,
      left.comparatorLabel,
    ].join(":"));
    const rightKey = sha256Hex([
      input.benchmarkId,
      normalizeRunDirectory(right.runDirectory),
      right.repeatIndex,
      right.configurationId,
      right.comparatorLabel,
    ].join(":"));

    return leftKey.localeCompare(rightKey);
  });
}

export async function generateObservationTopologyBlindReviewSet(input: {
  spec: ObservationTopologyBlindReviewSetSpec;
  outputRoot: string;
}): Promise<ObservationTopologyBlindReviewSetResult> {
  const startedAt = new Date();
  const allocated = await allocateBlindReviewSetDirectory({
    outputRoot: input.outputRoot,
    startedAt,
    reviewLabel: input.spec.reviewLabel,
  });
  const candidatesDirectory = path.join(allocated.reviewSetDirectory, "candidates");
  await fs.mkdir(candidatesDirectory, { recursive: true });

  const publicBlindReviewIndex: Array<{
    benchmarkId: string;
    candidateLabel: string;
    candidateArtifactRef: string;
    candidateHash: string;
  }> = [];
  const privateAnonymizationMap: Record<string, unknown> = {};

  for (const benchmark of input.spec.benchmarks) {
    const orderedSources = buildBenchmarkCandidateOrder({
      benchmarkId: benchmark.benchmarkId,
      candidateSources: benchmark.candidateSources,
    });

    for (const [index, source] of orderedSources.entries()) {
      const candidateLabel = CANDIDATE_LABELS[index] ?? `Candidate ${index + 1}`;
      const resolvedSource = await resolveCandidateSource(source);
      const candidateArtifactId = `candidate-${hashStableJson({
        benchmarkId: benchmark.benchmarkId,
        candidateLabel,
        sourceCandidateHash: resolvedSource.sourceCandidateHash,
      }).slice(0, 16)}`;
      const candidateArtifactRef = path.join("candidates", `${candidateArtifactId}.json`);

      await writeJsonAtomic(
        path.join(allocated.reviewSetDirectory, candidateArtifactRef),
        resolvedSource.sourceArtifact,
      );

      publicBlindReviewIndex.push({
        benchmarkId: benchmark.benchmarkId,
        candidateLabel,
        candidateArtifactRef,
        candidateHash: resolvedSource.sourceCandidateHash,
      });

      privateAnonymizationMap[`${benchmark.benchmarkId}:${candidateLabel}`] = {
        benchmarkId: benchmark.benchmarkId,
        candidateLabel,
        comparatorLabel: source.comparatorLabel,
        sourceRunId: resolvedSource.sourceRunId,
        sourceRunDirectory: normalizeRunDirectory(source.runDirectory),
        sourceBenchmarkId: source.benchmarkId,
        sourceRepeatIndex: source.repeatIndex,
        sourceConfigurationId: source.configurationId,
        sourceCandidateLabel: resolvedSource.sourceCandidateLabel,
        sourceCandidateArtifactRef: resolvedSource.sourceCandidateArtifactRef,
        sourceCandidateHash: resolvedSource.sourceCandidateHash,
      };
    }
  }

  await writeJsonAtomic(path.join(allocated.reviewSetDirectory, "review-set-manifest.json"), {
    reviewSetId: allocated.reviewSetId,
    generatedAt: startedAt.toISOString(),
    reviewLabel: input.spec.reviewLabel,
    benchmarkIds: input.spec.benchmarks.map((benchmark) => benchmark.benchmarkId),
  });
  await writeJsonAtomic(
    path.join(allocated.reviewSetDirectory, "blind-review-index.json"),
    publicBlindReviewIndex,
  );
  await writeJsonAtomic(
    path.join(allocated.reviewSetDirectory, "blind-review-anonymization-map.json"),
    privateAnonymizationMap,
  );

  return {
    reviewSetId: allocated.reviewSetId,
    reviewSetDirectory: allocated.reviewSetDirectory,
  };
}
