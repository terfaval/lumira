import { describe, expect, it, vi } from "vitest";

import {
  runObservationV3PipelineCore,
  type ObservationV3PipelineCoreInput,
  type ObservationV3PipelineStageOutcome,
} from "@/src/cognition/observation-v3/pipeline/pipeline-runner";

function success(
  payload: Record<string, unknown>,
  input: Omit<Extract<ObservationV3PipelineStageOutcome, { status: "success" }>, "status" | "payload">,
): ObservationV3PipelineStageOutcome {
  return {
    status: "success",
    payload,
    ...input,
  };
}

function failure(
  input: Omit<Extract<ObservationV3PipelineStageOutcome, { status: "failed" }>, "status">,
): ObservationV3PipelineStageOutcome {
  return {
    status: "failed",
    ...input,
  };
}

function makeCoreInput(
  overrides: Partial<ObservationV3PipelineCoreInput>,
): ObservationV3PipelineCoreInput {
  return {
    pipelineId: "obs-v3-pipeline-test",
    sourceText: "A dreamer walks through a city.",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 31,
    },
    fingerprintPipeline: vi.fn(async () => ({
      pipelineVersion: "test-pipeline-v1",
      pipelineHash: "pipeline-hash-v1",
    })),
    stages: {
      sourceAnalysis: vi.fn(async () => success({
        profile: {
          extractionRiskProfile: {
            overallRisk: "low",
          },
        },
      }, {
        executionMode: "native_deterministic",
        sourceArtifactRef: "source-analysis.json",
        adapterFingerprint: null,
        subsystemFingerprint: "source-analysis-fingerprint",
        inputHash: "source-input-hash",
        outputHash: "source-output-hash",
      })),
      descriptiveExtraction: vi.fn(async () => success({
        attemptNumber: 1,
        bundle: {
          bundleId: "bundle-1",
        },
        diagnostics: {
          providerStatus: "replayed",
        },
        preservedReplay: {
          attemptId: "attempt-01",
        },
      }, {
        executionMode: "preserved_replay",
        sourceArtifactRef: "attempts/attempt-01/replay-structured-output.json",
        adapterFingerprint: "preserved-replay-adapter-v1",
        subsystemFingerprint: "descriptive-extraction-fingerprint",
        inputHash: "descriptive-input-hash",
        outputHash: "descriptive-output-hash",
      })),
      completenessAnalysis: vi.fn(async () => success({
        adequacy: "adequate",
        recoveryRecommendation: {
          eligibility: "not_eligible",
          disposition: "not_required",
        },
      }, {
        executionMode: "native_deterministic",
        sourceArtifactRef: "completeness-report.json",
        adapterFingerprint: null,
        subsystemFingerprint: "completeness-analysis-fingerprint",
        inputHash: "completeness-input-hash",
        outputHash: "completeness-output-hash",
      })),
      supplementalRealization: vi.fn(async () => success({
        packages: [],
      }, {
        executionMode: "preserved_replay",
        sourceArtifactRef: "supplemental-replay.json",
        adapterFingerprint: "preserved-replay-adapter-v1",
        subsystemFingerprint: "supplemental-realization-fingerprint",
        inputHash: "supplemental-input-hash",
        outputHash: "supplemental-output-hash",
      })),
      memoryComposition: vi.fn(async () => success({
        candidateId: "composed-candidate-1",
      }, {
        executionMode: "native_deterministic",
        sourceArtifactRef: "composition-summary.json",
        adapterFingerprint: null,
        subsystemFingerprint: "memory-composition-fingerprint",
        inputHash: "composition-input-hash",
        outputHash: "composition-output-hash",
      })),
      memoryRealization: vi.fn(async () => success({
        canonicalCandidateId: "canonical-candidate-1",
        canonicalHash: "canonical-hash-1",
      }, {
        executionMode: "native_deterministic",
        sourceArtifactRef: "memory-realization-summary.json",
        adapterFingerprint: null,
        subsystemFingerprint: "memory-realization-fingerprint",
        inputHash: "memory-realization-input-hash",
        outputHash: "memory-realization-output-hash",
      })),
      authorityAdmission: vi.fn(async () => success({
        disposition: "admitted",
        receivedCanonicalCandidateId: "canonical-candidate-1",
      }, {
        executionMode: "native_deterministic",
        sourceArtifactRef: "native-admission-decision.json",
        adapterFingerprint: null,
        subsystemFingerprint: "authority-admission-fingerprint",
        inputHash: "authority-admission-input-hash",
        outputHash: "authority-admission-output-hash",
      })),
    },
    ...overrides,
  };
}

describe("runObservationV3PipelineCore", () => {
  it("executes the native stage order and skips supplemental realization when completeness does not justify it", async () => {
    const input = makeCoreInput({});

    const result = await runObservationV3PipelineCore(input);

    expect(input.stages.sourceAnalysis).toHaveBeenCalledTimes(1);
    expect(input.stages.descriptiveExtraction).toHaveBeenCalledTimes(1);
    expect(input.stages.completenessAnalysis).toHaveBeenCalledTimes(1);
    expect(input.stages.supplementalRealization).not.toHaveBeenCalled();
    expect(input.stages.memoryComposition).toHaveBeenCalledTimes(1);
    expect(input.stages.memoryRealization).toHaveBeenCalledTimes(1);
    expect(input.stages.authorityAdmission).toHaveBeenCalledTimes(1);

    expect(result.stageResults.map((stage) => [stage.stage, stage.status, stage.executionMode])).toEqual([
      ["source_analysis", "success", "native_deterministic"],
      ["descriptive_extraction", "success", "preserved_replay"],
      ["completeness_analysis", "success", "native_deterministic"],
      ["supplemental_realization", "skipped", "skipped"],
      ["memory_composition", "success", "native_deterministic"],
      ["memory_realization", "success", "native_deterministic"],
      ["authority_admission", "success", "native_deterministic"],
    ]);
    expect(result.summary.finalOutcome).toBe("admitted");
    expect(result.summary.skippedStages).toEqual(["supplemental_realization"]);
  });

  it("does not execute supplemental realization when completeness says recovery is not required but still eligible", async () => {
    const input = makeCoreInput({
      stages: {
        ...makeCoreInput({}).stages,
        completenessAnalysis: vi.fn(async () => success({
          adequacy: "adequate_with_observations",
          recoveryRecommendation: {
            eligibility: "eligible",
            disposition: "not_required",
          },
        }, {
          executionMode: "native_deterministic",
          sourceArtifactRef: "completeness-report.json",
          adapterFingerprint: null,
          subsystemFingerprint: "completeness-analysis-fingerprint",
          inputHash: "completeness-input-hash",
          outputHash: "completeness-output-hash",
        })),
      },
    });

    const result = await runObservationV3PipelineCore(input);

    expect(input.stages.supplementalRealization).not.toHaveBeenCalled();
    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "skipped",
      skippedReason: "not_required",
    });
  });

  it("executes supplemental realization when completeness says recovery is required", async () => {
    const input = makeCoreInput({
      stages: {
        ...makeCoreInput({}).stages,
        completenessAnalysis: vi.fn(async () => success({
          adequacy: "inadequate_recoverable",
          recoveryRecommendation: {
            eligibility: "eligible",
            disposition: "required_before_admission",
          },
        }, {
          executionMode: "native_deterministic",
          sourceArtifactRef: "completeness-report.json",
          adapterFingerprint: null,
          subsystemFingerprint: "completeness-analysis-fingerprint",
          inputHash: "completeness-input-hash",
          outputHash: "completeness-output-hash",
        })),
      },
    });

    const result = await runObservationV3PipelineCore(input);

    expect(input.stages.supplementalRealization).toHaveBeenCalledTimes(1);
    expect(result.stageResults.find((stage) => stage.stage === "supplemental_realization")).toMatchObject({
      status: "success",
    });
  });

  it("stops deterministically when source analysis fails and marks all downstream stages skipped", async () => {
    const input = makeCoreInput({
      stages: {
        ...makeCoreInput({}).stages,
        sourceAnalysis: vi.fn(async () => failure({
          executionMode: "native_deterministic",
          sourceArtifactRef: "source-analysis.json",
          adapterFingerprint: null,
          subsystemFingerprint: "source-analysis-fingerprint",
          inputHash: "source-input-hash",
          outputHash: null,
          failure: {
            code: "analyzer_failed",
            message: "source analysis failed",
          },
        })),
      },
    });

    const result = await runObservationV3PipelineCore(input);

    expect(input.stages.descriptiveExtraction).not.toHaveBeenCalled();
    expect(result.summary.finalOutcome).toBe("failed_source_analysis");
    expect(result.stageResults.slice(1).every((stage) => stage.status === "skipped")).toBe(true);
    expect(result.failurePropagation.failureSourceStage).toBe("source_analysis");
  });

  it("skips authority admission when memory realization fails governance", async () => {
    const input = makeCoreInput({
      stages: {
        ...makeCoreInput({}).stages,
        completenessAnalysis: vi.fn(async () => success({
          adequacy: "adequate",
          recoveryRecommendation: {
            eligibility: "not_eligible",
            disposition: "not_required",
          },
        }, {
          executionMode: "native_deterministic",
          sourceArtifactRef: "completeness-report.json",
          adapterFingerprint: null,
          subsystemFingerprint: "completeness-analysis-fingerprint",
          inputHash: "completeness-input-hash",
          outputHash: "completeness-output-hash",
        })),
        memoryRealization: vi.fn(async () => failure({
          executionMode: "native_deterministic",
          sourceArtifactRef: "memory-realization-summary.json",
          adapterFingerprint: null,
          subsystemFingerprint: "memory-realization-fingerprint",
          inputHash: "memory-realization-input-hash",
          outputHash: null,
          failure: {
            code: "aborted_governance_failure",
            message: "provenance unavailable",
          },
        })),
      },
    });

    const result = await runObservationV3PipelineCore(input);

    expect(input.stages.authorityAdmission).not.toHaveBeenCalled();
    expect(result.summary.finalOutcome).toBe("failed_memory_realization");
    expect(result.stageResults.find((stage) => stage.stage === "authority_admission")).toMatchObject({
      status: "skipped",
      skippedReason: "upstream_failure",
    });
    expect(result.failurePropagation.failureSourceStage).toBe("memory_realization");
  });
});
