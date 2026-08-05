import type {
  AdmissionComparison,
  AdmissionDecision,
  V2AuthorityOutcome,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";

export function compareAuthorityAdmissionWithV2(input: {
  decision: AdmissionDecision;
  v2Outcome: V2AuthorityOutcome;
  candidateComparable: boolean;
  semanticMismatch?: string;
  missingArtifacts?: string[];
}): AdmissionComparison {
  if (input.missingArtifacts && input.missingArtifacts.length > 0) {
    return {
      classification: "comparison_unavailable",
      reasons: [`missing_artifacts:${input.missingArtifacts.join(",")}`],
      candidateComparable: false,
    };
  }

  if (input.semanticMismatch) {
    return {
      classification: "semantically_incomparable",
      reasons: [input.semanticMismatch],
      candidateComparable: false,
    };
  }

  if (!input.candidateComparable || input.v2Outcome === "unavailable") {
    return {
      classification: "comparison_unavailable",
      reasons: ["candidate_not_comparable"],
      candidateComparable: false,
    };
  }

  if (input.decision.disposition === "deferred_for_supplemental_realization" && input.v2Outcome === "accepted_and_persisted") {
    return {
      classification: "v3_defers_v2_accepts",
      reasons: ["v3_defers_authority_for_recovery"],
      candidateComparable: true,
    };
  }

  if ((input.decision.disposition === "rejected_candidate_failure"
      || input.decision.disposition === "rejected_governance_failure"
      || input.decision.disposition === "indeterminate")
    && input.v2Outcome === "accepted_and_persisted") {
    return {
      classification: "v3_blocks_v2_accepts",
      reasons: ["v3_denies_authority_where_v2_persists"],
      candidateComparable: true,
    };
  }

  if ((input.decision.disposition === "admitted" || input.decision.disposition === "admitted_with_observations")
    && input.v2Outcome === "rejected") {
    return {
      classification: "v3_admits_v2_rejects",
      reasons: ["v3_would_admit_where_v2_rejects"],
      candidateComparable: true,
    };
  }

  return {
    classification: "equivalent_authority_outcome",
    reasons: ["no_material_authority_delta"],
    candidateComparable: true,
  };
}
