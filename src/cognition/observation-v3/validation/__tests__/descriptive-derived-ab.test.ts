import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import type { ParsedObservationBenchmarkCorpus } from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import type { ObservationV3ShadowPipelineResult } from "@/src/cognition/observation-v3/pipeline";
import type {
  DescriptiveExtractionProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import {
  createObservationV3DescriptiveDerivedAbExperiment,
  persistObservationV3DescriptiveDerivedAbExperiment,
} from "@/src/cognition/observation-v3/validation/descriptive-derived-ab";

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

function buildDescriptiveEvidence(
  sourceIdentity: string,
  contractVariant: "control" | "no_derived",
): DescriptiveExtractionProviderEvidence {
  return {
    schemaVersion: "1",
    artifactVersion: "1",
    sanitizationVersion: "1",
    subsystem: "descriptive_extraction",
    sourceIdentity,
    sourceHash: "source-hash",
    attemptIdentity: {
      subsystem: "descriptive_extraction",
      identity: `${sourceIdentity}:${contractVariant}:attempt-1`,
      fingerprint: "fingerprint",
      sourceIdentity,
      attemptNumber: 1,
      retryParentAttemptIdentity: null,
      extractionRequestId: `${sourceIdentity}:${contractVariant}:request`,
    },
    evidenceLifecycle: "complete",
    request: {
      requestFingerprint: `${contractVariant}-request`,
      promptFingerprint: `${contractVariant}-prompt`,
      schemaFingerprint: `${contractVariant}-schema`,
      modelIdentifier: "gpt-4.1-mini",
    },
    providerBoundary: {
      status: "completed",
      incompleteReason: null,
      sanitizedPayload: null,
      payloadHash: null,
      tokenUsage: {
        input: contractVariant === "control" ? 200 : 180,
        output: contractVariant === "control" ? 400 : 320,
        total: contractVariant === "control" ? 600 : 500,
      },
      latencyMs: contractVariant === "control" ? 1500 : 1200,
      providerMetadata: {
        providerStatus: "completed",
        providerReturnedStructuredOutput: true,
        modelIdentifier: "gpt-4.1-mini",
      },
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

function buildPipelineResult(options: {
  benchmarkId: string;
  contractVariant: "control" | "no_derived";
  supplementalStatus: "success" | "skipped";
}): ObservationV3ShadowPipelineResult {
  const candidate = {
    candidateId: `candidate-${options.benchmarkId}`,
    candidateHash: `hash-${options.benchmarkId}`,
    candidateVersion: "observation_v3_native_c0" as const,
    reflectiveObjectId: options.benchmarkId,
    userId: "test-user",
    source: "system_llm_extract" as const,
    provenance: {
      provenanceTier: "system_extract" as const,
      semanticPolicyResult: "accept_with_uncertainty" as const,
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only" as const,
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "en" as const,
    },
    uncertaintyNotes: [],
    localities: [
      {
        localityId: "scene-1",
        order: 0,
        label: "A guide leads the dreamer up a staircase.",
        boundaryReasoning: [],
        boundaryUncertainty: null,
        evidenceContext: {
          snippet: "A guide leads the dreamer up a staircase.",
          spanStart: 0,
          spanEnd: 40,
          contextLabel: "scene",
        },
      },
    ],
    descriptiveUnits: [
      {
        unitId: "obs-1",
        localityId: "scene-1",
        order: 0,
        statement: "A guide leads the dreamer up a staircase.",
        evidenceRefs: [
          {
            snippet: "A guide leads the dreamer up a staircase.",
            spanStart: 0,
            spanEnd: 40,
            contextLabel: "quoted_support",
          },
        ],
        uncertainty: null,
      },
    ],
  };

  return {
    pipelineId: `pipeline-${options.benchmarkId}-${options.contractVariant}`,
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
        latencyMs: options.contractVariant === "control" ? 1500 : 1200,
        payload: {
          attemptNumber: 1,
          attemptId: `${options.benchmarkId}-${options.contractVariant}-attempt-1`,
          candidate,
          diagnostics: {
            attempt: 1,
            normalizedSceneCount: 1,
            normalizedObservationCount: 1,
            normalizedEvidenceSpanCount: 1,
            lateSectionObservationCount: 1,
            coverageRatio: 1,
            uncoveredTailChars: 0,
            guardVerdict: "pass",
            fallbackReason: null,
          },
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
          adequacy: options.supplementalStatus === "success" ? "inadequate_recoverable" : "adequate_with_observations",
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
            adequacy: "adequate_with_observations",
          },
          canonicalCandidate: {
            candidateId: `composed-${options.benchmarkId}`,
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
          canonicalCandidateId: `canonical-${options.benchmarkId}`,
          canonicalCandidateHash: `canonical-hash-${options.benchmarkId}`,
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
          disposition: options.supplementalStatus === "success"
            ? "deferred_for_supplemental_realization"
            : "admitted_with_observations",
        },
        failure: null,
      },
    ],
    summary: {
      governanceDisposition: options.supplementalStatus === "success"
        ? "deferred_for_supplemental_realization"
        : "admitted_with_observations",
      finalOutcome: options.supplementalStatus === "success"
        ? "deferred_for_supplemental_realization"
        : "admitted_with_observations",
      pipelineCompletionStatus: "completed",
      skippedStages: options.supplementalStatus === "success" ? [] : ["supplemental_realization"],
      startedAt: "2026-08-10T12:00:00.000Z",
      completedAt: "2026-08-10T12:00:02.060Z",
      totalLatencyMs: options.contractVariant === "control" ? 2560 : 2260,
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

describe("observation v3 descriptive derived ab experiment", () => {
  it("runs exactly the approved four cases in both control and experimental modes and compares native c0 outputs", async () => {
    const result = await createObservationV3DescriptiveDerivedAbExperiment({
      parseCorpus: async () => buildCorpus(),
      runPipeline: async ({
        benchmarkId,
        contractVariant,
        onDescriptiveProviderEvidence,
      }) => {
        onDescriptiveProviderEvidence(buildDescriptiveEvidence(benchmarkId, contractVariant));
        return buildPipelineResult({
          benchmarkId,
          contractVariant,
          supplementalStatus: benchmarkId === "OBS-A-002" ? "skipped" : "success",
        });
      },
      experimentId: "descriptive-derived-ab-1",
      outputRoot: "ignored",
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    expect(result.experimentId).toBe("descriptive-derived-ab-1");
    expect(result.cases.map((entry) => entry.benchmarkId)).toEqual([
      "OBS-A-002",
      "OBS-C-003",
      "OBS-E-002",
      "OBS-H-002",
    ]);
    expect(result.cases[0]).toEqual(expect.objectContaining({
      control: expect.objectContaining({
        contractVariant: "control",
      }),
      experimental: expect.objectContaining({
        contractVariant: "no_derived",
      }),
      comparison: expect.objectContaining({
        semanticVerdict: "SEMANTICALLY_EQUIVALENT",
        tokens: expect.objectContaining({
          outputDelta: -80,
          totalDelta: -100,
        }),
      }),
    }));
  });

  it("persists paired control and experimental artifacts plus an aggregate summary", async () => {
    const outputRoot = await makeTempDir("obs-v3-derived-ab");
    const result = await createObservationV3DescriptiveDerivedAbExperiment({
      parseCorpus: async () => buildCorpus(),
      runPipeline: async ({
        benchmarkId,
        contractVariant,
        onDescriptiveProviderEvidence,
      }) => {
        onDescriptiveProviderEvidence(buildDescriptiveEvidence(benchmarkId, contractVariant));
        return buildPipelineResult({
          benchmarkId,
          contractVariant,
          supplementalStatus: benchmarkId === "OBS-A-002" ? "skipped" : "success",
        });
      },
      experimentId: "descriptive-derived-ab-2",
      outputRoot,
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });

    const persisted = await persistObservationV3DescriptiveDerivedAbExperiment({
      outputRoot,
      result,
    });

    const manifest = JSON.parse(
      await fs.readFile(path.join(persisted.experimentRoot, "experiment-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    const caseSummary = JSON.parse(
      await fs.readFile(
        path.join(persisted.experimentRoot, "cases", "OBS-E-002", "comparison-summary.json"),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(manifest).toEqual(expect.objectContaining({
      experimentId: "descriptive-derived-ab-2",
      caseCount: 4,
    }));
    expect(caseSummary).toEqual(expect.objectContaining({
      benchmarkId: "OBS-E-002",
      semanticVerdict: "SEMANTICALLY_EQUIVALENT",
    }));
  });
});
