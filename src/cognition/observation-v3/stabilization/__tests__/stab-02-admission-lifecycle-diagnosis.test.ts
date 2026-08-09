import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

import type { CompletenessReport } from "@/src/cognition/observation-v3/completeness-analysis";
import {
  runObservationV3ShadowPipeline,
} from "@/src/cognition/observation-v3/pipeline";
import {
  realizeCanonicalMemoryCandidate,
  type MemoryRealizationRequest,
} from "@/src/cognition/observation-v3/memory-realization";
import type { ComposedProvisionalMemoryCandidate } from "@/src/cognition/observation-v3/memory-composition";
import {
  buildCanonicalCandidateCompletenessReport,
  buildHypotheticalAdmissionDecision,
  buildPostCompositionCompletenessReport,
} from "@/src/cognition/observation-v3/stabilization/stab-02-admission-lifecycle-diagnosis";

function buildComposedCandidate(): {
  dreamText: string;
  composedCandidateHash: string;
  composedCandidate: ComposedProvisionalMemoryCandidate;
} {
  const dreamText = "A beginning happens. A middle happens. An ending happens.";
  const sourceHash = createHash("sha256").update(JSON.stringify(dreamText)).digest("hex");

  return {
    dreamText,
    composedCandidateHash: "candidate-hash-1",
    composedCandidate: {
      candidateId: "composed-1",
      sourceIdentity: {
        sourceId: "source-1",
        sourceHash,
        sourceLength: dreamText.length,
      },
      localityRecords: [
        {
          localityId: "scene-1",
          derivedFrom: ["scene-1"],
          label: "Scene 1",
          sourceStart: 0,
          sourceEnd: dreamText.length,
          boundaryUncertainty: null,
          evidenceRefs: [
            {
              snippet: dreamText,
              spanStart: 0,
              spanEnd: dreamText.length,
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
              snippet: "A beginning happens.",
              spanStart: 0,
              spanEnd: 20,
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
              snippet: "A middle happens.",
              spanStart: 21,
              spanEnd: 38,
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
              snippet: "An ending happens.",
              spanStart: 39,
              spanEnd: dreamText.length,
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
  };
}

function buildMemoryRealizationResult() {
  const fixture = buildComposedCandidate();
  const request: MemoryRealizationRequest = {
    requestId: "memory-realization-request-1",
    sourceIdentity: fixture.composedCandidate.sourceIdentity,
    composedCandidateIdentity: {
      composedCandidateId: fixture.composedCandidate.candidateId,
      composedCandidateHash: fixture.composedCandidateHash,
    },
    composedCandidate: fixture.composedCandidate,
    compositionResultRef: "composition-result-1",
    realizationPolicyVersion: "memory-realization-shadow-v1",
    realizationPolicyFingerprint: "memory-realization-shadow-v1",
  };

  return {
    fixture,
    result: realizeCanonicalMemoryCandidate(request),
  };
}

function buildInitialCompletenessReport(): CompletenessReport {
  return {
    schemaVersion: "1",
    analyzerVersion: "1",
    sourceIdentity: {
      sourceHash: "source-hash-1",
      sourceLength: 57,
    },
    candidateIdentity: {
      candidateHash: "baseline-hash-1",
      candidateKind: "primary_extraction",
    },
    status: "available",
    adequacy: "adequate",
    coverage: {
      largestCoveredSpanEnd: 57,
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
      lateSectionStart: 39,
      lateSectionSentenceUnits: 1,
      lateSectionObservationCount: 1,
      status: "retained",
    },
    endingRetention: {
      endingStart: 39,
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
  };
}

function buildRecoverableReplay() {
  const dreamText = "The dreamer enters a city. Later the dreamer finds a hidden garden and wakes.";
  return {
    dreamText,
    replay: {
      adapterId: "preserved-replay-adapter-v1",
      descriptiveExtraction: {
        attemptId: "attempt-01",
        attemptNumber: 1 as const,
        sourceArtifactRef: "fixtures/recoverable-attempt-01.json",
        providerResult: {
          outputText: JSON.stringify({
            dreamLanguage: "en",
            scenes: [
              {
                sceneId: "scene-1",
                position: 0,
                summary: "The dreamer enters a city.",
                boundaryReasoning: [],
                evidenceContext: {
                  snippet: "The dreamer enters a city.",
                  spanStart: 0,
                  spanEnd: 26,
                  contextLabel: "early",
                },
                observations: [
                  {
                    observationId: "obs-1",
                    position: 0,
                    text: "The dreamer enters a city.",
                    evidence: [
                      {
                        snippet: "The dreamer enters a city.",
                        spanStart: 0,
                        spanEnd: 26,
                        contextLabel: "early",
                      },
                    ],
                    uncertaintyNote: null,
                  },
                ],
                derived: {
                  actors: [],
                  locations: [],
                  objects: [],
                  interactions: [],
                  affect: [],
                  agency: [],
                  phenomenology: [],
                  metacognition: [],
                },
              },
            ],
          }),
          providerDiagnostics: {
            elapsedMs: 10,
            providerStatus: "completed",
            providerIncompleteReason: null,
            providerReturnedStructuredOutput: true,
            inputTokenUsage: 1,
            outputTokenUsage: 1,
            totalTokenUsage: 2,
          },
        },
      },
      supplementalRealization: {
        responses: [
          {
            physicalGapId: "gap-001",
            sourceArtifactRef: "fixtures/recoverable-supplemental.json",
            providerResult: {
              outputText: JSON.stringify({
                regions: [
                  {
                    regionId: "region-1",
                    heading: "Later",
                    spanStart: 27,
                    spanEnd: dreamText.length,
                    boundaryUncertainty: null,
                    transitionCues: ["later"],
                    observations: [
                      {
                        observationId: "supp-1",
                        statement: "Later the dreamer finds a hidden garden and wakes.",
                        uncertainty: null,
                        evidence: [
                          {
                            snippet: "Later the dreamer finds a hidden garden and wakes.",
                            spanStart: 27,
                            spanEnd: dreamText.length,
                            contextLabel: "late",
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
              providerStatus: "completed",
              providerIncompleteReason: null,
              tokenUsage: {
                input: 1,
                output: 1,
                total: 2,
              },
            },
          },
        ],
      },
    },
  };
}

describe("OBS-V3-STAB-02 lifecycle diagnostics", () => {
  it("builds deterministic post-composition completeness aligned to the composed candidate hash", () => {
    const fixture = buildComposedCandidate();

    const first = buildPostCompositionCompletenessReport(fixture);
    const second = buildPostCompositionCompletenessReport(fixture);

    expect(first).toEqual(second);
    expect(first.candidateIdentity).toEqual({
      candidateHash: "candidate-hash-1",
      candidateKind: "composed_candidate",
      candidateVersionLabel: "post_composition",
    });
  });

  it("cannot masquerade baseline completeness as final-candidate completeness in hypothetical admission", () => {
    const { fixture, result } = buildMemoryRealizationResult();
    const baselineCompleteness = buildInitialCompletenessReport();
    const postCompositionCompleteness = buildPostCompositionCompletenessReport(fixture);

    const staleDecision = buildHypotheticalAdmissionDecision({
      memoryRealizationResult: result,
      completenessReport: baselineCompleteness,
      reportId: "baseline",
    });
    const alignedDecision = buildHypotheticalAdmissionDecision({
      memoryRealizationResult: result,
      completenessReport: postCompositionCompleteness,
      reportId: "post-composition",
    });

    expect(staleDecision.disposition).toBe("rejected_governance_failure");
    expect(alignedDecision.disposition).toBe("admitted_with_observations");
  });

  it("shows canonical-candidate completeness remains admission-incompatible under the current contract", () => {
    const { fixture, result } = buildMemoryRealizationResult();
    if (!result.canonicalCandidate) {
      throw new Error("canonical_candidate_fixture_unavailable");
    }

    const canonicalCompleteness = buildCanonicalCandidateCompletenessReport({
      dreamText: fixture.dreamText,
      canonicalCandidate: result.canonicalCandidate,
    });
    const decision = buildHypotheticalAdmissionDecision({
      memoryRealizationResult: result,
      completenessReport: canonicalCompleteness,
      reportId: "canonical",
    });

    expect(canonicalCompleteness.candidateIdentity.candidateHash).toBe(result.canonicalCandidate.canonicalHash);
    expect(decision.disposition).toBe("rejected_governance_failure");
  });

  it("reflects the repaired pipeline path, which now passes post-composition completeness into admission", async () => {
    const replay = buildRecoverableReplay();
    const result = await runObservationV3ShadowPipeline({
      userId: "user-1",
      reflectiveObjectId: "object-1",
      dreamText: replay.dreamText,
      replay: replay.replay,
    });

    const authorityStage = result.stageResults.find((stage) => stage.stage === "authority_admission");
    expect(authorityStage?.status).toBe("success");
    expect(authorityStage?.payload).toEqual(
      expect.objectContaining({
        request: expect.objectContaining({
          completeness: expect.objectContaining({
            status: "available",
            report: expect.objectContaining({
              candidateIdentity: expect.objectContaining({
                candidateKind: "composed_candidate",
                candidateVersionLabel: "post_composition",
              }),
            }),
          }),
        }),
      }),
    );
  });
});
