import fs from "node:fs/promises";
import path from "node:path";

import {
  hashObservationBenchmarkDreamText,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import type {
  ObservationV3ReplayDiscoveredRoots,
  ObservationV3ReplayMatrix,
} from "@/src/cognition/observation-v3/pipeline/replay/replay-types";

async function directoryExists(directoryPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(directoryPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function discoverDirectoriesWithFile(root: string, fileName: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    let found = false;
    for (const entry of entries) {
      if (entry.isFile() && entry.name === fileName) {
        found = true;
      }
    }
    if (found) {
      results.push(current);
      return;
    }
    for (const entry of entries.filter((value) => value.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
      await walk(path.join(current, entry.name));
    }
  }

  if (await directoryExists(root)) {
    await walk(root);
  }

  return results.sort((left, right) => left.localeCompare(right));
}

async function discoverRunDirectories(root: string): Promise<string[]> {
  if (!await directoryExists(root)) {
    return [];
  }
  const entries = await fs.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export async function discoverObservationV3ReplayRoots(input: {
  validationRoot: string;
}): Promise<ObservationV3ReplayDiscoveredRoots> {
  const validationRoot = path.resolve(input.validationRoot);

  const baselineBenchmarkRoots = await discoverRunDirectories(path.join(validationRoot, "observation-benchmark", "runs"));
  const topologyExperimentRoots = await discoverRunDirectories(path.join(validationRoot, "observation-topology-experiments", "runs"));
  const completenessRoots = await discoverDirectoriesWithFile(
    path.join(validationRoot, "observation-v3", "completeness-calibration"),
    "calibration-summary.json",
  );
  const authorityAdmissionRoots = await discoverDirectoriesWithFile(
    path.join(validationRoot, "observation-v3", "authority-admission-shadow"),
    "review-manifest.json",
  );
  const pipelineRoots = await discoverDirectoriesWithFile(
    path.join(validationRoot, "observation-v3"),
    "pipeline-summary.json",
  );

  return {
    baselineBenchmarkRoots,
    topologyExperimentRoots,
    completenessRoots,
    supplementalRealizationRoots: topologyExperimentRoots,
    authorityAdmissionRoots,
    pipelineRoots,
  };
}

export async function loadObservationV3BenchmarkMatrix(input: {
  corpusPath: string;
  expectedBenchmarkOrder: readonly string[];
  validationRoot: string;
}): Promise<ObservationV3ReplayMatrix> {
  const [parsedCorpus, discovery] = await Promise.all([
    parseObservationBenchmarkCorpusFile({
      sourcePath: input.corpusPath,
      expectedBenchmarkOrder: input.expectedBenchmarkOrder,
    }),
    discoverObservationV3ReplayRoots({
      validationRoot: input.validationRoot,
    }),
  ]);

  return {
    discovery,
    cases: parsedCorpus.items.map((item) => ({
      benchmarkId: item.benchmarkId,
      dreamText: item.dreamText,
      sourceHash: hashObservationBenchmarkDreamText(item.dreamText),
      sourceLength: item.dreamText.length,
    })),
  };
}
