import { createHash } from "node:crypto";

import { buildAdmissionFindings, stableReasonOrdering } from "@/src/cognition/observation-v3/authority-admission/admission-findings";
import { assessAdmissionMateriality } from "@/src/cognition/observation-v3/authority-admission/admission-materiality";
import type {
  AdmissionDecision,
  AdmissionDisposition,
  AdmissionPolicy,
  AdmissionReasonCode,
  AdmissionRequest,
  AuthorityIdentity,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";

function buildAuthorityIdentity(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy;
}): AuthorityIdentity {
  const authorityId = createHash("sha256")
    .update(JSON.stringify({
      sourceId: input.request.sourceIdentity.sourceId,
      canonicalCandidateId: input.request.canonicalCandidate.canonicalCandidateId,
      candidateHash: input.request.canonicalCandidate.canonicalHash,
      policyFingerprint: input.policy.policyFingerprint,
    }))
    .digest("hex");

  return {
    authorityId,
    sourceId: input.request.sourceIdentity.sourceId,
    canonicalCandidateId: input.request.canonicalCandidate.canonicalCandidateId,
    candidateHash: input.request.canonicalCandidate.canonicalHash,
    policyFingerprint: input.policy.policyFingerprint,
    shadowStatus: "inactive_non_authoritative",
  };
}

function classifyBlockingDisposition(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy;
  blockingFindings: AdmissionDecision["blockingFindings"];
}): AdmissionDisposition {
  const completeness = input.request.completeness;
  if (completeness.status !== "available") {
    return "rejected_governance_failure";
  }

  if (!isFrozenShadowV1Policy(input.policy) && input.blockingFindings.some((finding) =>
    finding.signalId === "coverage.uncovered_prefix"
    || finding.signalId === "realization.validation_failed",
  )) {
    return "rejected_candidate_failure";
  }

  const adequacy = completeness.report.adequacy;
  if (adequacy === "inadequate_non_recoverable") {
    return "rejected_candidate_failure";
  }

  if (adequacy === "inadequate_recoverable") {
    return completeness.report.recoveryRecommendation.eligibility === "eligible"
      && completeness.report.recoveryRecommendation.targetedPhysicalGapIds.length > 0
      ? "deferred_for_supplemental_realization"
      : "rejected_candidate_failure";
  }

  return "rejected_governance_failure";
}

function hasAdmissionRelevantObservations(decision: AdmissionDecision): boolean {
  return decision.nonBlockingObservations.some((finding) => finding.governanceRole === "admission_relevant_non_blocking");
}

function isFrozenShadowV1Policy(policy: AdmissionPolicy): boolean {
  return policy.policyVersion === "shadow-v1";
}

export function evaluateAdmissionRequest(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy;
}): AdmissionDecision {
  const findings = buildAdmissionFindings(input);
  const blockingFindings = findings.filter((finding) => finding.blocking);
  const nonBlockingObservations = findings.filter((finding) => !finding.blocking);

  const reasons = new Set<AdmissionReasonCode>(
    findings.map((finding) => finding.reasonCode),
  );

  let disposition: AdmissionDisposition;
  let requiredNextAction: AdmissionDecision["requiredNextAction"];
  let persistenceEligibility: AdmissionDecision["persistenceEligibility"];
  let downstreamEligibility: AdmissionDecision["downstreamEligibility"];
  let reusableCandidate: boolean;
  const adequacy = input.request.completeness.status === "available"
    ? input.request.completeness.report.adequacy
    : "indeterminate";
  const materiality = assessAdmissionMateriality({
    request: input.request,
    policy: input.policy,
    blockingFindings,
  });

  if (blockingFindings.length > 0) {
    disposition = classifyBlockingDisposition({
      request: input.request,
      policy: input.policy,
      blockingFindings,
    });
    if (disposition === "deferred_for_supplemental_realization") {
      reasons.add("candidate_recoverable_inadequacy_deferred");
      reasons.add("recovery_route_available");
      requiredNextAction = "request_supplemental_realization";
      persistenceEligibility = "provisional_non_authoritative";
      downstreamEligibility = "non_authoritative_internal_only";
      reusableCandidate = true;
    } else {
      if (disposition === "rejected_candidate_failure") {
        reasons.add(blockingFindings.some((finding) => finding.signalId === "coverage.uncovered_prefix")
          ? "candidate_prefix_loss_detected"
          : adequacy === "inadequate_non_recoverable"
            ? "candidate_non_recoverable"
            : "candidate_recoverable_inadequacy_without_route");
      }
      requiredNextAction = "stop_fail_closed";
      persistenceEligibility = "diagnostic_only";
      downstreamEligibility = "none";
      reusableCandidate = disposition === "rejected_governance_failure";
    }
  } else {
    if (adequacy === "inadequate_recoverable") {
      const hasRoute = input.request.completeness.status === "available"
        && input.request.completeness.report.recoveryRecommendation.eligibility === "eligible"
        && input.request.completeness.report.recoveryRecommendation.targetedPhysicalGapIds.length > 0;
      if (isFrozenShadowV1Policy(input.policy)) {
        disposition = hasRoute ? "deferred_for_supplemental_realization" : "rejected_candidate_failure";
        reasons.add(hasRoute ? "candidate_recoverable_inadequacy_deferred" : "candidate_recoverable_inadequacy_without_route");
        if (hasRoute) {
          reasons.add("recovery_route_available");
          requiredNextAction = "request_supplemental_realization";
          persistenceEligibility = "provisional_non_authoritative";
          downstreamEligibility = "non_authoritative_internal_only";
          reusableCandidate = true;
        } else {
          reasons.add("recovery_route_unavailable");
          requiredNextAction = "stop_fail_closed";
          persistenceEligibility = "diagnostic_only";
          downstreamEligibility = "none";
          reusableCandidate = false;
        }
      } else if (materiality.classification === "non_blocking_observation") {
        disposition = "admitted_with_observations";
        reasons.add("admission_with_observations");
        requiredNextAction = "none";
        persistenceEligibility = "authoritative";
        downstreamEligibility = "authoritative";
        reusableCandidate = true;
      } else if (materiality.classification === "material_recoverable" && hasRoute) {
        disposition = "deferred_for_supplemental_realization";
        reasons.add("candidate_recoverable_inadequacy_deferred");
        reasons.add("recovery_route_available");
        requiredNextAction = "request_supplemental_realization";
        persistenceEligibility = "provisional_non_authoritative";
        downstreamEligibility = "non_authoritative_internal_only";
        reusableCandidate = true;
      } else {
        disposition = "rejected_candidate_failure";
        reasons.add("candidate_recoverable_inadequacy_without_route");
        reasons.add(hasRoute ? "recovery_route_available" : "recovery_route_unavailable");
        requiredNextAction = "stop_fail_closed";
        persistenceEligibility = "diagnostic_only";
        downstreamEligibility = "none";
        reusableCandidate = false;
      }
    } else if (adequacy === "inadequate_non_recoverable") {
      disposition = "rejected_candidate_failure";
      reasons.add("candidate_non_recoverable");
      requiredNextAction = "stop_fail_closed";
      persistenceEligibility = "diagnostic_only";
      downstreamEligibility = "none";
      reusableCandidate = false;
    } else {
      const hasObservations = hasAdmissionRelevantObservations({
        disposition: "admitted",
        authorityIdentity: null,
        decisionReasons: [],
        blockingFindings,
        nonBlockingObservations,
        requiredNextAction: "none",
        persistenceEligibility: "authoritative",
        downstreamEligibility: "authoritative",
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
      });

      disposition = adequacy === "adequate_with_observations" || hasObservations
        ? "admitted_with_observations"
        : "admitted";
      reasons.add(disposition === "admitted_with_observations"
        ? "admission_with_observations"
        : "admitted_core_governance_passed");
      requiredNextAction = "none";
      persistenceEligibility = "authoritative";
      downstreamEligibility = "authoritative";
      reusableCandidate = true;
    }
  }

  return {
    disposition,
    authorityIdentity: disposition === "admitted" || disposition === "admitted_with_observations"
      ? buildAuthorityIdentity(input)
      : null,
    decisionReasons: stableReasonOrdering(reasons),
    blockingFindings,
    nonBlockingObservations,
    requiredNextAction,
    persistenceEligibility,
    downstreamEligibility,
    reusableCandidate,
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
  };
}
