import type {
  CompletenessEquivalenceClassification,
  CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";

export interface V2AttemptDiagnosticsReference {
  guardVerdict: "pass" | "coverage_guard_failed" | "late_section_guard_failed" | "overmerge_guard_failed" | null;
  fallbackReason: string | null;
  coverageRatio: number | null;
  uncoveredTailChars: number | null;
  lateSectionObservationCount: number | null;
  overmergeMatchedCueGroups: number | null;
  overmergeTotalCueMatches: number | null;
}

export interface CompletenessEquivalenceResult {
  classification: CompletenessEquivalenceClassification;
  reasons: string[];
  discrepancies: string[];
}

export function compareCompletenessWithV2Diagnostics(input: {
  report: CompletenessReport;
  v2AttemptDiagnostics: V2AttemptDiagnosticsReference | null;
}): CompletenessEquivalenceResult {
  if (input.report.status !== "available" || !input.v2AttemptDiagnostics?.guardVerdict) {
    return {
      classification: "comparison_unavailable",
      reasons: ["report_or_v2_reference_unavailable"],
      discrepancies: [],
    };
  }

  const v2Passed = input.v2AttemptDiagnostics.guardVerdict === "pass";
  const v3Adequate = input.report.adequacy === "adequate" || input.report.adequacy === "adequate_with_observations";

  if (v2Passed && !v3Adequate) {
    return {
      classification: "v3_stricter",
      reasons: ["v2_pass_but_v3_detected_inadequacy"],
      discrepancies: input.report.metricDiscrepancies.map((entry) => entry.code),
    };
  }

  if (!v2Passed && v3Adequate) {
    return {
      classification: "v3_more_permissive",
      reasons: ["v2_guard_failed_but_v3_found_adequacy"],
      discrepancies: input.report.metricDiscrepancies.map((entry) => entry.code),
    };
  }

  const representationDifferences = input.report.gaps.gaps.length > 0
    || input.report.metricDiscrepancies.length > 0
    || input.report.diagnosticReasons.length > 0;

  return {
    classification: representationDifferences ? "equivalent_with_representation_difference" : "equivalent",
    reasons: representationDifferences
      ? ["same_coarse_adequacy_with_richer_v3_representation"]
      : ["same_coarse_adequacy"],
    discrepancies: input.report.metricDiscrepancies.map((entry) => entry.code),
  };
}
