import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  captureObservationTopologyExperimentFingerprints,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-fingerprint";
import {
  finalizeObservationTopologyExperimentRunFromCheckpoint,
  loadObservationTopologyExperimentCompletedExecutions,
  writeObservationTopologyExperimentRunCheckpoint,
  writeObservationTopologyExperimentArtifacts,
  writeObservationTopologyExperimentRunArtifacts,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-artifact-writer";
import {
  buildAnonymizedLabelMap,
  parseObservationTopologyExperimentCliArgs,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-runner";
import { buildCompletenessFromLayeredBundle } from "@/src/cognition/observation/benchmark/observation-topology-experiment-metrics";
import type { ObservationTopologyExecutionResult } from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { dedupeRecoveredObservations, createBundleFromRegions } from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import { loadPreservedSupplementalReplayEvidence } from "@/src/cognition/observation-v3/pipeline/replay/preserved-case-loader";

function buildDescriptiveProviderEvidence(): DescriptiveExtractionProviderEvidence {
  return {
    schemaVersion: "1",
    artifactVersion: "1",
    sanitizationVersion: "san-v1",
    subsystem: "descriptive_extraction",
    sourceIdentity: "OBS-C-002",
    sourceHash: "source-hash",
    attemptIdentity: {
      subsystem: "descriptive_extraction",
      identity: "descriptive_extraction:OBS-C-002:request-1:attempt-1:root",
      fingerprint: "attempt-fingerprint",
      sourceIdentity: "OBS-C-002",
      extractionRequestId: "request-1",
      attemptNumber: 1,
      retryParentAttemptIdentity: null,
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
      sanitizedPayload: {
        output_text: "{\"dreamLanguage\":\"en\",\"scenes\":[]}",
      },
      payloadHash: "payload-hash",
      tokenUsage: null,
      latencyMs: 1000,
      providerMetadata: {
        provider: "openai",
      },
      occurredAt: "2026-08-02T12:00:00.000Z",
    },
    parsing: {
      parserFingerprint: "parser-fingerprint",
      parserSchemaFingerprint: "schema-fingerprint",
      status: "parsed",
      structuredOutput: {
        dreamLanguage: "en",
        scenes: [],
      },
      structuredOutputHash: "structured-output-hash",
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    },
    compatibility: {
      replayMode: "frozen_parsed_output",
      state: "compatible",
      replayable: true,
    },
    capture: {
      providerExecutionState: "completed",
      parsingState: "parsed",
      evidenceCaptureState: "complete",
      artifactWriteState: "not_written",
    },
  };
}

function buildSupplementalProviderEvidence(input?: {
  targetId?: string;
  physicalGapId?: string;
}): SupplementalRealizationProviderEvidence {
  const targetId = input?.targetId ?? "target-gap-1";
  const physicalGapId = input?.physicalGapId ?? "physical-gap-1";
  return {
    schemaVersion: "1",
    artifactVersion: "1",
    sanitizationVersion: "san-v1",
    subsystem: "supplemental_realization",
    sourceIdentity: "OBS-C-002",
    sourceHash: "source-hash",
    attemptIdentity: {
      subsystem: "supplemental_realization",
      identity: `supplemental_realization:OBS-C-002:supp-1:${targetId}:attempt-1:root`,
      fingerprint: "supp-fingerprint",
      sourceIdentity: "OBS-C-002",
      supplementalRequestId: "supp-1",
      targetId,
      attemptNumber: 1,
      targetExecutionAttempt: 1,
      retryParentAttemptIdentity: null,
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
      sanitizedPayload: {
        output_text: "{\"regions\":[]}",
      },
      payloadHash: "supp-payload-hash",
      tokenUsage: {
        input: 1,
        output: 2,
        total: 3,
      },
      latencyMs: 800,
      providerMetadata: {
        provider: "openai",
        physicalGapId,
        targetId,
      },
      occurredAt: "2026-08-02T12:01:00.000Z",
    },
    parsing: {
      parserFingerprint: "supp-parser-fingerprint",
      parserSchemaFingerprint: "schema-fingerprint",
      status: "parsed",
      structuredOutput: {
        regions: [],
      },
      structuredOutputHash: "supp-structured-output-hash",
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: true,
    },
    compatibility: {
      replayMode: "frozen_parsed_output",
      state: "compatible",
      replayable: true,
    },
    capture: {
      providerExecutionState: "completed",
      parsingState: "parsed",
      evidenceCaptureState: "complete",
      artifactWriteState: "not_written",
    },
  };
}

describe("parseObservationTopologyExperimentCliArgs", () => {
  it("parses repeated benchmark and configuration arguments", () => {
    expect(parseObservationTopologyExperimentCliArgs([
      "--benchmark",
      "OBS-C-002",
      "--benchmark",
      "OBS-A-002",
      "--configuration",
      "A_CURRENT_BASELINE",
      "--configuration",
      "F_LAYERED_OUTPUT",
      "--repeat",
      "2",
    ])).toEqual({
      benchmarkIds: ["OBS-C-002", "OBS-A-002"],
      benchmarkClass: null,
      configurationIds: ["A_CURRENT_BASELINE", "F_LAYERED_OUTPUT"],
      repeat: 2,
      outputRoot: ".validation/observation-topology-experiments/runs",
    });
  });

  it("parses resume-run arguments for deterministic experiment continuation", () => {
    expect(parseObservationTopologyExperimentCliArgs([
      "--benchmark",
      "OBS-C-002",
      "--configuration",
      "C_TARGETED_RECOVERY",
      "--resume-run",
      "C:\\mira\\.validation\\observation-topology-experiments\\runs\\20260802T173252Z-39b3730-subset-5-C_TARGETED_RECOVERY-r1",
    ])).toEqual({
      benchmarkIds: ["OBS-C-002"],
      benchmarkClass: null,
      configurationIds: ["C_TARGETED_RECOVERY"],
      repeat: 1,
      outputRoot: ".validation/observation-topology-experiments/runs",
      resumeRunDirectory: "C:\\mira\\.validation\\observation-topology-experiments\\runs\\20260802T173252Z-39b3730-subset-5-C_TARGETED_RECOVERY-r1",
    });
  });
});

describe("observation topology experiment fingerprints", () => {
  it("records independently fingerprinted configuration identity", async () => {
    const fingerprints = await captureObservationTopologyExperimentFingerprints();
    expect(fingerprints.configurations.A_CURRENT_BASELINE.fileHash).toBeTruthy();
    expect(fingerprints.configurations.C_TARGETED_RECOVERY.promptFingerprint).toBeTruthy();
    expect(fingerprints.configurations.D_HIERARCHICAL_LOCAL_EXTRACTION.schemaFingerprint).toBeTruthy();
    expect(fingerprints.configurations.C_TARGETED_RECOVERY.promptFingerprint).not.toBe(
      fingerprints.configurations.D_HIERARCHICAL_LOCAL_EXTRACTION.promptFingerprint,
    );
  });
});

describe("anonymized review mapping", () => {
  it("is reversible and repeat-specific", () => {
    const mapping = buildAnonymizedLabelMap({
      runId: "20260730T121500Z-abc1234-subset",
      benchmarkIds: ["OBS-C-002"],
      configurationIds: ["A_CURRENT_BASELINE", "C_TARGETED_RECOVERY", "D_HIERARCHICAL_LOCAL_EXTRACTION"],
      repeat: 2,
    });

    expect(Object.keys(mapping)).toContain("OBS-C-002:1:A_CURRENT_BASELINE");
    expect(mapping["OBS-C-002:1:A_CURRENT_BASELINE"]?.candidateLabel).toMatch(/^Candidate /);
    expect(mapping["OBS-C-002:1:A_CURRENT_BASELINE"]?.candidateLabel).not.toBe(
      mapping["OBS-C-002:2:A_CURRENT_BASELINE"]?.candidateLabel,
    );
  });

  it("public blind index contains no configuration identity or path leakage", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-blind-index-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-07-30T00:00:00.000Z",
      completedAt: "2026-07-30T00:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [],
      attempts: [],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete" as const,
        artifactAvailable: true,
        finalStatus: "success" as const,
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });
    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });
    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });
    await writeObservationTopologyExperimentRunArtifacts({
      runDirectory,
      runStatus: "completed",
      manifest: { runId: "run-1" },
      executions: [execution],
      anonymizationMap: {
        "OBS-C-002:1:C_TARGETED_RECOVERY": {
          candidateLabel: "Candidate X",
          configurationId: "C_TARGETED_RECOVERY",
        },
      },
    });

    const index = JSON.parse(
      await fs.readFile(path.join(runDirectory, "blind-review-index.json"), "utf8"),
    ) as Array<Record<string, unknown>>;
    const serialized = JSON.stringify(index);

    expect(index).toEqual([
      {
        benchmarkId: "OBS-C-002",
        repeatIndex: 1,
        candidateLabel: "Candidate X",
        candidateArtifactRef: expect.any(String),
        candidateHash: expect.any(String),
      },
    ]);
    expect(serialized).not.toContain("C_TARGETED_RECOVERY");
    expect(serialized).not.toContain("A_CURRENT_BASELINE");
    expect(serialized).not.toContain("artifactDirectory");
    expect(serialized).not.toContain("items\\");
  });

  it("writes descriptive and supplemental provider evidence artifacts for a topology execution", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-evidence-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-08-02T12:00:00.000Z",
      completedAt: "2026-08-02T12:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [],
      attempts: [],
      descriptiveProviderEvidence: [buildDescriptiveProviderEvidence()],
      supplementalProviderEvidence: [{
        requestId: "supp-1",
        targetId: "target-gap-1",
        physicalGapId: "physical-gap-1",
        providerAttemptNumber: 1,
        retryParentAttemptIdentity: null,
        evidence: buildSupplementalProviderEvidence(),
      }],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete",
        artifactAvailable: true,
        finalStatus: "success",
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });
    await writeObservationTopologyExperimentRunArtifacts({
      runDirectory,
      runStatus: "completed",
      manifest: { runId: "run-1" },
      executions: [execution],
      anonymizationMap: {
        "OBS-C-002:1:C_TARGETED_RECOVERY": {
          candidateLabel: "Candidate X",
          configurationId: "C_TARGETED_RECOVERY",
        },
      },
    });

    await expect(fs.readFile(
      path.join(
        runDirectory,
        "items",
        "OBS-C-002",
        "C_TARGETED_RECOVERY",
        "repeat-01",
        "attempts",
        "attempt-01",
        "descriptive-provider-evidence.json",
      ),
      "utf8",
    )).resolves.toContain("\"subsystem\": \"descriptive_extraction\"");

    await expect(fs.readFile(
      path.join(
        runDirectory,
        "items",
        "OBS-C-002",
        "C_TARGETED_RECOVERY",
        "repeat-01",
        "supplemental-provider-evidence-index.json",
      ),
      "utf8",
    )).resolves.toContain("\"targetId\": \"target-gap-1\"");
  });

  it("persists the preserved recovery target identity instead of substituting the physical gap id", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-target-identity-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-08-02T12:00:00.000Z",
      completedAt: "2026-08-02T12:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [],
      attempts: [],
      supplementalProviderEvidence: [{
        requestId: "supp-1",
        targetId: "target-1-gap-001",
        physicalGapId: "gap-001",
        providerAttemptNumber: 1,
        retryParentAttemptIdentity: null,
        evidence: buildSupplementalProviderEvidence({
          targetId: "target-1-gap-001",
          physicalGapId: "gap-001",
        }),
      }],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete",
        artifactAvailable: true,
        finalStatus: "success",
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });

    const index = JSON.parse(
      await fs.readFile(
        path.join(
          runDirectory,
          "items",
          "OBS-C-002",
          "C_TARGETED_RECOVERY",
          "repeat-01",
          "supplemental-provider-evidence-index.json",
        ),
        "utf8",
      ),
    ) as Array<Record<string, unknown>>;

    expect(index).toEqual([
      expect.objectContaining({
        targetId: "target-1-gap-001",
        physicalGapId: "gap-001",
      }),
    ]);
    expect(index[0]?.targetId).not.toBe(index[0]?.physicalGapId);
  });

  it("writes replay-consumable supplemental evidence indexes without manual target normalization", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-replay-compatible-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-08-02T12:00:00.000Z",
      completedAt: "2026-08-02T12:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [{
        stageId: "recovery-selection",
        stageType: "recovery_selection",
        order: 2,
        status: "success",
        startedAt: "2026-08-02T12:00:00.000Z",
        completedAt: "2026-08-02T12:00:01.000Z",
        elapsedMs: 1000,
        provider: null,
        model: null,
        promptFingerprint: null,
        schemaFingerprint: null,
        diagnostics: null,
        artifact: {
          canonicalRecoveryWindows: [{
            targetId: "target-1-gap-001",
            physicalGapId: "gap-001",
            kind: "prefix",
            sourceStart: 0,
            sourceEnd: 152,
            contextStart: 0,
            contextEnd: 412,
          }],
        },
        tokenUsage: {
          input: null,
          output: null,
          total: null,
        },
      }],
      attempts: [],
      supplementalProviderEvidence: [{
        requestId: "supp-1",
        targetId: "target-1-gap-001",
        physicalGapId: "gap-001",
        providerAttemptNumber: 1,
        retryParentAttemptIdentity: null,
        evidence: buildSupplementalProviderEvidence({
          targetId: "target-1-gap-001",
          physicalGapId: "gap-001",
        }),
      }],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete",
        artifactAvailable: true,
        finalStatus: "success",
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });

    const repeatDirectory = path.join(
      runDirectory,
      "items",
      "OBS-C-002",
      "C_TARGETED_RECOVERY",
      "repeat-01",
    );
    const loaded = await loadPreservedSupplementalReplayEvidence({
      repeatDirectory,
    });

    expect(loaded).toEqual([
      expect.objectContaining({
        physicalGapId: "gap-001",
        targetContract: expect.objectContaining({
          targetId: "target-1-gap-001",
          physicalGapId: "gap-001",
        }),
      }),
    ]);
  });

  it("keeps multiple target ids for the same physical gap distinguishable in persisted replay indexes", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-distinct-targets-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-08-02T12:00:00.000Z",
      completedAt: "2026-08-02T12:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [],
      attempts: [],
      supplementalProviderEvidence: [
        {
          requestId: "supp-1",
          targetId: "target-1-gap-001",
          physicalGapId: "gap-001",
          providerAttemptNumber: 1,
          retryParentAttemptIdentity: null,
          evidence: buildSupplementalProviderEvidence({
            targetId: "target-1-gap-001",
            physicalGapId: "gap-001",
          }),
        },
        {
          requestId: "supp-2",
          targetId: "target-2-gap-001",
          physicalGapId: "gap-001",
          providerAttemptNumber: 1,
          retryParentAttemptIdentity: null,
          evidence: buildSupplementalProviderEvidence({
            targetId: "target-2-gap-001",
            physicalGapId: "gap-001",
          }),
        },
      ],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete",
        artifactAvailable: true,
        finalStatus: "success",
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });

    const index = JSON.parse(
      await fs.readFile(
        path.join(
          runDirectory,
          "items",
          "OBS-C-002",
          "C_TARGETED_RECOVERY",
          "repeat-01",
          "supplemental-provider-evidence-index.json",
        ),
        "utf8",
      ),
    ) as Array<{ targetId?: string; physicalGapId?: string }>;

    expect(index).toHaveLength(2);
    expect(index.map((entry) => entry.targetId)).toEqual(["target-1-gap-001", "target-2-gap-001"]);
    expect(index.map((entry) => entry.physicalGapId)).toEqual(["gap-001", "gap-001"]);
  });

  it("finalizes a checkpointed run idempotently from completed item artifacts", async () => {
    const runDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "obs-topology-resume-"));
    const execution: ObservationTopologyExecutionResult = {
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      startedAt: "2026-08-02T12:00:00.000Z",
      completedAt: "2026-08-02T12:00:01.000Z",
      elapsedMs: 1000,
      success: true,
      provider: "openai",
      model: "gpt-4.1-mini",
      promptFingerprint: "prompt-hash",
      schemaFingerprint: "schema-hash",
      topologyImplementationFingerprint: "topology-hash",
      sourceFingerprint: "source-hash",
      stages: [{
        stageId: "stage-1",
        stageType: "baseline_extraction",
        order: 1,
        status: "success",
        startedAt: "2026-08-02T12:00:00.000Z",
        completedAt: "2026-08-02T12:00:01.000Z",
        elapsedMs: 1000,
        provider: "openai",
        model: "gpt-4.1-mini",
        promptFingerprint: null,
        schemaFingerprint: null,
        diagnostics: null,
        artifact: null,
        tokenUsage: {
          input: null,
          output: null,
          total: null,
        },
      }],
      attempts: [],
      finalRepresentation: null,
      completeness: null,
      diagnostics: {},
      summary: {
        benchmarkId: "OBS-C-002",
        configurationId: "C_TARGETED_RECOVERY",
        repeatIndex: 1,
        success: true,
        sceneOrRegionCount: 2,
        observationCount: 5,
        transitionCount: 0,
        evidenceSpanCoverage: 0.8,
        lateSectionRetention: true,
        endingRetention: true,
        retryOrStageCount: 4,
        tokenUsageTotal: 100,
        elapsedMs: 1000,
        structuralCompleteness: "complete",
        artifactAvailable: true,
        finalStatus: "success",
        failureReason: null,
        anonymizedCandidateLabel: "Candidate X",
      },
    };

    await writeObservationTopologyExperimentArtifacts({
      runDirectory,
      execution,
    });
    await writeObservationTopologyExperimentRunCheckpoint({
      runDirectory,
      checkpoint: {
        schemaVersion: "1",
        manifest: {
          schemaVersion: "1",
          runId: "run-1",
          benchmarkIds: ["OBS-C-002"],
          configurationIds: ["C_TARGETED_RECOVERY"],
          repeat: 1,
        },
        benchmarkIds: ["OBS-C-002"],
        configurationIds: ["C_TARGETED_RECOVERY"],
        repeat: 1,
        anonymizationMap: {
          "OBS-C-002:1:C_TARGETED_RECOVERY": {
            candidateLabel: "Candidate X",
            configurationId: "C_TARGETED_RECOVERY",
          },
        },
      },
    });

    const completed = await loadObservationTopologyExperimentCompletedExecutions(runDirectory);
    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      benchmarkId: "OBS-C-002",
      configurationId: "C_TARGETED_RECOVERY",
      repeatIndex: 1,
      success: true,
    });

    await finalizeObservationTopologyExperimentRunFromCheckpoint({
      runDirectory,
    });
    await finalizeObservationTopologyExperimentRunFromCheckpoint({
      runDirectory,
    });

    await expect(fs.readFile(path.join(runDirectory, "experiment-manifest.json"), "utf8")).resolves.toContain("\"runId\": \"run-1\"");
    await expect(fs.readFile(path.join(runDirectory, "experiment-summary.json"), "utf8")).resolves.toContain("\"successfulExecutions\": 1");
  });
});

describe("reconciliation", () => {
  it("preserves conflicts instead of silently discarding them", () => {
    const result = dedupeRecoveredObservations(
      [{
        observationId: "obs-1",
        regionId: "scene-1",
        order: 0,
        statement: "A door appears.",
        evidence: [{ snippet: "door", spanStart: 10, spanEnd: 14, contextLabel: "quoted" }],
        uncertainty: null,
        source: "baseline",
      }],
      [{
        observationId: "obs-2",
        regionId: "scene-2",
        order: 0,
        statement: "A door appears.",
        evidence: [{ snippet: "door", spanStart: 10, spanEnd: 14, contextLabel: "quoted" }],
        uncertainty: null,
        source: "recovery",
      }],
    );

    expect(result.observations).toHaveLength(1);
    expect(result.conflicts).toHaveLength(1);
  });
});

describe("hierarchical assembly", () => {
  it("preserves region order when assembling bundle scenes", () => {
    const bundle = createBundleFromRegions({
      reflectiveObjectId: "object-1",
      userId: "benchmark-runner",
      source: "system_llm_extract",
      dreamLanguage: "en",
      regions: [
        {
          regionId: "region-2",
          order: 1,
          heading: "Later",
          spanStart: 30,
          spanEnd: 40,
          evidence: [{ snippet: "later", spanStart: 30, spanEnd: 40, contextLabel: "region" }],
          boundaryConfidence: "medium",
          uncertainty: null,
          transitionCues: [],
        },
        {
          regionId: "region-1",
          order: 0,
          heading: "Earlier",
          spanStart: 0,
          spanEnd: 10,
          evidence: [{ snippet: "earlier", spanStart: 0, spanEnd: 10, contextLabel: "region" }],
          boundaryConfidence: "medium",
          uncertainty: null,
          transitionCues: [],
        },
      ],
      observations: [],
    });

    expect(bundle.scenes.map((scene) => scene.sceneId)).toEqual(["region-1", "region-2"]);
  });
});

describe("layered completeness", () => {
  it("requires evidence-backed transitions", () => {
    const completeness = buildCompletenessFromLayeredBundle({
      dreamText: "First scene. Then another scene.",
      bundle: {
        kind: "layered_bundle",
        bundleId: "bundle-1",
        sourceDreamHash: "hash",
        regions: [{
          regionId: "region-1",
          order: 0,
          heading: "One",
          spanStart: 0,
          spanEnd: 11,
          evidence: [{ snippet: "First scene", spanStart: 0, spanEnd: 11, contextLabel: "region" }],
          boundaryConfidence: "medium",
          uncertainty: null,
          transitionCues: [],
        }],
        observations: [],
        transitions: [{
          transitionId: "transition-1",
          fromRegionId: null,
          toRegionId: "region-1",
          order: 0,
          statement: "Then another scene.",
          evidence: [],
          uncertainty: null,
        }],
        uncertainty: [],
        completeness: {} as never,
        provenance: {
          configurationId: "F_LAYERED_OUTPUT",
          provider: "openai",
          model: "gpt-4.1-mini",
          sourceFingerprint: "source-hash",
        },
      },
    });

    expect(completeness.transitionCoverage.total).toBe(1);
    expect(completeness.transitionCoverage.withEvidence).toBe(0);
  });
});

describe("experimental isolation boundary", () => {
  it("does not reference production persistence or capture routes", async () => {
    const files = [
      "src/cognition/observation/benchmark/observation-topology-experiment-runner.ts",
      "src/cognition/observation/experiment/configurations/current-baseline.ts",
      "src/cognition/observation/experiment/configurations/targeted-recovery.ts",
      "src/cognition/observation/experiment/configurations/hierarchical-local-extraction.ts",
      "src/cognition/observation/experiment/configurations/layered-output.ts",
    ];

    for (const file of files) {
      const source = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toContain("createObservationV2WriteStore");
      expect(source).not.toContain("app/capture/page");
      expect(source).not.toContain("generateGlossaryCandidatesForReflectiveObject");
    }
  });
});
