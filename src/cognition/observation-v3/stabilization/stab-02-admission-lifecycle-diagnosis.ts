import fs from "node:fs/promises";
import path from "node:path";

import {
  DEFAULT_AUTHORITY_ADMISSION_POLICY,
  buildNativeAdmissionRequest,
  evaluateAdmissionRequest,
  type AdmissionDecision,
} from "@/src/cognition/observation-v3/authority-admission";
import {
  analyzeObservationCandidateCompleteness,
  type AdaptedObservationCandidate,
  type CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis";
import type { ComposedProvisionalMemoryCandidate } from "@/src/cognition/observation-v3/memory-composition";
import type { CanonicalMemoryCandidate, MemoryRealizationResult } from "@/src/cognition/observation-v3/memory-realization";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";

export const DEFAULT_OBSERVATION_V3_STAB_02_BASELINE_ROOT =
  ".validation/observation-v3/full-benchmark-baseline/20260803T081500Z-obs-v3-full-benchmark-baseline";

export const DEFAULT_OBSERVATION_V3_STAB_02_OUTPUT_ROOT =
  ".validation/observation-v3/stabilization/stab-02";

export type FinalCompletenessLifecycleDecision =
  | "post_supplemental"
  | "post_composition"
  | "both"
  | "existing_lifecycle_sufficient";

export type Stab02RootCauseClass =
  | "lifecycle_stale_deferral"
  | "genuine_post_supplemental_omission"
  | "overlap_or_uncertainty_degradation"
  | "governance_failure"
  | "candidate_failure"
  | "admission_policy_issue"
  | "indeterminate";

export interface Stab02CaseDiagnosis {
  benchmarkId: string;
  currentDisposition: string;
  initialCompleteness: {
    adequacy: CompletenessReport["adequacy"];
    candidateHash: string;
    candidateKind: string;
  };
  postCompositionCompleteness: {
    adequacy: CompletenessReport["adequacy"];
    candidateHash: string;
    candidateKind: string;
  };
  canonicalCandidateCompleteness: {
    adequacy: CompletenessReport["adequacy"];
    candidateHash: string;
    candidateKind: string;
  };
  hypotheticalDispositionPostComposition: AdmissionDecision["disposition"];
  hypotheticalDispositionCanonical: AdmissionDecision["disposition"];
  primaryRootCause: Stab02RootCauseClass;
}

export interface ObservationV3Stab02Result {
  reviewId: string;
  reviewRoot: string;
  finalCompletenessLifecycle: FinalCompletenessLifecycleDecision;
  admissionPolicyConclusion:
    | "YES - MATERIAL POLICY CALIBRATION STILL REQUIRED"
    | "YES - BOUNDED POLICY CALIBRATION STILL REQUIRED"
    | "NO - LIFECYCLE REPAIR EXPLAINS CURRENT DEFERRALS"
    | "INDETERMINATE";
  caseDiagnoses: Stab02CaseDiagnosis[];
  artifacts: Record<string, unknown>;
}

interface StoredCaseArtifacts {
  benchmarkId: string;
  pipelineSummary: { finalOutcome: string };
  descriptiveBundle: Record<string, unknown>;
  initialCompleteness: CompletenessReport;
  composedCandidate: ComposedProvisionalMemoryCandidate;
  composedCandidateHash: string;
  canonicalCandidate: CanonicalMemoryCandidate;
  memoryRealizationResult: MemoryRealizationResult;
}

const ROOT_CAUSE_OVERRIDES: Partial<Record<string, Stab02RootCauseClass>> = {
  "OBS-A-002": "overlap_or_uncertainty_degradation",
  "OBS-E-001": "overlap_or_uncertainty_degradation",
};

function buildSyntheticSceneRange(input: {
  evidence: Array<{ spanStart: number | null; spanEnd: number | null }>;
}): { spanStart: number | null; spanEnd: number | null } {
  const starts = input.evidence
    .map((entry) => entry.spanStart)
    .filter((value): value is number => typeof value === "number");
  const ends = input.evidence
    .map((entry) => entry.spanEnd)
    .filter((value): value is number => typeof value === "number");

  return {
    spanStart: starts.length > 0 ? Math.min(...starts) : null,
    spanEnd: ends.length > 0 ? Math.max(...ends) : null,
  };
}

function adaptComposedCandidateForCompleteness(
  candidate: ComposedProvisionalMemoryCandidate,
): AdaptedObservationCandidate {
  const localityOrder = new Map(candidate.localityRecords.map((locality, index) => [locality.localityId, index]));
  const syntheticEvidence = candidate.descriptiveUnits
    .filter((unit) => unit.localityId === null)
    .flatMap((unit) => unit.evidenceRefs);
  const syntheticSceneRange = buildSyntheticSceneRange({ evidence: syntheticEvidence });

  return {
    scenes: [
      ...candidate.localityRecords.map((locality, index) => ({
        sceneId: locality.localityId,
        position: index,
        summary: locality.label ?? locality.localityId,
        sceneRange: {
          spanStart: locality.sourceStart,
          spanEnd: locality.sourceEnd,
        },
      })),
      ...(syntheticEvidence.length > 0
        ? [{
            sceneId: "__unassigned__",
            position: candidate.localityRecords.length,
            summary: "Unassigned units",
            sceneRange: syntheticSceneRange,
          }]
        : []),
    ],
    observations: candidate.descriptiveUnits.map((unit, index) => ({
      observationId: unit.unitId,
      sceneId: unit.localityId ?? "__unassigned__",
      scenePosition: localityOrder.get(unit.localityId ?? "") ?? candidate.localityRecords.length,
      position: index,
      text: unit.statement,
      evidence: unit.evidenceRefs.map((entry) => ({
        spanStart: entry.spanStart,
        spanEnd: entry.spanEnd,
        contextLabel: entry.contextLabel,
      })),
    })),
  };
}

function adaptCanonicalCandidateForCompleteness(
  candidate: CanonicalMemoryCandidate,
): AdaptedObservationCandidate {
  const localityOrder = new Map(candidate.localities.map((locality) => [locality.canonicalLocalityId, locality.order]));
  const syntheticEvidence = candidate.descriptiveUnits
    .filter((unit) => unit.localityId === null)
    .flatMap((unit) => unit.evidenceRefs);
  const syntheticSceneRange = buildSyntheticSceneRange({ evidence: syntheticEvidence });

  return {
    scenes: [
      ...candidate.localities.map((locality) => ({
        sceneId: locality.canonicalLocalityId,
        position: locality.order,
        summary: locality.label ?? locality.canonicalLocalityId,
        sceneRange: {
          spanStart: locality.sourceStart,
          spanEnd: locality.sourceEnd,
        },
      })),
      ...(syntheticEvidence.length > 0
        ? [{
            sceneId: "__unassigned__",
            position: candidate.localities.length,
            summary: "Unassigned units",
            sceneRange: syntheticSceneRange,
          }]
        : []),
    ],
    observations: candidate.descriptiveUnits.map((unit) => ({
      observationId: unit.canonicalUnitId,
      sceneId: unit.localityId ?? "__unassigned__",
      scenePosition: localityOrder.get(unit.localityId ?? "") ?? candidate.localities.length,
      position: unit.order,
      text: unit.statement,
      evidence: unit.evidenceRefs.map((entry) => ({
        spanStart: entry.spanStart,
        spanEnd: entry.spanEnd,
        contextLabel: entry.contextLabel,
      })),
    })),
  };
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8")) as T;
}

async function loadDreamTexts(): Promise<Record<string, string>> {
  const parsed = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });

  return Object.fromEntries(parsed.items.map((item) => [item.benchmarkId, item.dreamText]));
}

async function loadStoredCaseArtifacts(input: {
  baselineRoot: string;
  benchmarkId: string;
}): Promise<StoredCaseArtifacts> {
  const caseRoot = path.join(input.baselineRoot, "cases", input.benchmarkId);
  const descriptivePayload = await readJson<{ bundle: Record<string, unknown> }>(
    path.join(caseRoot, "stages", "descriptive_extraction", "payload.json"),
  );
  const compositionPayload = await readJson<{
    result: {
      composedCandidate: ComposedProvisionalMemoryCandidate;
      composedCandidateIdentity: { composedCandidateHash: string };
    };
  }>(path.join(caseRoot, "stages", "memory_composition", "payload.json"));
  const realizationPayload = await readJson<{
    result: MemoryRealizationResult;
  }>(path.join(caseRoot, "stages", "memory_realization", "payload.json"));
  const initialCompleteness = await readJson<CompletenessReport>(
    path.join(caseRoot, "stages", "completeness_analysis", "payload.json"),
  );
  const pipelineSummary = await readJson<{ finalOutcome: string }>(
    path.join(caseRoot, "pipeline-summary.json"),
  );

  if (!realizationPayload.result.canonicalCandidate) {
    throw new Error(`canonical_candidate_unavailable:${input.benchmarkId}`);
  }

  return {
    benchmarkId: input.benchmarkId,
    pipelineSummary,
    descriptiveBundle: descriptivePayload.bundle,
    initialCompleteness,
    composedCandidate: compositionPayload.result.composedCandidate,
    composedCandidateHash: compositionPayload.result.composedCandidateIdentity.composedCandidateHash,
    canonicalCandidate: realizationPayload.result.canonicalCandidate,
    memoryRealizationResult: realizationPayload.result,
  };
}

export function buildPostCompositionCompletenessReport(input: {
  dreamText: string;
  composedCandidate: ComposedProvisionalMemoryCandidate;
  composedCandidateHash: string;
}): CompletenessReport {
  const report = analyzeObservationCandidateCompleteness({
    dreamText: input.dreamText,
    candidate: adaptComposedCandidateForCompleteness(input.composedCandidate),
    candidateIdentity: {
      candidateHash: input.composedCandidateHash,
      candidateKind: "composed_candidate",
      candidateVersionLabel: "post_composition",
    },
  });

  return {
    ...report,
    sourceIdentity: {
      sourceHash: input.composedCandidate.sourceIdentity.sourceHash,
      sourceLength: input.composedCandidate.sourceIdentity.sourceLength,
    },
  };
}

export function buildCanonicalCandidateCompletenessReport(input: {
  dreamText: string;
  canonicalCandidate: CanonicalMemoryCandidate;
}): CompletenessReport {
  const report = analyzeObservationCandidateCompleteness({
    dreamText: input.dreamText,
    candidate: adaptCanonicalCandidateForCompleteness(input.canonicalCandidate),
    candidateIdentity: {
      candidateHash: input.canonicalCandidate.canonicalHash,
      candidateKind: "unknown",
      candidateVersionLabel: "canonical_memory_candidate",
    },
  });

  return {
    ...report,
    sourceIdentity: {
      sourceHash: input.canonicalCandidate.sourceIdentity.sourceHash,
      sourceLength: input.canonicalCandidate.sourceIdentity.sourceLength,
    },
  };
}

export function buildHypotheticalAdmissionDecision(input: {
  memoryRealizationResult: MemoryRealizationResult;
  completenessReport: CompletenessReport;
  reportId: string;
}): AdmissionDecision {
  const request = buildNativeAdmissionRequest({
    nativeResult: input.memoryRealizationResult,
    completeness: {
      status: "available",
      reportId: input.reportId,
      report: input.completenessReport,
    },
  });

  if (!request) {
    throw new Error("canonical_candidate_unavailable");
  }

  return evaluateAdmissionRequest({
    request,
    policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
  });
}

export function classifyStab02RootCause(input: {
  benchmarkId: string;
  currentDisposition: string;
  initialCompleteness: CompletenessReport;
  postCompositionCompleteness: CompletenessReport;
  hypotheticalPostCompositionDecision: AdmissionDecision;
}): Stab02RootCauseClass {
  const override = ROOT_CAUSE_OVERRIDES[input.benchmarkId];
  if (override) {
    return override;
  }

  if (input.currentDisposition === "rejected_governance_failure") {
    return "governance_failure";
  }

  if (
    input.currentDisposition === "deferred_for_supplemental_realization"
    && (
      input.hypotheticalPostCompositionDecision.disposition === "admitted"
      || input.hypotheticalPostCompositionDecision.disposition === "admitted_with_observations"
    )
  ) {
    return "lifecycle_stale_deferral";
  }

  if (input.postCompositionCompleteness.adequacy === "inadequate_recoverable") {
    return "genuine_post_supplemental_omission";
  }

  if (input.hypotheticalPostCompositionDecision.disposition === "rejected_candidate_failure") {
    return "candidate_failure";
  }

  if (
    input.initialCompleteness.adequacy === "inadequate_recoverable"
    && input.hypotheticalPostCompositionDecision.disposition === "deferred_for_supplemental_realization"
  ) {
    return "admission_policy_issue";
  }

  return "indeterminate";
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export async function createObservationV3Stab02Diagnosis(input?: {
  baselineRoot?: string;
  outputRoot?: string;
  reviewId?: string;
  now?: () => Date;
}): Promise<ObservationV3Stab02Result> {
  const baselineRoot = input?.baselineRoot ?? DEFAULT_OBSERVATION_V3_STAB_02_BASELINE_ROOT;
  const outputRoot = input?.outputRoot ?? DEFAULT_OBSERVATION_V3_STAB_02_OUTPUT_ROOT;
  const now = input?.now ?? (() => new Date());
  const reviewId = input?.reviewId ?? `${timestampLabel(now())}-obs-v3-stab-02`;
  const reviewRoot = path.join(outputRoot, reviewId);
  const dreamTexts = await loadDreamTexts();
  const benchmarkIds = OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER;
  const caseDiagnoses: Stab02CaseDiagnosis[] = [];
  const lifecycleMap: Record<string, unknown> = {};
  const candidateStateMap: Record<string, unknown> = {};
  const initialVsFinalCompleteness: Record<string, unknown> = {};
  const admissionDispositionDelta: Record<string, unknown> = {};
  const rootCauseMatrix: Record<string, unknown> = {};

  for (const benchmarkId of benchmarkIds) {
    const dreamText = dreamTexts[benchmarkId];
    const stored = await loadStoredCaseArtifacts({
      baselineRoot,
      benchmarkId,
    });
    const postCompositionCompleteness = buildPostCompositionCompletenessReport({
      dreamText,
      composedCandidate: stored.composedCandidate,
      composedCandidateHash: stored.composedCandidateHash,
    });
    const canonicalCandidateCompleteness = buildCanonicalCandidateCompletenessReport({
      dreamText,
      canonicalCandidate: stored.canonicalCandidate,
    });
    const hypotheticalPostCompositionDecision = buildHypotheticalAdmissionDecision({
      memoryRealizationResult: stored.memoryRealizationResult,
      completenessReport: postCompositionCompleteness,
      reportId: `diagnostic:${benchmarkId}:post-composition`,
    });
    const hypotheticalCanonicalDecision = buildHypotheticalAdmissionDecision({
      memoryRealizationResult: stored.memoryRealizationResult,
      completenessReport: canonicalCandidateCompleteness,
      reportId: `diagnostic:${benchmarkId}:canonical`,
    });
    const primaryRootCause = classifyStab02RootCause({
      benchmarkId,
      currentDisposition: stored.pipelineSummary.finalOutcome,
      initialCompleteness: stored.initialCompleteness,
      postCompositionCompleteness,
      hypotheticalPostCompositionDecision,
    });

    caseDiagnoses.push({
      benchmarkId,
      currentDisposition: stored.pipelineSummary.finalOutcome,
      initialCompleteness: {
        adequacy: stored.initialCompleteness.adequacy,
        candidateHash: stored.initialCompleteness.candidateIdentity.candidateHash,
        candidateKind: stored.initialCompleteness.candidateIdentity.candidateKind,
      },
      postCompositionCompleteness: {
        adequacy: postCompositionCompleteness.adequacy,
        candidateHash: postCompositionCompleteness.candidateIdentity.candidateHash,
        candidateKind: postCompositionCompleteness.candidateIdentity.candidateKind,
      },
      canonicalCandidateCompleteness: {
        adequacy: canonicalCandidateCompleteness.adequacy,
        candidateHash: canonicalCandidateCompleteness.candidateIdentity.candidateHash,
        candidateKind: canonicalCandidateCompleteness.candidateIdentity.candidateKind,
      },
      hypotheticalDispositionPostComposition: hypotheticalPostCompositionDecision.disposition,
      hypotheticalDispositionCanonical: hypotheticalCanonicalDecision.disposition,
      primaryRootCause,
    });

    lifecycleMap[benchmarkId] = {
      c0: {
        candidateHash: stored.initialCompleteness.candidateIdentity.candidateHash,
        completenessHash: stored.initialCompleteness.candidateIdentity.candidateHash,
        completenessDescribesCandidate: true,
      },
      c2: {
        candidateHash: stored.composedCandidateHash,
        completenessHash: postCompositionCompleteness.candidateIdentity.candidateHash,
        completenessDescribesCandidate: stored.composedCandidateHash
          === postCompositionCompleteness.candidateIdentity.candidateHash,
      },
      c3: {
        candidateHash: stored.canonicalCandidate.canonicalHash,
        completenessHash: canonicalCandidateCompleteness.candidateIdentity.candidateHash,
        completenessDescribesCandidate: stored.canonicalCandidate.canonicalHash
          === canonicalCandidateCompleteness.candidateIdentity.candidateHash,
      },
      admissionCandidateHash: stored.canonicalCandidate.composedCandidateIdentity.composedCandidateHash,
      currentAdmissionCompletenessHash: stored.initialCompleteness.candidateIdentity.candidateHash,
      currentAdmissionCompletenessMatchesFinalCandidate:
        stored.initialCompleteness.candidateIdentity.candidateHash
        === stored.canonicalCandidate.composedCandidateIdentity.composedCandidateHash,
    };
    candidateStateMap[benchmarkId] = {
      c0: {
        candidateKind: "primary_extraction",
        candidateHash: stored.initialCompleteness.candidateIdentity.candidateHash,
      },
      c2: {
        candidateKind: "composed_candidate",
        candidateHash: stored.composedCandidateHash,
      },
      c3: {
        candidateKind: "canonical_memory_candidate",
        candidateHash: stored.canonicalCandidate.canonicalHash,
      },
    };
    initialVsFinalCompleteness[benchmarkId] = {
      initial: stored.initialCompleteness,
      postComposition: postCompositionCompleteness,
      canonical: canonicalCandidateCompleteness,
    };
    admissionDispositionDelta[benchmarkId] = {
      current: stored.pipelineSummary.finalOutcome,
      postComposition: hypotheticalPostCompositionDecision.disposition,
      canonical: hypotheticalCanonicalDecision.disposition,
    };
    rootCauseMatrix[benchmarkId] = {
      primaryRootCause,
      currentDisposition: stored.pipelineSummary.finalOutcome,
      initialCompletenessAdequacy: stored.initialCompleteness.adequacy,
      postCompositionCompletenessAdequacy: postCompositionCompleteness.adequacy,
      canonicalCompletenessAdequacy: canonicalCandidateCompleteness.adequacy,
      hypotheticalPostCompositionDisposition: hypotheticalPostCompositionDecision.disposition,
      hypotheticalCanonicalDisposition: hypotheticalCanonicalDecision.disposition,
    };
  }

  const postCompositionCounts = countBy(caseDiagnoses.map((entry) => entry.hypotheticalDispositionPostComposition));
  const canonicalCounts = countBy(caseDiagnoses.map((entry) => entry.hypotheticalDispositionCanonical));
  const rootCauseCounts = countBy(caseDiagnoses.map((entry) => entry.primaryRootCause));

  const finalCompletenessLifecycle: FinalCompletenessLifecycleDecision = "post_composition";
  const admissionPolicyConclusion =
    postCompositionCounts.admitted || postCompositionCounts.admitted_with_observations
      ? "YES - BOUNDED POLICY CALIBRATION STILL REQUIRED"
      : "INDETERMINATE";

  const lifecycleModelComparison = {
    currentBaselineCounts: countBy(caseDiagnoses.map((entry) => entry.currentDisposition)),
    postCompositionCounts,
    canonicalCounts,
    recommendedModel: finalCompletenessLifecycle,
    rationale: [
      "Admission evaluates the canonical candidate against composed-candidate identity, so a final completeness basis must align to the post-composition candidate hash.",
      "Canonical-candidate completeness remains diagnostically useful, but it is not admission-compatible without changing the admission contract.",
      "A post-supplemental-only reassessment would still leave admission consuming a non-final candidate basis.",
    ],
  };
  const terminalSummaryAssessment = {
    currentSummaryField: "finalOutcome",
    currentBehavior: "mixes pipeline completion and governance disposition into one terminal label",
    recommendedModel: {
      pipelineStatus: "completed | failed | incomplete",
      governanceDisposition: "admitted | admitted_with_observations | deferred | rejected | indeterminate",
    },
  };
  const stab02Summary = {
    benchmarkCount: caseDiagnoses.length,
    currentDispositionCounts: countBy(caseDiagnoses.map((entry) => entry.currentDisposition)),
    postCompositionDispositionCounts: postCompositionCounts,
    canonicalDispositionCounts: canonicalCounts,
    rootCauseCounts,
    finalCompletenessLifecycle,
    admissionPolicyConclusion,
  };

  const artifacts: Record<string, unknown> = {
    "lifecycle-map.json": lifecycleMap,
    "candidate-state-map.json": candidateStateMap,
    "initial-vs-final-completeness.json": initialVsFinalCompleteness,
    "admission-disposition-delta.json": admissionDispositionDelta,
    "root-cause-matrix.json": rootCauseMatrix,
    "lifecycle-model-comparison.json": lifecycleModelComparison,
    "terminal-summary-assessment.json": terminalSummaryAssessment,
    "stab-02-summary.json": stab02Summary,
  };

  for (const [fileName, value] of Object.entries(artifacts)) {
    await writeJson(path.join(reviewRoot, fileName), value);
  }

  return {
    reviewId,
    reviewRoot,
    finalCompletenessLifecycle,
    admissionPolicyConclusion,
    caseDiagnoses,
    artifacts,
  };
}
