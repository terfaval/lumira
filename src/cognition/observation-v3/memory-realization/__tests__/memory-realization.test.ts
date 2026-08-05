import { describe, expect, it } from "vitest";

import {
  compareNativeMemoryRealizationWithLegacyAdapter,
  realizeCanonicalMemoryCandidate,
  runShadowMemoryRealization,
  type CanonicalMemoryCandidate,
  type ComposedProvisionalMemoryCandidate,
  type MemoryRealizationRequest,
} from "@/src/cognition/observation-v3/memory-realization";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

function buildComposedCandidate(
  overrides?: Partial<ComposedProvisionalMemoryCandidate>,
): ComposedProvisionalMemoryCandidate {
  return {
    candidateId: "composed-1",
    sourceIdentity: {
      sourceId: "source-1",
      sourceHash: "source-hash-1",
      sourceLength: 120,
    },
    localityRecords: [
      {
        localityId: "locality-beta",
        derivedFrom: ["region-beta"],
        label: "Beta",
        sourceStart: 60,
        sourceEnd: 90,
        boundaryUncertainty: null,
        evidenceRefs: [
          {
            snippet: "beta scene",
            spanStart: 60,
            spanEnd: 70,
            contextLabel: "scene",
          },
        ],
      },
      {
        localityId: "locality-alpha",
        derivedFrom: ["region-alpha"],
        label: "Alpha",
        sourceStart: 0,
        sourceEnd: 50,
        boundaryUncertainty: "boundary uncertain",
        evidenceRefs: [
          {
            snippet: "alpha scene",
            spanStart: 0,
            spanEnd: 10,
            contextLabel: "scene",
          },
        ],
      },
    ],
    descriptiveUnits: [
      {
        unitId: "unit-beta",
        derivedFrom: ["obs-beta"],
        localityId: "locality-beta",
        statement: "Beta happens.",
        evidenceRefs: [
          {
            snippet: "beta happens",
            spanStart: 62,
            spanEnd: 74,
            contextLabel: "quoted_support",
          },
        ],
        uncertainty: null,
        compositionStatus: "retained",
      },
      {
        unitId: "unit-alpha",
        derivedFrom: ["obs-alpha"],
        localityId: "locality-alpha",
        statement: "Alpha happens.",
        evidenceRefs: [
          {
            snippet: "alpha happens",
            spanStart: 2,
            spanEnd: 15,
            contextLabel: "quoted_support",
          },
        ],
        uncertainty: "maybe",
        compositionStatus: "retained",
      },
    ],
    transitionRecords: [
      {
        transitionId: "transition-1",
        derivedFrom: ["transition-src-1"],
        fromLocalityId: "locality-alpha",
        toLocalityId: "locality-beta",
        statement: "Then it shifts.",
        evidenceRefs: [
          {
            snippet: "then it shifts",
            spanStart: 50,
            spanEnd: 61,
            contextLabel: "transition",
          },
        ],
        uncertainty: null,
      },
    ],
    unresolvedAlternatives: [
      {
        alternativeId: "alternative-1",
        competingUnitIds: ["unit-alpha", "unit-beta"],
        reasonCode: "semantic_overlap_unresolved",
        evidenceRefs: [
          {
            snippet: "overlap",
            spanStart: 40,
            spanEnd: 45,
            contextLabel: "overlap",
          },
        ],
      },
    ],
    uncertaintyNotes: ["bundle uncertain"],
    provenance: {
      provenanceId: "composition-provenance-1",
      compositionKind: "memory_composition",
      baselineCandidateId: "baseline-1",
      supplementalPackageIds: ["supplemental-1"],
      policyVersion: "composition-v1",
      policyFingerprint: "composition-policy-fingerprint",
    },
    ...overrides,
  };
}

function buildRequest(
  overrides?: Partial<MemoryRealizationRequest>,
): MemoryRealizationRequest {
  const composedCandidate = overrides?.composedCandidate ?? buildComposedCandidate();

  return {
    requestId: "realization-request-1",
    sourceIdentity: composedCandidate.sourceIdentity,
    composedCandidateIdentity: {
      composedCandidateId: composedCandidate.candidateId,
      composedCandidateHash: "composed-hash-1",
    },
    composedCandidate,
    compositionResultRef: "composition-result-1",
    realizationPolicyVersion: "memory-realization-shadow-v1",
    realizationPolicyFingerprint: "memory-realization-policy-fingerprint",
    ...overrides,
  };
}

function buildLegacyBundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "object-1",
    userId: "user-1",
    source: "system_llm_extract",
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["legacy"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "en",
    },
    uncertaintyNotes: ["bundle uncertain"],
    runtimeVersion: "observation_v2_phase1",
    scenes: [
      {
        sceneId: "locality-alpha",
        position: 0,
        summary: "Alpha",
        boundaryReasoning: [],
        uncertaintyNotes: ["boundary uncertain"],
        evidenceContext: {
          snippet: "alpha scene",
          spanStart: 0,
          spanEnd: 10,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "unit-alpha",
            position: 0,
            text: "Alpha happens.",
            evidence: [
              {
                snippet: "alpha happens",
                spanStart: 2,
                spanEnd: 15,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: "maybe",
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
      {
        sceneId: "locality-beta",
        position: 1,
        summary: "Beta",
        boundaryReasoning: [],
        uncertaintyNotes: [],
        evidenceContext: {
          snippet: "beta scene",
          spanStart: 60,
          spanEnd: 70,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "unit-beta",
            position: 0,
            text: "Beta happens.",
            evidence: [
              {
                snippet: "beta happens",
                spanStart: 62,
                spanEnd: 74,
                contextLabel: "quoted_support",
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
  };
}

function normalizeCandidate(candidate: CanonicalMemoryCandidate | null) {
  return candidate ? JSON.parse(JSON.stringify(candidate)) : null;
}

describe("realizeCanonicalMemoryCandidate", () => {
  it("produces a deterministic canonical candidate with stable ids, ordering, and hash", () => {
    const request = buildRequest();

    const first = realizeCanonicalMemoryCandidate(request);
    const second = realizeCanonicalMemoryCandidate(request);

    expect(first.disposition).toBe("realized_with_observations");
    expect(first.validation.status).toBe("valid_with_observations");
    expect(first.canonicalCandidate?.localities.map((locality) => locality.label)).toEqual(["Alpha", "Beta"]);
    expect(first.canonicalCandidate?.descriptiveUnits.map((unit) => unit.statement)).toEqual([
      "Alpha happens.",
      "Beta happens.",
    ]);
    expect(first.canonicalCandidate?.canonicalCandidateId).toBe(second.canonicalCandidate?.canonicalCandidateId);
    expect(first.canonicalCandidate?.canonicalHash).toBe(second.canonicalCandidate?.canonicalHash);
    expect(normalizeCandidate(first.canonicalCandidate)).toEqual(normalizeCandidate(second.canonicalCandidate));
  });

  it("fails closed on malformed evidence spans", () => {
    const request = buildRequest({
      composedCandidate: buildComposedCandidate({
        descriptiveUnits: [
          {
            unitId: "unit-invalid",
            derivedFrom: ["obs-invalid"],
            localityId: "locality-alpha",
            statement: "Broken evidence.",
            evidenceRefs: [
              {
                snippet: "broken",
                spanStart: 15,
                spanEnd: 3,
                contextLabel: "quoted_support",
              },
            ],
            uncertainty: null,
            compositionStatus: "retained",
          },
        ],
      }),
    });

    const result = realizeCanonicalMemoryCandidate(request);

    expect(result.disposition).toBe("aborted_candidate_failure");
    expect(result.validation.status).toBe("invalid_candidate");
    expect(result.failures.map((failure) => failure.code)).toContain("evidence_invalid");
  });

  it("fails closed on missing composition provenance", () => {
    const request = buildRequest({
      composedCandidate: buildComposedCandidate({
        provenance: {
          provenanceId: "",
          compositionKind: "memory_composition",
          baselineCandidateId: "",
          supplementalPackageIds: [],
          policyVersion: "composition-v1",
          policyFingerprint: "",
        },
      }),
    });

    const result = realizeCanonicalMemoryCandidate(request);

    expect(result.disposition).toBe("aborted_governance_failure");
    expect(result.validation.status).toBe("invalid_governance");
  });

  it("preserves unresolved alternatives canonically and rejects invalid alternative references", () => {
    const valid = realizeCanonicalMemoryCandidate(buildRequest());
    expect(valid.canonicalCandidate?.unresolvedAlternatives).toHaveLength(1);

    const invalid = realizeCanonicalMemoryCandidate(buildRequest({
      composedCandidate: buildComposedCandidate({
        unresolvedAlternatives: [
          {
            alternativeId: "alternative-bad",
            competingUnitIds: ["unit-alpha", "missing-unit"],
            reasonCode: "semantic_overlap_unresolved",
            evidenceRefs: [],
          },
        ],
      }),
    }));

    expect(invalid.disposition).toBe("aborted_candidate_failure");
    expect(invalid.validation.status).toBe("invalid_candidate");
  });
});

describe("runShadowMemoryRealization", () => {
  it("emits native shadow artifacts and does not inflate uncertainty confidence", () => {
    const result = runShadowMemoryRealization({
      request: buildRequest(),
    });

    expect(result.result.disposition).toBe("realized_with_observations");
    expect(result.result.canonicalCandidate?.uncertaintyRecords.some((record) => record.note === "maybe")).toBe(true);
    expect(Object.keys(result.artifacts)).toEqual([
      "memory-realization-request",
      "canonical-memory-candidate",
      "canonical-identity-transition",
      "memory-realization-validation",
      "memory-realization-findings",
      "canonical-provenance",
      "canonical-identity-map",
      "memory-realization-diagnostics",
      "memory-realization-summary",
    ]);
  });
});

describe("compareNativeMemoryRealizationWithLegacyAdapter", () => {
  it("classifies governance-information gain when native realization preserves alternatives the legacy adapter cannot express", () => {
    const native = realizeCanonicalMemoryCandidate(buildRequest());

    const comparison = compareNativeMemoryRealizationWithLegacyAdapter({
      nativeResult: native,
      legacyCandidate: buildLegacyBundle(),
    });

    expect(comparison.classification).toBe("governance_information_gain");
  });
});
