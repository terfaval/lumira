import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createObservationV3RuntimePerfMeasurement,
  persistObservationV3RuntimePerfMeasurement,
} from "@/src/cognition/observation-v3/validation/runtime-perf-measurement";
import type { ObservationV3ShadowPipelineResult } from "@/src/cognition/observation-v3/pipeline";
import type { ParsedObservationBenchmarkCorpus } from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";

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

function buildCorpus(): ParsedObservationBenchmarkCorpus {
  const ids = [
    "OBS-A-001",
    "OBS-A-002",
    "OBS-B-001",
    "OBS-C-003",
    "OBS-E-002",
    "OBS-H-002",
  ];

  return {
    sourcePath: "ignored.md",
    benchmarkCount: ids.length,
    benchmarkOrder: ids,
    items: ids.map((benchmarkId) => ({
      benchmarkId,
      sourceDate: "2026-08-10",
      benchmarkFamily: "test-family",
      stressTargets: [],
      secondaryTags: [],
      expectedEvaluationFocus: [],
      dreamText: `Dream text for ${benchmarkId}`,
      source: {
        heading: benchmarkId,
        startLine: 1,
        endLine: 10,
        dreamTextStartLine: 2,
        dreamTextEndLine: 9,
      },
    })),
  };
}

function buildDescriptiveEvidence(sourceIdentity: string): DescriptiveExtractionProviderEvidence {
  return {
    schemaVersion: "1",
    artifactVersion: "1",
    sanitizationVersion: "1",
    subsystem: "descriptive_extraction",
    sourceIdentity,
    sourceHash: "source-hash",
    attemptIdentity: {
      subsystem: "descriptive_extraction",
      identity: `${sourceIdentity}:attempt-1`,
      fingerprint: "fingerprint",
      sourceIdentity,
      attemptNumber: 1,
      retryParentAttemptIdentity: null,
      extractionRequestId: `${sourceIdentity}:request`,
    },
    evidenceLifecycle: "complete",
    request: {
      requestFingerprint: "request-fingerprint",
      promptFingerprint: "prompt-fingerprint",
      schemaFingerprint: "schema-fingerprint",
      modelIdentifier: "gpt-4.1-mini",
    },
    providerBoundary: {
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: null,
      payloadHash: null,
      tokenUsage: {
        input: 10,
        output: 20,
        total: 30,
      },
      latencyMs: 1200,
      providerMetadata: null,
      occurredAt: "2026-08-10T12:00:01.000Z",
    },
    parsing: {
      parserFingerprint: "parser",
      parserSchemaFingerprint: "schema",
      status: "parsed",
      structuredOutput: null,
      structuredOutputHash: null,
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    },
    compatibility: {
      replayMode: "frozen_parsed_output",
      state: "comparison_unavailable",
      replayable: false,
    },
    capture: {
      providerExecutionState: "completed",
      parsingState: "parsed",
      evidenceCaptureState: "complete",
      artifactWriteState: "not_written",
    },
  };
}

function buildSupplementalEvidence(sourceIdentity: string): SupplementalRealizationProviderEvidence {
  return {
    ...buildDescriptiveEvidence(sourceIdentity),
    subsystem: "supplemental_realization",
    attemptIdentity: {
      subsystem: "supplemental_realization",
      identity: `${sourceIdentity}:supp-target-1`,
      fingerprint: "fingerprint",
      sourceIdentity,
      attemptNumber: 1,
      retryParentAttemptIdentity: null,
      supplementalRequestId: `${sourceIdentity}:supplemental`,
      targetId: "target-1",
      targetExecutionAttempt: 1,
    },
  };
}

function buildPipelineResult(options: {
  benchmarkId: string;
  supplementalStatus: "success" | "skipped";
}): ObservationV3ShadowPipelineResult {
  return {
    pipelineId: `pipeline-${options.benchmarkId}`,
    pipelineFingerprint: {
      pipelineVersion: "1",
      pipelineHash: "hash",
    },
    stageResults: [
      {
        stage: "source_analysis",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:00.000Z",
        completedAt: "2026-08-10T12:00:00.010Z",
        latencyMs: 10,
        payload: {},
        failure: null,
      },
      {
        stage: "descriptive_extraction",
        status: "success",
        executionMode: "provider_backed",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:00.010Z",
        completedAt: "2026-08-10T12:00:01.010Z",
        latencyMs: 1000,
        payload: {
          diagnostics: {},
        },
        failure: null,
      },
      {
        stage: "completeness_analysis",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:01.010Z",
        completedAt: "2026-08-10T12:00:01.020Z",
        latencyMs: 10,
        payload: {
          adequacy: options.supplementalStatus === "success" ? "inadequate_recoverable" : "adequate",
          recoveryRecommendation: {
            disposition: options.supplementalStatus === "success" ? "required_before_admission" : "not_required",
          },
        },
        failure: null,
      },
      {
        stage: "supplemental_realization",
        status: options.supplementalStatus,
        executionMode: options.supplementalStatus === "success" ? "provider_backed" : "skipped",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: options.supplementalStatus === "success" ? null : "not_required",
        startedAt: options.supplementalStatus === "success" ? "2026-08-10T12:00:01.020Z" : null,
        completedAt: options.supplementalStatus === "success" ? "2026-08-10T12:00:02.020Z" : null,
        latencyMs: options.supplementalStatus === "success" ? 1000 : null,
        payload: options.supplementalStatus === "success" ? {
          result: {
            disposition: "completed",
          },
          packages: [],
        } : null,
        failure: null,
      },
      {
        stage: "memory_composition",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:02.020Z",
        completedAt: "2026-08-10T12:00:02.040Z",
        latencyMs: 20,
        payload: {
          finalCompleteness: {
            adequacy: "adequate",
          },
        },
        failure: null,
      },
      {
        stage: "memory_realization",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:02.040Z",
        completedAt: "2026-08-10T12:00:02.050Z",
        latencyMs: 10,
        payload: {
          canonicalCandidateId: "canonical",
        },
        failure: null,
      },
      {
        stage: "authority_admission",
        status: "success",
        executionMode: "native_deterministic",
        sourceArtifactRef: null,
        adapterFingerprint: null,
        subsystemFingerprint: null,
        inputHash: null,
        outputHash: null,
        skippedReason: null,
        startedAt: "2026-08-10T12:00:02.050Z",
        completedAt: "2026-08-10T12:00:02.060Z",
        latencyMs: 10,
        payload: {
          disposition: "admitted",
        },
        failure: null,
      },
    ],
    summary: {
      governanceDisposition: "admitted",
      finalOutcome: "admitted",
      pipelineCompletionStatus: "completed",
      skippedStages: options.supplementalStatus === "success" ? [] : ["supplemental_realization"],
      startedAt: "2026-08-10T12:00:00.000Z",
      completedAt: "2026-08-10T12:00:02.060Z",
      totalLatencyMs: 2060,
    },
    failurePropagation: {
      failureSourceStage: null,
      skippedStages: options.supplementalStatus === "success" ? [] : ["supplemental_realization"],
    },
    artifacts: {
      "pipeline-summary.json": {
        pipelineCompletionStatus: "completed",
      },
    },
    subsystemFingerprints: {
      descriptive_extraction: "fingerprint",
    },
  };
}

describe("observation v3 runtime perf measurement", () => {
  it("measures exactly the approved four cases and preserves skipped supplemental explicitly", async () => {
    const result = await createObservationV3RuntimePerfMeasurement({
      parseCorpus: async () => buildCorpus(),
      runPipeline: async ({ benchmarkId, onDescriptiveProviderEvidence, onSupplementalProviderEvidence, onDeterministicSubstageTiming }) => {
        void onSupplementalProviderEvidence;
        onDescriptiveProviderEvidence(buildDescriptiveEvidence(benchmarkId));
        onDeterministicSubstageTiming({
          stage: "final_completeness",
          executionMode: "native_deterministic",
          startedAt: "2026-08-10T12:00:02.021Z",
          completedAt: "2026-08-10T12:00:02.023Z",
          latencyMs: 2,
          status: "success",
        });
        return buildPipelineResult({
          benchmarkId,
          supplementalStatus: benchmarkId === "OBS-A-002" ? "skipped" : "success",
        });
      },
      measurementId: "runtime-perf-1",
      outputRoot: "ignored",
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    expect(result.measurementId).toBe("runtime-perf-1");
    expect(result.cases.map((entry) => entry.benchmarkId)).toEqual([
      "OBS-A-002",
      "OBS-C-003",
      "OBS-E-002",
      "OBS-H-002",
    ]);
    expect(result.cases.find((entry) => entry.benchmarkId === "OBS-A-002")).toEqual(
      expect.objectContaining({
        supplementalExecuted: false,
        recoveryDisposition: "not_required",
        stageTimings: expect.arrayContaining([
          expect.objectContaining({
            stage: "supplemental_realization",
            status: "skipped",
            startedAt: null,
            completedAt: null,
            latencyMs: null,
          }),
          expect.objectContaining({
            stage: "final_completeness",
            latencyMs: 2,
          }),
        ]),
        providerBreakdown: expect.objectContaining({
          descriptiveExtraction: expect.objectContaining({
            callCount: 1,
            retryCount: 0,
            totalLatencyMs: 1200,
          }),
          supplementalRealization: expect.objectContaining({
            executed: false,
            callCount: 0,
          }),
        }),
      }),
    );
  });

  it("persists the measurement manifest and per-case artifacts", async () => {
    const outputRoot = await makeTempDir("obs-v3-runtime-perf");
    const result = await createObservationV3RuntimePerfMeasurement({
      parseCorpus: async () => buildCorpus(),
      runPipeline: async ({ benchmarkId, onDescriptiveProviderEvidence, onSupplementalProviderEvidence, onDeterministicSubstageTiming }) => {
        onDescriptiveProviderEvidence(buildDescriptiveEvidence(benchmarkId));
        if (benchmarkId !== "OBS-A-002") {
          onSupplementalProviderEvidence(buildSupplementalEvidence(benchmarkId));
        }
        onDeterministicSubstageTiming({
          stage: "final_completeness",
          executionMode: "native_deterministic",
          startedAt: "2026-08-10T12:00:02.021Z",
          completedAt: "2026-08-10T12:00:02.023Z",
          latencyMs: 2,
          status: "success",
        });
        return buildPipelineResult({
          benchmarkId,
          supplementalStatus: benchmarkId === "OBS-A-002" ? "skipped" : "success",
        });
      },
      measurementId: "runtime-perf-2",
      outputRoot,
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    const persisted = await persistObservationV3RuntimePerfMeasurement({
      outputRoot,
      result,
    });

    const manifest = JSON.parse(
      await fs.readFile(path.join(persisted.measurementRoot, "measurement-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    const caseSummary = JSON.parse(
      await fs.readFile(
        path.join(persisted.measurementRoot, "cases", "OBS-E-002", "measurement-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(manifest).toEqual(expect.objectContaining({
      measurementId: "runtime-perf-2",
      caseCount: 4,
    }));
    expect(caseSummary).toEqual(expect.objectContaining({
      benchmarkId: "OBS-E-002",
      totalLatencyMs: 2060,
      supplementalExecuted: true,
    }));
  });
});
