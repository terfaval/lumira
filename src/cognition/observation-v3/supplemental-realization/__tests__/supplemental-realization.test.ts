import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { CompletenessReport, PhysicalGap } from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import {
  buildSupplementalRealizationArtifacts,
  buildSupplementalRealizationPackage,
  compareSupplementalRealizationOutputs,
  fingerprintSupplementalRealization,
  planSupplementalRealization,
  runShadowSupplementalRealization,
} from "@/src/cognition/observation-v3/supplemental-realization";

function makeRegion(input: Partial<ExperimentalRegion> & Pick<ExperimentalRegion, "regionId" | "order">): ExperimentalRegion {
  return {
    heading: null,
    spanStart: null,
    spanEnd: null,
    evidence: [],
    boundaryConfidence: "medium",
    uncertainty: null,
    transitionCues: [],
    ...input,
  };
}

function makeUnit(input: Partial<ExperimentalObservationUnit> & Pick<ExperimentalObservationUnit, "observationId" | "regionId" | "order" | "statement">): ExperimentalObservationUnit {
  return {
    evidence: [],
    uncertainty: null,
    source: "baseline",
    recoveryProvenance: null,
    ...input,
  };
}

function makeGap(input: Partial<PhysicalGap> & Pick<PhysicalGap, "id" | "sourceStart" | "sourceEnd" | "kind" | "reasons" | "confidence">): PhysicalGap {
  return {
    neighboringEvidence: {
      precedingObservationId: null,
      followingObservationId: null,
    },
    ...input,
  };
}

function makeCompletenessReport(gaps: PhysicalGap[]): CompletenessReport {
  return {
    schemaVersion: "1",
    analyzerVersion: "1",
    sourceIdentity: {
      sourceHash: "source-hash",
      sourceLength: 4614,
    },
    candidateIdentity: {
      candidateHash: "candidate-hash",
      candidateKind: "primary_extraction",
    },
    status: "available",
    adequacy: "inadequate_recoverable",
    coverage: {
      largestCoveredSpanEnd: 1225,
      coverageRatio: 0.26,
      uncoveredPrefix: null,
      uncoveredTail: {
        start: 1225,
        end: 4614,
      },
      internalUncoveredRegions: [],
      measurementAvailability: "full",
    },
    gaps: {
      gaps,
      canonicalGapCount: gaps.length,
    },
    lateRetention: {
      lateSectionStart: 3450,
      lateSectionSentenceUnits: 12,
      lateSectionObservationCount: 0,
      status: "missing",
    },
    endingRetention: {
      endingStart: 4364,
      retained: false,
      status: "not_retained",
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
      disposition: "required_before_admission",
      targetedPhysicalGapIds: gaps.map((gap) => gap.id),
      eligibility: "eligible",
      advisoryClass: "admission_relevant",
      reasons: ["physical_gap_detected", "late_section_missing"],
    },
    metricDiscrepancies: [],
    diagnosticReasons: ["coverage_tail_loss_detected", "late_section_missing"],
  };
}

function makeCompletenessReportWithOverrides(
  gaps: PhysicalGap[],
  overrides: Partial<CompletenessReport>,
): CompletenessReport {
  return {
    ...makeCompletenessReport(gaps),
    ...overrides,
  };
}

describe("supplemental realization", () => {
  it("does not plan supplemental work when recovery is not required", () => {
    const completeness = {
      ...makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected", "late_section_missing"],
          confidence: "high",
        }),
      ]),
      adequacy: "adequate_with_observations" as const,
      recoveryRecommendation: {
        disposition: "not_required" as const,
        targetedPhysicalGapIds: [],
        eligibility: "eligible" as const,
        advisoryClass: "advisory" as const,
        reasons: [],
      },
    };

    const plan = planSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness,
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    expect(plan.selectedGaps).toEqual([]);
    expect(plan.realizationContext).toEqual([]);
  });

  it("builds an ending-biased bounded window for large terminal tail gaps", () => {
    const completeness = makeCompletenessReport([
      makeGap({
        id: "physical-gap-1",
        sourceStart: 2375,
        sourceEnd: 4614,
        kind: "tail",
        reasons: ["coverage_tail_loss_detected", "late_section_missing", "ending_not_retained"],
        confidence: "high",
      }),
    ]);

    const plan = planSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness,
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    expect(plan.selectedGaps).toHaveLength(1);
    expect(plan.selectedGaps[0]?.physicalGapId).toBe("physical-gap-1");
    expect(plan.selectedGaps[0]?.sourceStart).toBe(2375);
    expect(plan.realizationContext[0]?.contextEnd).toBe(4614);
    expect(plan.realizationContext[0]?.contextStart).toBe(3190);
    expect(plan.realizationContext[0]?.contextEnd - plan.realizationContext[0]!.contextStart).toBeLessThan(3200);
    expect(plan.realizationContext[0]?.wholeSourceForbidden).toBe(true);
  });

  it("does not apply ending-biased targeting to non-terminal recovery gaps", () => {
    const sourceText = "x".repeat(2400);
    const completeness = makeCompletenessReportWithOverrides([
      makeGap({
        id: "physical-gap-1",
        sourceStart: 600,
        sourceEnd: 1000,
        kind: "internal",
        reasons: ["coverage_internal_gap_detected"],
        confidence: "medium",
      }),
    ], {
      coverage: {
        largestCoveredSpanEnd: 2200,
        coverageRatio: 0.75,
        uncoveredPrefix: null,
        uncoveredTail: null,
        internalUncoveredRegions: [{ start: 600, end: 1000 }],
        measurementAvailability: "full",
      },
      lateRetention: {
        lateSectionStart: 1800,
        lateSectionSentenceUnits: 3,
        lateSectionObservationCount: 2,
        status: "retained",
      },
      endingRetention: {
        endingStart: 2250,
        retained: true,
        status: "retained",
      },
      recoveryRecommendation: {
        disposition: "required_before_admission",
        targetedPhysicalGapIds: ["physical-gap-1"],
        eligibility: "eligible",
        advisoryClass: "admission_relevant",
        reasons: ["physical_gap_detected"],
      },
      diagnosticReasons: ["coverage_internal_gap_detected", "recovery_required_for_admission"],
    });

    const plan = planSupplementalRealization({
      sourceText,
      completeness,
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    expect(plan.selectedGaps).toHaveLength(1);
    expect(plan.realizationContext[0]?.contextStart).toBe(340);
    expect(plan.realizationContext[0]?.contextEnd).toBe(1260);
  });

  it("builds a provenance-tagged supplemental package from structured bounded output", () => {
    const plan = planSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness: makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    const pkg = buildSupplementalRealizationPackage({
      sourceText: "x".repeat(4614),
      plan,
      target: plan.realizationContext[0]!,
      structured: {
        regions: [{
          regionId: "region-1",
          heading: "City",
          spanStart: 800,
          spanEnd: 1200,
          boundaryUncertainty: null,
          transitionCues: ["dream_awareness_change"],
          observations: [{
            observationId: "obs-1",
            statement: "The person becomes lucid in a polluted city.",
            uncertainty: null,
            evidence: [{
              snippet: "ez csak egy alom",
              spanStart: 704,
              spanEnd: 760,
              contextLabel: "late",
            }],
          }],
        }],
      },
      packageIndex: 0,
    });

    expect(pkg.regions).toHaveLength(1);
    expect(pkg.observations).toHaveLength(1);
    expect(pkg.provenance.requestId).toBe(plan.request.requestId);
    expect(pkg.observations[0]?.recoveryProvenance?.physicalGapId).toBe("physical-gap-1");
  });

  it("clamps recovery-region evidence spans to the source boundary", () => {
    const sourceText = "x".repeat(364);
    const plan = planSupplementalRealization({
      sourceText,
      completeness: makeCompletenessReport([
        makeGap({
          id: "gap-001",
          sourceStart: 298,
          sourceEnd: 364,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    const pkg = buildSupplementalRealizationPackage({
      sourceText,
      plan,
      target: plan.realizationContext[0]!,
      structured: {
        regions: [{
          regionId: "r1",
          heading: null,
          spanStart: 31,
          spanEnd: 380,
          boundaryUncertainty: null,
          transitionCues: ["végül"],
          observations: [{
            observationId: "o1",
            statement: "Recovered ending.",
            uncertainty: null,
            evidence: [{
              snippet: "Recovered ending.",
              spanStart: 62,
              spanEnd: 81,
              contextLabel: null,
            }],
          }],
        }],
      },
      packageIndex: 0,
    });

    expect(pkg.regions[0]?.spanEnd).toBe(364);
    expect(pkg.regions[0]?.evidence[0]?.spanEnd).toBe(364);
  });

  it("preserves absolute supplemental evidence spans without shifting them twice", () => {
    const sourceText = "x".repeat(1651);
    const plan = planSupplementalRealization({
      sourceText,
      completeness: makeCompletenessReport([
        makeGap({
          id: "gap-001",
          sourceStart: 828,
          sourceEnd: 1651,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
    });

    const pkg = buildSupplementalRealizationPackage({
      sourceText,
      plan,
      target: plan.realizationContext[0]!,
      structured: {
        regions: [{
          regionId: "r1",
          heading: null,
          spanStart: 828,
          spanEnd: 1651,
          boundaryUncertainty: null,
          transitionCues: ["afterwards"],
          observations: [{
            observationId: "o5",
            statement: "Recovered absolute span.",
            uncertainty: null,
            evidence: [{
              snippet: "Recovered absolute span.",
              spanStart: 1109,
              spanEnd: 1165,
              contextLabel: "dream content",
            }],
          }],
        }],
      },
      packageIndex: 0,
    });

    expect(pkg.regions[0]?.spanStart).toBe(828);
    expect(pkg.regions[0]?.spanEnd).toBe(1651);
    expect(pkg.observations[0]?.evidence[0]?.spanStart).toBe(1109);
    expect(pkg.observations[0]?.evidence[0]?.spanEnd).toBe(1165);
  });

  it("runs deterministically for planning and diagnostics with an injected executor", async () => {
    const input = {
      sourceText: "x".repeat(4614),
      completeness: makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [makeRegion({ regionId: "scene-1", order: 0, spanStart: 0, spanEnd: 1225 })],
        units: [makeUnit({ observationId: "obs-1", regionId: "scene-1", order: 0, statement: "Baseline." })],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
      executeStructuredRealization: async () => ({
        outputText: JSON.stringify({
          regions: [{
            regionId: "region-1",
            heading: "City",
            spanStart: 800,
            spanEnd: 1200,
            boundaryUncertainty: null,
            transitionCues: [],
            observations: [{
              observationId: "obs-1",
              statement: "Supplemental statement.",
              uncertainty: null,
              evidence: [{
                snippet: "supplemental",
                spanStart: 810,
                spanEnd: 860,
                contextLabel: "late",
              }],
            }],
          }],
        }),
        providerStatus: "completed",
        providerIncompleteReason: null,
        tokenUsage: {
          input: 10,
          output: 20,
          total: 30,
        },
      }),
    };

    const first = await runShadowSupplementalRealization(input);
    const second = await runShadowSupplementalRealization(input);

    expect(second.plan).toEqual(first.plan);
    expect(second.result).toEqual(first.result);
    expect(fingerprintSupplementalRealization(first.result)).toBe(fingerprintSupplementalRealization(second.result));
  });

  it("builds the required deterministic supplemental artifacts", async () => {
    const run = await runShadowSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness: makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
      executeStructuredRealization: async () => ({
        outputText: JSON.stringify({ regions: [] }),
        providerStatus: "completed",
        providerIncompleteReason: null,
        tokenUsage: {
          input: 1,
          output: 1,
          total: 2,
        },
      }),
    });

    const artifacts = buildSupplementalRealizationArtifacts(run);

    expect(Object.keys(artifacts).sort()).toEqual([
      "realization-context",
      "realization-diagnostics",
      "realization-plan",
      "realization-summary",
      "selected-gaps",
      "supplemental-package",
      "supplemental-provenance",
    ]);
  });

  it("emits one canonical provider evidence object per bounded supplemental execution", async () => {
    const evidenceEvents: unknown[] = [];

    const run = await runShadowSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness: makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
      sourceIdentity: "OBS-C-002",
      onProviderEvidence: async (evidence) => {
        evidenceEvents.push(evidence);
      },
      executeStructuredRealization: async () => ({
        outputText: JSON.stringify({ regions: [] }),
        providerStatus: "completed",
        providerIncompleteReason: null,
        tokenUsage: {
          input: 1,
          output: 1,
          total: 2,
        },
      }),
    });

    expect(run.result.execution).toHaveLength(1);
    expect(evidenceEvents).toEqual([
      expect.objectContaining({
        subsystem: "supplemental_realization",
        sourceIdentity: "OBS-C-002",
        evidenceLifecycle: "complete",
        providerBoundary: expect.objectContaining({
          status: "completed",
          payloadHash: expect.any(String),
        }),
        parsing: expect.objectContaining({
          status: "parsed",
          structuredOutputHash: expect.any(String),
        }),
      }),
    ]);
  });

  it("captures supplemental provider latency in evidence when available", async () => {
    const evidenceEvents: unknown[] = [];

    await runShadowSupplementalRealization({
      sourceText: "x".repeat(4614),
      completeness: makeCompletenessReport([
        makeGap({
          id: "physical-gap-1",
          sourceStart: 2375,
          sourceEnd: 4614,
          kind: "tail",
          reasons: ["coverage_tail_loss_detected", "late_section_missing", "ending_not_retained"],
          confidence: "high",
        }),
      ]),
      baseline: {
        candidateId: "candidate-1",
        candidateHash: "candidate-hash",
        regions: [],
        units: [],
      },
      contextPadding: 260,
      maximumWindowLength: 3200,
      onProviderEvidence: async (evidence) => {
        evidenceEvents.push(evidence);
      },
      executeStructuredRealization: async () => ({
        outputText: JSON.stringify({ regions: [] }),
        providerStatus: "completed",
        providerIncompleteReason: null,
        tokenUsage: {
          input: 1,
          output: 1,
          total: 2,
        },
        latencyMs: 42,
      } as never),
    });

    expect(evidenceEvents).toEqual([
      expect.objectContaining({
        providerBoundary: expect.objectContaining({
          latencyMs: 42,
        }),
      }),
    ]);
  });

  it("classifies preserved targeted-recovery packages as equivalent on identical shaped input", () => {
    const comparison = compareSupplementalRealizationOutputs({
      plannedTargets: [{
        physicalGapId: "physical-gap-1",
        contextStart: 100,
        contextEnd: 500,
      }],
      experimental: {
        regions: [makeRegion({ regionId: "recovery-1", order: 0 })],
        observations: [makeUnit({ observationId: "obs-1", regionId: "recovery-1", order: 0, statement: "A" })],
      },
      supplemental: {
        regions: [makeRegion({ regionId: "recovery-1", order: 0 })],
        observations: [makeUnit({ observationId: "obs-1", regionId: "recovery-1", order: 0, statement: "A" })],
      },
    });

    expect(comparison.classification).toBe("equivalent");
  });

  it("does not leave prompt/schema/provider generation inside targeted-recovery orchestration", async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), "src/cognition/observation/experiment/configurations/targeted-recovery.ts"),
      "utf8",
    );

    expect(source).not.toContain("runStructuredObservationExperiment");
    expect(source).not.toContain("TARGETED_RECOVERY_REGION_SCHEMA");
    expect(source).not.toContain("buildTargetedRecoveryPrompt");
  });
});
