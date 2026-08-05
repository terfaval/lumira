import type {
  CompletenessAdequacy,
  PhysicalGapSet,
  RecoveryRecommendation,
  RecoveryRecommendationReason,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

export function buildRecoveryRecommendation(input: {
  adequacy: CompletenessAdequacy;
  gaps: PhysicalGapSet;
  lateRetentionStatus: "retained" | "thin" | "missing" | "not_applicable" | "indeterminate";
  endingRetentionStatus: "retained" | "not_retained" | "indeterminate" | "not_applicable";
}): RecoveryRecommendation {
  if (input.adequacy === "indeterminate") {
    return {
      disposition: "indeterminate",
      targetedPhysicalGapIds: [],
      eligibility: "unknown",
      advisoryClass: "advisory",
      reasons: ["measurement_indeterminate"],
    };
  }

  if (input.adequacy === "inadequate_non_recoverable") {
    return {
      disposition: "not_recoverable",
      targetedPhysicalGapIds: [],
      eligibility: "not_eligible",
      advisoryClass: "advisory",
      reasons: ["candidate_not_recoverable"],
    };
  }

  if (input.adequacy === "inadequate_recoverable") {
    const reasons = new Set<RecoveryRecommendationReason>(["physical_gap_detected"]);
    if (input.lateRetentionStatus === "missing") {
      reasons.add("late_section_missing");
    }
    if (input.endingRetentionStatus === "not_retained") {
      reasons.add("ending_not_retained");
    }

    const admissionRelevant = input.lateRetentionStatus === "missing" || input.endingRetentionStatus === "not_retained";
    return {
      disposition: admissionRelevant ? "required_before_admission" : "recommended",
      targetedPhysicalGapIds: input.gaps.gaps.map((gap) => gap.id),
      eligibility: input.gaps.gaps.length > 0 ? "eligible" : "unknown",
      advisoryClass: admissionRelevant ? "admission_relevant" : "advisory",
      reasons: [...reasons].sort((left, right) => left.localeCompare(right)),
    };
  }

  return {
    disposition: "not_required",
    targetedPhysicalGapIds: [],
    eligibility: "eligible",
    advisoryClass: "advisory",
    reasons: [],
  };
}
