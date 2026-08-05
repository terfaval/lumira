import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHORITY_ADMISSION_POLICY,
  evaluateAdmissionRequest,
  runShadowAuthorityAdmission,
  type AdmissionDecision,
  type AdmissionRequest,
  type EvidenceIntegrityAssessment,
  type MemoryRealizationValidationResult,
  type ObservationProvenanceManifest,
  type UncertaintyPreservationAssessment,
} from "@/src/cognition/observation-v3/authority-admission";
import type { CompletenessReport } from "@/src/cognition/observation-v3/completeness-analysis";
import {
  realizeCanonicalMemoryCandidate,
  type CanonicalMemoryCandidate,
  type MemoryRealizationRequest,
} from "@/src/cognition/observation-v3/memory-realization";

function buildCanonicalCandidate(overrides?: Partial<CanonicalMemoryCandidate>): CanonicalMemoryCandidate {
  const request: MemoryRealizationRequest = {
    requestId: "memory-realization-request-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 35,
    },
    composedCandidateIdentity: {
      composedCandidateId: "composed-1",
      composedCandidateHash: "candidate-hash-1",
    },
    composedCandidate: {
      candidateId: "composed-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 35,
      },
      localityRecords: [
        {
          localityId: "scene-1",
          derivedFrom: ["scene-1"],
          label: "Scene 1",
          sourceStart: 0,
          sourceEnd: 35,
          boundaryUncertainty: null,
          evidenceRefs: [
            {
              snippet: "A beginning, a middle, and an ending.",
              spanStart: 0,
              spanEnd: 35,
              contextLabel: "scene",
            },
          ],
        },
      ],
      descriptiveUnits: [
        {
          unitId: "observation-1",
          derivedFrom: ["observation-1"],
          localityId: "scene-1",
          statement: "A beginning happens.",
          evidenceRefs: [
            {
              snippet: "A beginning",
              spanStart: 0,
              spanEnd: 11,
              contextLabel: "quoted_support",
            },
          ],
          uncertainty: null,
          compositionStatus: "retained",
        },
        {
          unitId: "observation-2",
          derivedFrom: ["observation-2"],
          localityId: "scene-1",
          statement: "A middle happens.",
          evidenceRefs: [
            {
              snippet: "a middle",
              spanStart: 13,
              spanEnd: 21,
              contextLabel: "quoted_support",
            },
          ],
          uncertainty: null,
          compositionStatus: "retained",
        },
        {
          unitId: "observation-3",
          derivedFrom: ["observation-3"],
          localityId: "scene-1",
          statement: "An ending happens.",
          evidenceRefs: [
            {
              snippet: "an ending",
              spanStart: 27,
              spanEnd: 35,
              contextLabel: "quoted_support",
            },
          ],
          uncertainty: null,
          compositionStatus: "retained",
        },
      ],
      transitionRecords: [],
      unresolvedAlternatives: [],
      uncertaintyNotes: [],
      provenance: {
        provenanceId: "composition-provenance-1",
        compositionKind: "memory_composition",
        baselineCandidateId: "baseline-1",
        supplementalPackageIds: [],
        policyVersion: "composition-v1",
        policyFingerprint: "composition-v1",
      },
    },
    compositionResultRef: "composition-result-1",
    realizationPolicyVersion: "memory-realization-shadow-v1",
    realizationPolicyFingerprint: "memory-realization-shadow-v1",
  };

  const realized = realizeCanonicalMemoryCandidate(request).canonicalCandidate;
  if (!realized) {
    throw new Error("canonical_candidate_fixture_unavailable");
  }

  return {
    ...realized,
    ...(overrides ?? {}),
  };
}

function buildCompletenessReport(overrides?: Partial<CompletenessReport>): CompletenessReport {
  return {
    schemaVersion: "1",
    analyzerVersion: "1",
    sourceIdentity: {
      sourceHash: "source-hash-1",
      sourceLength: 35,
    },
    candidateIdentity: {
      candidateHash: "candidate-hash-1",
      candidateKind: "primary_extraction",
    },
    status: "available",
    adequacy: "adequate",
    coverage: {
      largestCoveredSpanEnd: 35,
      coverageRatio: 1,
      uncoveredPrefix: null,
      uncoveredTail: null,
      internalUncoveredRegions: [],
      measurementAvailability: "full",
    },
    gaps: {
      gaps: [],
      canonicalGapCount: 0,
    },
    lateRetention: {
      lateSectionStart: 24,
      lateSectionSentenceUnits: 1,
      lateSectionObservationCount: 1,
      status: "retained",
    },
    endingRetention: {
      endingStart: 27,
      retained: true,
      status: "retained",
    },
    structuralAssessment: {
      sceneOrLocalityCount: 1,
      observationCount: 3,
      overmergeCueGroups: 0,
      repeatedSpanRealizationCount: 0,
      outOfOrderLocalityCount: 0,
      outOfOrderUnitCount: 0,
      weaknessSignals: [],
    },
    recoveryRecommendation: {
      disposition: "not_required",
      targetedPhysicalGapIds: [],
      eligibility: "eligible",
      advisoryClass: "advisory",
      reasons: [],
    },
    metricDiscrepancies: [],
    diagnosticReasons: [],
    ...overrides,
  };
}

function buildProvenanceManifest(overrides?: Partial<ObservationProvenanceManifest>): ObservationProvenanceManifest {
  return {
    provenanceId: "provenance-1",
    status: "available",
    derivationKind: "adapter_derived",
    sourceBoundaryVersion: "observation_v2_phase1",
    provenanceTier: "system_extract",
    dreamLanguage: "en",
    evidenceRef: "provenance",
    ...overrides,
  };
}

function buildRealizationValidation(
  overrides?: Partial<MemoryRealizationValidationResult>,
): MemoryRealizationValidationResult {
  return {
    validationId: "realization-1",
    status: "pass",
    candidateHashStable: true,
    stableOrdering: true,
    unitIdentitiesAvailable: true,
    evidenceReferencesAvailable: true,
    structuralConflicts: [],
    observations: [],
    evidenceRef: "realization",
    ...overrides,
  };
}

function buildEvidenceIntegrity(
  overrides?: Partial<EvidenceIntegrityAssessment>,
): EvidenceIntegrityAssessment {
  return {
    assessmentId: "evidence-1",
    status: "pass",
    malformedSpanCount: 0,
    missingSpanCount: 0,
    outOfBoundsSpanCount: 0,
    totalEvidenceSpanCount: 3,
    evidenceRef: "evidence",
    observations: [],
    ...overrides,
  };
}

function buildUncertainty(
  overrides?: Partial<UncertaintyPreservationAssessment>,
): UncertaintyPreservationAssessment {
  return {
    assessmentId: "uncertainty-1",
    status: "acceptable",
    evidenceRef: "uncertainty",
    observations: [],
    ...overrides,
  };
}

function buildRequest(overrides?: Partial<AdmissionRequest>): AdmissionRequest {
  const candidate = buildCanonicalCandidate();

  return {
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: candidate.sourceIdentity.sourceHash,
      sourceLength: candidate.sourceIdentity.sourceLength,
    },
    canonicalCandidate: candidate,
    provenanceManifest: buildProvenanceManifest(),
    completeness: {
      status: "available",
      reportId: "completeness-1",
      report: buildCompletenessReport(),
    },
    memoryRealizationValidation: buildRealizationValidation(),
    evidenceIntegrity: buildEvidenceIntegrity(),
    uncertaintyPreservation: buildUncertainty(),
    admissionIdentityInputComparison: {
      sourceIdentity: candidate.sourceIdentity,
      parentIdentity: {
        candidateId: candidate.composedCandidateIdentity.composedCandidateId,
        candidateHash: candidate.composedCandidateIdentity.composedCandidateHash,
      },
      nativeIdentity: {
        candidateId: candidate.canonicalCandidateId,
        candidateHash: candidate.canonicalHash,
      },
      legacyIdentity: null,
      subsystemFingerprint: "memory-realization-contract-v1",
      policyFingerprint: "memory-realization-policy-fingerprint",
      lineageRefs: [
        candidate.composedCandidateIdentity.composedCandidateId,
        candidate.provenance.provenanceId,
      ],
      substantiveEquality: true,
      classification: "comparison_unavailable",
      reasonCode: "legacy_identity_unavailable",
      artifactRefs: ["canonical-memory-candidate.json"],
    },
    governanceObservations: [],
    contractFingerprint: "contract-fingerprint",
    ...overrides,
  };
}

function readFindingIds(decision: AdmissionDecision): string[] {
  return [
    ...decision.blockingFindings.map((finding) => `${finding.signalId}:${finding.reasonCode}`),
    ...decision.nonBlockingObservations.map((finding) => `${finding.signalId}:${finding.reasonCode}`),
  ];
}

function normalizeDecision(decision: AdmissionDecision) {
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

describe("evaluateAdmissionRequest", () => {
  it("returns an admitted decision deterministically for an adequate candidate with complete governance inputs", () => {
    const request = buildRequest();

    const first = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });
    const second = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(first.disposition).toBe("admitted");
    expect(first.persistenceEligibility).toBe("authoritative");
    expect(first.downstreamEligibility).toBe("authoritative");
    expect(first.reusableCandidate).toBe(true);
    expect(first.blockingFindings).toEqual([]);
    expect(normalizeDecision(first)).toEqual(normalizeDecision(second));
  });

  it("treats completeness lineage hash as the governance comparison target when native canonical hash differs", () => {
    const request = buildRequest({
      canonicalCandidate: {
        ...buildCanonicalCandidate(),
        canonicalHash: "native-canonical-hash-1",
        composedCandidateIdentity: {
          composedCandidateId: "composed-1",
          composedCandidateHash: "candidate-hash-1",
        },
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted");
    expect(readFindingIds(decision)).not.toContain("governance.hash_mismatch:completeness_contradictory_measurements");
  });

  it("returns admitted_with_observations for adequate_with_observations and preserves attached findings", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "adequate_with_observations",
          coverage: {
            largestCoveredSpanEnd: 31,
            coverageRatio: 0.88,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 31,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          diagnosticReasons: [
            "coverage_tail_loss_detected",
            "ending_not_retained",
          ],
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted_with_observations");
    expect(decision.blockingFindings).toEqual([]);
    expect(decision.nonBlockingObservations.map((finding) => finding.signalId)).toEqual([
      "coverage.uncovered_tail",
      "ending.not_retained",
    ]);
  });

  it("defers for supplemental realization when recoverable inadequacy has eligible targeted gaps", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_recoverable",
          gaps: {
            canonicalGapCount: 1,
            gaps: [
              {
                id: "gap-001",
                sourceStart: 27,
                sourceEnd: 35,
                kind: "tail",
                reasons: ["coverage_tail_loss_detected", "ending_not_retained"],
                confidence: "high",
              },
            ],
          },
          coverage: {
            largestCoveredSpanEnd: 27,
            coverageRatio: 0.77,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 27,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
          recoveryRecommendation: {
            disposition: "required_before_admission",
            targetedPhysicalGapIds: ["gap-001"],
            eligibility: "eligible",
            advisoryClass: "admission_relevant",
            reasons: ["physical_gap_detected", "ending_not_retained"],
          },
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("deferred_for_supplemental_realization");
    expect(decision.requiredNextAction).toBe("request_supplemental_realization");
    expect(decision.persistenceEligibility).toBe("provisional_non_authoritative");
  });

  it("rejects recoverable inadequacy with uncovered prefix loss as candidate failure instead of deferring", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_recoverable",
          coverage: {
            largestCoveredSpanEnd: 28,
            coverageRatio: 0.54,
            uncoveredPrefix: {
              start: 0,
              end: 8,
            },
            uncoveredTail: {
              start: 28,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          gaps: {
            canonicalGapCount: 2,
            gaps: [
              {
                id: "gap-prefix",
                sourceStart: 0,
                sourceEnd: 8,
                kind: "prefix",
                reasons: ["coverage_prefix_loss_detected"],
                confidence: "high",
              },
              {
                id: "gap-tail",
                sourceStart: 28,
                sourceEnd: 35,
                kind: "tail",
                reasons: ["coverage_tail_loss_detected", "ending_not_retained"],
                confidence: "high",
              },
            ],
          },
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
          recoveryRecommendation: {
            disposition: "required_before_admission",
            targetedPhysicalGapIds: ["gap-prefix", "gap-tail"],
            eligibility: "eligible",
            advisoryClass: "admission_relevant",
            reasons: ["physical_gap_detected"],
          },
          diagnosticReasons: ["coverage_prefix_loss_detected", "coverage_tail_loss_detected", "ending_not_retained"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_candidate_failure");
    expect(decision.blockingFindings.map((finding) => finding.signalId)).toContain("coverage.uncovered_prefix");
  });

  it("rejects recoverable inadequacy as candidate failure when no eligible recovery route exists", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_recoverable",
          gaps: {
            canonicalGapCount: 0,
            gaps: [],
          },
          recoveryRecommendation: {
            disposition: "recommended",
            targetedPhysicalGapIds: [],
            eligibility: "not_eligible",
            advisoryClass: "advisory",
            reasons: ["measurement_indeterminate"],
          },
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_candidate_failure");
  });

  it("admits recoverable internal-gap-only weakness with observations when no material tail or prefix omission exists", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_recoverable",
          coverage: {
            largestCoveredSpanEnd: 35,
            coverageRatio: 0.91,
            uncoveredPrefix: null,
            uncoveredTail: null,
            internalUncoveredRegions: [
              {
                start: 12,
                end: 15,
              },
            ],
            measurementAvailability: "full",
          },
          gaps: {
            canonicalGapCount: 1,
            gaps: [
              {
                id: "gap-internal",
                sourceStart: 12,
                sourceEnd: 15,
                kind: "internal",
                reasons: ["coverage_internal_gap_detected"],
                confidence: "low",
              },
            ],
          },
          recoveryRecommendation: {
            disposition: "recommended",
            targetedPhysicalGapIds: ["gap-internal"],
            eligibility: "eligible",
            advisoryClass: "advisory",
            reasons: ["structural_weakness_detected"],
          },
          diagnosticReasons: ["coverage_internal_gap_detected"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted_with_observations");
    expect(decision.blockingFindings).toEqual([]);
    expect(decision.nonBlockingObservations.map((finding) => finding.signalId)).toContain("coverage.internal_gaps");
  });

  it("admits recoverable thin-late-trace weakness with observations when omission evidence stays non-blocking", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_recoverable",
          lateRetention: {
            lateSectionStart: 24,
            lateSectionSentenceUnits: 1,
            lateSectionObservationCount: 1,
            status: "thin",
          },
          structuralAssessment: {
            sceneOrLocalityCount: 1,
            observationCount: 3,
            overmergeCueGroups: 0,
            repeatedSpanRealizationCount: 0,
            outOfOrderLocalityCount: 0,
            outOfOrderUnitCount: 0,
            weaknessSignals: ["thin_late_retention"],
          },
          recoveryRecommendation: {
            disposition: "recommended",
            targetedPhysicalGapIds: [],
            eligibility: "eligible",
            advisoryClass: "advisory",
            reasons: ["structural_weakness_detected"],
          },
          diagnosticReasons: ["late_section_thin_trace"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted_with_observations");
    expect(decision.blockingFindings).toEqual([]);
    expect(decision.nonBlockingObservations.map((finding) => finding.signalId)).toContain("late.thin_trace");
  });

  it("keeps short-source ending loss with a high-confidence tail gap deferred because the missing ending is materially dense", () => {
    const request = buildRequest({
      sourceIdentity: {
        sourceId: "source-short",
        sourceHash: "source-hash-1",
        sourceLength: 96,
      },
      canonicalCandidate: {
        ...buildCanonicalCandidate(),
        sourceIdentity: {
          sourceId: "source-short",
          sourceHash: "source-hash-1",
          sourceLength: 96,
        },
      },
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          sourceIdentity: {
            sourceHash: "source-hash-1",
            sourceLength: 96,
          },
          adequacy: "inadequate_recoverable",
          coverage: {
            largestCoveredSpanEnd: 68,
            coverageRatio: 0.7083333333333334,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 68,
              end: 96,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          gaps: {
            canonicalGapCount: 1,
            gaps: [
              {
                id: "gap-tail",
                sourceStart: 68,
                sourceEnd: 96,
                kind: "tail",
                reasons: ["coverage_tail_loss_detected", "ending_not_retained"],
                confidence: "high",
              },
            ],
          },
          endingRetention: {
            endingStart: 68,
            retained: false,
            status: "not_retained",
          },
          recoveryRecommendation: {
            disposition: "required_before_admission",
            targetedPhysicalGapIds: ["gap-tail"],
            eligibility: "eligible",
            advisoryClass: "admission_relevant",
            reasons: ["physical_gap_detected", "ending_not_retained"],
          },
          diagnosticReasons: ["coverage_tail_loss_detected", "ending_not_retained"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("deferred_for_supplemental_realization");
  });

  it("rejects inadequate_non_recoverable as candidate failure", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "inadequate_non_recoverable",
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_candidate_failure");
  });

  it("rejects missing provenance as governance failure", () => {
    const request = buildRequest({
      provenanceManifest: buildProvenanceManifest({
        status: "unavailable",
      }),
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_governance_failure");
    expect(decision.blockingFindings.map((finding) => finding.signalId)).toContain("provenance.unavailable");
  });

  it("rejects malformed evidence support as governance failure", () => {
    const request = buildRequest({
      evidenceIntegrity: buildEvidenceIntegrity({
        status: "failed",
        malformedSpanCount: 1,
      }),
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_governance_failure");
    expect(decision.blockingFindings.map((finding) => finding.signalId)).toContain("evidence.malformed_support");
  });

  it("rejects contradictory completeness measurements as governance failure", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          metricDiscrepancies: [
            {
              code: "contradictory_measurements",
              severity: "high",
              description: "contradiction",
            },
          ],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_governance_failure");
    expect(decision.blockingFindings.map((finding) => finding.signalId)).toContain(
      "completeness.contradictory_measurements",
    );
  });

  it("treats uncovered prefix loss as blocking candidate failure", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          coverage: {
            largestCoveredSpanEnd: 35,
            coverageRatio: 0.7,
            uncoveredPrefix: {
              start: 0,
              end: 6,
            },
            uncoveredTail: null,
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          diagnosticReasons: ["coverage_prefix_loss_detected"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("rejected_candidate_failure");
    expect(decision.blockingFindings.map((finding) => finding.signalId)).toContain("coverage.uncovered_prefix");
  });

  it("keeps uncovered tail non-blocking by itself", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "adequate_with_observations",
          coverage: {
            largestCoveredSpanEnd: 31,
            coverageRatio: 0.88,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 31,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          diagnosticReasons: ["coverage_tail_loss_detected"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted_with_observations");
    expect(decision.blockingFindings).toEqual([]);
  });

  it("keeps ending not retained non-blocking by itself", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "adequate_with_observations",
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
          diagnosticReasons: ["ending_not_retained"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted_with_observations");
    expect(decision.blockingFindings).toEqual([]);
  });

  it("does not let recovery-only signals independently block an otherwise adequate candidate", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          structuralAssessment: {
            sceneOrLocalityCount: 1,
            observationCount: 3,
            overmergeCueGroups: 1,
            repeatedSpanRealizationCount: 0,
            outOfOrderLocalityCount: 0,
            outOfOrderUnitCount: 0,
            weaknessSignals: ["single_scene_overmerge_risk", "thin_late_retention"],
          },
          diagnosticReasons: ["single_scene_overmerge_risk", "late_section_thin_trace"],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted");
    expect(decision.blockingFindings).toEqual([]);
  });

  it("does not let diagnostic-only signals affect disposition", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          structuralAssessment: {
            sceneOrLocalityCount: 1,
            observationCount: 3,
            overmergeCueGroups: 0,
            repeatedSpanRealizationCount: 1,
            outOfOrderLocalityCount: 1,
            outOfOrderUnitCount: 1,
            weaknessSignals: ["repeated_span_realization", "out_of_order_localities", "out_of_order_units"],
          },
          metricDiscrepancies: [
            {
              code: "coverage_ratio_vs_uncovered_range",
              severity: "low",
              description: "diagnostic",
            },
          ],
        }),
      },
    });

    const decision = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(decision.disposition).toBe("admitted");
  });

  it("stabilizes finding ordering deterministically", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "adequate_with_observations",
          coverage: {
            largestCoveredSpanEnd: 31,
            coverageRatio: 0.88,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 31,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          lateRetention: {
            lateSectionStart: 24,
            lateSectionSentenceUnits: 1,
            lateSectionObservationCount: 0,
            status: "missing",
          },
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
          metricDiscrepancies: [
            {
              code: "ending_metric_false_negative",
              severity: "medium",
              description: "false negative",
            },
          ],
          diagnosticReasons: [
            "ending_not_retained",
            "coverage_tail_loss_detected",
            "late_section_missing",
          ],
        }),
      },
    });

    const first = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });
    const second = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(readFindingIds(first)).toEqual(readFindingIds(second));
  });

  it("stabilizes reason ordering deterministically", () => {
    const request = buildRequest({
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: buildCompletenessReport({
          adequacy: "adequate_with_observations",
          coverage: {
            largestCoveredSpanEnd: 31,
            coverageRatio: 0.88,
            uncoveredPrefix: null,
            uncoveredTail: {
              start: 31,
              end: 35,
            },
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          endingRetention: {
            endingStart: 27,
            retained: false,
            status: "not_retained",
          },
          diagnosticReasons: ["ending_not_retained", "coverage_tail_loss_detected"],
        }),
      },
    });

    const first = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });
    const second = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(first.decisionReasons).toEqual(second.decisionReasons);
  });

  it("creates a stable shadow authority identity for admitted decisions", () => {
    const request = buildRequest();

    const first = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });
    const second = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });

    expect(first.authorityIdentity).toEqual(second.authorityIdentity);
    expect(first.authorityIdentity?.shadowStatus).toBe("inactive_non_authoritative");
  });

  it("changes authority identity when the policy fingerprint changes", () => {
    const request = buildRequest();
    const variantPolicy = {
      ...DEFAULT_AUTHORITY_ADMISSION_POLICY,
      policyVersion: "shadow-v2",
      policyFingerprint: "policy-fingerprint-v2",
    };

    const first = evaluateAdmissionRequest({
      request,
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
    });
    const second = evaluateAdmissionRequest({
      request,
      policy: variantPolicy,
    });

    expect(first.disposition).toBe("admitted");
    expect(second.disposition).toBe("admitted");
    expect(first.authorityIdentity?.authorityId).not.toBe(second.authorityIdentity?.authorityId);
  });

  it("returns identical substantive output on replay", () => {
    const request = buildRequest();

    const decisions = Array.from({ length: 3 }, () =>
      evaluateAdmissionRequest({
        request,
        policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
      }),
    );

    expect(normalizeDecision(decisions[0]!)).toEqual(normalizeDecision(decisions[1]!));
    expect(normalizeDecision(decisions[1]!)).toEqual(normalizeDecision(decisions[2]!));
  });
});

describe("runShadowAuthorityAdmission", () => {
  it("returns an indeterminate artifact-safe decision when the policy is unavailable", () => {
    const result = runShadowAuthorityAdmission({
      request: buildRequest(),
      policy: null,
    });

    expect(result.decision.disposition).toBe("indeterminate");
    expect(result.decision.requiredNextAction).toBe("stop_fail_closed");
  });

  it("isolates evaluator failures and returns indeterminate instead of throwing", () => {
    const result = runShadowAuthorityAdmission({
      request: buildRequest(),
      policy: DEFAULT_AUTHORITY_ADMISSION_POLICY,
      forceEvaluatorFailure: true,
    });

    expect(result.decision.disposition).toBe("indeterminate");
    expect(result.failure?.code).toBe("evaluator_failed");
  });
});
