import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

function sha256Hex(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  return sha256Hex(await fs.readFile(path.resolve(filePath)));
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)]),
    );
  }

  return value;
}

export function hashStableValue(value: unknown): string {
  return sha256Hex(stableStringify(value));
}

export interface CompletenessFingerprintSet {
  contractPath: string;
  contractHash: string;
  analyzerPath: string;
  analyzerHash: string;
  rulesHash: string;
  equivalencePath: string;
  equivalenceHash: string;
}

export const COMPLETENESS_ANALYSIS_RULES = {
  internalGapMinCharsFloor: 24,
  internalGapRelativeThresholdRatio: 0.05,
  significantBoundaryGapFloor: 8,
  significantBoundaryGapRatio: 0.08,
  lateSectionStartRatio: 0.75,
  lateSectionMinSentenceUnits: 2,
  lateSectionThinObservationThreshold: 1,
  endingSectionMinChars: 250,
  endingSectionStartRatio: 0.9,
  shortSourceTailObservationMaxChars: 32,
  shortSourceTailObservationSourceMaxChars: 160,
  boundedTerminalCueTailMaxChars: 320,
  boundedTerminalCueSourceMaxChars: 1200,
  reflectiveTailMaxChars: 96,
  reflectiveTailMaxSentenceUnits: 1,
  reflectiveTailMarkers: [
    "afterwards",
    "afterward",
    "i just remember",
    "i only remember",
    "i remember feeling",
    "i felt",
    "i think",
    "maybe",
    "somehow",
  ],
  longDreamTextThreshold: 3000,
  overmergeMinObservations: 5,
  overmergeMinMatchedCueGroups: 3,
  overmergeMinTotalCueMatches: 6,
} as const;

export async function fingerprintCompletenessAnalysis(): Promise<CompletenessFingerprintSet> {
  const contractPath = "src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract.ts";
  const analyzerPath = "src/cognition/observation-v3/completeness-analysis/completeness-analyzer.ts";
  const equivalencePath = "src/cognition/observation-v3/completeness-analysis/v2-equivalence.ts";

  const [contractHash, analyzerHash, equivalenceHash] = await Promise.all([
    hashFile(contractPath),
    hashFile(analyzerPath),
    hashFile(equivalencePath),
  ]);

  return {
    contractPath,
    contractHash,
    analyzerPath,
    analyzerHash,
    rulesHash: hashStableValue(COMPLETENESS_ANALYSIS_RULES),
    equivalencePath,
    equivalenceHash,
  };
}
