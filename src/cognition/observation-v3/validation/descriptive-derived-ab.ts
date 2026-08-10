import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
  type ParsedObservationBenchmarkCorpus,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import {
  runObservationV3ShadowPipeline,
  type ObservationV3ShadowPipelineResult,
} from "@/src/cognition/observation-v3/pipeline";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import type { ObservationV3NativeC0Candidate } from "@/src/cognition/observation-v3/descriptive-extraction";

export const DEFAULT_OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_OUTPUT_ROOT =
  ".validation/observation-v3/descriptive-derived-ab";

export const OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_CASE_IDS = [
  "OBS-A-002",
  "OBS-C-003",
  "OBS-E-002",
  "OBS-H-002",
] as const;

export type ObservationV3DescriptiveDerivedAbCaseId =
  typeof OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_CASE_IDS[number];

export type ObservationV3DescriptiveDerivedAbContractVariant = "control" | "no_derived";

export type ObservationV3DescriptiveDerivedAbSemanticVerdict =
  | "SEMANTICALLY_EQUIVALENT"
  | "EXPERIMENTAL_BETTER"
  | "CONTROL_BETTER"
  | "MIXED"
  | "INDETERMINATE";

interface ProviderAttemptSummary {
  sourceIdentity: string;
  attemptIdentity: string;
  targetId: string | null;
  attemptNumber: number;
  retryParentAttemptIdentity: string | null;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  latencyMs: number | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  } | null;
}

interface ProviderStageBreakdown {
  executed: boolean;
  callCount: number;
  retryCount: number;
  totalLatencyMs: number;
  totalTokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  } | null;
  attempts: ProviderAttemptSummary[];
}

interface ExperimentRunSummary {
  contractVariant: ObservationV3DescriptiveDerivedAbContractVariant;
  sourceLength: number;
  totalLatencyMs: number;
  pipelineCompletionStatus: ObservationV3ShadowPipelineResult["summary"]["pipelineCompletionStatus"];
  governanceDisposition: string | null;
  recoveryDisposition: string | null;
  finalAdequacy: string | null;
  admissionDisposition: string | null;
  supplementalExecuted: boolean;
  providerBreakdown: {
    descriptiveExtraction: ProviderStageBreakdown;
    supplementalRealization: ProviderStageBreakdown;
  };
  nativeCandidate: ObservationV3NativeC0Candidate | null;
  descriptiveDiagnostics: {
    normalizedSceneCount: number | null;
    normalizedObservationCount: number | null;
    normalizedEvidenceSpanCount: number | null;
    lateSectionObservationCount: number | null;
    coverageRatio: number | null;
    uncoveredTailChars: number | null;
    guardVerdict: string | null;
  };
  downstream: {
    initialCompletenessAdequacy: string | null;
    initialRecoveryDisposition: string | null;
    finalCompletenessAdequacy: string | null;
    canonicalCandidateId: string | null;
    canonicalCandidateHash: string | null;
    admissionDisposition: string | null;
  };
  pipelineResult: ObservationV3ShadowPipelineResult;
  providerEvidence: {
    descriptiveExtraction: DescriptiveExtractionProviderEvidence[];
    supplementalRealization: SupplementalRealizationProviderEvidence[];
  };
}

interface SemanticComparisonSummary {
  localityCountDelta: number;
  descriptiveUnitCountDelta: number;
  uncertaintyNoteCountDelta: number;
  localityOrderingChanged: boolean;
  localityLabelsChanged: boolean;
  descriptiveUnitStatementsChanged: boolean;
  evidenceChanged: boolean;
  downstreamChanged: boolean;
  coverageRatioDelta: number | null;
  uncoveredTailCharsDelta: number | null;
  lateSectionObservationDelta: number | null;
}

interface TokenLatencyComparisonSummary {
  latencyMsDelta: number;
  latencyMsPercentDelta: number | null;
  inputDelta: number | null;
  outputDelta: number | null;
  totalDelta: number | null;
  outputPercentDelta: number | null;
  totalPercentDelta: number | null;
  retryCountDelta: number;
}

export interface ObservationV3DescriptiveDerivedAbCaseResult {
  benchmarkId: ObservationV3DescriptiveDerivedAbCaseId;
  control: ExperimentRunSummary;
  experimental: ExperimentRunSummary;
  comparison: {
    semanticVerdict: ObservationV3DescriptiveDerivedAbSemanticVerdict;
    semanticReason: string;
    nativeC0: SemanticComparisonSummary;
    tokens: TokenLatencyComparisonSummary;
  };
}

export interface ObservationV3DescriptiveDerivedAbExperimentResult {
  experimentId: string;
  experimentRoot: string;
  corpusPath: string;
  selectedCaseIds: ObservationV3DescriptiveDerivedAbCaseId[];
  cases: ObservationV3DescriptiveDerivedAbCaseResult[];
  aggregate: {
    semanticVerdictCounts: Record<ObservationV3DescriptiveDerivedAbSemanticVerdict, number>;
    averageLatencyDeltaMs: number;
    averageOutputTokenDelta: number;
    averageTotalTokenDelta: number;
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function sumNullable(values: Array<number | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

function toNullableNumber(value: number): number | null {
  return value > 0 ? value : null;
}

function safePercentDelta(control: number | null | undefined, experimental: number | null | undefined): number | null {
  if (control === null || control === undefined || control === 0 || experimental === null || experimental === undefined) {
    return null;
  }

  return Number((((experimental - control) / control) * 100).toFixed(2));
}

function summarizeProviderEvidence(
  evidence: Array<DescriptiveExtractionProviderEvidence | SupplementalRealizationProviderEvidence>,
): ProviderStageBreakdown {
  const attempts = evidence.map((entry) => ({
    sourceIdentity: entry.sourceIdentity,
    attemptIdentity: entry.attemptIdentity.identity,
    targetId: entry.attemptIdentity.targetId ?? null,
    attemptNumber: entry.attemptIdentity.targetExecutionAttempt ?? entry.attemptIdentity.attemptNumber,
    retryParentAttemptIdentity: entry.attemptIdentity.retryParentAttemptIdentity,
    providerStatus: typeof entry.providerBoundary.providerMetadata?.providerStatus === "string"
      ? entry.providerBoundary.providerMetadata.providerStatus
      : null,
    providerIncompleteReason: entry.providerBoundary.incompleteReason,
    latencyMs: entry.providerBoundary.latencyMs,
    tokenUsage: entry.providerBoundary.tokenUsage,
  }));

  const totalInputTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.input));
  const totalOutputTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.output));
  const totalTokens = sumNullable(attempts.map((entry) => entry.tokenUsage?.total));

  return {
    executed: attempts.length > 0,
    callCount: attempts.length,
    retryCount: attempts.filter((entry) => entry.retryParentAttemptIdentity !== null).length,
    totalLatencyMs: sumNullable(attempts.map((entry) => entry.latencyMs)),
    totalTokenUsage: attempts.some((entry) => entry.tokenUsage !== null)
      ? {
          input: toNullableNumber(totalInputTokens),
          output: toNullableNumber(totalOutputTokens),
          total: toNullableNumber(totalTokens),
        }
      : null,
    attempts,
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

function countUncertaintyNotes(candidate: ObservationV3NativeC0Candidate | null): number {
  if (!candidate) {
    return 0;
  }

  return candidate.descriptiveUnits.filter((unit) => typeof unit.uncertainty === "string" && unit.uncertainty.trim()).length;
}

function buildRunSummary(input: {
  contractVariant: ObservationV3DescriptiveDerivedAbContractVariant;
  sourceLength: number;
  pipelineResult: ObservationV3ShadowPipelineResult;
  descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[];
  supplementalProviderEvidence: SupplementalRealizationProviderEvidence[];
}): ExperimentRunSummary {
  const completenessPayload = input.pipelineResult.stageResults.find((stage) => stage.stage === "completeness_analysis")?.payload as
    | { adequacy?: string; recoveryRecommendation?: { disposition?: string } }
    | null
    | undefined;
  const compositionPayload = input.pipelineResult.stageResults.find((stage) => stage.stage === "memory_composition")?.payload as
    | { finalCompleteness?: { adequacy?: string }; canonicalCandidate?: { candidateId?: string } }
    | null
    | undefined;
  const realizationPayload = input.pipelineResult.stageResults.find((stage) => stage.stage === "memory_realization")?.payload as
    | { canonicalCandidateId?: string; canonicalCandidateHash?: string }
    | null
    | undefined;
  const admissionPayload = input.pipelineResult.stageResults.find((stage) => stage.stage === "authority_admission")?.payload as
    | { disposition?: string }
    | null
    | undefined;
  const descriptivePayload = input.pipelineResult.stageResults.find((stage) => stage.stage === "descriptive_extraction")?.payload as
    | { candidate?: ObservationV3NativeC0Candidate; diagnostics?: Record<string, unknown> }
    | null
    | undefined;
  const supplementalStage = input.pipelineResult.stageResults.find((stage) => stage.stage === "supplemental_realization");
  const descriptiveDiagnostics = descriptivePayload?.diagnostics as Record<string, unknown> | undefined;

  return {
    contractVariant: input.contractVariant,
    sourceLength: input.sourceLength,
    totalLatencyMs: input.pipelineResult.summary.totalLatencyMs,
    pipelineCompletionStatus: input.pipelineResult.summary.pipelineCompletionStatus,
    governanceDisposition: input.pipelineResult.summary.governanceDisposition,
    recoveryDisposition: completenessPayload?.recoveryRecommendation?.disposition ?? null,
    finalAdequacy: compositionPayload?.finalCompleteness?.adequacy ?? null,
    admissionDisposition: admissionPayload?.disposition ?? null,
    supplementalExecuted: supplementalStage?.status === "success",
    providerBreakdown: {
      descriptiveExtraction: summarizeProviderEvidence(input.descriptiveProviderEvidence),
      supplementalRealization: summarizeProviderEvidence(input.supplementalProviderEvidence),
    },
    nativeCandidate: descriptivePayload?.candidate ?? null,
    descriptiveDiagnostics: {
      normalizedSceneCount: typeof descriptiveDiagnostics?.normalizedSceneCount === "number" ? descriptiveDiagnostics.normalizedSceneCount : null,
      normalizedObservationCount: typeof descriptiveDiagnostics?.normalizedObservationCount === "number" ? descriptiveDiagnostics.normalizedObservationCount : null,
      normalizedEvidenceSpanCount: typeof descriptiveDiagnostics?.normalizedEvidenceSpanCount === "number" ? descriptiveDiagnostics.normalizedEvidenceSpanCount : null,
      lateSectionObservationCount: typeof descriptiveDiagnostics?.lateSectionObservationCount === "number" ? descriptiveDiagnostics.lateSectionObservationCount : null,
      coverageRatio: typeof descriptiveDiagnostics?.coverageRatio === "number" ? descriptiveDiagnostics.coverageRatio : null,
      uncoveredTailChars: typeof descriptiveDiagnostics?.uncoveredTailChars === "number" ? descriptiveDiagnostics.uncoveredTailChars : null,
      guardVerdict: typeof descriptiveDiagnostics?.guardVerdict === "string" ? descriptiveDiagnostics.guardVerdict : null,
    },
    downstream: {
      initialCompletenessAdequacy: completenessPayload?.adequacy ?? null,
      initialRecoveryDisposition: completenessPayload?.recoveryRecommendation?.disposition ?? null,
      finalCompletenessAdequacy: compositionPayload?.finalCompleteness?.adequacy ?? null,
      canonicalCandidateId: realizationPayload?.canonicalCandidateId ?? compositionPayload?.canonicalCandidate?.candidateId ?? null,
      canonicalCandidateHash: realizationPayload?.canonicalCandidateHash ?? null,
      admissionDisposition: admissionPayload?.disposition ?? null,
    },
    pipelineResult: input.pipelineResult,
    providerEvidence: {
      descriptiveExtraction: input.descriptiveProviderEvidence,
      supplementalRealization: input.supplementalProviderEvidence,
    },
  };
}

function compareCandidates(
  control: ObservationV3NativeC0Candidate | null,
  experimental: ObservationV3NativeC0Candidate | null,
  controlRun: ExperimentRunSummary,
  experimentalRun: ExperimentRunSummary,
): {
  nativeC0: SemanticComparisonSummary;
  verdict: ObservationV3DescriptiveDerivedAbSemanticVerdict;
  reason: string;
} {
  const controlLocalities = control?.localities ?? [];
  const experimentalLocalities = experimental?.localities ?? [];
  const controlUnits = control?.descriptiveUnits ?? [];
  const experimentalUnits = experimental?.descriptiveUnits ?? [];

  const localityOrderingChanged = stableJson(controlLocalities.map((entry) => entry.localityId))
    !== stableJson(experimentalLocalities.map((entry) => entry.localityId));
  const localityLabelsChanged = stableJson(controlLocalities.map((entry) => entry.label))
    !== stableJson(experimentalLocalities.map((entry) => entry.label));
  const descriptiveUnitStatementsChanged = stableJson(controlUnits.map((entry) => entry.statement))
    !== stableJson(experimentalUnits.map((entry) => entry.statement));
  const evidenceChanged = stableJson(controlUnits.map((entry) => entry.evidenceRefs))
    !== stableJson(experimentalUnits.map((entry) => entry.evidenceRefs));
  const downstreamChanged = stableJson(controlRun.downstream) !== stableJson(experimentalRun.downstream);

  const nativeC0: SemanticComparisonSummary = {
    localityCountDelta: experimentalLocalities.length - controlLocalities.length,
    descriptiveUnitCountDelta: experimentalUnits.length - controlUnits.length,
    uncertaintyNoteCountDelta: countUncertaintyNotes(experimental) - countUncertaintyNotes(control),
    localityOrderingChanged,
    localityLabelsChanged,
    descriptiveUnitStatementsChanged,
    evidenceChanged,
    downstreamChanged,
    coverageRatioDelta: controlRun.descriptiveDiagnostics.coverageRatio !== null
      && experimentalRun.descriptiveDiagnostics.coverageRatio !== null
      ? Number((experimentalRun.descriptiveDiagnostics.coverageRatio - controlRun.descriptiveDiagnostics.coverageRatio).toFixed(4))
      : null,
    uncoveredTailCharsDelta: controlRun.descriptiveDiagnostics.uncoveredTailChars !== null
      && experimentalRun.descriptiveDiagnostics.uncoveredTailChars !== null
      ? experimentalRun.descriptiveDiagnostics.uncoveredTailChars - controlRun.descriptiveDiagnostics.uncoveredTailChars
      : null,
    lateSectionObservationDelta: controlRun.descriptiveDiagnostics.lateSectionObservationCount !== null
      && experimentalRun.descriptiveDiagnostics.lateSectionObservationCount !== null
      ? experimentalRun.descriptiveDiagnostics.lateSectionObservationCount - controlRun.descriptiveDiagnostics.lateSectionObservationCount
      : null,
  };

  if (
    stableJson(controlLocalities) === stableJson(experimentalLocalities) &&
    stableJson(controlUnits) === stableJson(experimentalUnits) &&
    !downstreamChanged
  ) {
    return {
      nativeC0,
      verdict: "SEMANTICALLY_EQUIVALENT",
      reason: "Native localities, descriptive units, evidence, and downstream governance outputs matched exactly across variants.",
    };
  }

  const controlSignals =
    (nativeC0.descriptiveUnitCountDelta < 0 ? 1 : 0) +
    (nativeC0.lateSectionObservationDelta !== null && nativeC0.lateSectionObservationDelta < 0 ? 1 : 0) +
    (nativeC0.uncoveredTailCharsDelta !== null && nativeC0.uncoveredTailCharsDelta > 0 ? 1 : 0) +
    (downstreamChanged && controlRun.downstream.initialRecoveryDisposition !== experimentalRun.downstream.initialRecoveryDisposition ? 1 : 0);

  const experimentalSignals =
    (nativeC0.descriptiveUnitCountDelta > 0 ? 1 : 0) +
    (nativeC0.lateSectionObservationDelta !== null && nativeC0.lateSectionObservationDelta > 0 ? 1 : 0) +
    (nativeC0.uncoveredTailCharsDelta !== null && nativeC0.uncoveredTailCharsDelta < 0 ? 1 : 0);

  if (controlSignals > 0 && experimentalSignals === 0) {
    return {
      nativeC0,
      verdict: "CONTROL_BETTER",
      reason: "The derived-free variant changed native content or downstream behavior in ways that reduced retained units, weakened tail coverage, or altered recovery/governance.",
    };
  }

  if (experimentalSignals > 0 && controlSignals === 0) {
    return {
      nativeC0,
      verdict: "EXPERIMENTAL_BETTER",
      reason: "The derived-free variant preserved or improved native content without introducing weaker tail or governance behavior.",
    };
  }

  return {
    nativeC0,
    verdict: "MIXED",
    reason: "The variants differed in native C0 or downstream behavior, but the observed changes did not produce a clean one-sided semantic winner.",
  };
}

function buildTokenLatencyComparison(control: ExperimentRunSummary, experimental: ExperimentRunSummary): TokenLatencyComparisonSummary {
  const controlTokens = control.providerBreakdown.descriptiveExtraction.totalTokenUsage;
  const experimentalTokens = experimental.providerBreakdown.descriptiveExtraction.totalTokenUsage;

  return {
    latencyMsDelta: experimental.providerBreakdown.descriptiveExtraction.totalLatencyMs
      - control.providerBreakdown.descriptiveExtraction.totalLatencyMs,
    latencyMsPercentDelta: safePercentDelta(
      control.providerBreakdown.descriptiveExtraction.totalLatencyMs,
      experimental.providerBreakdown.descriptiveExtraction.totalLatencyMs,
    ),
    inputDelta: controlTokens && experimentalTokens ? experimentalTokens.input! - controlTokens.input! : null,
    outputDelta: controlTokens && experimentalTokens ? experimentalTokens.output! - controlTokens.output! : null,
    totalDelta: controlTokens && experimentalTokens ? experimentalTokens.total! - controlTokens.total! : null,
    outputPercentDelta: safePercentDelta(controlTokens?.output, experimentalTokens?.output),
    totalPercentDelta: safePercentDelta(controlTokens?.total, experimentalTokens?.total),
    retryCountDelta: experimental.providerBreakdown.descriptiveExtraction.retryCount
      - control.providerBreakdown.descriptiveExtraction.retryCount,
  };
}

async function defaultRunPipeline(input: {
  benchmarkId: ObservationV3DescriptiveDerivedAbCaseId;
  dreamText: string;
  contractVariant: ObservationV3DescriptiveDerivedAbContractVariant;
  onDescriptiveProviderEvidence: (evidence: DescriptiveExtractionProviderEvidence) => void;
  onSupplementalProviderEvidence: (evidence: SupplementalRealizationProviderEvidence) => void;
}): Promise<ObservationV3ShadowPipelineResult> {
  return runObservationV3ShadowPipeline({
    userId: "observation-v3-descriptive-derived-ab-validation",
    reflectiveObjectId: input.benchmarkId,
    dreamText: input.dreamText,
    sourceIdentity: {
      sourceId: input.benchmarkId,
      sourceHash: sha256Hex(input.dreamText),
      sourceLength: input.dreamText.length,
    },
    liveProviderExecution: {
      descriptiveExtraction: {
        attempt: 1,
        contractVariant: input.contractVariant,
        extractionRequestId: `${input.benchmarkId}:${input.contractVariant}:descriptive-extraction`,
        onProviderEvidence: async (evidence) => {
          input.onDescriptiveProviderEvidence(evidence);
        },
      },
      supplementalRealization: {
        onProviderEvidence: async (evidence) => {
          input.onSupplementalProviderEvidence(evidence);
        },
      },
    },
  });
}

export async function createObservationV3DescriptiveDerivedAbExperiment(input?: {
  outputRoot?: string;
  experimentId?: string;
  corpusPath?: string;
  expectedBenchmarkOrder?: readonly string[];
  now?: () => Date;
  parseCorpus?: () => Promise<ParsedObservationBenchmarkCorpus>;
  runPipeline?: (input: {
    benchmarkId: ObservationV3DescriptiveDerivedAbCaseId;
    dreamText: string;
    contractVariant: ObservationV3DescriptiveDerivedAbContractVariant;
    onDescriptiveProviderEvidence: (evidence: DescriptiveExtractionProviderEvidence) => void;
    onSupplementalProviderEvidence: (evidence: SupplementalRealizationProviderEvidence) => void;
  }) => Promise<ObservationV3ShadowPipelineResult>;
}): Promise<ObservationV3DescriptiveDerivedAbExperimentResult> {
  const now = input?.now ?? (() => new Date());
  const experimentId = input?.experimentId ?? `${timestampLabel(now())}-obs-v3-descriptive-derived-ab`;
  const outputRoot = input?.outputRoot ?? DEFAULT_OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_OUTPUT_ROOT;
  const experimentRoot = path.join(outputRoot, experimentId);
  const corpusPath = input?.corpusPath ?? OBSERVATION_BENCHMARK_CORPUS_V1_PATH;
  const parseCorpus = input?.parseCorpus ?? (() => parseObservationBenchmarkCorpusFile({
    sourcePath: corpusPath,
    expectedBenchmarkOrder: input?.expectedBenchmarkOrder ?? OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  }));
  const runPipeline = input?.runPipeline ?? defaultRunPipeline;
  const parsedCorpus = await parseCorpus();

  const selectedItems = OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_CASE_IDS.map((benchmarkId) => {
    const item = parsedCorpus.items.find((entry) => entry.benchmarkId === benchmarkId);
    if (!item) {
      throw new Error(`Missing benchmark corpus entry for ${benchmarkId}.`);
    }
    return item;
  });

  const cases: ObservationV3DescriptiveDerivedAbCaseResult[] = [];

  for (const item of selectedItems) {
    const runVariant = async (
      contractVariant: ObservationV3DescriptiveDerivedAbContractVariant,
    ): Promise<ExperimentRunSummary> => {
      const descriptiveProviderEvidence: DescriptiveExtractionProviderEvidence[] = [];
      const supplementalProviderEvidence: SupplementalRealizationProviderEvidence[] = [];

      const pipelineResult = await runPipeline({
        benchmarkId: item.benchmarkId as ObservationV3DescriptiveDerivedAbCaseId,
        dreamText: item.dreamText,
        contractVariant,
        onDescriptiveProviderEvidence: (evidence) => {
          descriptiveProviderEvidence.push(evidence);
        },
        onSupplementalProviderEvidence: (evidence) => {
          supplementalProviderEvidence.push(evidence);
        },
      });

      return buildRunSummary({
        contractVariant,
        sourceLength: item.dreamText.length,
        pipelineResult,
        descriptiveProviderEvidence,
        supplementalProviderEvidence,
      });
    };

    const control = await runVariant("control");
    const experimental = await runVariant("no_derived");
    const semantic = compareCandidates(control.nativeCandidate, experimental.nativeCandidate, control, experimental);
    const tokens = buildTokenLatencyComparison(control, experimental);

    cases.push({
      benchmarkId: item.benchmarkId as ObservationV3DescriptiveDerivedAbCaseId,
      control,
      experimental,
      comparison: {
        semanticVerdict: semantic.verdict,
        semanticReason: semantic.reason,
        nativeC0: semantic.nativeC0,
        tokens,
      },
    });
  }

  const semanticVerdictCounts: Record<ObservationV3DescriptiveDerivedAbSemanticVerdict, number> = {
    SEMANTICALLY_EQUIVALENT: 0,
    EXPERIMENTAL_BETTER: 0,
    CONTROL_BETTER: 0,
    MIXED: 0,
    INDETERMINATE: 0,
  };

  for (const entry of cases) {
    semanticVerdictCounts[entry.comparison.semanticVerdict] += 1;
  }

  return {
    experimentId,
    experimentRoot,
    corpusPath,
    selectedCaseIds: [...OBSERVATION_V3_DESCRIPTIVE_DERIVED_AB_CASE_IDS],
    cases,
    aggregate: {
      semanticVerdictCounts,
      averageLatencyDeltaMs: Number((cases.reduce((total, entry) => total + entry.comparison.tokens.latencyMsDelta, 0) / cases.length).toFixed(2)),
      averageOutputTokenDelta: Number((cases.reduce((total, entry) => total + (entry.comparison.tokens.outputDelta ?? 0), 0) / cases.length).toFixed(2)),
      averageTotalTokenDelta: Number((cases.reduce((total, entry) => total + (entry.comparison.tokens.totalDelta ?? 0), 0) / cases.length).toFixed(2)),
    },
  };
}

export async function persistObservationV3DescriptiveDerivedAbExperiment(input: {
  outputRoot: string;
  result: ObservationV3DescriptiveDerivedAbExperimentResult;
}): Promise<ObservationV3DescriptiveDerivedAbExperimentResult> {
  const experimentRoot = path.join(input.outputRoot, input.result.experimentId);

  await writeJson(path.join(experimentRoot, "experiment-manifest.json"), {
    experimentId: input.result.experimentId,
    experimentRoot,
    corpusPath: input.result.corpusPath,
    caseCount: input.result.cases.length,
    selectedCaseIds: input.result.selectedCaseIds,
  });
  await writeJson(path.join(experimentRoot, "aggregate-summary.json"), input.result.aggregate);

  for (const caseResult of input.result.cases) {
    const caseRoot = path.join(experimentRoot, "cases", caseResult.benchmarkId);

    await writeJson(path.join(caseRoot, "comparison-summary.json"), {
      benchmarkId: caseResult.benchmarkId,
      semanticVerdict: caseResult.comparison.semanticVerdict,
      semanticReason: caseResult.comparison.semanticReason,
      nativeC0: caseResult.comparison.nativeC0,
      tokens: caseResult.comparison.tokens,
    });
    await writeJson(path.join(caseRoot, "control-summary.json"), caseResult.control);
    await writeJson(path.join(caseRoot, "experimental-summary.json"), caseResult.experimental);
    await writeJson(path.join(caseRoot, "control-pipeline-result.json"), caseResult.control.pipelineResult);
    await writeJson(path.join(caseRoot, "experimental-pipeline-result.json"), caseResult.experimental.pipelineResult);
    await writeJson(path.join(caseRoot, "control-descriptive-provider-evidence.json"), caseResult.control.providerEvidence.descriptiveExtraction);
    await writeJson(path.join(caseRoot, "experimental-descriptive-provider-evidence.json"), caseResult.experimental.providerEvidence.descriptiveExtraction);
    await writeJson(path.join(caseRoot, "control-supplemental-provider-evidence.json"), caseResult.control.providerEvidence.supplementalRealization);
    await writeJson(path.join(caseRoot, "experimental-supplemental-provider-evidence.json"), caseResult.experimental.providerEvidence.supplementalRealization);
  }

  return {
    ...input.result,
    experimentRoot,
  };
}
