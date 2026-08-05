import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import {
  captureObservationBenchmarkFingerprints,
  type ObservationBenchmarkFingerprintSet,
} from "@/src/cognition/observation/benchmark/observation-benchmark-fingerprint";
import type { ObservationTopologyConfigurationId } from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";

export interface ObservationTopologyConfigurationFingerprint {
  configurationId: ObservationTopologyConfigurationId;
  filePath: string;
  fileHash: string;
  promptFingerprint: string;
  schemaFingerprint: string;
}

export interface ObservationTopologyExperimentFingerprintSet {
  sharedBenchmarkInfrastructure: ObservationBenchmarkFingerprintSet;
  configurations: Record<ObservationTopologyConfigurationId, ObservationTopologyConfigurationFingerprint>;
}

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

async function hashFiles(filePaths: string[]): Promise<string> {
  const contents = await Promise.all(filePaths.map((filePath) => fs.readFile(path.resolve(filePath))));
  return sha256Hex(Buffer.concat(contents));
}

async function readUtf8(filePath: string): Promise<string> {
  return fs.readFile(path.resolve(filePath), "utf8");
}

function extractSlice(source: string, patterns: RegExp[], fallback: string): string {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[0]) {
      return sha256Hex(match[0]);
    }
  }

  return fallback;
}

async function captureConfigurationFingerprint(input: {
  configurationId: ObservationTopologyConfigurationId;
  filePath: string;
  dependencyFilePaths?: string[];
  promptPatterns: RegExp[];
  schemaPatterns: RegExp[];
}): Promise<ObservationTopologyConfigurationFingerprint> {
  const hashedFiles = [input.filePath, ...(input.dependencyFilePaths ?? [])];
  const [fileHash, sources] = await Promise.all([
    hashedFiles.length === 1 ? hashFile(input.filePath) : hashFiles(hashedFiles),
    Promise.all(hashedFiles.map((filePath) => readUtf8(filePath))),
  ]);
  const source = sources.join("\n\n");

  return {
    configurationId: input.configurationId,
    filePath: input.filePath,
    fileHash,
    promptFingerprint: extractSlice(source, input.promptPatterns, fileHash),
    schemaFingerprint: extractSlice(source, input.schemaPatterns, fileHash),
  };
}

export async function captureObservationTopologyExperimentFingerprints(): Promise<ObservationTopologyExperimentFingerprintSet> {
  const sharedBenchmarkInfrastructure = await captureObservationBenchmarkFingerprints();
  const [a, c, d, f] = await Promise.all([
    captureConfigurationFingerprint({
      configurationId: "A_CURRENT_BASELINE",
      filePath: "src/cognition/observation/experiment/configurations/current-baseline.ts",
      promptPatterns: [],
      schemaPatterns: [],
    }),
    captureConfigurationFingerprint({
      configurationId: "C_TARGETED_RECOVERY",
      filePath: "src/cognition/observation/experiment/configurations/targeted-recovery.ts",
      dependencyFilePaths: [
        "src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract.ts",
        "src/cognition/observation-v3/supplemental-realization/provider-adapter.ts",
        "src/cognition/observation-v3/supplemental-realization/fingerprints.ts",
        "src/cognition/observation-v3/supplemental-realization/realization-planner.ts",
        "src/cognition/observation-v3/supplemental-realization/package-builder.ts",
        "src/cognition/observation-v3/supplemental-realization/shadow-supplemental-realization.ts",
        "src/cognition/observation-v3/supplemental-realization/diagnostics.ts",
        "src/cognition/observation-v3/supplemental-realization/index.ts",
        "src/cognition/observation-v3/memory-composition/memory-composition-contract.ts",
        "src/cognition/observation-v3/memory-composition/composition-diagnostics.ts",
        "src/cognition/observation-v3/memory-composition/composition-fingerprint.ts",
        "src/cognition/observation-v3/memory-composition/memory-composition.ts",
        "src/cognition/observation-v3/memory-composition/shadow-memory-composition.ts",
        "src/cognition/observation-v3/memory-composition/index.ts",
      ],
      promptPatterns: [/function buildSupplementalRealizationPrompt[\s\S]*?\n\}/m],
      schemaPatterns: [/const SUPPLEMENTAL_REALIZATION_SCHEMA = \{[\s\S]*?\n\} as const;/m],
    }),
    captureConfigurationFingerprint({
      configurationId: "D_HIERARCHICAL_LOCAL_EXTRACTION",
      filePath: "src/cognition/observation/experiment/configurations/hierarchical-local-extraction.ts",
      promptPatterns: [/function buildLocalityDiscoveryPrompt[\s\S]*?\n\}/m, /function buildRegionExtractionPrompt[\s\S]*?\n\}/m],
      schemaPatterns: [/const LOCALITY_DISCOVERY_SCHEMA = \{[\s\S]*?\n\} as const;/m, /const REGION_EXTRACTION_SCHEMA = \{[\s\S]*?\n\} as const;/m],
    }),
    captureConfigurationFingerprint({
      configurationId: "F_LAYERED_OUTPUT",
      filePath: "src/cognition/observation/experiment/configurations/layered-output.ts",
      promptPatterns: [],
      schemaPatterns: [],
    }),
  ]);

  return {
    sharedBenchmarkInfrastructure,
    configurations: {
      A_CURRENT_BASELINE: a,
      C_TARGETED_RECOVERY: c,
      D_HIERARCHICAL_LOCAL_EXTRACTION: d,
      F_LAYERED_OUTPUT: f,
    },
  };
}
