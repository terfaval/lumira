import fs from "node:fs/promises";
import path from "node:path";

import {
  countObservationBenchmarkDreamTextBytes,
  hashObservationBenchmarkDreamText,
  hashObservationBenchmarkSourceFile,
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusContent,
} from "./observation-benchmark-corpus-parser.ts";

export const OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH =
  "docs/v2-build/validation-benchmark/Observation-Benchmark-Corpus-Manifest-v1.json";

export interface ObservationBenchmarkCorpusManifestItem {
  benchmarkId: string;
  sourceDate: string;
  benchmarkFamily: string;
  stressTargets: string[];
  secondaryTags: string[];
  expectedEvaluationFocus: string[];
  source: {
    heading: string;
    startLine: number;
    endLine: number;
    dreamTextStartLine: number;
    dreamTextEndLine: number;
  };
  dreamTextHash: string;
  dreamTextByteLength: number;
  dreamTextCharacterLength: number;
}

export interface ObservationBenchmarkCorpusManifest {
  schemaVersion: "1";
  corpusVersion: "1";
  authority: {
    sourcePath: string;
    sourceFileHash: string;
    hashAlgorithm: "sha256";
  };
  benchmarkCount: number;
  benchmarkOrder: string[];
  items: ObservationBenchmarkCorpusManifestItem[];
}

interface BuildObservationBenchmarkCorpusManifestInput {
  sourcePath?: string;
  expectedBenchmarkOrder?: readonly string[];
}

interface WriteObservationBenchmarkCorpusManifestInput {
  sourcePath?: string;
  manifestPath?: string;
  expectedBenchmarkOrder?: readonly string[];
}

interface CheckObservationBenchmarkCorpusManifestInput {
  sourcePath?: string;
  manifestPath?: string;
  expectedBenchmarkOrder?: readonly string[];
}

export interface ObservationBenchmarkCorpusManifestResult {
  manifest: ObservationBenchmarkCorpusManifest;
  manifestJson: string;
  sourceFileHash: string;
  benchmarkCount: number;
  outputPath?: string;
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

export function renderObservationBenchmarkCorpusManifest(
  manifest: ObservationBenchmarkCorpusManifest,
): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export async function buildObservationBenchmarkCorpusManifest(
  input: BuildObservationBenchmarkCorpusManifestInput = {},
): Promise<ObservationBenchmarkCorpusManifestResult> {
  const sourcePath = input.sourcePath ?? defaultSourcePath();
  const expectedBenchmarkOrder = input.expectedBenchmarkOrder ?? defaultExpectedBenchmarkOrder();
  const resolvedSourcePath = path.resolve(sourcePath);
  const sourceBuffer = await fs.readFile(resolvedSourcePath);
  const sourceContent = sourceBuffer.toString("utf8");
  const parsed = parseObservationBenchmarkCorpusContent({
    content: sourceContent,
    sourcePath,
    expectedBenchmarkOrder,
  });

  const sourceFileHash = hashObservationBenchmarkSourceFile(sourceBuffer);
  const manifest: ObservationBenchmarkCorpusManifest = {
    schemaVersion: "1",
    corpusVersion: "1",
    authority: {
      sourcePath,
      sourceFileHash,
      hashAlgorithm: "sha256",
    },
    benchmarkCount: parsed.benchmarkCount,
    benchmarkOrder: [...parsed.benchmarkOrder],
    items: parsed.items.map((item) => ({
      benchmarkId: item.benchmarkId,
      sourceDate: item.sourceDate,
      benchmarkFamily: item.benchmarkFamily,
      stressTargets: [...item.stressTargets],
      secondaryTags: [...item.secondaryTags],
      expectedEvaluationFocus: [...item.expectedEvaluationFocus],
      source: {
        ...item.source,
      },
      dreamTextHash: hashObservationBenchmarkDreamText(item.dreamText),
      dreamTextByteLength: countObservationBenchmarkDreamTextBytes(item.dreamText),
      dreamTextCharacterLength: item.dreamText.length,
    })),
  };

  return {
    manifest,
    manifestJson: renderObservationBenchmarkCorpusManifest(manifest),
    sourceFileHash,
    benchmarkCount: parsed.benchmarkCount,
  };
}

export async function writeObservationBenchmarkCorpusManifest(
  input: WriteObservationBenchmarkCorpusManifestInput = {},
): Promise<ObservationBenchmarkCorpusManifestResult> {
  const manifestPath = input.manifestPath ?? defaultManifestPath();
  const result = await buildObservationBenchmarkCorpusManifest({
    sourcePath: input.sourcePath,
    expectedBenchmarkOrder: input.expectedBenchmarkOrder,
  });

  await fs.mkdir(path.dirname(path.resolve(manifestPath)), { recursive: true });
  await fs.writeFile(path.resolve(manifestPath), result.manifestJson, "utf8");

  return {
    ...result,
    outputPath: manifestPath,
  };
}

export async function checkObservationBenchmarkCorpusManifest(
  input: CheckObservationBenchmarkCorpusManifestInput = {},
): Promise<ObservationBenchmarkCorpusManifestResult> {
  const manifestPath = input.manifestPath ?? defaultManifestPath();
  const generated = await buildObservationBenchmarkCorpusManifest({
    sourcePath: input.sourcePath,
    expectedBenchmarkOrder: input.expectedBenchmarkOrder,
  });

  let committedManifest: string;
  try {
    committedManifest = await fs.readFile(path.resolve(manifestPath), "utf8");
  } catch (error) {
    throw new Error(
      `Observation benchmark manifest is missing or unreadable at ${manifestPath}. Regenerate it explicitly.`,
      { cause: error },
    );
  }

  if (committedManifest !== generated.manifestJson) {
    throw new Error(
      `Observation benchmark manifest is stale at ${manifestPath}. Regenerate it explicitly.`,
    );
  }

  return {
    ...generated,
    outputPath: manifestPath,
  };
}
