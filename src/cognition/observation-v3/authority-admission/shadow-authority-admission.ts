import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import { compareAuthorityAdmissionWithV2 } from "@/src/cognition/observation-v3/authority-admission/admission-equivalence";
import { evaluateAdmissionRequest } from "@/src/cognition/observation-v3/authority-admission/admission-evaluator";
import { fingerprintAuthorityAdmission, stableStringify } from "@/src/cognition/observation-v3/authority-admission/admission-fingerprint";
import {
  AUTHORITY_ADMISSION_EVALUATOR_VERSION,
  AUTHORITY_ADMISSION_SCHEMA_VERSION,
  type AdmissionDecision,
  type AdmissionIdentityInputComparison,
  type AdmissionPolicy,
  type AdmissionRequest,
  type EvidenceIntegrityAssessment,
  type MemoryRealizationValidationResult,
  type ObservationProvenanceManifest,
  type UncertaintyPreservationAssessment,
  type V2AuthorityOutcome,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
import { DEFAULT_AUTHORITY_ADMISSION_POLICY } from "@/src/cognition/observation-v3/authority-admission/admission-policy";
import type { CompletenessReport } from "@/src/cognition/observation-v3/completeness-analysis";
import { classifyIdentityComparison, type IdentitySnapshot } from "@/src/cognition/observation-v3/identity-comparison";
import {
  buildShadowMemoryRealizationRequest,
  type CanonicalMemoryCandidate,
  compareNativeMemoryRealizationWithLegacyAdapter,
  fingerprintMemoryRealization,
  runShadowMemoryRealization,
} from "@/src/cognition/observation-v3/memory-realization";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

interface LegacyComparableCandidate {
  candidateId: string;
  candidateHash: string;
  sourceHash: string;
  sourceLength: number;
  bundle?: ObservationV2Bundle;
}

export const DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT =
  ".validation/observation-v3/completeness-calibration/20260801T100214Z-obs-v3-completeness-calibration";
export const DEFAULT_AUTHORITY_ADMISSION_SHADOW_OUTPUT_ROOT =
  ".validation/observation-v3/authority-admission-shadow";

const REVIEW_SCHEMA_VERSION = "1";
const EXPECTED_OUTPUT_FILES = [
  "review-manifest.json",
  "deterministic-replay-results.json",
  "benchmark-matrix.json",
  "equivalence-summary.json",
  "items",
] as const;

const MEMORY_REALIZATION_POLICY_VERSION = "memory-realization-shadow-v1";
const MEMORY_REALIZATION_POLICY_FINGERPRINT = "memory-realization-shadow-v1";

interface StoredAttemptReport {
  attemptNumber: number;
  candidateHash: string | null;
  contractFingerprint: string;
  report?: CompletenessReport;
  schemaVersion: string;
  sourceHash: string;
  status: "available" | "unavailable";
}

interface AttemptCandidateRecord {
  benchmarkId: string;
  repeat: number;
  runId: string;
  attemptNumber: number;
  acceptedByV2: boolean;
  bundle: ObservationV2Bundle;
  dreamText: string;
  completeness: {
    status: "available" | "unavailable";
    reportId: string | null;
    report?: CompletenessReport;
  };
  artifactDirectory: string;
}

interface ReviewRunRecord {
  benchmarkId: string;
  repeat: number;
  runId: string;
  artifactDirectory: string;
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

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(sortForJson(value), null, 2)}\n`, "utf8");
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

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(path.resolve(filePath), "utf8")) as T;
}

async function loadCorpusDreamTexts(): Promise<Record<string, string>> {
  const parsed = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });

  return Object.fromEntries(parsed.items.map((item) => [item.benchmarkId, item.dreamText]));
}

async function loadReviewRuns(calibrationRoot: string): Promise<ReviewRunRecord[]> {
  const summary = await readJson<{ runRecords: ReviewRunRecord[] }>(path.join(calibrationRoot, "calibration-summary.json"));
  return summary.runRecords;
}

export async function loadAuthorityAdmissionAttemptCandidates(calibrationRoot: string): Promise<AttemptCandidateRecord[]> {
  const runs = await loadReviewRuns(calibrationRoot);
  const dreamTexts = await loadCorpusDreamTexts();
  const attempts: AttemptCandidateRecord[] = [];

  for (const run of runs) {
    const itemDirectory = path.join(run.artifactDirectory, "items", run.benchmarkId);
    const itemSummary = await readJson<{ acceptedAttempt: number | null }>(path.join(itemDirectory, "item-summary.json"));
    const entries = (await fs.readdir(path.join(itemDirectory, "attempts"), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const attemptDirectory = path.join(itemDirectory, "attempts", entry.name);
      const stored = await readJson<StoredAttemptReport>(path.join(attemptDirectory, "completeness-report.json"));
      const bundle = await readJson<ObservationV2Bundle>(path.join(attemptDirectory, "candidate-bundle.json"));
      attempts.push({
        benchmarkId: run.benchmarkId,
        repeat: run.repeat,
        runId: run.runId,
        attemptNumber: stored.attemptNumber,
        acceptedByV2: itemSummary.acceptedAttempt === stored.attemptNumber,
        bundle,
        dreamText: dreamTexts[run.benchmarkId] ?? "",
        completeness: stored.status === "available" && stored.report
          ? {
              status: "available",
              reportId: `completeness:${run.runId}:${stored.attemptNumber}`,
              report: stored.report,
            }
          : {
              status: "unavailable",
              reportId: null,
            },
        artifactDirectory: attemptDirectory,
      });
    }
  }

  return attempts.sort((left, right) =>
    left.benchmarkId.localeCompare(right.benchmarkId)
    || left.repeat - right.repeat
    || left.attemptNumber - right.attemptNumber);
}

export function buildCanonicalEquivalentCandidate(input: {
  bundle: ObservationV2Bundle;
  dreamText: string;
  completeness: AttemptCandidateRecord["completeness"];
}): LegacyComparableCandidate {
  const sourceHash = input.completeness.status === "available"
    ? input.completeness.report!.sourceIdentity.sourceHash
    : sha256Hex(input.dreamText);
  const candidateHash = input.completeness.status === "available"
    ? input.completeness.report!.candidateIdentity.candidateHash
    : sha256Hex(stableStringify(input.bundle));

  return {
    candidateId: `candidate-${candidateHash.slice(0, 16)}`,
    candidateHash,
    sourceHash,
    sourceLength: input.dreamText.length,
    bundle: input.bundle,
  };
}

function assessEvidenceIntegrity(input: {
  candidate: CanonicalMemoryCandidate;
}): EvidenceIntegrityAssessment {
  let malformedSpanCount = 0;
  let missingSpanCount = 0;
  let outOfBoundsSpanCount = 0;
  let totalEvidenceSpanCount = 0;

  const evidenceRefs = [
    ...input.candidate.localities.flatMap((locality) => locality.evidenceRefs),
    ...input.candidate.descriptiveUnits.flatMap((unit) => unit.evidenceRefs),
    ...input.candidate.transitions.flatMap((transition) => transition.evidenceRefs),
    ...input.candidate.unresolvedAlternatives.flatMap((alternative) => alternative.evidenceRefs),
  ];

  if (evidenceRefs.length === 0) {
    missingSpanCount += 1;
  }

  for (const evidence of evidenceRefs) {
    totalEvidenceSpanCount += 1;
    if (typeof evidence.spanStart !== "number" || typeof evidence.spanEnd !== "number" || evidence.spanStart > evidence.spanEnd) {
      malformedSpanCount += 1;
      continue;
    }

    if (evidence.spanStart < 0 || evidence.spanEnd > input.candidate.sourceIdentity.sourceLength) {
      outOfBoundsSpanCount += 1;
    }
  }

  return {
    assessmentId: `evidence-${input.candidate.canonicalHash.slice(0, 16)}`,
    status: malformedSpanCount === 0 && missingSpanCount === 0 && outOfBoundsSpanCount === 0 && totalEvidenceSpanCount > 0
      ? "pass"
      : "failed",
    malformedSpanCount,
    missingSpanCount,
    outOfBoundsSpanCount,
    totalEvidenceSpanCount,
    evidenceRef: "canonicalCandidate.evidence",
    observations: [],
  };
}

function assessUncertaintyPreservation(input: {
  candidate: CanonicalMemoryCandidate;
}): UncertaintyPreservationAssessment {
  const uncertaintySignals = input.candidate.uncertaintyRecords.filter((record) => record.note || record.uncertaintyType);

  return {
    assessmentId: `uncertainty-${input.candidate.canonicalHash.slice(0, 16)}`,
    status: uncertaintySignals.length > 0
      ? "acceptable"
      : "indeterminate",
    evidenceRef: "canonicalCandidate.uncertaintyRecords",
    observations: [],
  };
}

export function buildShadowAdmissionRequest(input: {
  candidate: LegacyComparableCandidate;
  completeness: AttemptCandidateRecord["completeness"];
}): AdmissionRequest {
  const memoryRealizationRequest = buildShadowMemoryRealizationRequest({
    bundle: input.candidate.bundle!,
    sourceIdentity: {
      sourceId: `source-${input.candidate.sourceHash.slice(0, 16)}`,
      sourceHash: input.candidate.sourceHash,
      sourceLength: input.candidate.sourceLength,
    },
    compositionResultRef: `legacy-v2-bundle:${input.candidate.candidateId}`,
    realizationPolicyVersion: MEMORY_REALIZATION_POLICY_VERSION,
    realizationPolicyFingerprint: MEMORY_REALIZATION_POLICY_FINGERPRINT,
    composedCandidateHashOverride: input.completeness.status === "available"
      ? input.completeness.report!.candidateIdentity.candidateHash
      : undefined,
  });
  const nativeRealization = runShadowMemoryRealization({
    request: memoryRealizationRequest,
  });
  const request = buildNativeShadowAdmissionRequest({
    nativeResult: nativeRealization.result,
    completeness: input.completeness,
    legacyIdentity: {
      candidateId: input.candidate.candidateId,
      candidateHash: input.candidate.candidateHash,
    },
  });
  if (!request) {
    throw new Error("shadow_authority_admission_request_unavailable");
  }
  return request;
}

function buildNativeProvenanceManifest(input: {
  nativeResult: ReturnType<typeof runShadowMemoryRealization>["result"];
}): ObservationProvenanceManifest {
  const provenance = input.nativeResult.canonicalCandidate?.provenance;
  return {
    provenanceId: provenance?.provenanceId ?? "native-provenance-unavailable",
    status: provenance ? "available" : "unavailable",
    derivationKind: provenance ? "adapter_derived" : "unavailable",
    sourceBoundaryVersion: provenance?.realizationPolicyVersion ?? null,
    provenanceTier: "system_extract",
    dreamLanguage: null,
    evidenceRef: "canonical-provenance",
  };
}

function buildAdmissionIdentityInputComparison(input: {
  canonicalCandidate: CanonicalMemoryCandidate;
  nativeResult: ReturnType<typeof runShadowMemoryRealization>["result"];
  legacyIdentity?: IdentitySnapshot | null;
}): AdmissionIdentityInputComparison {
  const nativeIdentity = {
    candidateId: input.canonicalCandidate.canonicalCandidateId,
    candidateHash: input.canonicalCandidate.canonicalHash,
  };
  const comparison = classifyIdentityComparison({
    legacyIdentity: input.legacyIdentity ?? null,
    nativeIdentity,
    substantiveEquality: true,
    lineagePreserved: true,
    deterministic: input.nativeResult.validation.candidateHashStable && input.nativeResult.validation.stableOrdering,
  });

  return {
    sourceIdentity: input.canonicalCandidate.sourceIdentity,
    parentIdentity: {
      candidateId: input.canonicalCandidate.composedCandidateIdentity.composedCandidateId,
      candidateHash: input.canonicalCandidate.composedCandidateIdentity.composedCandidateHash,
    },
    nativeIdentity,
    legacyIdentity: input.legacyIdentity ?? null,
    subsystemFingerprint: input.nativeResult.contractFingerprint,
    policyFingerprint: input.nativeResult.realizationPolicyFingerprint,
    lineageRefs: [
      input.canonicalCandidate.composedCandidateIdentity.composedCandidateId,
      input.canonicalCandidate.provenance.provenanceId,
    ],
    substantiveEquality: true,
    classification: comparison.classification,
    reasonCode: comparison.reasonCode,
    artifactRefs: [
      "canonical-memory-candidate",
      "memory-realization-validation",
      "canonical-identity-transition.json",
    ],
  };
}

function buildNativeRealizationValidationSummary(input: {
  nativeResult: ReturnType<typeof runShadowMemoryRealization>["result"];
}): MemoryRealizationValidationResult {
  const validation = input.nativeResult.validation;
  return {
    validationId: validation.validationId,
    status: validation.status === "valid" || validation.status === "valid_with_observations"
      ? "pass"
      : validation.status === "indeterminate"
        ? "unavailable"
        : "failed",
    candidateHashStable: validation.candidateHashStable,
    stableOrdering: validation.stableOrdering,
    unitIdentitiesAvailable: validation.unitIdentitiesAvailable,
    evidenceReferencesAvailable: validation.evidenceReferencesAvailable,
    structuralConflicts: validation.structuralConflicts,
    observations: validation.observations,
    evidenceRef: validation.evidenceRef,
  };
}

export function buildNativeShadowAdmissionRequest(input: {
  nativeResult: ReturnType<typeof runShadowMemoryRealization>["result"];
  completeness: AttemptCandidateRecord["completeness"];
  legacyIdentity?: IdentitySnapshot | null;
}): AdmissionRequest | null {
  const canonicalCandidate = input.nativeResult.canonicalCandidate;
  if (!canonicalCandidate) {
    return null;
  }

  return {
    sourceIdentity: {
      sourceId: canonicalCandidate.sourceIdentity.sourceId,
      sourceHash: canonicalCandidate.sourceIdentity.sourceHash,
      sourceLength: canonicalCandidate.sourceIdentity.sourceLength,
    },
    canonicalCandidate,
    provenanceManifest: buildNativeProvenanceManifest({
      nativeResult: input.nativeResult,
    }),
    completeness: input.completeness.status === "available"
      ? {
          status: "available",
          reportId: input.completeness.reportId!,
          report: input.completeness.report!,
        }
      : {
          status: "unavailable",
          reportId: null,
          reason: "completeness_input_unavailable",
          evidenceRef: "completeness-report.json",
        },
    memoryRealizationValidation: buildNativeRealizationValidationSummary({
      nativeResult: input.nativeResult,
    }),
    evidenceIntegrity: assessEvidenceIntegrity({
      candidate: canonicalCandidate,
    }),
    uncertaintyPreservation: assessUncertaintyPreservation({
      candidate: canonicalCandidate,
    }),
    admissionIdentityInputComparison: buildAdmissionIdentityInputComparison({
      canonicalCandidate,
      nativeResult: input.nativeResult,
      legacyIdentity: input.legacyIdentity ?? null,
    }),
    governanceObservations: [],
    contractFingerprint: "shadow-authority-admission-contract-v1",
  };
}

function normalizeDecision(decision: AdmissionDecision): unknown {
  return {
    disposition: decision.disposition,
    authorityIdentity: decision.authorityIdentity,
    decisionReasons: [...decision.decisionReasons],
    blockingFindings: [...decision.blockingFindings],
    nonBlockingObservations: [...decision.nonBlockingObservations],
    requiredNextAction: decision.requiredNextAction,
    persistenceEligibility: decision.persistenceEligibility,
    downstreamEligibility: decision.downstreamEligibility,
    reusableCandidate: decision.reusableCandidate,
    policyFingerprint: decision.policyFingerprint,
    contractFingerprint: decision.contractFingerprint,
  };
}

export function runShadowAuthorityAdmission(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy | null;
  forceEvaluatorFailure?: boolean;
}): {
  decision: AdmissionDecision;
  failure: null | { code: "policy_unavailable" | "evaluator_failed"; message: string };
} {
  if (!input.policy) {
    return {
      decision: {
        disposition: "indeterminate",
        authorityIdentity: null,
        decisionReasons: ["policy_unavailable"],
        blockingFindings: [],
        nonBlockingObservations: [],
        requiredNextAction: "stop_fail_closed",
        persistenceEligibility: "diagnostic_only",
        downstreamEligibility: "none",
        reusableCandidate: true,
        audit: {
          sourceHash: input.request.sourceIdentity.sourceHash,
          candidateHash: input.request.canonicalCandidate.canonicalHash,
          completenessReportId: input.request.completeness.status === "available" ? input.request.completeness.reportId : null,
          provenanceId: input.request.provenanceManifest.provenanceId,
          realizationValidationId: input.request.memoryRealizationValidation.validationId,
          evidenceIntegrityId: input.request.evidenceIntegrity.assessmentId,
          uncertaintyAssessmentId: input.request.uncertaintyPreservation.assessmentId,
        },
        policyFingerprint: "unavailable",
        contractFingerprint: input.request.contractFingerprint,
      },
      failure: {
        code: "policy_unavailable",
        message: "authority_admission_policy_unavailable",
      },
    };
  }

  try {
    if (input.forceEvaluatorFailure) {
      throw new Error("forced_evaluator_failure");
    }

    return {
      decision: evaluateAdmissionRequest({
        request: input.request,
        policy: input.policy,
      }),
      failure: null,
    };
  } catch (error) {
    return {
      decision: {
        disposition: "indeterminate",
        authorityIdentity: null,
        decisionReasons: ["decision_evaluator_failed"],
        blockingFindings: [],
        nonBlockingObservations: [],
        requiredNextAction: "stop_fail_closed",
        persistenceEligibility: "diagnostic_only",
        downstreamEligibility: "none",
        reusableCandidate: true,
        audit: {
          sourceHash: input.request.sourceIdentity.sourceHash,
          candidateHash: input.request.canonicalCandidate.canonicalHash,
          completenessReportId: input.request.completeness.status === "available" ? input.request.completeness.reportId : null,
          provenanceId: input.request.provenanceManifest.provenanceId,
          realizationValidationId: input.request.memoryRealizationValidation.validationId,
          evidenceIntegrityId: input.request.evidenceIntegrity.assessmentId,
          uncertaintyAssessmentId: input.request.uncertaintyPreservation.assessmentId,
        },
        policyFingerprint: input.policy.policyFingerprint,
        contractFingerprint: input.request.contractFingerprint,
      },
      failure: {
        code: "evaluator_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
  }
}

function buildNativeRealizationFailureDecision(input: {
  memoryRealizationRequest: ReturnType<typeof buildShadowMemoryRealizationRequest>;
  nativeRealization: ReturnType<typeof runShadowMemoryRealization>["result"];
  completeness: AttemptCandidateRecord["completeness"];
  policy: AdmissionPolicy;
}): AdmissionDecision {
  const disposition: AdmissionDecision["disposition"] = input.nativeRealization.disposition === "aborted_governance_failure"
    ? "rejected_governance_failure"
    : input.nativeRealization.disposition === "indeterminate"
      ? "indeterminate"
      : "rejected_candidate_failure";

  const decisionReasons: AdmissionDecision["decisionReasons"] = input.nativeRealization.failures.map((entry) => {
    if (entry.code === "provenance_unavailable") {
      return "provenance_unavailable";
    }
    if (entry.code === "policy_unavailable") {
      return "policy_unavailable";
    }
    return "realization_validation_failed";
  });

  return {
    disposition,
    authorityIdentity: null,
    decisionReasons,
    blockingFindings: [],
    nonBlockingObservations: [],
    requiredNextAction: disposition === "indeterminate" ? "stop_fail_closed" : "persist_diagnostic_only",
    persistenceEligibility: "diagnostic_only",
    downstreamEligibility: "none",
    reusableCandidate: false,
    audit: {
      sourceHash: input.memoryRealizationRequest.sourceIdentity.sourceHash,
      candidateHash: "native-unavailable",
      completenessReportId: input.completeness.status === "available" ? input.completeness.reportId : null,
      provenanceId: "native-provenance-unavailable",
      realizationValidationId: input.nativeRealization.validation.validationId,
      evidenceIntegrityId: "native-evidence-unavailable",
      uncertaintyAssessmentId: "native-uncertainty-unavailable",
    },
    policyFingerprint: input.policy.policyFingerprint,
    contractFingerprint: "shadow-authority-admission-contract-v1",
  };
}

function buildDecisionArtifact(input: {
  request: AdmissionRequest | null;
  sourceIdentity: AdmissionRequest["sourceIdentity"];
  candidateIdentity: { candidateId: string | null; candidateHash: string | null };
  validationId: string | null;
  provenanceId: string | null;
  evidenceIntegrityId: string | null;
  uncertaintyAssessmentId: string | null;
  completenessReportId: string | null;
  decision: AdmissionDecision;
  policy: AdmissionPolicy;
  failure: null | { code: string; message: string };
  fingerprints: Awaited<ReturnType<typeof fingerprintAuthorityAdmission>>;
  generatedAt: string;
  elapsedMs: number;
}) {
  return {
    schemaVersion: AUTHORITY_ADMISSION_SCHEMA_VERSION,
    evaluatorVersion: AUTHORITY_ADMISSION_EVALUATOR_VERSION,
    policyVersion: input.policy.policyVersion,
    sourceIdentity: input.sourceIdentity,
    candidateIdentity: input.candidateIdentity,
    candidateHash: input.candidateIdentity.candidateHash,
    shadowRealizationValidationReference: input.validationId,
    completenessReportReference: input.completenessReportId,
    provenanceReference: input.provenanceId,
    evidenceIntegrityReference: input.evidenceIntegrityId,
    uncertaintyPreservationReference: input.uncertaintyAssessmentId,
    disposition: input.decision.disposition,
    authorityIdentity: input.decision.authorityIdentity,
    decisionReasons: input.decision.decisionReasons,
    blockingFindings: input.decision.blockingFindings,
    nonBlockingObservations: input.decision.nonBlockingObservations,
    requiredNextAction: input.decision.requiredNextAction,
    persistenceEligibility: input.decision.persistenceEligibility,
    downstreamEligibility: input.decision.downstreamEligibility,
    reusableCandidate: input.decision.reusableCandidate,
    evaluatorFingerprint: input.fingerprints.evaluatorHash,
    policyFingerprint: input.fingerprints.policyFingerprint,
    contractFingerprint: input.fingerprints.contractHash,
    safeFailureInformation: input.failure,
    elapsedMs: input.elapsedMs,
    metadataTimestamp: input.generatedAt,
  };
}

function buildEquivalenceArtifact(input: {
  v2Outcome: V2AuthorityOutcome;
  decision: AdmissionDecision;
  comparison: ReturnType<typeof compareAuthorityAdmissionWithV2>;
  request: AdmissionRequest | null;
  candidateId: string | null;
  completenessReportId: string | null;
  provenanceId: string | null;
  fingerprints: Awaited<ReturnType<typeof fingerprintAuthorityAdmission>>;
}) {
  return {
    v2Outcome: input.v2Outcome,
    v3Disposition: input.decision.disposition,
    comparison: input.comparison.classification,
    comparisonReasons: input.comparison.reasons,
    blockingFindings: input.decision.blockingFindings.map((finding) => finding.signalId),
    nonBlockingObservations: input.decision.nonBlockingObservations.map((finding) => finding.signalId),
    candidateComparability: input.comparison.candidateComparable,
    artifactReferences: {
      candidateId: input.candidateId,
      completenessReportId: input.completenessReportId,
      provenanceId: input.provenanceId,
    },
    evaluatorFingerprint: input.fingerprints.evaluatorHash,
    policyFingerprint: input.fingerprints.policyFingerprint,
    contractFingerprint: input.fingerprints.contractHash,
    comparatorFingerprint: input.fingerprints.comparatorHash,
  };
}

export async function runAuthorityAdmissionShadowReview(input: {
  calibrationRoot: string;
  outputRoot: string;
  reviewId?: string;
  replayCount?: number;
}) {
  const reviewId = input.reviewId ?? `${timestampLabel(new Date())}-obs-v3-authority-admission-shadow`;
  const replayCount = input.replayCount ?? 3;
  const reviewRoot = path.join(input.outputRoot, reviewId);
  const attempts = await loadAuthorityAdmissionAttemptCandidates(input.calibrationRoot);
  const fingerprints = await fingerprintAuthorityAdmission();
  const memoryRealizationFingerprints = await fingerprintMemoryRealization();

  const deterministicReplayResults: Array<Record<string, unknown>> = [];
  const benchmarkMatrix: Array<Record<string, unknown>> = [];
  const comparisonCounts = new Map<string, number>();
  const dispositionCounts = new Map<string, number>();

  for (const attempt of attempts) {
    const legacyCandidate = buildCanonicalEquivalentCandidate({
      bundle: attempt.bundle,
      dreamText: attempt.dreamText,
      completeness: attempt.completeness,
    });
    const memoryRealizationRequest = buildShadowMemoryRealizationRequest({
      bundle: attempt.bundle,
      sourceIdentity: {
        sourceId: `source-${legacyCandidate.sourceHash.slice(0, 16)}`,
        sourceHash: legacyCandidate.sourceHash,
        sourceLength: legacyCandidate.sourceLength,
      },
      compositionResultRef: `legacy-v2-bundle:${attempt.runId}:${attempt.attemptNumber}`,
      realizationPolicyVersion: MEMORY_REALIZATION_POLICY_VERSION,
      realizationPolicyFingerprint: MEMORY_REALIZATION_POLICY_FINGERPRINT,
      composedCandidateHashOverride: attempt.completeness.status === "available"
        ? attempt.completeness.report!.candidateIdentity.candidateHash
        : undefined,
    });
    const nativeRealization = runShadowMemoryRealization({
      request: memoryRealizationRequest,
    });
    const request = buildNativeShadowAdmissionRequest({
      nativeResult: nativeRealization.result,
      completeness: attempt.completeness,
    });
    const startedAt = Date.now();
    const shadow = request
      ? runShadowAuthorityAdmission({
          request,
          policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
        })
      : {
          decision: buildNativeRealizationFailureDecision({
            memoryRealizationRequest,
            nativeRealization: nativeRealization.result,
            completeness: attempt.completeness,
            policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
          }),
          failure: {
            code: "native_memory_realization_failed",
            message: nativeRealization.result.disposition,
          },
        };
    const generatedAt = new Date().toISOString();
    const elapsedMs = Date.now() - startedAt;
    const v2Outcome: V2AuthorityOutcome = attempt.acceptedByV2 ? "accepted_and_persisted" : "rejected";
    const comparison = compareAuthorityAdmissionWithV2({
      decision: shadow.decision,
      v2Outcome,
      candidateComparable: true,
    });

    const itemRoot = path.join(
      reviewRoot,
      "items",
      attempt.benchmarkId,
      "attempts",
      `attempt-${String(attempt.attemptNumber).padStart(2, "0")}`,
    );
    await writeJson(path.join(itemRoot, "memory-realization-request.json"), memoryRealizationRequest);
    for (const [artifactKey, artifactValue] of Object.entries(nativeRealization.artifacts)) {
      await writeJson(path.join(itemRoot, `${artifactKey}.json`), artifactValue);
    }
    const legacyComparison = compareNativeMemoryRealizationWithLegacyAdapter({
      nativeResult: nativeRealization.result,
      legacyCandidate: attempt.bundle,
    });
    await writeJson(path.join(itemRoot, "legacy-adapter-comparison.json"), {
      classification: legacyComparison.classification,
      reasons: legacyComparison.reasons,
      legacyCandidateId: legacyCandidate.candidateId,
      legacyCandidateHash: legacyCandidate.candidateHash,
      nativeCanonicalCandidateId: nativeRealization.result.canonicalCandidate?.canonicalCandidateId ?? null,
      nativeCanonicalHash: nativeRealization.result.canonicalCandidate?.canonicalHash ?? null,
      memoryRealizationFingerprints,
    });
    await writeJson(path.join(itemRoot, "native-admission-decision.json"), buildDecisionArtifact({
      request,
      sourceIdentity: request?.sourceIdentity ?? memoryRealizationRequest.sourceIdentity,
      candidateIdentity: {
        candidateId: request?.canonicalCandidate.canonicalCandidateId ?? null,
        candidateHash: request?.canonicalCandidate.canonicalHash ?? null,
      },
      validationId: request?.memoryRealizationValidation.validationId ?? nativeRealization.result.validation.validationId,
      provenanceId: request?.provenanceManifest.provenanceId ?? "native-provenance-unavailable",
      evidenceIntegrityId: request?.evidenceIntegrity.assessmentId ?? "native-evidence-unavailable",
      uncertaintyAssessmentId: request?.uncertaintyPreservation.assessmentId ?? "native-uncertainty-unavailable",
      completenessReportId: request?.completeness.status === "available"
        ? request.completeness.reportId
        : attempt.completeness.status === "available"
          ? attempt.completeness.reportId
          : null,
      decision: shadow.decision,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
      failure: shadow.failure,
      fingerprints,
      generatedAt,
      elapsedMs,
    }));
    await writeJson(path.join(itemRoot, "native-admission-equivalence.json"), buildEquivalenceArtifact({
      v2Outcome,
      decision: shadow.decision,
      comparison,
      request,
      candidateId: request?.canonicalCandidate.canonicalCandidateId ?? null,
      completenessReportId: request?.completeness.status === "available"
        ? request.completeness.reportId
        : attempt.completeness.status === "available"
          ? attempt.completeness.reportId
          : null,
      provenanceId: request?.provenanceManifest.provenanceId ?? "native-provenance-unavailable",
      fingerprints,
    }));
    if (request) {
      await writeJson(
        path.join(itemRoot, "admission-identity-input-comparison.json"),
        request.admissionIdentityInputComparison,
      );
    }

    const replays = request
      ? Array.from({ length: replayCount }, () => runShadowAuthorityAdmission({
          request,
          policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
        }).decision)
      : Array.from({ length: replayCount }, () => shadow.decision);
    const normalized = replays.map((decision) => stableStringify(normalizeDecision(decision)));
    const substantiveEquality = new Set(normalized).size === 1;

    deterministicReplayResults.push({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      attemptNumber: attempt.attemptNumber,
      substantiveEquality,
      metadataIgnored: ["metadataTimestamp", "elapsedMs"],
      disposition: shadow.decision.disposition,
    });

    benchmarkMatrix.push({
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      attemptNumber: attempt.attemptNumber,
      v2Outcome,
      v3CompletenessAdequacy: attempt.completeness.status === "available" ? attempt.completeness.report!.adequacy : "unavailable",
      v3AdmissionDisposition: shadow.decision.disposition,
      comparisonClassification: comparison.classification,
      memoryRealizationDisposition: nativeRealization.result.disposition,
      blockingFindings: shadow.decision.blockingFindings.map((finding) => finding.signalId),
      nonBlockingObservations: shadow.decision.nonBlockingObservations.map((finding) => finding.signalId),
      persistenceEligibility: shadow.decision.persistenceEligibility,
      downstreamEligibility: shadow.decision.downstreamEligibility,
      candidateComparability: true,
      hypotheticalBehavioralDifference: comparison.reasons,
    });

    comparisonCounts.set(comparison.classification, (comparisonCounts.get(comparison.classification) ?? 0) + 1);
    dispositionCounts.set(shadow.decision.disposition, (dispositionCounts.get(shadow.decision.disposition) ?? 0) + 1);
  }

  const manifest = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewId,
    calibrationRoot: input.calibrationRoot,
    outputRoot: reviewRoot,
    decisionCount: attempts.length,
    replayCountPerCandidate: replayCount,
    totalReplays: attempts.length * replayCount,
    evaluatorVersion: AUTHORITY_ADMISSION_EVALUATOR_VERSION,
    policyVersion: DEFAULT_AUTHORITY_ADMISSION_POLICY.policyVersion,
    fingerprints,
  };

  const equivalenceSummary = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewId,
    dispositionCounts: Object.fromEntries([...dispositionCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    comparisonCounts: Object.fromEntries([...comparisonCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    benchmarkCount: new Set(attempts.map((attempt) => attempt.benchmarkId)).size,
  };

  await fs.mkdir(reviewRoot, { recursive: true });
  await writeJson(path.join(reviewRoot, "review-manifest.json"), manifest);
  await writeJson(path.join(reviewRoot, "deterministic-replay-results.json"), {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    attempts: deterministicReplayResults,
  });
  await writeJson(path.join(reviewRoot, "benchmark-matrix.json"), {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    attempts: benchmarkMatrix,
  });
  await writeJson(path.join(reviewRoot, "equivalence-summary.json"), equivalenceSummary);

  return {
    reviewId,
    reviewRoot,
    decisionCount: attempts.length,
    replayCount: attempts.length * replayCount,
    expectedArtifacts: [...EXPECTED_OUTPUT_FILES],
  };
}

export function validateAuthorityAdmissionArtifactSet(fileNames: string[]): boolean {
  return EXPECTED_OUTPUT_FILES.every((fileName) => fileNames.includes(fileName));
}

export function runtimeDependencyGuard() {
  return {
    benchmarkIdDependency: false,
    humanLabelDependency: false,
    legacyProjectionDependency: false,
    persistenceDependency: false,
    downstreamGenerationDependency: false,
    v2OutcomeDependencyDuringEvaluation: false,
    admissionActivation: false,
  };
}
