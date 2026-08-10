export type ObservationV3PipelineStageName =
  | "source_analysis"
  | "descriptive_extraction"
  | "completeness_analysis"
  | "supplemental_realization"
  | "memory_composition"
  | "memory_realization"
  | "authority_admission";

export type ObservationV3PipelineExecutionMode =
  | "preserved_replay"
  | "native_deterministic"
  | "skipped";

type StageSuccess = {
  status: "success";
  executionMode: Exclude<ObservationV3PipelineExecutionMode, "skipped">;
  sourceArtifactRef: string | null;
  adapterFingerprint: string | null;
  subsystemFingerprint: string | null;
  inputHash: string | null;
  outputHash: string | null;
  payload: Record<string, unknown>;
};

type StageFailure = {
  status: "failed";
  executionMode: Exclude<ObservationV3PipelineExecutionMode, "skipped">;
  sourceArtifactRef: string | null;
  adapterFingerprint: string | null;
  subsystemFingerprint: string | null;
  inputHash: string | null;
  outputHash: string | null;
  failure: {
    code: string;
    message: string;
  };
};

export type ObservationV3PipelineStageOutcome = StageSuccess | StageFailure;

export interface ObservationV3PipelineStageResult {
  stage: ObservationV3PipelineStageName;
  status: "success" | "failed" | "skipped";
  executionMode: ObservationV3PipelineExecutionMode;
  sourceArtifactRef: string | null;
  adapterFingerprint: string | null;
  subsystemFingerprint: string | null;
  inputHash: string | null;
  outputHash: string | null;
  skippedReason: "not_required" | "upstream_failure" | null;
  payload: Record<string, unknown> | null;
  failure: {
    code: string;
    message: string;
  } | null;
}

type StageExecutorContext = {
  sourceText: string;
  sourceIdentity: {
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
  };
  upstream: Partial<Record<ObservationV3PipelineStageName, Record<string, unknown>>>;
};

type StageExecutor = (
  input: StageExecutorContext,
) => Promise<ObservationV3PipelineStageOutcome>;

export interface ObservationV3PipelineCoreInput {
  pipelineId: string;
  sourceText: string;
  sourceIdentity: {
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
  };
  fingerprintPipeline: () => Promise<{
    pipelineVersion: string;
    pipelineHash: string;
  }>;
  stages: {
    sourceAnalysis: StageExecutor;
    descriptiveExtraction: StageExecutor;
    completenessAnalysis: StageExecutor;
    supplementalRealization: StageExecutor;
    memoryComposition: StageExecutor;
    memoryRealization: StageExecutor;
    authorityAdmission: StageExecutor;
  };
}

export interface ObservationV3PipelineRunResult {
  pipelineId: string;
  pipelineFingerprint: {
    pipelineVersion: string;
    pipelineHash: string;
  };
  stageResults: ObservationV3PipelineStageResult[];
  summary: {
    governanceDisposition: string | null;
    /**
     * Deprecated compatibility field.
     * New consumers should read governanceDisposition for governance semantics.
     */
    finalOutcome: string;
    pipelineCompletionStatus: "completed" | "failed" | "terminated_early";
    skippedStages: ObservationV3PipelineStageName[];
  };
  failurePropagation: {
    failureSourceStage: ObservationV3PipelineStageName | null;
    skippedStages: ObservationV3PipelineStageName[];
  };
}

const STAGE_SEQUENCE: Array<{
  name: ObservationV3PipelineStageName;
  executorKey: keyof ObservationV3PipelineCoreInput["stages"];
}> = [
  { name: "source_analysis", executorKey: "sourceAnalysis" },
  { name: "descriptive_extraction", executorKey: "descriptiveExtraction" },
  { name: "completeness_analysis", executorKey: "completenessAnalysis" },
  { name: "supplemental_realization", executorKey: "supplementalRealization" },
  { name: "memory_composition", executorKey: "memoryComposition" },
  { name: "memory_realization", executorKey: "memoryRealization" },
  { name: "authority_admission", executorKey: "authorityAdmission" },
];

function toStageResult(
  stage: ObservationV3PipelineStageName,
  outcome: ObservationV3PipelineStageOutcome,
): ObservationV3PipelineStageResult {
  if (outcome.status === "success") {
    return {
      stage,
      status: "success",
      executionMode: outcome.executionMode,
      sourceArtifactRef: outcome.sourceArtifactRef,
      adapterFingerprint: outcome.adapterFingerprint,
      subsystemFingerprint: outcome.subsystemFingerprint,
      inputHash: outcome.inputHash,
      outputHash: outcome.outputHash,
      skippedReason: null,
      payload: outcome.payload,
      failure: null,
    };
  }

  return {
    stage,
    status: "failed",
    executionMode: outcome.executionMode,
    sourceArtifactRef: outcome.sourceArtifactRef,
    adapterFingerprint: outcome.adapterFingerprint,
    subsystemFingerprint: outcome.subsystemFingerprint,
    inputHash: outcome.inputHash,
    outputHash: outcome.outputHash,
    skippedReason: null,
    payload: null,
    failure: outcome.failure,
  };
}

function skippedStage(
  stage: ObservationV3PipelineStageName,
  reason: ObservationV3PipelineStageResult["skippedReason"],
): ObservationV3PipelineStageResult {
  return {
    stage,
    status: "skipped",
    executionMode: "skipped",
    sourceArtifactRef: null,
    adapterFingerprint: null,
    subsystemFingerprint: null,
    inputHash: null,
    outputHash: null,
    skippedReason: reason,
    payload: null,
    failure: null,
  };
}

function shouldSkipSupplemental(
  completenessPayload: Record<string, unknown> | undefined,
): boolean {
  const recommendation = completenessPayload?.recoveryRecommendation as Record<string, unknown> | undefined;
  return recommendation?.disposition !== "required_before_admission";
}

export async function runObservationV3PipelineCore(
  input: ObservationV3PipelineCoreInput,
): Promise<ObservationV3PipelineRunResult> {
  const pipelineFingerprint = await input.fingerprintPipeline();
  const stageResults: ObservationV3PipelineStageResult[] = [];
  const upstreamPayloads: Partial<Record<ObservationV3PipelineStageName, Record<string, unknown>>> = {};
  let failureSourceStage: ObservationV3PipelineStageName | null = null;

  for (const { name, executorKey } of STAGE_SEQUENCE) {
    if (failureSourceStage) {
      stageResults.push(skippedStage(name, "upstream_failure"));
      continue;
    }

    if (name === "supplemental_realization" && shouldSkipSupplemental(upstreamPayloads.completeness_analysis)) {
      stageResults.push(skippedStage(name, "not_required"));
      continue;
    }

    if (name === "authority_admission" && stageResults.some((stage) =>
      stage.stage === "memory_realization" && stage.status === "failed")) {
      stageResults.push(skippedStage(name, "upstream_failure"));
      continue;
    }

    const outcome = await input.stages[executorKey]({
      sourceText: input.sourceText,
      sourceIdentity: input.sourceIdentity,
      upstream: upstreamPayloads,
    });
    const result = toStageResult(name, outcome);
    stageResults.push(result);

    if (result.status === "success" && result.payload) {
      upstreamPayloads[name] = result.payload;
    }
    if (result.status === "failed") {
      failureSourceStage = name;
    }
  }

  const skippedStages = stageResults
    .filter((stage) => stage.status === "skipped")
    .map((stage) => stage.stage);

  const authorityAdmission = stageResults.find((stage) => stage.stage === "authority_admission");
  const governanceDisposition = authorityAdmission?.status === "success"
    ? String((authorityAdmission.payload?.disposition as string | undefined) ?? "authority_admission_completed")
    : null;
  const pipelineCompletionStatus = authorityAdmission?.status === "success"
    ? "completed"
    : failureSourceStage
      ? "failed"
      : "terminated_early";
  const finalOutcome = governanceDisposition
    ?? (failureSourceStage === "source_analysis"
      ? "failed_source_analysis"
      : failureSourceStage === "memory_realization"
        ? "failed_memory_realization"
        : failureSourceStage
          ? `failed_${failureSourceStage}`
          : "completed_without_admission");

  return {
    pipelineId: input.pipelineId,
    pipelineFingerprint,
    stageResults,
    summary: {
      governanceDisposition,
      finalOutcome,
      pipelineCompletionStatus,
      skippedStages,
    },
    failurePropagation: {
      failureSourceStage,
      skippedStages,
    },
  };
}
