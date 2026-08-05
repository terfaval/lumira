import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-manifest";

const execFileAsync = promisify(execFile);

export interface ObservationBenchmarkRepositoryState {
  commitSha: string;
  shortCommitSha: string;
  isDirty: boolean;
  hasUntrackedFiles: boolean;
  changedPaths: string[];
}

export interface ObservationBenchmarkFingerprintSet {
  corpus: {
    authorityPath: string;
    authorityHash: string;
    manifestPath: string;
    manifestHash: string;
  };
  extractor: {
    filePath: string;
    fileHash: string;
    promptFingerprint: string;
    promptFingerprintMode: "source_slice_hash" | "source_file_hash";
    schemaFingerprint: string;
    schemaFingerprintMode: "source_slice_hash" | "source_file_hash";
    modelIdentifier: string | null;
    timeoutMs: number | null;
    retryPolicy: string | null;
  };
  diagnostics: {
    filePath: string;
    fileHash: string;
    normalizationAuthorityPath: string;
    normalizationAuthorityHash: string;
  };
  derivedConstructor: {
    filePath: string;
    fileHash: string;
    promptFingerprint: string;
    promptFingerprintMode: "source_slice_hash" | "source_file_hash";
    schemaFingerprint: string;
    schemaFingerprintMode: "source_slice_hash" | "source_file_hash";
    modelIdentifier: string | null;
    timeoutMs: number | null;
  };
  runner: {
    fileHashes: Record<string, string>;
  };
  sourceAnalysis: {
    contractPath: string;
    contractHash: string;
    analyzerPath: string;
    analyzerHash: string;
  };
  completenessAnalysis: {
    contractPath: string;
    contractHash: string;
    analyzerPath: string;
    analyzerHash: string;
    rulesHash: string;
    equivalencePath: string;
    equivalenceHash: string;
  };
}

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

async function readUtf8(filePath: string): Promise<string> {
  return fs.readFile(path.resolve(filePath), "utf8");
}

function extractSourceSlice(source: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[0]) {
      return match[0];
    }
  }

  return null;
}

function fingerprintSourceSlice(input: {
  source: string;
  patterns: RegExp[];
  fileHash: string;
}): {
  fingerprint: string;
  mode: "source_slice_hash" | "source_file_hash";
} {
  const slice = extractSourceSlice(input.source, input.patterns);
  if (!slice) {
    return {
      fingerprint: input.fileHash,
      mode: "source_file_hash",
    };
  }

  return {
    fingerprint: sha256Hex(slice),
    mode: "source_slice_hash",
  };
}

function readConstString(source: string, constName: string): string | null {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*"([^"]+)"`, "m");
  return source.match(pattern)?.[1] ?? null;
}

function readConstNumber(source: string, constName: string): number | null {
  const pattern = new RegExp(`const\\s+${constName}\\s*=\\s*([\\d_]+)`, "m");
  const raw = source.match(pattern)?.[1];
  if (!raw) {
    return null;
  }

  const parsed = Number(raw.replaceAll("_", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function readRetryPolicy(source: string): string | null {
  if (
    source.includes('requestStructuredExtraction(2)') &&
    source.includes('"coverage_guard_failed"') &&
    source.includes('"overmerge_guard_failed"') &&
    source.includes('"late_section_guard_failed"')
  ) {
    return "same_topology_retry_max_attempts_2";
  }

  return null;
}

export async function readObservationBenchmarkRepositoryState(
  cwd = process.cwd(),
): Promise<ObservationBenchmarkRepositoryState> {
  const [{ stdout: commitShaStdout }, { stdout: shortShaStdout }, { stdout: statusStdout }] = await Promise.all([
    execFileAsync("git", ["rev-parse", "HEAD"], { cwd }),
    execFileAsync("git", ["rev-parse", "--short", "HEAD"], { cwd }),
    execFileAsync("git", ["status", "--short", "--untracked-files=all"], { cwd }),
  ]);

  const statusLines = statusStdout
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const changedPaths = statusLines.map((line) => line.slice(3));
  const hasUntrackedFiles = statusLines.some((line) => line.startsWith("?? "));

  return {
    commitSha: commitShaStdout.trim(),
    shortCommitSha: shortShaStdout.trim(),
    isDirty: statusLines.length > 0,
    hasUntrackedFiles,
    changedPaths,
  };
}

export async function captureObservationBenchmarkFingerprints(input?: {
  corpusAuthorityPath?: string;
  corpusManifestPath?: string;
}): Promise<ObservationBenchmarkFingerprintSet> {
  const corpusAuthorityPath = input?.corpusAuthorityPath ?? OBSERVATION_BENCHMARK_CORPUS_V1_PATH;
  const corpusManifestPath = input?.corpusManifestPath ?? OBSERVATION_BENCHMARK_CORPUS_MANIFEST_V1_PATH;

  const extractorPath = "src/cognition/observation-v3/descriptive-extraction/descriptive-extraction.ts";
  const descriptiveExtractionPromptPath = "src/cognition/observation-v3/descriptive-extraction/parser.ts";
  const descriptiveExtractionProviderPath = "src/cognition/observation-v3/descriptive-extraction/provider-adapter.ts";
  const orchestrationExtractorPath = "src/cognition/observation/llm-scene-observation-extractor.ts";
  const diagnosticsPath = "src/cognition/observation/llm-scene-observation-diagnostics.ts";
  const normalizationAuthorityPath = "src/domain/observation/v2-runtime.ts";
  const derivedConstructorPath = "src/cognition/observation/llm-derived-structure-constructor.ts";
  const runnerPath = "src/cognition/observation/benchmark/observation-benchmark-runner.ts";
  const artifactWriterPath = "src/cognition/observation/benchmark/observation-benchmark-artifact-writer.ts";
  const fingerprintPath = "src/cognition/observation/benchmark/observation-benchmark-fingerprint.ts";
  const runSummaryPath = "src/cognition/observation/benchmark/observation-benchmark-run-summary.ts";
  const corpusParserPath = "src/cognition/observation/benchmark/observation-benchmark-corpus-parser.ts";
  const corpusManifestModulePath = "src/cognition/observation/benchmark/observation-benchmark-corpus-manifest.ts";
  const scriptPath = "scripts/run-observation-benchmark.ts";
  const sourceAnalysisContractPath = "src/cognition/observation-v3/source-analysis/source-analysis-contract.ts";
  const sourceAnalysisAnalyzerPath = "src/cognition/observation-v3/source-analysis/source-analysis.ts";
  const completenessAnalysisContractPath = "src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract.ts";
  const completenessAnalysisAnalyzerPath = "src/cognition/observation-v3/completeness-analysis/completeness-analyzer.ts";
  const completenessAnalysisFingerprintPath = "src/cognition/observation-v3/completeness-analysis/fingerprint.ts";
  const completenessAnalysisEquivalencePath = "src/cognition/observation-v3/completeness-analysis/v2-equivalence.ts";

  const [
    corpusAuthorityHash,
    corpusManifestHash,
    extractorFileHash,
    diagnosticsFileHash,
    normalizationAuthorityHash,
    derivedFileHash,
    runnerFileHash,
    artifactWriterHash,
    fingerprintHash,
    runSummaryHash,
    corpusParserHash,
    corpusManifestModuleHash,
    scriptHash,
    sourceAnalysisContractHash,
    sourceAnalysisAnalyzerHash,
    completenessAnalysisContractHash,
    completenessAnalysisAnalyzerHash,
    completenessAnalysisFingerprintHash,
    completenessAnalysisEquivalenceHash,
    descriptiveExtractionPromptSource,
    descriptiveExtractionProviderSource,
    orchestrationExtractorSource,
    derivedSource,
  ] = await Promise.all([
    hashFile(corpusAuthorityPath),
    hashFile(corpusManifestPath),
    hashFile(extractorPath),
    hashFile(descriptiveExtractionPromptPath),
    hashFile(descriptiveExtractionProviderPath),
    hashFile(diagnosticsPath),
    hashFile(normalizationAuthorityPath),
    hashFile(derivedConstructorPath),
    hashFile(runnerPath),
    hashFile(artifactWriterPath),
    hashFile(fingerprintPath),
    hashFile(runSummaryPath),
    hashFile(corpusParserPath),
    hashFile(corpusManifestModulePath),
    hashFile(scriptPath),
    hashFile(sourceAnalysisContractPath),
    hashFile(sourceAnalysisAnalyzerPath),
    hashFile(completenessAnalysisContractPath),
    hashFile(completenessAnalysisAnalyzerPath),
    hashFile(completenessAnalysisFingerprintPath),
    hashFile(completenessAnalysisEquivalencePath),
    readUtf8(descriptiveExtractionPromptPath),
    readUtf8(descriptiveExtractionProviderPath),
    readUtf8(orchestrationExtractorPath),
    readUtf8(derivedConstructorPath),
  ]);

  const extractorPrompt = fingerprintSourceSlice({
    source: descriptiveExtractionPromptSource,
    patterns: [/export function buildDescriptiveExtractionPrompt\(dreamText: string\): string \{[\s\S]*?\n\}/m],
    fileHash: sha256Hex(descriptiveExtractionPromptSource),
  });
  const extractorSchema = fingerprintSourceSlice({
    source: descriptiveExtractionProviderSource,
    patterns: [/const SCENE_EXTRACTION_JSON_SCHEMA = \{[\s\S]*?\n\} as const;/m],
    fileHash: sha256Hex(descriptiveExtractionProviderSource),
  });
  const derivedPrompt = fingerprintSourceSlice({
    source: derivedSource,
    patterns: [/function buildConstructorPrompt\(bundle: ObservationV2Bundle\): string \{[\s\S]*?\n\}/m],
    fileHash: derivedFileHash,
  });
  const derivedSchema = fingerprintSourceSlice({
    source: derivedSource,
    patterns: [/const DERIVED_STRUCTURE_JSON_SCHEMA = \{[\s\S]*?\n\} as const;/m],
    fileHash: derivedFileHash,
  });

  return {
    corpus: {
      authorityPath: corpusAuthorityPath,
      authorityHash: corpusAuthorityHash,
      manifestPath: corpusManifestPath,
      manifestHash: corpusManifestHash,
    },
    extractor: {
      filePath: extractorPath,
      fileHash: extractorFileHash,
      promptFingerprint: extractorPrompt.fingerprint,
      promptFingerprintMode: extractorPrompt.mode,
      schemaFingerprint: extractorSchema.fingerprint,
      schemaFingerprintMode: extractorSchema.mode,
      modelIdentifier: readConstString(descriptiveExtractionProviderSource, "OBSERVATION_SCENE_EXTRACTION_MODEL"),
      timeoutMs: readConstNumber(descriptiveExtractionProviderSource, "OPENAI_REQUEST_TIMEOUT_MS"),
      retryPolicy: readRetryPolicy(orchestrationExtractorSource),
    },
    diagnostics: {
      filePath: diagnosticsPath,
      fileHash: diagnosticsFileHash,
      normalizationAuthorityPath,
      normalizationAuthorityHash,
    },
    derivedConstructor: {
      filePath: derivedConstructorPath,
      fileHash: derivedFileHash,
      promptFingerprint: derivedPrompt.fingerprint,
      promptFingerprintMode: derivedPrompt.mode,
      schemaFingerprint: derivedSchema.fingerprint,
      schemaFingerprintMode: derivedSchema.mode,
      modelIdentifier: readConstString(derivedSource, "OBSERVATION_DERIVED_STRUCTURE_MODEL"),
      timeoutMs: readConstNumber(derivedSource, "OPENAI_REQUEST_TIMEOUT_MS"),
    },
    runner: {
      fileHashes: {
        runner: runnerFileHash,
        artifactWriter: artifactWriterHash,
        fingerprint: fingerprintHash,
        runSummary: runSummaryHash,
        corpusParser: corpusParserHash,
        corpusManifest: corpusManifestModuleHash,
        cliEntrypoint: scriptHash,
      },
    },
    sourceAnalysis: {
      contractPath: sourceAnalysisContractPath,
      contractHash: sourceAnalysisContractHash,
      analyzerPath: sourceAnalysisAnalyzerPath,
      analyzerHash: sourceAnalysisAnalyzerHash,
    },
    completenessAnalysis: {
      contractPath: completenessAnalysisContractPath,
      contractHash: completenessAnalysisContractHash,
      analyzerPath: completenessAnalysisAnalyzerPath,
      analyzerHash: completenessAnalysisAnalyzerHash,
      rulesHash: completenessAnalysisFingerprintHash,
      equivalencePath: completenessAnalysisEquivalencePath,
      equivalenceHash: completenessAnalysisEquivalenceHash,
    },
  };
}
