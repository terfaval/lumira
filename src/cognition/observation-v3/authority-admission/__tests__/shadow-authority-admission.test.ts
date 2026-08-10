import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
  buildNativeShadowAdmissionRequest,
  compareAuthorityAdmissionWithV2,
  evaluateAdmissionRequest,
  runAuthorityAdmissionShadowReview,
} from "@/src/cognition/observation-v3/authority-admission";
import { DEFAULT_AUTHORITY_ADMISSION_POLICY } from "@/src/cognition/observation-v3/authority-admission/admission-policy";
import {
  runtimeDependencyGuard,
  validateAuthorityAdmissionArtifactSet,
} from "@/src/cognition/observation-v3/authority-admission/shadow-authority-admission";
import { realizeCanonicalMemoryCandidate, type MemoryRealizationRequest } from "@/src/cognition/observation-v3/memory-realization";
import * as authorityAdmissionPublicApi from "@/src/cognition/observation-v3/authority-admission";

function buildCanonicalCandidateFixture() {
  const request: MemoryRealizationRequest = {
    requestId: "memory-realization-request-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 20,
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
        sourceLength: 20,
      },
      localityRecords: [
        {
          localityId: "scene-1",
          derivedFrom: ["scene-1"],
          label: "Scene 1",
          sourceStart: 0,
          sourceEnd: 11,
          boundaryUncertainty: null,
          evidenceRefs: [
            {
              snippet: "Short source",
              spanStart: 0,
              spanEnd: 11,
              contextLabel: "scene",
            },
          ],
        },
      ],
      descriptiveUnits: [
        {
          unitId: "obs-1",
          derivedFrom: ["obs-1"],
          localityId: "scene-1",
          statement: "Short source",
          evidenceRefs: [
            {
              snippet: "Short source",
              spanStart: 0,
              spanEnd: 11,
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

  const result = realizeCanonicalMemoryCandidate(request);
  if (!result.canonicalCandidate) {
    throw new Error("canonical_candidate_fixture_unavailable");
  }
  return result.canonicalCandidate;
}

describe("compareAuthorityAdmissionWithV2", () => {
  function buildDecision(disposition: Parameters<typeof compareAuthorityAdmissionWithV2>[0]["decision"]["disposition"]) {
    const canonicalCandidate = buildCanonicalCandidateFixture();
    return evaluateAdmissionRequest({
      request: {
        sourceIdentity: {
          sourceId: "source-1",
          sourceHash: "source-hash-1",
          sourceLength: 20,
        },
        canonicalCandidate: canonicalCandidate,
        provenanceManifest: {
          provenanceId: "provenance-1",
          status: "available",
          derivationKind: "adapter_derived",
          sourceBoundaryVersion: "observation_v2_phase1",
          provenanceTier: "system_extract",
          dreamLanguage: "en",
          evidenceRef: "provenance",
        },
        completeness: {
          status: "available",
          reportId: "completeness-1",
          report: {
            schemaVersion: "1",
            analyzerVersion: "1",
            sourceIdentity: {
              sourceHash: "source-hash-1",
              sourceLength: 20,
            },
            candidateIdentity: {
              candidateHash: "candidate-hash-1",
              candidateKind: "primary_extraction",
            },
            status: "available",
            adequacy:
              disposition === "deferred_for_supplemental_realization"
                ? "inadequate_recoverable"
                : disposition === "rejected_candidate_failure"
                  ? "inadequate_non_recoverable"
                  : "adequate",
            coverage: {
              largestCoveredSpanEnd: disposition === "deferred_for_supplemental_realization" ? 15 : 20,
              coverageRatio: disposition === "deferred_for_supplemental_realization" ? 0.75 : 1,
              uncoveredPrefix: null,
              uncoveredTail: disposition === "deferred_for_supplemental_realization"
                ? {
                    start: 15,
                    end: 20,
                  }
                : null,
              internalUncoveredRegions: [],
              measurementAvailability: "full",
            },
            gaps: {
              canonicalGapCount: disposition === "deferred_for_supplemental_realization" ? 1 : 0,
              gaps: disposition === "deferred_for_supplemental_realization"
                ? [
                    {
                      id: "gap-1",
                      sourceStart: 15,
                      sourceEnd: 20,
                      kind: "tail",
                      reasons: ["coverage_tail_loss_detected"],
                      confidence: "high",
                    },
                  ]
                : [],
            },
            lateRetention: {
              lateSectionStart: 10,
              lateSectionSentenceUnits: 1,
              lateSectionObservationCount: disposition === "deferred_for_supplemental_realization" ? 0 : 1,
              status: disposition === "deferred_for_supplemental_realization" ? "missing" : "retained",
            },
            endingRetention: {
              endingStart: 16,
              retained: disposition === "deferred_for_supplemental_realization" ? false : true,
              status: disposition === "deferred_for_supplemental_realization" ? "not_retained" : "retained",
            },
            structuralAssessment: {
              sceneOrLocalityCount: 1,
              observationCount: 1,
              overmergeCueGroups: 0,
              repeatedSpanRealizationCount: 0,
              outOfOrderLocalityCount: 0,
              outOfOrderUnitCount: 0,
              weaknessSignals: [],
            },
            recoveryRecommendation: {
              disposition: disposition === "deferred_for_supplemental_realization" ? "required_before_admission" : "not_required",
              targetedPhysicalGapIds: disposition === "deferred_for_supplemental_realization" ? ["gap-1"] : [],
              eligibility: "eligible",
              advisoryClass: disposition === "deferred_for_supplemental_realization" ? "admission_relevant" : "advisory",
              reasons: disposition === "deferred_for_supplemental_realization" ? ["physical_gap_detected"] : [],
            },
            metricDiscrepancies: [],
            diagnosticReasons: disposition === "deferred_for_supplemental_realization"
              ? ["coverage_tail_loss_detected", "late_section_missing", "ending_not_retained"]
              : [],
          },
        },
        memoryRealizationValidation: {
          validationId: "realization-1",
          status: "pass",
          candidateHashStable: true,
          stableOrdering: true,
          unitIdentitiesAvailable: true,
          evidenceReferencesAvailable: true,
          structuralConflicts: [],
          observations: [],
          evidenceRef: "realization",
        },
        evidenceIntegrity: {
          assessmentId: "evidence-1",
          status: "pass",
          malformedSpanCount: 0,
          missingSpanCount: 0,
          outOfBoundsSpanCount: 0,
          totalEvidenceSpanCount: 1,
          evidenceRef: "evidence",
          observations: [],
        },
        uncertaintyPreservation: {
          assessmentId: "uncertainty-1",
          status: "acceptable",
          evidenceRef: "uncertainty",
          observations: [],
        },
        admissionIdentityInputComparison: {
          sourceIdentity: canonicalCandidate.sourceIdentity,
          parentIdentity: {
            candidateId: canonicalCandidate.composedCandidateIdentity.composedCandidateId,
            candidateHash: canonicalCandidate.composedCandidateIdentity.composedCandidateHash,
          },
          nativeIdentity: {
            candidateId: canonicalCandidate.canonicalCandidateId,
            candidateHash: canonicalCandidate.canonicalHash,
          },
          compatibilityIdentity: null,
          legacyIdentity: null,
          subsystemFingerprint: "memory-realization-contract-v1",
          policyFingerprint: "memory-realization-policy-v1",
          lineageRefs: [
            canonicalCandidate.composedCandidateIdentity.composedCandidateId,
            canonicalCandidate.provenance.provenanceId,
          ],
          substantiveEquality: true,
          classification: "comparison_unavailable",
          reasonCode: "legacy_identity_unavailable",
          artifactRefs: ["canonical-memory-candidate.json"],
        },
        governanceObservations: [],
        contractFingerprint: "contract-fingerprint",
      },
      policy: {
        ...DEFAULT_AUTHORITY_ADMISSION_POLICY,
        admittedDispositions: ["admitted", "admitted_with_observations"],
      },
    });
  }

  it("classifies v3_blocks_v2_accepts", () => {
    const comparison = compareAuthorityAdmissionWithV2({
      decision: buildDecision("rejected_candidate_failure"),
      v2Outcome: "accepted_and_persisted",
      candidateComparable: true,
    });

    expect(comparison.classification).toBe("v3_blocks_v2_accepts");
  });

  it("classifies v3_defers_v2_accepts", () => {
    const comparison = compareAuthorityAdmissionWithV2({
      decision: buildDecision("deferred_for_supplemental_realization"),
      v2Outcome: "accepted_and_persisted",
      candidateComparable: true,
    });

    expect(comparison.classification).toBe("v3_defers_v2_accepts");
  });

  it("classifies comparison_unavailable", () => {
    const comparison = compareAuthorityAdmissionWithV2({
      decision: buildDecision("admitted"),
      v2Outcome: "unavailable",
      candidateComparable: false,
      missingArtifacts: ["candidate_bundle"],
    });

    expect(comparison.classification).toBe("comparison_unavailable");
  });

  it("classifies semantically_incomparable", () => {
    const comparison = compareAuthorityAdmissionWithV2({
      decision: buildDecision("admitted"),
      v2Outcome: "fallback",
      candidateComparable: false,
      semanticMismatch: "fallback_only_output_has_no_canonical_equivalent_candidate",
    });

    expect(comparison.classification).toBe("semantically_incomparable");
  });
});

describe("runAuthorityAdmissionShadowReview", () => {
  it("replays the preserved calibration root and writes authority admission artifacts", async () => {
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "authority-admission-shadow-"));

    const result = await runAuthorityAdmissionShadowReview({
      calibrationRoot: DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
      outputRoot,
      reviewId: "20260802T070000Z-obs-v3-authority-admission-shadow",
      replayCount: 3,
    });

    expect(result.reviewId).toBe("20260802T070000Z-obs-v3-authority-admission-shadow");
    expect(result.decisionCount).toBe(30);
    expect(result.replayCount).toBe(90);

    const manifest = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "review-manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    const summary = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "equivalence-summary.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(manifest.reviewId).toBe(result.reviewId);
    expect(summary.reviewId).toBe(result.reviewId);
    expect(validateAuthorityAdmissionArtifactSet(await fs.readdir(result.reviewRoot))).toBe(true);

    const admittedDecision = JSON.parse(
      await fs.readFile(
        path.join(
          result.reviewRoot,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "native-admission-decision.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const admittedEquivalence = JSON.parse(
      await fs.readFile(
        path.join(
          result.reviewRoot,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "native-admission-equivalence.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const realizationSummary = JSON.parse(
      await fs.readFile(
        path.join(
          result.reviewRoot,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "memory-realization-summary.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    const legacyComparison = JSON.parse(
      await fs.readFile(
        path.join(
          result.reviewRoot,
          "items",
          "OBS-A-001",
          "attempts",
          "attempt-01",
          "legacy-adapter-comparison.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;

    expect(admittedDecision).toEqual(
      expect.objectContaining({
        disposition: expect.any(String),
        policyVersion: expect.any(String),
        evaluatorFingerprint: expect.any(String),
        policyFingerprint: expect.any(String),
        contractFingerprint: expect.any(String),
      }),
    );
    expect(admittedEquivalence).toEqual(
      expect.objectContaining({
        comparison: expect.any(String),
        v2Outcome: expect.any(String),
        v3Disposition: expect.any(String),
      }),
    );
    expect(realizationSummary).toEqual(
      expect.objectContaining({
        disposition: expect.any(String),
        canonicalCandidateId: expect.any(String),
        canonicalHash: expect.any(String),
      }),
    );
    expect(legacyComparison).toEqual(
      expect.objectContaining({
        classification: expect.any(String),
      }),
    );
  }, 15000);

  it("builds admission input from the full canonical candidate rather than a reduced summary", () => {
    const request: MemoryRealizationRequest = {
      requestId: "memory-realization-request-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash: "source-hash-1",
        sourceLength: 20,
      },
      composedCandidateIdentity: {
        composedCandidateId: "composed-1",
        composedCandidateHash: "composed-hash-1",
      },
      composedCandidate: {
        candidateId: "composed-1",
        sourceIdentity: {
          sourceId: "source-1",
          sourceHash: "source-hash-1",
          sourceLength: 20,
        },
        localityRecords: [
          {
            localityId: "locality-1",
            derivedFrom: ["region-1"],
            label: "Scene",
            sourceStart: 0,
            sourceEnd: 10,
            boundaryUncertainty: null,
            evidenceRefs: [
              {
                snippet: "short source",
                spanStart: 0,
                spanEnd: 10,
                contextLabel: "scene",
              },
            ],
          },
        ],
        descriptiveUnits: [
          {
            unitId: "unit-1",
            derivedFrom: ["obs-1"],
            localityId: "locality-1",
            statement: "Short source",
            evidenceRefs: [
              {
                snippet: "short source",
                spanStart: 0,
                spanEnd: 10,
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
          policyFingerprint: "composition-policy-v1",
        },
      },
      compositionResultRef: "composition-result-1",
      realizationPolicyVersion: "memory-realization-shadow-v1",
      realizationPolicyFingerprint: "memory-realization-policy-v1",
    };

    const nativeResult = realizeCanonicalMemoryCandidate(request);
    const admissionRequest = buildNativeShadowAdmissionRequest({
      nativeResult,
      completeness: {
        status: "available",
        reportId: "completeness-1",
        report: {
          schemaVersion: "1",
          analyzerVersion: "1",
          sourceIdentity: {
            sourceHash: "source-hash-1",
            sourceLength: 20,
          },
          candidateIdentity: {
            candidateHash: "composed-hash-1",
            candidateKind: "primary_extraction",
          },
          status: "available",
          adequacy: "adequate",
          coverage: {
            largestCoveredSpanEnd: 20,
            coverageRatio: 1,
            uncoveredPrefix: null,
            uncoveredTail: null,
            internalUncoveredRegions: [],
            measurementAvailability: "full",
          },
          gaps: {
            canonicalGapCount: 0,
            gaps: [],
          },
          lateRetention: {
            lateSectionStart: 10,
            lateSectionSentenceUnits: 1,
            lateSectionObservationCount: 1,
            status: "retained",
          },
          endingRetention: {
            endingStart: 16,
            retained: true,
            status: "retained",
          },
          structuralAssessment: {
            sceneOrLocalityCount: 1,
            observationCount: 1,
            overmergeCueGroups: 0,
            repeatedSpanRealizationCount: 0,
            outOfOrderLocalityCount: 0,
            outOfOrderUnitCount: 0,
            weaknessSignals: [],
          },
          recoveryRecommendation: {
            disposition: "not_required",
            targetedPhysicalGapIds: [],
            eligibility: "not_eligible",
            advisoryClass: "advisory",
            reasons: [],
          },
          metricDiscrepancies: [],
          diagnosticReasons: [],
        },
      },
    });

    expect(admissionRequest?.canonicalCandidate.localities).toHaveLength(1);
    expect(admissionRequest?.canonicalCandidate.descriptiveUnits).toHaveLength(1);
    expect(admissionRequest?.canonicalCandidate.canonicalHash).toBe(
      nativeResult.canonicalCandidate?.canonicalHash,
    );
  });

  it("produces stable substantive replay results for preserved candidates", async () => {
    const outputRoot = await fs.mkdtemp(path.join(os.tmpdir(), "authority-admission-shadow-replay-"));

    const result = await runAuthorityAdmissionShadowReview({
      calibrationRoot: DEFAULT_AUTHORITY_ADMISSION_SHADOW_INPUT_ROOT,
      outputRoot,
      reviewId: "20260802T071500Z-obs-v3-authority-admission-shadow",
      replayCount: 3,
    });

    const replay = JSON.parse(
      await fs.readFile(path.join(result.reviewRoot, "deterministic-replay-results.json"), "utf8"),
    ) as {
      attempts: Array<{
        substantiveEquality: boolean;
      }>;
    };

    expect(replay.attempts).toHaveLength(30);
    expect(replay.attempts.every((entry) => entry.substantiveEquality)).toBe(true);
  });

  it("exposes explicit runtime dependency guards", () => {
    expect(runtimeDependencyGuard()).toEqual({
      benchmarkIdDependency: false,
      humanLabelDependency: false,
      legacyProjectionDependency: false,
      persistenceDependency: false,
      downstreamGenerationDependency: false,
      v2OutcomeDependencyDuringEvaluation: false,
      admissionActivation: false,
    });
  });

  it("rejects incomplete review roots as missing expected artifacts", () => {
    expect(validateAuthorityAdmissionArtifactSet(["review-manifest.json"])).toBe(false);
  });

  it("does not expose review-root validation helpers from the public barrel", () => {
    expect("runtimeDependencyGuard" in authorityAdmissionPublicApi).toBe(false);
    expect("validateAuthorityAdmissionArtifactSet" in authorityAdmissionPublicApi).toBe(false);
  });
});

describe("dependency boundary", () => {
  it("does not import prohibited runtime boundaries", async () => {
    const authorityRoot = path.resolve("src/cognition/observation-v3/authority-admission");
    const fileNames = await fs.readdir(authorityRoot);
    const prohibitedPatterns = [
      "llm-scene-observation-extractor",
      "supplemental-realization",
      "memory-composition",
      "repositories/create-",
      "supabase/repositories",
      "reflective-space/composition",
      "legacy projection",
      "observation-topology-experiment",
    ];

    for (const fileName of fileNames.filter((entry) => entry.endsWith(".ts") && !entry.endsWith(".test.ts"))) {
      const source = await fs.readFile(path.join(authorityRoot, fileName), "utf8");
      for (const pattern of prohibitedPatterns) {
        expect(source).not.toContain(pattern);
      }
    }
  });
});
