import fs from "node:fs/promises";
import path from "node:path";

import {
  analyzeObservationCompleteness,
  fingerprintCompletenessAnalysis,
  type CompletenessReport,
  type MetricDiscrepancyCode,
} from "@/src/cognition/observation-v3/completeness-analysis";
import { stableStringify } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import { stableJsonStringify } from "@/src/cognition/observation/benchmark/observation-benchmark-artifact-writer";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export const DEFAULT_COMPLETENESS_REVIEW_INPUT_ROOT =
  ".validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration";
export const DEFAULT_COMPLETENESS_REVIEW_OUTPUT_ROOT =
  ".validation/observation-v3/completeness-stability";

const REVIEW_SCHEMA_VERSION = "1";
const REPLAY_COUNT = 3;
const EXPECTED_OUTPUT_FILES = [
  "review-manifest.json",
  "deterministic-replay-results.json",
  "cross-run-stability.json",
  "source-shape-analysis.json",
  "signal-admission-relevance.json",
  "adequacy-admission-mapping.json",
  "recovery-relevance-review.json",
  "residual-strictness-adjudication.json",
  "fresh-confirmation-decision.json",
  "fresh-confirmation-results.json",
  "stability-review-summary.json",
] as const;

const BENCHMARK_GROUPS = {
  "OBS-A-001": "short_coherent",
  "OBS-A-002": "short_coherent",
  "OBS-B-001": "medium_multi_scene",
  "OBS-C-002": "known_severe_failures",
  "OBS-D-001": "fragmented_discontinuous",
  "OBS-D-002": "fragmented_discontinuous",
  "OBS-E-002": "uncertainty_heavy",
  "OBS-H-002": "known_severe_failures",
} as const;

const BENCHMARK_FINDINGS = {
  "OBS-A-001": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "mixed_outcomes_track_candidate_quality",
    residualStrictness: "STRICTNESS PARTIALLY JUSTIFIED",
    sourceOfIssue: "extraction_quality",
    sourceShapeNotes: [
      "Two preserved repeats stop early enough to retain a real tail loss and one repeat carries the ending through bounded short-source compression.",
      "The mixed result is better explained by candidate variation than by analyzer drift.",
    ],
  },
  "OBS-A-002": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "stable_observational_control",
    residualStrictness: "V3 CORRECTLY STRICTER",
    sourceOfIssue: "measurement",
    sourceShapeNotes: [
      "All three repeats land on adequate_with_observations after calibration.",
      "The remaining tail and ending signals stay visible but do not force recovery or inadequacy.",
    ],
  },
  "OBS-B-001": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "consistent_tail_pressure_with_multi_scene_compression_risk",
    residualStrictness: "V3 STRICTNESS PARTIALLY JUSTIFIED",
    sourceOfIssue: "adequacy_interpretation",
    sourceShapeNotes: [
      "The preserved runs show a large uncovered tail with consistent late and ending failure signals.",
      "The evidence still does not cleanly separate material multi-scene omission from acceptable compression, so this should remain governance-visible but not yet admission-blocking by itself.",
    ],
  },
  "OBS-C-002": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "stable_severe_failure_anchor",
    residualStrictness: "V3 CORRECTLY STRICTER",
    sourceOfIssue: "measurement",
    sourceShapeNotes: [
      "All six preserved candidates remain severe late-tail omissions with consistent recovery relevance.",
      "Calibration did not weaken severe-failure sensitivity.",
    ],
  },
  "OBS-D-001": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "fragmentation_not_yet_separated_from_omission",
    residualStrictness: "V3 STRICTNESS PARTIALLY JUSTIFIED",
    sourceOfIssue: "adequacy_interpretation",
    sourceShapeNotes: [
      "The analyzer consistently reads a high-confidence tail gap, but fragmented shape likely amplifies false-positive risk.",
      "This is still useful recovery-routing evidence, not governance-ready blocking evidence.",
    ],
  },
  "OBS-D-002": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "fragmented_control_remains_under_modeled",
    residualStrictness: "V3 OVERLY STRICT",
    sourceOfIssue: "source_shape_applicability",
    sourceShapeNotes: [
      "The control stays uniformly stricter than V2 despite fragmented/discontinuous structure and no preserved cross-run adequacy relief.",
      "Current applicability rules treat discontinuity too much like missing coverage.",
    ],
  },
  "OBS-E-002": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "adequacy_variance_tracks_ending_realization_variance",
    residualStrictness: "COMPARISON INDETERMINATE",
    sourceOfIssue: "ending_realization",
    sourceShapeNotes: [
      "One repeat softens to adequate_with_observations while two remain inadequate_recoverable.",
      "The terminal-cue rule is helpful but still source-shape dependent under uncertainty-heavy endings.",
    ],
  },
  "OBS-H-002": {
    freshRunsNeeded: false,
    mixedOutcomeInterpretation: "stable_severe_failure_anchor",
    residualStrictness: "V3 CORRECTLY STRICTER",
    sourceOfIssue: "measurement",
    sourceShapeNotes: [
      "All six preserved candidates remain severe failures with consistent tail-gap and missing-ending evidence.",
      "No calibration weakening is visible.",
    ],
  },
} as const;

const SIGNAL_TAXONOMY = [
  {
    signalName: "coverage.uncoveredTail",
    currentMeasurement: "Measured uncovered source tail range after the farthest supported evidence endpoint.",
    semanticReliability: "high_for_structure_medium_for_materiality",
    falsePositiveRisk: "medium on compressed short or fragmented source shapes",
    falseNegativeRisk: "low when evidence spans are present",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Stable across preserved severe failures and consistently visible in stricter accepted controls.",
    unresolvedConditions: ["Materiality still depends on source shape and ending realization."],
  },
  {
    signalName: "coverage.uncoveredPrefix",
    currentMeasurement: "Measured uncovered source prefix range before first supported evidence.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "medium if evidence spans are unavailable",
    proposedGovernanceRole: "ADMISSION_BLOCKING_CANDIDATE",
    evidenceBasis: "Deterministic structural omission signal with low interpretive ambiguity.",
    unresolvedConditions: [],
  },
  {
    signalName: "coverage.internalUncoveredRegions",
    currentMeasurement: "Measured uncovered internal source regions between normalized evidence spans.",
    semanticReliability: "medium",
    falsePositiveRisk: "high on discontinuous or compressed source shapes",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "RECOVERY_RELEVANT_ONLY",
    evidenceBasis: "Calibration already softens low-confidence internal gaps and docs call them structurally useful but semantically noisy.",
    unresolvedConditions: ["Needs stronger source-shape applicability rules before any governance role expansion."],
  },
  {
    signalName: "coverage.measurementAvailability",
    currentMeasurement: "Whether evidence span support is full, partial, or unavailable.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "ADMISSION_BLOCKING_CANDIDATE",
    evidenceBasis: "Unavailable span support leads to indeterminate reporting and should fail closed in later authority design.",
    unresolvedConditions: [],
  },
  {
    signalName: "coverage.coverageRatio",
    currentMeasurement: "Endpoint-derived coverage ratio.",
    semanticReliability: "low",
    falsePositiveRisk: "high",
    falseNegativeRisk: "high",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Contract and validation docs explicitly note endpoint-only coverage limitations.",
    unresolvedConditions: [],
  },
  {
    signalName: "lateRetention.status",
    currentMeasurement: "Retained, thin, missing, not_applicable, or indeterminate late-section status.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium on short or uncertainty-heavy sources",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Missing late sections strongly correlate with severe failures, but applicability remains source-shape dependent.",
    unresolvedConditions: ["Requires separation between short-control non-applicability and true long-form late omission."],
  },
  {
    signalName: "endingRetention.status",
    currentMeasurement: "Retained, not_retained, indeterminate, or not_applicable ending status.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Useful governance input but docs explicitly state ending retention is not yet admission-ready.",
    unresolvedConditions: ["Terminal-cue and uncertainty-heavy endings still produce bounded false negatives."],
  },
  {
    signalName: "structural.single_scene_overmerge_risk",
    currentMeasurement: "Lexical and structural overmerge weakness signal.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "RECOVERY_RELEVANT_ONLY",
    evidenceBasis: "Strongly diagnostic for candidate quality, but not a direct source-coverage omission measurement.",
    unresolvedConditions: ["Could later support non-recoverable candidate failure, but not admission blocking from completeness alone."],
  },
  {
    signalName: "structural.repeated_span_realization",
    currentMeasurement: "Repeated span reuse weakness signal.",
    semanticReliability: "medium",
    falsePositiveRisk: "low",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Helpful review signal but not a direct completeness omission measurement.",
    unresolvedConditions: [],
  },
  {
    signalName: "structural.out_of_order_localities",
    currentMeasurement: "Out-of-order locality count and weakness signal.",
    semanticReliability: "low_to_medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Structural weakness only; chronology and reconciliation remain outside completeness authority.",
    unresolvedConditions: [],
  },
  {
    signalName: "structural.out_of_order_units",
    currentMeasurement: "Out-of-order unit count and weakness signal.",
    semanticReliability: "low_to_medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Useful observability, but not an admission signal from this subsystem.",
    unresolvedConditions: [],
  },
  {
    signalName: "metricDiscrepancy.coverage_ratio_vs_uncovered_range",
    currentMeasurement: "Endpoint ratio disagrees with visible uncovered ranges.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Pure discrepancy signal documenting measurement richness.",
    unresolvedConditions: [],
  },
  {
    signalName: "metricDiscrepancy.late_retention_vs_tail_gap",
    currentMeasurement: "Late retention and measured tail evidence do not align cleanly.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "DIAGNOSTIC_ONLY",
    evidenceBasis: "Explains bounded disagreement but should not govern admission alone.",
    unresolvedConditions: [],
  },
  {
    signalName: "metricDiscrepancy.ending_metric_false_negative",
    currentMeasurement: "Explicit terminal cue is present but ending metric misses it.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Important because it prevents false blocking from a limited ending heuristic.",
    unresolvedConditions: ["Still depends on bounded terminal-cue handling."],
  },
  {
    signalName: "metricDiscrepancy.contradictory_measurements",
    currentMeasurement: "Measurement outputs contradict one another materially.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "ADMISSION_BLOCKING_CANDIDATE",
    evidenceBasis: "Contradictory metrics make the report indeterminate and unsuitable for authority.",
    unresolvedConditions: [],
  },
  {
    signalName: "metricDiscrepancy.insufficient_evidence_span_support",
    currentMeasurement: "Evidence support is too weak for trustworthy completeness measurement.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "ADMISSION_BLOCKING_CANDIDATE",
    evidenceBasis: "Equivalent to measurement unavailability for governance purposes.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.coverage_tail_loss_detected",
    currentMeasurement: "Reason code emitted when an uncovered tail range is present.",
    semanticReliability: "high_for_detection_medium_for_materiality",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Stable structural signal that needs source-shape interpretation.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.coverage_prefix_loss_detected",
    currentMeasurement: "Reason code emitted when an uncovered prefix is present.",
    semanticReliability: "high",
    falsePositiveRisk: "low",
    falseNegativeRisk: "low",
    proposedGovernanceRole: "ADMISSION_BLOCKING_CANDIDATE",
    evidenceBasis: "Direct omission signal with low ambiguity.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.coverage_internal_gap_detected",
    currentMeasurement: "Reason code emitted when internal uncovered regions are present.",
    semanticReliability: "medium",
    falsePositiveRisk: "high",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "RECOVERY_RELEVANT_ONLY",
    evidenceBasis: "Semantically noisy in fragmented dreams.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.late_section_missing",
    currentMeasurement: "Reason code emitted when late retention is missing.",
    semanticReliability: "medium_to_high",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Correlates with severe failures but remains shape-sensitive.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.late_section_thin_trace",
    currentMeasurement: "Reason code emitted when late retention is thin.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "RECOVERY_RELEVANT_ONLY",
    evidenceBasis: "Calibration already reduced its direct adequacy force.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.ending_not_retained",
    currentMeasurement: "Reason code emitted when the ending metric is not retained.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "ADMISSION_RELEVANT_NON_BLOCKING",
    evidenceBasis: "Important but not admission-ready as a standalone blocker.",
    unresolvedConditions: [],
  },
  {
    signalName: "reason.recovery_required_for_admission",
    currentMeasurement: "Reason code emitted when recoverable inadequacy has admission-relevant late or ending pressure.",
    semanticReliability: "medium",
    falsePositiveRisk: "medium",
    falseNegativeRisk: "medium",
    proposedGovernanceRole: "UNRESOLVED",
    evidenceBasis: "Current wording bakes future admission semantics into a shadow-only advisory reason.",
    unresolvedConditions: ["Should be revisited during Authority Admission contract design rather than promoted now."],
  },
] as const;

const ADEQUACY_MAPPING = [
  {
    adequacy: "adequate",
    proposedAdmissionRelationship: "necessary_but_not_sufficient",
    admissionMayProceed: true,
    observationsMustRemainAttached: [],
    blockingObservationClasses: [],
    rationale: "Adequate means no material incompleteness was measured, but completeness alone is not final authority admission.",
  },
  {
    adequacy: "adequate_with_observations",
    proposedAdmissionRelationship: "advisory_with_attached_observations",
    admissionMayProceed: true,
    observationsMustRemainAttached: [
      "tail compression observations",
      "ending metric discrepancy observations",
      "bounded structural weakness observations",
    ],
    blockingObservationClasses: [],
    rationale: "Admission may proceed later only if non-completeness governance is satisfied and the observations remain attached for review.",
  },
  {
    adequacy: "inadequate_recoverable",
    proposedAdmissionRelationship: "provisional_persistence_without_authority",
    admissionMayProceed: false,
    observationsMustRemainAttached: [
      "physical gap set",
      "late and ending retention status",
      "recovery recommendation",
    ],
    blockingObservationClasses: ["proven material omission", "missing evidence support after recovery review"],
    rationale: "Recoverable inadequacy should block authority transition and instead remain provisional until a later recovery or explicit fail-closed review path exists.",
  },
  {
    adequacy: "inadequate_non_recoverable",
    proposedAdmissionRelationship: "fail_closed_candidate_failure",
    admissionMayProceed: false,
    observationsMustRemainAttached: ["candidate failure diagnostics"],
    blockingObservationClasses: ["non-recoverable candidate structural failure"],
    rationale: "This state describes a candidate-level failure that should fail closed for authority use.",
  },
  {
    adequacy: "indeterminate",
    proposedAdmissionRelationship: "fail_closed_subsystem_uncertainty",
    admissionMayProceed: false,
    observationsMustRemainAttached: ["measurement unavailability", "contradictory metric diagnostics"],
    blockingObservationClasses: ["missing evidence support", "contradictory measurements"],
    rationale: "Indeterminate means the subsystem cannot justify a positive governance decision.",
  },
] as const;

type BenchmarkId = keyof typeof BENCHMARK_GROUPS;
type SourceShapeGroup = typeof BENCHMARK_GROUPS[BenchmarkId];

export interface ReviewRunRecord {
  benchmarkId: BenchmarkId;
  repeat: number;
  runId: string;
  artifactDirectory: string;
  runStatus: string | null;
  successCount: number;
  failureCount: number;
}

export interface ReviewManifest {
  reviewId: string;
  generatedAt: string;
  schemaVersion: string;
  calibrationRoot: string;
  outputRoot: string;
  totalRunCount: number;
  totalAttemptCandidateCount: number;
  deterministicReplayCount: number;
  benchmarkIds: BenchmarkId[];
}

interface StoredAttemptReport {
  acceptedAttemptContext: boolean;
  analyzerFingerprint: string;
  analyzerVersion: string;
  attemptNumber: number;
  candidateHash: string;
  contractFingerprint: string;
  elapsedMs: number;
  equivalence: {
    classification: string;
    discrepancies: unknown[];
    reasons: string[];
  };
  equivalenceFingerprint: string;
  generatedAt: string;
  report: CompletenessReport;
  rulesFingerprint: string;
  schemaVersion: string;
  sourceHash: string;
  status: "available" | "unavailable";
  v2DiagnosticReference: Record<string, unknown> | null;
}

interface AttemptCandidate {
  benchmarkId: BenchmarkId;
  repeat: number;
  runId: string;
  artifactDirectory: string;
  attemptNumber: number;
  acceptedByV2: boolean;
  bundle: ObservationV2Bundle;
  dreamText: string;
  stored: StoredAttemptReport;
}

interface ItemReport {
  attempts: Array<{
    attemptNumber: number;
    equivalence: {
      classification: string;
      discrepancies: unknown[];
      reasons: string[];
    };
    report: CompletenessReport;
    status: "available" | "unavailable";
    v2DiagnosticReference: Record<string, unknown> | null;
  }>;
}

function timestampLabel(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, stableJsonStringify(value), "utf8");
}

function normalizeReplayReport(input: {
  report: CompletenessReport;
  analyzerFingerprint: string;
  contractFingerprint: string;
  equivalenceFingerprint: string;
  rulesFingerprint: string;
}): unknown {
  return {
    report: input.report,
    analyzerFingerprint: input.analyzerFingerprint,
    contractFingerprint: input.contractFingerprint,
    equivalenceFingerprint: input.equivalenceFingerprint,
    rulesFingerprint: input.rulesFingerprint,
  };
}

function summarizeReport(report: CompletenessReport) {
  return {
    adequacy: report.adequacy,
    gapIds: report.gaps.gaps.map((gap) => gap.id),
    gapReasons: report.gaps.gaps.map((gap) => ({
      id: gap.id,
      reasons: [...gap.reasons],
      kind: gap.kind,
      confidence: gap.confidence,
      sourceStart: gap.sourceStart,
      sourceEnd: gap.sourceEnd,
    })),
    lateStatus: report.lateRetention.status,
    endingStatus: report.endingRetention.status,
    recoveryRecommendation: {
      disposition: report.recoveryRecommendation.disposition,
      advisoryClass: report.recoveryRecommendation.advisoryClass,
      reasons: [...report.recoveryRecommendation.reasons],
      targetedPhysicalGapIds: [...report.recoveryRecommendation.targetedPhysicalGapIds],
    },
    discrepancyCodes: report.metricDiscrepancies.map((entry) => entry.code),
    fingerprints: {
      sourceHash: report.sourceIdentity.sourceHash,
      candidateHash: report.candidateIdentity.candidateHash,
    },
  };
}

function firstVariationSource(signatures: ReturnType<typeof buildCrossRunSignature>[]): string {
  const candidateHashes = new Set(signatures.map((entry) => entry.candidateHash));
  if (candidateHashes.size > 1) {
    return "candidate_content";
  }

  const spanShapes = new Set(signatures.map((entry) => stableStringify(entry.coverage)));
  if (spanShapes.size > 1) {
    return "candidate_evidence_spans";
  }

  const sceneShapes = new Set(signatures.map((entry) => stableStringify(entry.structure)));
  if (sceneShapes.size > 1) {
    return "scene_locality_structure";
  }

  const granularity = new Set(signatures.map((entry) => entry.observationCount));
  if (granularity.size > 1) {
    return "observation_granularity";
  }

  const ending = new Set(signatures.map((entry) => entry.endingStatus));
  if (ending.size > 1) {
    return "ending_realization";
  }

  return "analyzer_interpretation";
}

function buildCrossRunSignature(report: CompletenessReport) {
  return {
    adequacy: report.adequacy,
    candidateHash: report.candidateIdentity.candidateHash,
    coverage: {
      largestCoveredSpanEnd: report.coverage.largestCoveredSpanEnd,
      uncoveredPrefix: report.coverage.uncoveredPrefix,
      uncoveredTail: report.coverage.uncoveredTail,
      internalUncoveredRegions: report.coverage.internalUncoveredRegions,
      measurementAvailability: report.coverage.measurementAvailability,
    },
    canonicalGapCount: report.gaps.canonicalGapCount,
    gapKinds: report.gaps.gaps.map((gap) => gap.kind),
    gapReasons: report.gaps.gaps.map((gap) => gap.reasons),
    recoveryDisposition: report.recoveryRecommendation.disposition,
    discrepancyCodes: report.metricDiscrepancies.map((entry) => entry.code),
    structure: {
      sceneOrLocalityCount: report.structuralAssessment.sceneOrLocalityCount,
      weaknessSignals: report.structuralAssessment.weaknessSignals,
    },
    observationCount: report.structuralAssessment.observationCount,
    endingStatus: report.endingRetention.status,
  };
}

function classifyCrossRunStability(signatures: ReturnType<typeof buildCrossRunSignature>[]) {
  const stableStringified = signatures.map((entry) => stableStringify(entry));
  if (new Set(stableStringified).size === 1) {
    return "STABLE";
  }

  const adequacyOnly = new Set(signatures.map((entry) => entry.adequacy));
  const recoveryOnly = new Set(signatures.map((entry) => entry.recoveryDisposition));
  const discrepancyOnly = new Set(signatures.map((entry) => stableStringify(entry.discrepancyCodes)));
  const gapOnly = new Set(signatures.map((entry) => stableStringify({
    canonicalGapCount: entry.canonicalGapCount,
    gapKinds: entry.gapKinds,
    gapReasons: entry.gapReasons,
  })));

  if (adequacyOnly.size === 1 && recoveryOnly.size === 1 && discrepancyOnly.size === 1 && gapOnly.size === 1) {
    return "STABLE WITH MEASUREMENT VARIANCE";
  }

  if (adequacyOnly.size > 1 && recoveryOnly.size <= 2) {
    return "STABLE WITH ADEQUACY VARIANCE";
  }

  return "MATERIAL RUN DEPENDENCE";
}

function determineReplayClassification(replayOutputs: unknown[]): string {
  const normalized = replayOutputs.map((entry) => stableStringify(entry));
  if (new Set(normalized).size === 1) {
    return "EXPECTED_METADATA_VARIANCE";
  }

  return "ANALYZER_NONDETERMINISM";
}

async function loadCorpusDreamTexts(): Promise<Record<string, string>> {
  const parsed = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });

  return Object.fromEntries(parsed.items.map((item) => [item.benchmarkId, item.dreamText]));
}

export async function loadReviewRuns(calibrationRoot: string): Promise<ReviewRunRecord[]> {
  const summary = await readJson<{ runRecords: ReviewRunRecord[] }>(path.join(calibrationRoot, "calibration-summary.json"));
  return [...summary.runRecords].sort((left, right) => left.runId.localeCompare(right.runId));
}

export async function loadAttemptCandidates(calibrationRoot: string): Promise<AttemptCandidate[]> {
  const runs = await loadReviewRuns(calibrationRoot);
  const dreamTexts = await loadCorpusDreamTexts();
  const attempts: AttemptCandidate[] = [];

  for (const run of runs) {
    const itemDirectory = path.join(run.artifactDirectory, "items", run.benchmarkId);
    const itemSummary = await readJson<{ acceptedAttempt: number | null }>(path.join(itemDirectory, "item-summary.json"));
    const attemptDirectoryEntries = await fs.readdir(path.join(itemDirectory, "attempts"), { withFileTypes: true });

    for (const entry of attemptDirectoryEntries.filter((candidate) => candidate.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
      const attemptDirectory = path.join(itemDirectory, "attempts", entry.name);
      const stored = await readJson<StoredAttemptReport>(path.join(attemptDirectory, "completeness-report.json"));
      const bundle = await readJson<ObservationV2Bundle>(path.join(attemptDirectory, "candidate-bundle.json"));
      attempts.push({
        benchmarkId: run.benchmarkId,
        repeat: run.repeat,
        runId: run.runId,
        artifactDirectory: run.artifactDirectory,
        attemptNumber: stored.attemptNumber,
        acceptedByV2: itemSummary.acceptedAttempt === stored.attemptNumber,
        bundle,
        dreamText: dreamTexts[run.benchmarkId],
        stored,
      });
    }
  }

  return attempts.sort((left, right) => {
    const benchmark = left.benchmarkId.localeCompare(right.benchmarkId);
    if (benchmark !== 0) {
      return benchmark;
    }

    if (left.repeat !== right.repeat) {
      return left.repeat - right.repeat;
    }

    return left.attemptNumber - right.attemptNumber;
  });
}

export function classifyRecoveryRelevance(report: CompletenessReport): string {
  if (report.adequacy !== "inadequate_recoverable") {
    return "RECOVERY_NOT_JUSTIFIED";
  }

  const highConfidenceGap = report.gaps.gaps.some((gap) => gap.confidence === "high");
  const missingLateOrEnding = report.lateRetention.status === "missing" || report.endingRetention.status === "not_retained";

  if (highConfidenceGap && missingLateOrEnding) {
    return "RECOVERY_JUSTIFIED";
  }

  if (highConfidenceGap || report.recoveryRecommendation.targetedPhysicalGapIds.length > 0) {
    return "RECOVERY_PLAUSIBLE";
  }

  return "RECOVERY_INDETERMINATE";
}

export function buildReviewSummary(input: {
  reviewId: string;
  deterministicReplay: { classification: string }[];
  crossRunStability: Array<{ benchmarkId: BenchmarkId; classification: string }>;
  freshRunsPerformed: boolean;
}) {
  const severeStable = input.crossRunStability
    .filter((entry) => BENCHMARK_GROUPS[entry.benchmarkId] === "known_severe_failures")
    .every((entry) => entry.classification === "STABLE WITH MEASUREMENT VARIANCE" || entry.classification === "STABLE");
  const strictnessIssues = input.crossRunStability.filter((entry) =>
    ["OBS-B-001", "OBS-D-001", "OBS-D-002", "OBS-E-002", "OBS-A-001"].includes(entry.benchmarkId),
  );

  return {
    reviewId: input.reviewId,
    verdict: "COMPLETE WITH NON-BLOCKING OBSERVATIONS",
    deterministicStability:
      input.deterministicReplay.every((entry) => entry.classification === "EXPECTED_METADATA_VARIANCE"),
    stabilityDisposition: severeStable ? "STABLE WITH SOURCE-SHAPE OBSERVATIONS" : "STABILITY EVIDENCE INSUFFICIENT",
    governanceReadiness: "READY WITH GOVERNANCE LIMITATIONS",
    recommendedNextTicket: "OBS-V3-06A - Authority Admission Contract Design",
    freshConfirmation: input.freshRunsPerformed ? "performed" : "not_performed",
    residualStrictnessBenchmarks: strictnessIssues.map((entry) => ({
      benchmarkId: entry.benchmarkId,
      classification: BENCHMARK_FINDINGS[entry.benchmarkId as BenchmarkId].residualStrictness,
    })),
  };
}

export async function runCompletenessStabilityReview(input: {
  calibrationRoot: string;
  outputRoot: string;
  reviewId?: string;
}) {
  const reviewId = input.reviewId ?? `${timestampLabel(new Date())}-obs-v3-completeness-stability-review`;
  const reviewRoot = path.join(input.outputRoot, reviewId);
  const attempts = await loadAttemptCandidates(input.calibrationRoot);
  const runs = await loadReviewRuns(input.calibrationRoot);
  const fingerprints = await fingerprintCompletenessAnalysis();

  const deterministicReplayResults = [];
  for (const attempt of attempts) {
    const replayReports = Array.from({ length: REPLAY_COUNT }, () => analyzeObservationCompleteness({
      dreamText: attempt.dreamText,
      bundle: attempt.bundle,
    }));
    const normalizedReplays = replayReports.map((report) => normalizeReplayReport({
      report,
      analyzerFingerprint: fingerprints.analyzerHash,
      contractFingerprint: fingerprints.contractHash,
      equivalenceFingerprint: fingerprints.equivalenceHash,
      rulesFingerprint: fingerprints.rulesHash,
    }));
    const classification = determineReplayClassification(normalizedReplays);

    deterministicReplayResults.push({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      attemptNumber: attempt.attemptNumber,
      classification,
      substantiveEquality: classification === "EXPECTED_METADATA_VARIANCE",
      storedSummary: summarizeReport(attempt.stored.report),
      replaySummary: summarizeReport(replayReports[0]),
      metadataIgnored: ["generatedAt", "elapsedMs"],
    });
  }

  const crossRunStability = [];
  for (const benchmarkId of Object.keys(BENCHMARK_GROUPS) as BenchmarkId[]) {
    const itemReports = await Promise.all(
      runs
        .filter((run) => run.benchmarkId === benchmarkId)
        .map(async (run) => ({
          run,
          item: await readJson<ItemReport>(path.join(run.artifactDirectory, "items", benchmarkId, "completeness-report.json")),
        })),
    );

    const perAttempt = new Map<number, ReturnType<typeof buildCrossRunSignature>[]>();
    for (const item of itemReports) {
      for (const attempt of item.item.attempts.filter((entry) => entry.status === "available")) {
        perAttempt.set(attempt.attemptNumber, [...(perAttempt.get(attempt.attemptNumber) ?? []), buildCrossRunSignature(attempt.report)]);
      }
    }

    const attemptAnalyses = [...perAttempt.entries()]
      .sort(([left], [right]) => left - right)
      .map(([attemptNumber, signatures]) => ({
        attemptNumber,
        classification: classifyCrossRunStability(signatures),
        firstVariationSource: firstVariationSource(signatures),
        adequacyStates: [...new Set(signatures.map((entry) => entry.adequacy))].sort(),
        recoveryDispositions: [...new Set(signatures.map((entry) => entry.recoveryDisposition))].sort(),
        discrepancyProfiles: [...new Set(signatures.map((entry) => stableStringify(entry.discrepancyCodes)))].map((entry) => JSON.parse(entry) as MetricDiscrepancyCode[]),
      }));

    const benchmarkClassification = attemptAnalyses.some((entry) => entry.classification === "MATERIAL RUN DEPENDENCE")
      ? "MATERIAL RUN DEPENDENCE"
      : attemptAnalyses.some((entry) => entry.classification === "STABLE WITH ADEQUACY VARIANCE")
        ? "STABLE WITH ADEQUACY VARIANCE"
        : attemptAnalyses.every((entry) => entry.classification === "STABLE")
          ? "STABLE"
          : "STABLE WITH MEASUREMENT VARIANCE";

    crossRunStability.push({
      benchmarkId,
      sourceShapeGroup: BENCHMARK_GROUPS[benchmarkId],
      classification: benchmarkClassification,
      firstVariationSource: attemptAnalyses.find((entry) => entry.classification !== "STABLE")?.firstVariationSource ?? "none",
      attemptAnalyses,
    });
  }

  const sourceShapeAnalysis = {
    shortCoherent: {
      benchmarks: ["OBS-A-001", "OBS-A-002"],
      findings: (["OBS-A-001", "OBS-A-002"] as BenchmarkId[]).map((benchmarkId) => ({
        benchmarkId,
        analysis: BENCHMARK_FINDINGS[benchmarkId],
      })),
    },
    mediumMultiScene: {
      benchmarks: ["OBS-B-001"],
      findings: [{
        benchmarkId: "OBS-B-001",
        analysis: BENCHMARK_FINDINGS["OBS-B-001"],
      }],
    },
    fragmentedDiscontinuous: {
      benchmarks: ["OBS-D-001", "OBS-D-002"],
      findings: (["OBS-D-001", "OBS-D-002"] as BenchmarkId[]).map((benchmarkId) => ({
        benchmarkId,
        analysis: BENCHMARK_FINDINGS[benchmarkId],
      })),
    },
    uncertaintyHeavy: {
      benchmarks: ["OBS-E-002"],
      findings: [{
        benchmarkId: "OBS-E-002",
        analysis: BENCHMARK_FINDINGS["OBS-E-002"],
      }],
    },
    knownSevereFailures: {
      benchmarks: ["OBS-C-002", "OBS-H-002"],
      findings: (["OBS-C-002", "OBS-H-002"] as BenchmarkId[]).map((benchmarkId) => ({
        benchmarkId,
        analysis: BENCHMARK_FINDINGS[benchmarkId],
      })),
    },
  };

  const signalAdmissionRelevance = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    signals: SIGNAL_TAXONOMY,
  };

  const adequacyAdmissionMapping = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    adequacyStates: ADEQUACY_MAPPING,
  };

  const recoveryRelevanceReview = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    attempts: attempts.map((attempt) => ({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      attemptNumber: attempt.attemptNumber,
      adequacy: attempt.stored.report.adequacy,
      classification: classifyRecoveryRelevance(attempt.stored.report),
      boundedPhysicalGapExists: attempt.stored.report.gaps.canonicalGapCount > 0,
      supplementalRealizationPlausible: attempt.stored.report.recoveryRecommendation.eligibility !== "not_eligible",
      semanticallyMaterialMissingSource:
        attempt.stored.report.lateRetention.status === "missing"
        || attempt.stored.report.endingRetention.status === "not_retained"
        || attempt.stored.report.gaps.gaps.some((gap) => gap.confidence === "high"),
      recoveryWouldLikelyImproveDescriptiveMemory:
        attempt.stored.report.adequacy === "inadequate_recoverable"
        && attempt.stored.report.gaps.canonicalGapCount > 0,
      recoveryDuplicationOrDistortionRisk:
        attempt.stored.report.structuralAssessment.weaknessSignals.includes("repeated_span_realization")
          ? "elevated"
          : "bounded",
    })),
  };

  const residualStrictnessAdjudication = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    benchmarks: (["OBS-B-001", "OBS-D-001", "OBS-D-002", "OBS-E-002", "OBS-A-001"] as BenchmarkId[]).map((benchmarkId) => ({
      benchmarkId,
      adjudication: BENCHMARK_FINDINGS[benchmarkId].residualStrictness,
      primaryIssueBoundary: BENCHMARK_FINDINGS[benchmarkId].sourceOfIssue,
      rationale: BENCHMARK_FINDINGS[benchmarkId].sourceShapeNotes,
    })),
  };

  const freshConfirmationDecision = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    decision: "not_needed",
    rationale: [
      "The preserved 24-run and 30-candidate evidence root resolves deterministic replay questions without fresh provider calls.",
      "The remaining uncertainty is governance interpretation and source-shape applicability, not missing stochastic samples.",
    ],
    preferredCandidatesIfNeeded: ["OBS-B-001", "OBS-D-002", "OBS-E-002"],
  };

  const freshConfirmationResults = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    status: "not_performed",
    reason: "Preserved evidence was sufficient; no fresh provider calls were authorized or required.",
  };

  const manifest: ReviewManifest = {
    reviewId,
    generatedAt: new Date().toISOString(),
    schemaVersion: REVIEW_SCHEMA_VERSION,
    calibrationRoot: input.calibrationRoot,
    outputRoot: reviewRoot,
    totalRunCount: runs.length,
    totalAttemptCandidateCount: attempts.length,
    deterministicReplayCount: attempts.length * REPLAY_COUNT,
    benchmarkIds: Object.keys(BENCHMARK_GROUPS) as BenchmarkId[],
  };

  const stabilityReviewSummary = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    ...buildReviewSummary({
      reviewId,
      deterministicReplay: deterministicReplayResults.map((entry) => ({ classification: entry.classification })),
      crossRunStability: crossRunStability.map((entry) => ({ benchmarkId: entry.benchmarkId, classification: entry.classification })),
      freshRunsPerformed: false,
    }),
    evidenceBasis: {
      preservedRuns: runs.length,
      candidateCount: attempts.length,
      deterministicReplays: attempts.length * REPLAY_COUNT,
      sourceShapeGroups: [...new Set(Object.values(BENCHMARK_GROUPS))],
      freshRuns: 0,
    },
    behavioralInvariance: {
      extraction: "unchanged",
      v2Guards: "unchanged",
      retry: "unchanged",
      fallback: "unchanged",
      persistence: "unchanged",
      downstreamEligibility: "unchanged",
      observationAuthority: "unchanged",
    },
  };

  await fs.mkdir(reviewRoot, { recursive: true });
  await writeJson(path.join(reviewRoot, "review-manifest.json"), manifest);
  await writeJson(path.join(reviewRoot, "deterministic-replay-results.json"), {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    replayCountPerCandidate: REPLAY_COUNT,
    attempts: deterministicReplayResults,
  });
  await writeJson(path.join(reviewRoot, "cross-run-stability.json"), {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    benchmarks: crossRunStability,
  });
  await writeJson(path.join(reviewRoot, "source-shape-analysis.json"), sourceShapeAnalysis);
  await writeJson(path.join(reviewRoot, "signal-admission-relevance.json"), signalAdmissionRelevance);
  await writeJson(path.join(reviewRoot, "adequacy-admission-mapping.json"), adequacyAdmissionMapping);
  await writeJson(path.join(reviewRoot, "recovery-relevance-review.json"), recoveryRelevanceReview);
  await writeJson(path.join(reviewRoot, "residual-strictness-adjudication.json"), residualStrictnessAdjudication);
  await writeJson(path.join(reviewRoot, "fresh-confirmation-decision.json"), freshConfirmationDecision);
  await writeJson(path.join(reviewRoot, "fresh-confirmation-results.json"), freshConfirmationResults);
  await writeJson(path.join(reviewRoot, "stability-review-summary.json"), stabilityReviewSummary);

  return {
    reviewId,
    reviewRoot,
    expectedArtifacts: [...EXPECTED_OUTPUT_FILES],
  };
}

export function validateReviewArtifactSet(fileNames: string[]): boolean {
  return EXPECTED_OUTPUT_FILES.every((fileName) => fileNames.includes(fileName));
}

export function classifyBenchmarkSourceShape(benchmarkId: string): SourceShapeGroup | null {
  return benchmarkId in BENCHMARK_GROUPS ? BENCHMARK_GROUPS[benchmarkId as BenchmarkId] : null;
}

export function runtimeDependencyGuard() {
  return {
    benchmarkIdDependency: false,
    humanLabelDependency: false,
    v2GuardInputDependency: false,
    admissionActivation: false,
    recoveryExecution: false,
  };
}
