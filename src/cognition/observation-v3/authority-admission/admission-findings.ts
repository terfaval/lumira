import type {
  AdmissionFinding,
  AdmissionPolicy,
  AdmissionReasonCode,
  AdmissionRequest,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
import type {
  CompletenessReason,
  CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis";

function finding(input: AdmissionFinding): AdmissionFinding {
  return input;
}

function includesDiagnosticReason(report: CompletenessReport, reason: CompletenessReason): boolean {
  return report.diagnosticReasons.includes(reason);
}

export function buildAdmissionFindings(input: {
  request: AdmissionRequest;
  policy: AdmissionPolicy;
}): AdmissionFinding[] {
  const findings: AdmissionFinding[] = [];
  const { request } = input;

  if (request.provenanceManifest.status !== "available") {
    findings.push(finding({
      sourceSubsystem: "provenance",
      signalId: "provenance.unavailable",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: "provenance_unavailable",
      evidenceRef: request.provenanceManifest.evidenceRef,
      policyRuleId: "provenance_must_be_available",
    }));
  }

  if (request.memoryRealizationValidation.status !== "pass"
    || !request.memoryRealizationValidation.candidateHashStable
    || !request.memoryRealizationValidation.stableOrdering
    || !request.memoryRealizationValidation.unitIdentitiesAvailable
    || !request.memoryRealizationValidation.evidenceReferencesAvailable
    || request.memoryRealizationValidation.structuralConflicts.length > 0) {
    findings.push(finding({
      sourceSubsystem: "memory_realization",
      signalId: request.memoryRealizationValidation.status === "unavailable"
        ? "realization.unavailable"
        : "realization.validation_failed",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: request.memoryRealizationValidation.status === "unavailable"
        ? "realization_validation_unavailable"
        : "realization_validation_failed",
      evidenceRef: request.memoryRealizationValidation.evidenceRef,
      policyRuleId: "canonical_realization_validation_must_pass",
    }));
  }

  if (request.evidenceIntegrity.status !== "pass"
    || request.evidenceIntegrity.malformedSpanCount > 0
    || request.evidenceIntegrity.missingSpanCount > 0
    || request.evidenceIntegrity.outOfBoundsSpanCount > 0
    || request.evidenceIntegrity.totalEvidenceSpanCount <= 0) {
    findings.push(finding({
      sourceSubsystem: "evidence_integrity",
      signalId: request.evidenceIntegrity.status === "unavailable"
        ? "evidence.unavailable_support"
        : "evidence.malformed_support",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: request.evidenceIntegrity.status === "unavailable"
        ? "evidence_integrity_unavailable"
        : "evidence_integrity_failed",
      evidenceRef: request.evidenceIntegrity.evidenceRef,
      policyRuleId: "evidence_integrity_must_pass",
    }));
  }

  if (request.uncertaintyPreservation.status === "failed" || request.uncertaintyPreservation.status === "unavailable") {
    findings.push(finding({
      sourceSubsystem: "uncertainty_preservation",
      signalId: "uncertainty.failed",
      governanceRole: "admission_blocking_candidate",
      severity: "major",
      blocking: true,
      reasonCode: "uncertainty_preservation_failed",
      evidenceRef: request.uncertaintyPreservation.evidenceRef,
      policyRuleId: "uncertainty_preservation_must_not_fail",
    }));
  } else if (request.uncertaintyPreservation.status === "indeterminate") {
    findings.push(finding({
      sourceSubsystem: "uncertainty_preservation",
      signalId: "uncertainty.indeterminate",
      governanceRole: "admission_relevant_non_blocking",
      severity: "minor",
      blocking: false,
      reasonCode: "uncertainty_preservation_indeterminate_non_blocking",
      evidenceRef: request.uncertaintyPreservation.evidenceRef,
      policyRuleId: "indeterminate_uncertainty_is_non_blocking",
    }));
  }

  if (request.completeness.status !== "available") {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: request.completeness.status === "failed"
        ? "completeness.input_failed"
        : "completeness.input_unavailable",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: request.completeness.status === "failed"
        ? "completeness_input_failed"
        : "completeness_input_unavailable",
      evidenceRef: request.completeness.evidenceRef,
      policyRuleId: "completeness_input_must_be_available",
    }));
    return findings;
  }

  const report = request.completeness.report;
  if (report.candidateIdentity.candidateHash !== request.canonicalCandidate.composedCandidateIdentity.composedCandidateHash
    || report.sourceIdentity.sourceHash !== request.sourceIdentity.sourceHash) {
    findings.push(finding({
      sourceSubsystem: "authority_admission",
      signalId: "governance.hash_mismatch",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: "completeness_contradictory_measurements",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "governance_inputs_must_not_contradict",
    }));
  }

  if (report.metricDiscrepancies.some((entry) => entry.code === "contradictory_measurements")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "completeness.contradictory_measurements",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: "completeness_contradictory_measurements",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "contradictory_measurements_fail_closed",
    }));
  }

  if (report.coverage.uncoveredPrefix || includesDiagnosticReason(report, "coverage_prefix_loss_detected")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "coverage.uncovered_prefix",
      governanceRole: "admission_blocking_candidate",
      severity: "critical",
      blocking: true,
      reasonCode: "candidate_prefix_loss_detected",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "uncovered_prefix_loss_blocks_authority",
    }));
  }

  if (report.coverage.uncoveredTail || includesDiagnosticReason(report, "coverage_tail_loss_detected")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "coverage.uncovered_tail",
      governanceRole: "admission_relevant_non_blocking",
      severity: "moderate",
      blocking: false,
      reasonCode: "admission_with_observations",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "uncovered_tail_is_non_blocking",
    }));
  }

  if (report.lateRetention.status === "missing" || includesDiagnosticReason(report, "late_section_missing")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "late.missing",
      governanceRole: "admission_relevant_non_blocking",
      severity: "moderate",
      blocking: false,
      reasonCode: "admission_with_observations",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "late_section_missing_is_non_blocking",
    }));
  }

  if (report.endingRetention.status === "not_retained" || includesDiagnosticReason(report, "ending_not_retained")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "ending.not_retained",
      governanceRole: "admission_relevant_non_blocking",
      severity: "moderate",
      blocking: false,
      reasonCode: "admission_with_observations",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "ending_not_retained_is_non_blocking",
    }));
  }

  if (report.metricDiscrepancies.some((entry) => entry.code === "ending_metric_false_negative")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "ending.metric_false_negative",
      governanceRole: "admission_relevant_non_blocking",
      severity: "minor",
      blocking: false,
      reasonCode: "admission_with_observations",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "ending_metric_false_negative_is_non_blocking",
    }));
  }

  if (report.coverage.internalUncoveredRegions.length > 0 || includesDiagnosticReason(report, "coverage_internal_gap_detected")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "coverage.internal_gaps",
      governanceRole: "recovery_relevant_only",
      severity: "moderate",
      blocking: false,
      reasonCode: "completeness_structural_weakness_observed",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "internal_gaps_are_recovery_only",
    }));
  }

  if (report.structuralAssessment.weaknessSignals.includes("single_scene_overmerge_risk")
    || includesDiagnosticReason(report, "single_scene_overmerge_risk")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "structural.overmerge_risk",
      governanceRole: "recovery_relevant_only",
      severity: "minor",
      blocking: false,
      reasonCode: "completeness_structural_weakness_observed",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "overmerge_risk_is_recovery_only",
    }));
  }

  if (report.lateRetention.status === "thin" || includesDiagnosticReason(report, "late_section_thin_trace")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "late.thin_trace",
      governanceRole: "recovery_relevant_only",
      severity: "minor",
      blocking: false,
      reasonCode: "completeness_structural_weakness_observed",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "thin_late_trace_is_recovery_only",
    }));
  }

  if ((report.structuralAssessment.repeatedSpanRealizationCount ?? 0) > 0) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "diagnostic.repeated_span_realization",
      governanceRole: "diagnostic_only",
      severity: "info",
      blocking: false,
      reasonCode: "diagnostic_signal_attached",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "diagnostic_only_signals_never_block",
    }));
  }

  if ((report.structuralAssessment.outOfOrderLocalityCount ?? 0) > 0) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "diagnostic.out_of_order_localities",
      governanceRole: "diagnostic_only",
      severity: "info",
      blocking: false,
      reasonCode: "diagnostic_signal_attached",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "diagnostic_only_signals_never_block",
    }));
  }

  if ((report.structuralAssessment.outOfOrderUnitCount ?? 0) > 0) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "diagnostic.out_of_order_units",
      governanceRole: "diagnostic_only",
      severity: "info",
      blocking: false,
      reasonCode: "diagnostic_signal_attached",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "diagnostic_only_signals_never_block",
    }));
  }

  if (report.metricDiscrepancies.some((entry) => entry.code === "coverage_ratio_vs_uncovered_range")) {
    findings.push(finding({
      sourceSubsystem: "completeness_analysis",
      signalId: "diagnostic.coverage_ratio_discrepancy",
      governanceRole: "diagnostic_only",
      severity: "info",
      blocking: false,
      reasonCode: "diagnostic_signal_attached",
      evidenceRef: request.completeness.reportId,
      policyRuleId: "diagnostic_only_signals_never_block",
    }));
  }

  return findings.sort(compareFindings);
}

const SOURCE_RANK: Record<AdmissionFinding["sourceSubsystem"], number> = {
  authority_admission: 0,
  provenance: 1,
  memory_realization: 2,
  evidence_integrity: 3,
  uncertainty_preservation: 4,
  completeness_analysis: 5,
};

const SEVERITY_RANK: Record<AdmissionFinding["severity"], number> = {
  critical: 0,
  major: 1,
  moderate: 2,
  minor: 3,
  info: 4,
};

export function compareFindings(left: AdmissionFinding, right: AdmissionFinding): number {
  if (left.blocking !== right.blocking) {
    return left.blocking ? -1 : 1;
  }

  const severity = SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
  if (severity !== 0) {
    return severity;
  }

  const source = SOURCE_RANK[left.sourceSubsystem] - SOURCE_RANK[right.sourceSubsystem];
  if (source !== 0) {
    return source;
  }

  const signal = left.signalId.localeCompare(right.signalId);
  if (signal !== 0) {
    return signal;
  }

  return left.reasonCode.localeCompare(right.reasonCode);
}

const REASON_RANK: Record<AdmissionReasonCode, number> = {
  policy_unavailable: 0,
  decision_evaluator_failed: 1,
  provenance_unavailable: 2,
  realization_validation_unavailable: 3,
  realization_validation_failed: 4,
  evidence_integrity_unavailable: 5,
  evidence_integrity_failed: 6,
  completeness_input_unavailable: 7,
  completeness_input_failed: 8,
  completeness_contradictory_measurements: 9,
  candidate_prefix_loss_detected: 10,
  uncertainty_preservation_failed: 11,
  candidate_non_recoverable: 12,
  candidate_recoverable_inadequacy_without_route: 13,
  candidate_recoverable_inadequacy_deferred: 14,
  recovery_route_unavailable: 15,
  recovery_route_available: 16,
  admission_with_observations: 17,
  uncertainty_preservation_indeterminate_non_blocking: 18,
  completeness_structural_weakness_observed: 19,
  diagnostic_signal_attached: 20,
  admitted_core_governance_passed: 21,
  completeness_required_before_admission: 22,
};

export function stableReasonOrdering(reasons: Iterable<AdmissionReasonCode>): AdmissionReasonCode[] {
  return [...new Set(reasons)].sort((left, right) => REASON_RANK[left] - REASON_RANK[right] || left.localeCompare(right));
}
