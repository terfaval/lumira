import fs from "node:fs/promises";
import path from "node:path";

import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  buildObservationV3CorpusReplayArtifacts,
  runObservationV3CorpusReplay,
  type ObservationV3CorpusReplayResult,
} from "@/src/cognition/observation-v3/pipeline/replay";

export const DEFAULT_OBSERVATION_V3_FULL_BENCHMARK_BASELINE_OUTPUT_ROOT =
  ".validation/observation-v3/full-benchmark-baseline";

export interface ObservationV3FullBenchmarkBaselineSummary {
  benchmarkCount: number;
  executedCount: number;
  classifications: Record<string, number>;
  finalOutcomes: Record<string, number>;
}

export interface ObservationV3FullBenchmarkBaselineResult {
  baselineId: string;
  baselineRoot: string;
  summary: ObservationV3FullBenchmarkBaselineSummary;
  replayResult: ObservationV3CorpusReplayResult;
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

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export function buildObservationV3FullBenchmarkBaselineSummary(
  replayResult: ObservationV3CorpusReplayResult,
): ObservationV3FullBenchmarkBaselineSummary {
  return {
    benchmarkCount: replayResult.results.length,
    executedCount: replayResult.results.filter((entry) => entry.executionStatus === "executed").length,
    classifications: countBy(replayResult.results.map((entry) => entry.classification)),
    finalOutcomes: countBy(
      replayResult.results.map((entry) => entry.pipelineResult?.summary.finalOutcome ?? "not_executed"),
    ),
  };
}

export async function createObservationV3FullBenchmarkBaseline(input: {
  validationRoot: string;
  outputRoot?: string;
  baselineId?: string;
  corpusPath?: string;
  expectedBenchmarkOrder?: readonly string[];
  now?: () => Date;
}): Promise<ObservationV3FullBenchmarkBaselineResult> {
  const now = input.now ?? (() => new Date());
  const baselineId = input.baselineId ?? `${timestampLabel(now())}-obs-v3-full-benchmark-baseline`;
  const baselineRoot = path.join(
    input.outputRoot ?? DEFAULT_OBSERVATION_V3_FULL_BENCHMARK_BASELINE_OUTPUT_ROOT,
    baselineId,
  );
  const replayResult = await runObservationV3CorpusReplay({
    corpusPath: input.corpusPath ?? OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: input.expectedBenchmarkOrder ?? OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
    validationRoot: input.validationRoot,
  });

  return {
    baselineId,
    baselineRoot,
    summary: buildObservationV3FullBenchmarkBaselineSummary(replayResult),
    replayResult: {
      ...replayResult,
      artifacts: {
        ...buildObservationV3CorpusReplayArtifacts(replayResult),
        ...replayResult.artifacts,
      },
    },
  };
}

export async function persistObservationV3FullBenchmarkBaseline(input: {
  outputRoot: string;
  result: ObservationV3FullBenchmarkBaselineResult;
}): Promise<ObservationV3FullBenchmarkBaselineResult> {
  const baselineRoot = path.join(input.outputRoot, input.result.baselineId);

  await fs.mkdir(baselineRoot, { recursive: true });
  await writeJson(path.join(baselineRoot, "baseline-manifest.json"), {
    baselineId: input.result.baselineId,
    baselineRoot,
    benchmarkCount: input.result.summary.benchmarkCount,
    executedCount: input.result.summary.executedCount,
    discovery: input.result.replayResult.discovery,
  });
  await writeJson(path.join(baselineRoot, "baseline-summary.json"), input.result.summary);

  for (const [artifactName, artifactValue] of Object.entries(input.result.replayResult.artifacts)) {
    await writeJson(path.join(baselineRoot, artifactName), artifactValue);
  }

  for (const caseResult of input.result.replayResult.results) {
    const caseRoot = path.join(baselineRoot, "cases", caseResult.benchmarkId);
    await fs.mkdir(caseRoot, { recursive: true });

    for (const [artifactName, artifactValue] of Object.entries(caseResult.artifacts)) {
      await writeJson(path.join(caseRoot, artifactName), artifactValue);
    }

    if (caseResult.pipelineResult) {
      await writeJson(path.join(caseRoot, "pipeline-result.json"), caseResult.pipelineResult);
      await writeJson(path.join(caseRoot, "subsystem-fingerprints.json"), caseResult.pipelineResult.subsystemFingerprints);
      for (const [artifactName, artifactValue] of Object.entries(caseResult.pipelineResult.artifacts)) {
        await writeJson(path.join(caseRoot, artifactName), artifactValue);
      }

      for (const stageResult of caseResult.pipelineResult.stageResults) {
        const stageRoot = path.join(caseRoot, "stages", stageResult.stage);
        await writeJson(path.join(stageRoot, "stage-result.json"), stageResult);
        if (stageResult.payload) {
          await writeJson(path.join(stageRoot, "payload.json"), stageResult.payload);
          const payloadArtifacts = (stageResult.payload as Record<string, unknown>).artifacts;
          if (payloadArtifacts && typeof payloadArtifacts === "object" && !Array.isArray(payloadArtifacts)) {
            for (const [artifactName, artifactValue] of Object.entries(payloadArtifacts as Record<string, unknown>)) {
              await writeJson(path.join(stageRoot, "artifacts", artifactName), artifactValue);
            }
          }
        }
      }
    }
  }

  return {
    ...input.result,
    baselineRoot,
  };
}
