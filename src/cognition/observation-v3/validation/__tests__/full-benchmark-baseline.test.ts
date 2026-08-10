import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  persistObservationV3FullBenchmarkBaseline,
  type ObservationV3FullBenchmarkBaselineResult,
} from "@/src/cognition/observation-v3/validation/full-benchmark-baseline";

const createdDirectories: string[] = [];

async function makeTempDir(label: string): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  createdDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(createdDirectories.splice(0).map(async (directory) => {
    await fs.rm(directory, { recursive: true, force: true });
  }));
});

function buildBaselineResult(): ObservationV3FullBenchmarkBaselineResult {
  return {
    baselineId: "20260802T210000Z-obs-v3-full-benchmark-baseline",
    baselineRoot: "ignored-by-test",
    summary: {
      benchmarkCount: 2,
      executedCount: 1,
      classifications: {
        fully_replayable: 1,
        artifact_incomplete: 1,
      },
      finalOutcomes: {
        admitted: 1,
        not_executed: 1,
      },
    },
    replayResult: {
      discovery: {
        baselineBenchmarkRoots: ["benchmark-root"],
        topologyExperimentRoots: ["topology-root"],
        completenessRoots: ["completeness-root"],
        supplementalRealizationRoots: [],
        authorityAdmissionRoots: ["authority-root"],
        pipelineRoots: [],
      },
      results: [
        {
          benchmarkId: "OBS-A-001",
          classification: "fully_replayable",
          executionStatus: "executed",
          selectedRunId: "run-001",
          selectionReason: "latest_compatible_root",
          failure: null,
          lineage: {
            benchmarkRunRoot: "benchmark-root",
          },
          compatibility: {
            replayFingerprint: "fingerprint-1",
          },
          pipelineResult: {
            pipelineId: "pipeline-1",
            pipelineFingerprint: {
              pipelineVersion: "1",
              pipelineHash: "pipeline-hash-1",
            },
            stageResults: [
              {
                stage: "memory_realization",
                status: "success",
                executionMode: "native_deterministic",
                sourceArtifactRef: "memory-realization-summary.json",
                adapterFingerprint: null,
                subsystemFingerprint: "memory-subsystem",
                inputHash: "input-hash-1",
                outputHash: "output-hash-1",
                skippedReason: null,
                startedAt: "2026-08-02T21:00:00.000Z",
                completedAt: "2026-08-02T21:00:00.010Z",
                latencyMs: 10,
                payload: {
                  request: {
                    requestId: "memory-request-1",
                  },
                  artifacts: {
                    "canonical-memory-candidate.json": {
                      canonicalCandidateId: "canonical-1",
                    },
                    "canonical-identity-transition.json": {
                      finalClassification: "identity_preserved",
                    },
                  },
                },
                failure: null,
              },
            ],
            summary: {
              governanceDisposition: "admitted",
              finalOutcome: "admitted",
              pipelineCompletionStatus: "completed",
              skippedStages: [],
              startedAt: "2026-08-02T21:00:00.000Z",
              completedAt: "2026-08-02T21:00:00.010Z",
              totalLatencyMs: 10,
            },
            failurePropagation: {
              failureSourceStage: null,
              skippedStages: [],
            },
            artifacts: {
              "pipeline-summary.json": {
                governanceDisposition: "admitted",
                finalOutcome: "admitted",
                pipelineCompletionStatus: "completed",
                startedAt: "2026-08-02T21:00:00.000Z",
                completedAt: "2026-08-02T21:00:00.010Z",
                totalLatencyMs: 10,
              },
              "native-identity-lineage-comparison.json": {
                finalClassification: "identity_preserved",
              },
            },
            subsystemFingerprints: {
              authority_admission: "fingerprint-a",
            },
          },
          artifacts: {
            "case-summary.json": {
              benchmarkId: "OBS-A-001",
            },
          },
        },
        {
          benchmarkId: "OBS-B-001",
          classification: "artifact_incomplete",
          executionStatus: "not_executed",
          selectedRunId: null,
          selectionReason: "missing_replay_evidence",
          failure: {
            classification: "missing_replay_evidence",
            message: "missing_replay_evidence",
            sourceArtifactRef: null,
          },
          lineage: {},
          compatibility: {},
          pipelineResult: null,
          artifacts: {
            "case-summary.json": {
              benchmarkId: "OBS-B-001",
            },
          },
        },
      ],
      artifacts: {
        "pipeline-replay-summary.json": {
          benchmarkCount: 2,
        },
      },
    },
  };
}

describe("persistObservationV3FullBenchmarkBaseline", () => {
  it("writes corpus-level artifacts plus per-case pipeline artifacts for executed cases", async () => {
    const outputRoot = await makeTempDir("obs-v3-full-baseline");

    const persisted = await persistObservationV3FullBenchmarkBaseline({
      outputRoot,
      result: buildBaselineResult(),
    });

    const manifest = JSON.parse(
      await fs.readFile(path.join(persisted.baselineRoot, "baseline-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    const replaySummary = JSON.parse(
      await fs.readFile(path.join(persisted.baselineRoot, "pipeline-replay-summary.json"), "utf8"),
    ) as Record<string, unknown>;
    const executedPipelineSummary = JSON.parse(
      await fs.readFile(
        path.join(persisted.baselineRoot, "cases", "OBS-A-001", "pipeline-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const identityLineage = JSON.parse(
      await fs.readFile(
        path.join(persisted.baselineRoot, "cases", "OBS-A-001", "native-identity-lineage-comparison.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const canonicalCandidate = JSON.parse(
      await fs.readFile(
        path.join(
          persisted.baselineRoot,
          "cases",
          "OBS-A-001",
          "stages",
          "memory_realization",
          "artifacts",
          "canonical-memory-candidate.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(manifest).toEqual(
      expect.objectContaining({
        baselineId: "20260802T210000Z-obs-v3-full-benchmark-baseline",
        benchmarkCount: 2,
        executedCount: 1,
      }),
    );
    expect(replaySummary).toEqual(
      expect.objectContaining({
        benchmarkCount: 2,
      }),
    );
    expect(executedPipelineSummary).toEqual(
      expect.objectContaining({
        governanceDisposition: "admitted",
        finalOutcome: "admitted",
        pipelineCompletionStatus: "completed",
        startedAt: "2026-08-02T21:00:00.000Z",
        completedAt: "2026-08-02T21:00:00.010Z",
        totalLatencyMs: 10,
      }),
    );
    expect(identityLineage).toEqual(
      expect.objectContaining({
        finalClassification: "identity_preserved",
      }),
    );
    expect(canonicalCandidate).toEqual(
      expect.objectContaining({
        canonicalCandidateId: "canonical-1",
      }),
    );
  });

  it("writes case artifacts for non-executed cases without fabricating pipeline files", async () => {
    const outputRoot = await makeTempDir("obs-v3-full-baseline");

    const persisted = await persistObservationV3FullBenchmarkBaseline({
      outputRoot,
      result: buildBaselineResult(),
    });

    const caseSummary = JSON.parse(
      await fs.readFile(
        path.join(persisted.baselineRoot, "cases", "OBS-B-001", "case-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const missingPipelineSummary = await fs.access(
      path.join(persisted.baselineRoot, "cases", "OBS-B-001", "pipeline-summary.json"),
    ).then(() => true).catch(() => false);

    expect(caseSummary).toEqual(
      expect.objectContaining({
        benchmarkId: "OBS-B-001",
      }),
    );
    expect(missingPipelineSummary).toBe(false);
  });
});
