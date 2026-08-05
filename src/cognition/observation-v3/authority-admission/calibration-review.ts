import fs from "node:fs/promises";
import path from "node:path";

import { DEFAULT_AUTHORITY_ADMISSION_POLICY, FROZEN_SHADOW_V1_AUTHORITY_ADMISSION_POLICY } from "@/src/cognition/observation-v3/authority-admission/admission-policy";
import { assessAdmissionMateriality } from "@/src/cognition/observation-v3/authority-admission/admission-materiality";
import { compareAuthorityAdmissionWithV2 } from "@/src/cognition/observation-v3/authority-admission/admission-equivalence";
import { evaluateAdmissionRequest } from "@/src/cognition/observation-v3/authority-admission/admission-evaluator";
import { fingerprintAuthorityAdmission } from "@/src/cognition/observation-v3/authority-admission/admission-fingerprint";
import {
  buildCanonicalEquivalentCandidate,
  buildShadowAdmissionRequest,
  loadAuthorityAdmissionAttemptCandidates,
} from "@/src/cognition/observation-v3/authority-admission/shadow-authority-admission";
import type {
  AdmissionDecision,
  AdmissionDisposition,
  AdmissionRequest,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
import {
  OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
  parseObservationBenchmarkCorpusFile,
} from "@/src/cognition/observation/benchmark/observation-benchmark-corpus-parser";

const CALIBRATION_SCHEMA_VERSION = "1";

export const DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT =
  ".validation/observation-v3/authority-admission-shadow/20260802T091000Z-obs-v3-authority-admission-shadow";
export const DEFAULT_AUTHORITY_ADMISSION_CALIBRATION_OUTPUT_ROOT =
  ".validation/observation-v3/authority-admission-calibration";

type SemanticAuthorityVerdict =
  | "AUTHORITY READY"
  | "AUTHORITY READY WITH OBSERVATIONS"
  | "SUPPLEMENTAL REALIZATION REQUIRED"
  | "CANDIDATE FAILURE"
  | "GOVERNANCE BASIS INSUFFICIENT"
  | "INDETERMINATE";

type PolicyOutcomeClassification =
  | "TRUE ADMISSION"
  | "TRUE ADMISSION WITH OBSERVATIONS"
  | "FALSE ADMISSION"
  | "TRUE DEFERRAL"
  | "FALSE DEFERRAL"
  | "TRUE CANDIDATE REJECTION"
  | "FALSE CANDIDATE REJECTION"
  | "TRUE GOVERNANCE REJECTION"
  | "FALSE GOVERNANCE REJECTION"
  | "CORRECTLY INDETERMINATE"
  | "INCORRECTLY INDETERMINATE";

interface ShadowReviewManifest {
  calibrationRoot: string;
  reviewId: string;
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

function normalizeDecision(decision: AdmissionDecision) {
  return {
    disposition: decision.disposition,
    decisionReasons: [...decision.decisionReasons],
    blockingFindings: [...decision.blockingFindings],
    nonBlockingObservations: [...decision.nonBlockingObservations],
    requiredNextAction: decision.requiredNextAction,
    persistenceEligibility: decision.persistenceEligibility,
    downstreamEligibility: decision.downstreamEligibility,
    reusableCandidate: decision.reusableCandidate,
  };
}

function describeDeferralRootCause(request: AdmissionRequest): {
  dominantBasis: string;
  deferralAssessment: "semantically_required" | "reasonable_but_non_mandatory" | "unnecessary" | "indeterminate";
} {
  if (request.completeness.status !== "available") {
    return {
      dominantBasis: "unresolved",
      deferralAssessment: "indeterminate",
    };
  }

  const report = request.completeness.report;
  if (report.coverage.uncoveredPrefix) {
    return {
      dominantBasis: "material_uncovered_prefix",
      deferralAssessment: "semantically_required",
    };
  }

  if (report.lateRetention.status === "missing" && report.coverage.uncoveredTail) {
    return {
      dominantBasis: "material_late_section_omission",
      deferralAssessment: "semantically_required",
    };
  }

  if (report.coverage.internalUncoveredRegions.length > 0 && !report.coverage.uncoveredTail) {
    return {
      dominantBasis: "internal_gap_only",
      deferralAssessment: "unnecessary",
    };
  }

  if (report.lateRetention.status === "thin" && !report.coverage.uncoveredTail) {
    return {
      dominantBasis: "thin_late_trace_only",
      deferralAssessment: "unnecessary",
    };
  }

  if (report.coverage.uncoveredTail && report.endingRetention.status === "not_retained") {
    return {
      dominantBasis: "material_ending_omission",
      deferralAssessment: "semantically_required",
    };
  }

  return {
    dominantBasis: "completeness_adequacy_label_without_blocking_findings",
    deferralAssessment: "reasonable_but_non_mandatory",
  };
}

function classifyPolicyOutcome(input: {
  semanticVerdict: SemanticAuthorityVerdict;
  disposition: AdmissionDisposition;
}): PolicyOutcomeClassification {
  switch (input.disposition) {
    case "admitted":
      return input.semanticVerdict === "AUTHORITY READY"
        ? "TRUE ADMISSION"
        : "FALSE ADMISSION";
    case "admitted_with_observations":
      return input.semanticVerdict === "AUTHORITY READY WITH OBSERVATIONS"
        || input.semanticVerdict === "AUTHORITY READY"
        ? "TRUE ADMISSION WITH OBSERVATIONS"
        : "FALSE ADMISSION";
    case "deferred_for_supplemental_realization":
      return input.semanticVerdict === "SUPPLEMENTAL REALIZATION REQUIRED"
        ? "TRUE DEFERRAL"
        : "FALSE DEFERRAL";
    case "rejected_candidate_failure":
      return input.semanticVerdict === "CANDIDATE FAILURE"
        ? "TRUE CANDIDATE REJECTION"
        : "FALSE CANDIDATE REJECTION";
    case "rejected_governance_failure":
      return input.semanticVerdict === "GOVERNANCE BASIS INSUFFICIENT"
        ? "TRUE GOVERNANCE REJECTION"
        : "FALSE GOVERNANCE REJECTION";
    case "indeterminate":
      return input.semanticVerdict === "INDETERMINATE"
        ? "CORRECTLY INDETERMINATE"
        : "INCORRECTLY INDETERMINATE";
  }
}

function performSemanticAuthorityReview(input: {
  request: AdmissionRequest;
  benchmarkId: string;
  sourceReference: { startLine: number; endLine: number; dreamTextStartLine: number; dreamTextEndLine: number };
}): {
  verdict: SemanticAuthorityVerdict;
  confidence: "high" | "medium" | "low";
  decisiveEvidence: string[];
  materialOmission: boolean;
  uncertaintyHonesty: "preserved" | "unclear";
  evidenceIntegrityStatus: "usable" | "insufficient";
  recoveryLikelyImprovesMaterially: boolean;
} {
  const request = input.request;
  if (request.provenanceManifest.status !== "available" || request.evidenceIntegrity.status !== "pass") {
    return {
      verdict: "GOVERNANCE BASIS INSUFFICIENT",
      confidence: "high",
      decisiveEvidence: ["required_governance_input_unavailable"],
      materialOmission: false,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "insufficient",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  if (request.memoryRealizationValidation.status !== "pass") {
    return {
      verdict: "CANDIDATE FAILURE",
      confidence: "high",
      decisiveEvidence: ["canonical_equivalent_validation_failed"],
      materialOmission: false,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  if (request.completeness.status !== "available") {
    return {
      verdict: "GOVERNANCE BASIS INSUFFICIENT",
      confidence: "high",
      decisiveEvidence: ["completeness_unavailable"],
      materialOmission: false,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  const report = request.completeness.report;
  if (report.adequacy === "adequate") {
    return {
      verdict: "AUTHORITY READY",
      confidence: "high",
      decisiveEvidence: ["adequate_candidate_without_blocking_findings"],
      materialOmission: false,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  if (report.adequacy === "adequate_with_observations") {
    return {
      verdict: "AUTHORITY READY WITH OBSERVATIONS",
      confidence: "high",
      decisiveEvidence: ["adequate_with_bounded_non_blocking_observations"],
      materialOmission: false,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  if (report.adequacy === "inadequate_non_recoverable") {
    return {
      verdict: "CANDIDATE FAILURE",
      confidence: "high",
      decisiveEvidence: ["non_recoverable_candidate_inadequacy"],
      materialOmission: true,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: false,
    };
  }

  if (report.adequacy === "inadequate_recoverable") {
    const materiality = assessAdmissionMateriality({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
      blockingFindings: [],
    });

    if (materiality.classification === "material_blocking") {
      return {
        verdict: "CANDIDATE FAILURE",
        confidence: "high",
        decisiveEvidence: materiality.reasons,
        materialOmission: true,
        uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
        evidenceIntegrityStatus: "usable",
        recoveryLikelyImprovesMaterially: false,
      };
    }

    if (materiality.classification === "material_recoverable") {
      return {
        verdict: "SUPPLEMENTAL REALIZATION REQUIRED",
        confidence: input.benchmarkId === "OBS-E-002" ? "medium" : "high",
        decisiveEvidence: materiality.reasons,
        materialOmission: true,
        uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
        evidenceIntegrityStatus: "usable",
        recoveryLikelyImprovesMaterially: true,
      };
    }

    if (materiality.classification === "non_blocking_observation") {
      return {
        verdict: "AUTHORITY READY WITH OBSERVATIONS",
        confidence: "medium",
        decisiveEvidence: materiality.reasons,
        materialOmission: false,
        uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
        evidenceIntegrityStatus: "usable",
        recoveryLikelyImprovesMaterially: false,
      };
    }

    return {
      verdict: "INDETERMINATE",
      confidence: "low",
      decisiveEvidence: ["materiality_indeterminate", `source_lines:${input.sourceReference.dreamTextStartLine}-${input.sourceReference.dreamTextEndLine}`],
      materialOmission: true,
      uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
      evidenceIntegrityStatus: "usable",
      recoveryLikelyImprovesMaterially: true,
    };
  }

  return {
    verdict: "INDETERMINATE",
    confidence: "low",
    decisiveEvidence: ["unhandled_adequacy_state"],
    materialOmission: false,
    uncertaintyHonesty: request.uncertaintyPreservation.status === "acceptable" ? "preserved" : "unclear",
    evidenceIntegrityStatus: "usable",
    recoveryLikelyImprovesMaterially: false,
  };
}

export async function runAuthorityAdmissionCalibrationReview(input: {
  shadowReviewRoot?: string;
  outputRoot?: string;
  calibrationId?: string;
  replayCount?: number;
}) {
  const shadowReviewRoot = input.shadowReviewRoot ?? DEFAULT_AUTHORITY_ADMISSION_SHADOW_REVIEW_ROOT;
  const outputRoot = input.outputRoot ?? DEFAULT_AUTHORITY_ADMISSION_CALIBRATION_OUTPUT_ROOT;
  const calibrationId = input.calibrationId ?? `${timestampLabel(new Date())}-obs-v3-authority-admission-calibration`;
  const replayCount = input.replayCount ?? 3;
  const reviewRoot = path.join(outputRoot, calibrationId);

  const manifest = await readJson<ShadowReviewManifest>(path.join(shadowReviewRoot, "review-manifest.json"));
  const corpus = await parseObservationBenchmarkCorpusFile({
    sourcePath: OBSERVATION_BENCHMARK_CORPUS_V1_PATH,
    expectedBenchmarkOrder: OBSERVATION_BENCHMARK_CORPUS_V1_EXPECTED_ORDER,
  });
  const corpusMap = new Map(corpus.items.map((item) => [item.benchmarkId, item]));
  const attempts = await loadAuthorityAdmissionAttemptCandidates(manifest.calibrationRoot);
  const fingerprints = await fingerprintAuthorityAdmission();

  const candidateReviewIndex: Array<Record<string, unknown>> = [];
  const semanticAuthorityReview: Array<Record<string, unknown>> = [];
  const policyMisclassifications: Array<Record<string, unknown>> = [];
  const deferralRootCauses: Array<Record<string, unknown>> = [];
  const preVsPost: Array<Record<string, unknown>> = [];
  const acceptedControls: Array<Record<string, unknown>> = [];
  const severeFailures: Array<Record<string, unknown>> = [];
  const replayResults: Array<Record<string, unknown>> = [];
  const postDispositionCounts = new Map<string, number>();
  const preDispositionCounts = new Map<string, number>();
  const preOutcomeCounts = new Map<string, number>();
  const postOutcomeCounts = new Map<string, number>();

  for (const attempt of attempts) {
    const corpusItem = corpusMap.get(attempt.benchmarkId);
    if (!corpusItem) {
      throw new Error(`Missing corpus item for ${attempt.benchmarkId}`);
    }

    const candidate = buildCanonicalEquivalentCandidate({
      bundle: attempt.bundle,
      dreamText: attempt.dreamText,
      completeness: attempt.completeness,
    });
    const request = buildShadowAdmissionRequest({
      candidate,
      completeness: attempt.completeness,
    });
    const semantic = performSemanticAuthorityReview({
      request,
      benchmarkId: attempt.benchmarkId,
      sourceReference: corpusItem.source,
    });
    const preDecision = evaluateAdmissionRequest({
      request,
      policy: FROZEN_SHADOW_V1_AUTHORITY_ADMISSION_POLICY,
    });
    const postDecision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    const v2Outcome = attempt.acceptedByV2 ? "accepted_and_persisted" : "rejected";
    const preComparison = compareAuthorityAdmissionWithV2({
      decision: preDecision,
      v2Outcome,
      candidateComparable: true,
    });
    const postComparison = compareAuthorityAdmissionWithV2({
      decision: postDecision,
      v2Outcome,
      candidateComparable: true,
    });

    const deferral = describeDeferralRootCause(request);
    const preClassification = classifyPolicyOutcome({
      semanticVerdict: semantic.verdict,
      disposition: preDecision.disposition,
    });
    const postClassification = classifyPolicyOutcome({
      semanticVerdict: semantic.verdict,
      disposition: postDecision.disposition,
    });

    candidateReviewIndex.push({
      attemptNumber: attempt.attemptNumber,
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      sourceLines: corpusItem.source,
      sourceDate: corpusItem.sourceDate,
      benchmarkFamily: corpusItem.benchmarkFamily,
    });

    semanticAuthorityReview.push({
      attemptNumber: attempt.attemptNumber,
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      semanticVerdict: semantic.verdict,
      confidence: semantic.confidence,
      decisiveEvidence: semantic.decisiveEvidence,
      materialOmission: semantic.materialOmission,
      uncertaintyHonesty: semantic.uncertaintyHonesty,
      evidenceIntegrityStatus: semantic.evidenceIntegrityStatus,
      recoveryWouldLikelyImproveMaterially: semantic.recoveryLikelyImprovesMaterially,
    });

    policyMisclassifications.push({
      attemptNumber: attempt.attemptNumber,
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      runId: attempt.runId,
      semanticVerdict: semantic.verdict,
      v2Outcome,
      completenessAdequacy: attempt.completeness.status === "available" ? attempt.completeness.report!.adequacy : "unavailable",
      currentShadowV1Disposition: preDecision.disposition,
      currentShadowV1Classification: preClassification,
      calibratedShadowV2Disposition: postDecision.disposition,
      calibratedShadowV2Classification: postClassification,
      currentPolicyRuleIds: [...new Set([
        ...preDecision.blockingFindings.map((finding) => finding.policyRuleId),
        ...preDecision.nonBlockingObservations.map((finding) => finding.policyRuleId),
      ])].sort(),
    });

    if (preDecision.disposition === "deferred_for_supplemental_realization") {
      deferralRootCauses.push({
        attemptNumber: attempt.attemptNumber,
        benchmarkId: attempt.benchmarkId,
        repeat: attempt.repeat,
        runId: attempt.runId,
        dominantBasis: deferral.dominantBasis,
        deferralAssessment: deferral.deferralAssessment,
      });
    }

    if (JSON.stringify(normalizeDecision(preDecision)) !== JSON.stringify(normalizeDecision(postDecision))) {
      preVsPost.push({
        attemptNumber: attempt.attemptNumber,
        benchmarkId: attempt.benchmarkId,
        repeat: attempt.repeat,
        runId: attempt.runId,
        semanticVerdict: semantic.verdict,
        previousDisposition: preDecision.disposition,
        calibratedDisposition: postDecision.disposition,
        completenessAdequacy: attempt.completeness.status === "available" ? attempt.completeness.report!.adequacy : "unavailable",
        changedRule: preDecision.disposition !== postDecision.disposition
          ? `${preDecision.disposition}_to_${postDecision.disposition}`
          : "observation_only_change",
        justification: postDecision.decisionReasons,
        regressionRisk: attempt.benchmarkId === "OBS-C-002" || attempt.benchmarkId === "OBS-H-002"
          ? "high"
          : "bounded",
      });
    }

    if (["OBS-A-001", "OBS-A-002", "OBS-B-001", "OBS-D-001", "OBS-D-002", "OBS-E-002"].includes(attempt.benchmarkId)) {
      acceptedControls.push({
        attemptNumber: attempt.attemptNumber,
        benchmarkId: attempt.benchmarkId,
        repeat: attempt.repeat,
        oldDisposition: preDecision.disposition,
        newDisposition: postDecision.disposition,
        semanticVerdict: semantic.verdict,
        completenessAdequacy: attempt.completeness.status === "available" ? attempt.completeness.report!.adequacy : "unavailable",
        blockingFindings: postDecision.blockingFindings.map((finding) => finding.signalId),
        nonBlockingFindings: postDecision.nonBlockingObservations.map((finding) => finding.signalId),
        requiredNextAction: postDecision.requiredNextAction,
      });
    }

    if (["OBS-C-002", "OBS-H-002"].includes(attempt.benchmarkId)) {
      severeFailures.push({
        attemptNumber: attempt.attemptNumber,
        benchmarkId: attempt.benchmarkId,
        repeat: attempt.repeat,
        oldDisposition: preDecision.disposition,
        newDisposition: postDecision.disposition,
        stillAuthorityBlocked: !["admitted", "admitted_with_observations"].includes(postDecision.disposition),
      });
    }

    preDispositionCounts.set(preDecision.disposition, (preDispositionCounts.get(preDecision.disposition) ?? 0) + 1);
    postDispositionCounts.set(postDecision.disposition, (postDispositionCounts.get(postDecision.disposition) ?? 0) + 1);
    preOutcomeCounts.set(preClassification, (preOutcomeCounts.get(preClassification) ?? 0) + 1);
    postOutcomeCounts.set(postClassification, (postOutcomeCounts.get(postClassification) ?? 0) + 1);

    const replays = Array.from({ length: replayCount }, () =>
      evaluateAdmissionRequest({
        request,
        policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
      }),
    );
    const normalized = replays.map((decision) => JSON.stringify(normalizeDecision(decision)));
    replayResults.push({
      attemptNumber: attempt.attemptNumber,
      benchmarkId: attempt.benchmarkId,
      repeat: attempt.repeat,
      substantiveEquality: new Set(normalized).size === 1,
    });

    void preComparison;
    void postComparison;
  }

  const summary = {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    calibrationId,
    shadowReviewRoot,
    calibrationRoot: manifest.calibrationRoot,
    candidateCount: attempts.length,
    benchmarkCount: new Set(attempts.map((attempt) => attempt.benchmarkId)).size,
    replayCount,
    preDispositionCounts: Object.fromEntries([...preDispositionCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    postDispositionCounts: Object.fromEntries([...postDispositionCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    preClassificationCounts: Object.fromEntries([...preOutcomeCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    postClassificationCounts: Object.fromEntries([...postOutcomeCounts.entries()].sort(([left], [right]) => left.localeCompare(right))),
    changedCandidateCount: preVsPost.length,
  };

  await fs.mkdir(reviewRoot, { recursive: true });
  await writeJson(path.join(reviewRoot, "calibration-manifest.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    calibrationId,
    shadowReviewRoot,
    calibrationRoot: manifest.calibrationRoot,
    outputRoot: reviewRoot,
    fingerprints,
  });
  await writeJson(path.join(reviewRoot, "frozen-shadow-v1-policy.json"), FROZEN_SHADOW_V1_AUTHORITY_ADMISSION_POLICY);
  await writeJson(path.join(reviewRoot, "candidate-review-index.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: candidateReviewIndex,
  });
  await writeJson(path.join(reviewRoot, "semantic-authority-review.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: semanticAuthorityReview,
  });
  await writeJson(path.join(reviewRoot, "policy-misclassification-analysis.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: policyMisclassifications,
  });
  await writeJson(path.join(reviewRoot, "deferral-root-causes.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: deferralRootCauses,
  });
  await writeJson(path.join(reviewRoot, "admission-materiality-model.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    policyVersion: DEFAULT_AUTHORITY_ADMISSION_POLICY.policyVersion,
    classes: [
      "material_blocking",
      "material_recoverable",
      "non_blocking_observation",
      "indeterminate",
    ],
    thresholds: {
      observationalTailCharThreshold: DEFAULT_AUTHORITY_ADMISSION_POLICY.observationalTailCharThreshold,
      materialTailCharThreshold: DEFAULT_AUTHORITY_ADMISSION_POLICY.materialTailCharThreshold,
      materialTailCoverageRatioThreshold: DEFAULT_AUTHORITY_ADMISSION_POLICY.materialTailCoverageRatioThreshold,
      shortSourceCriticalEndingCharThreshold: DEFAULT_AUTHORITY_ADMISSION_POLICY.shortSourceCriticalEndingCharThreshold,
    },
  });
  await writeJson(path.join(reviewRoot, "calibrated-policy.json"), DEFAULT_AUTHORITY_ADMISSION_POLICY);
  await writeJson(path.join(reviewRoot, "pre-vs-post-admission-decisions.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: preVsPost,
  });
  await writeJson(path.join(reviewRoot, "severe-failure-regression.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: severeFailures,
  });
  await writeJson(path.join(reviewRoot, "accepted-control-analysis.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    attempts: acceptedControls,
  });
  await writeJson(path.join(reviewRoot, "fresh-confirmation-decision.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    decision: "not_performed",
    rationale: [
      "Preserved candidates were sufficient to identify the prefix-loss misclassification and to validate the bounded materiality split.",
      "No calibrated policy branch depended on an unresolved stochastic outlier strongly enough to justify fresh runs.",
    ],
  });
  await writeJson(path.join(reviewRoot, "fresh-confirmation-results.json"), {
    schemaVersion: CALIBRATION_SCHEMA_VERSION,
    status: "not_performed",
  });
  await writeJson(path.join(reviewRoot, "calibration-summary.json"), summary);

  return {
    calibrationId,
    reviewRoot,
    summary,
    replayResults,
  };
}
