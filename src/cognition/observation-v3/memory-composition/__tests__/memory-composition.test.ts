import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { reconcileTargetedRecoveryCandidate } from "@/src/cognition/observation/experiment/targeted-recovery-refinement";
import {
  buildMemoryCompositionArtifacts,
  classifyCompositionOverlaps,
  composeMemoryLocalities,
  compareMemoryCompositionOutputs,
  composeMemoryPackages,
  normalizeCompositionRequest,
  orderComposedRegions,
  fingerprintMemoryComposition,
} from "@/src/cognition/observation-v3/memory-composition";

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

describe("composeMemoryPackages", () => {
  it("produces a native provisional candidate with deterministic identity and lineage", () => {
    const request = {
      dreamTextLength: 96,
      baseline: {
        regions: [makeRegion({ regionId: "scene-1", order: 0, spanStart: 0, spanEnd: 20 })],
        units: [makeUnit({
          observationId: "obs-1",
          regionId: "scene-1",
          order: 0,
          statement: "Kozmo meghal.",
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        })],
      },
      supplemental: {
        regions: [makeRegion({ regionId: "recovery-1", order: 0, spanStart: 40, spanEnd: 80 })],
        units: [makeUnit({
          observationId: "obs-2",
          regionId: "recovery-1",
          order: 0,
          statement: "Kozmo uj eletre kel.",
          source: "recovery",
          evidence: [{ snippet: "uj eletre kel", spanStart: 45, spanEnd: 58, contextLabel: "late" }],
        })],
      },
    };

    const first = composeMemoryPackages(request);
    const second = composeMemoryPackages(request);

    expect(first.composedCandidate).toEqual(second.composedCandidate);
    expect(first.composedCandidateIdentity).toEqual(second.composedCandidateIdentity);
    expect(first.composedCandidate?.sourceIdentity.sourceHash).toBeDefined();
    expect(first.composedCandidate?.provenance.baselineCandidateId).toBeDefined();
  });

  it("preserves chronology across baseline and supplemental packages", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 4614,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-1",
            order: 0,
            heading: "Workplace",
            spanStart: 0,
            spanEnd: 1225,
            evidence: [{ snippet: "munkahely", spanStart: 0, spanEnd: 26, contextLabel: "early" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "baseline-early",
              regionId: "scene-1",
              order: 0,
              statement: "A huge workplace is described.",
              evidence: [{ snippet: "egy hatalmas munkahelyen vagyok", spanStart: 0, spanEnd: 26, contextLabel: "early" }],
            }),
            admissionStatus: "rejected_parseable" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-city",
            order: 0,
            heading: "City and exploration",
            spanStart: 2181,
            spanEnd: 3391,
            evidence: [{ snippet: "hirtelen ... felebredek", spanStart: 2181, spanEnd: 3391, contextLabel: "late" }],
            transitionCues: ["dream_awareness_change"],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-late",
              regionId: "recovery-city",
              order: 0,
              statement: "The person becomes lucid in a polluted city and later wakes up.",
              evidence: [
                { snippet: "ez csak egy alom", spanStart: 2118, spanEnd: 2180, contextLabel: "late" },
                { snippet: "de akkor felebredek", spanStart: 3380, spanEnd: 3391, contextLabel: "late" },
              ],
              source: "recovery",
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-1",
                physicalGapId: "physical-gap-tail-1",
                extractionLocalRegionId: "recovery-city",
                semanticSignature: "the person becomes lucid in a polluted city and later wakes up",
                entitySignature: ["person", "city"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    });

    expect(result.composedUnits.map((unit) => unit.observationId)).toEqual(["baseline-early", "recovery-late"]);
    expect(result.composedRegions.map((region) => region.regionId)).toEqual(["scene-1", "recovery-city"]);
    expect(result.chronology.finalLocalityOrderValid).toBe(true);
    expect(result.coverage.earliestRepresentedPosition).toBe(0);
    expect(result.coverage.latestRepresentedPosition).toBe(3391);
  });

  it("collapses duplicates deterministically", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 96,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-1",
            order: 0,
            heading: "Kozmo",
            spanStart: 0,
            spanEnd: 71,
            evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-1",
              regionId: "scene-1",
              order: 0,
              statement: "Kozmo meghal.",
              evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-1",
            order: 0,
            heading: "Duplicate tail",
            spanStart: 0,
            spanEnd: 95,
            evidence: [{ snippet: "kozmo meghal ... uj eletre kel", spanStart: 0, spanEnd: 95, contextLabel: "window" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-1",
              regionId: "recovery-1",
              order: 0,
              statement: "kozmo meghal",
              evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 10, contextLabel: null }],
              source: "recovery",
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-1",
                physicalGapId: "physical-gap-1",
                extractionLocalRegionId: "recovery-1",
                semanticSignature: "kozmo meghal",
                entitySignature: ["kozmo"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    });

    expect(result.composedUnits).toHaveLength(1);
    expect(result.duplicateAnalysis.duplicateResolution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          retainedObservationId: "obs-1",
          discardedObservationId: "recovery-1",
        }),
      ]),
    );
  });

  it("abstains from redundant supplemental overlap that only restates clustered baseline material", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 720,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-1",
            order: 0,
            heading: "Money exchange",
            spanStart: 219,
            spanEnd: 399,
            evidence: [{ snippet: "money exchange", spanStart: 219, spanEnd: 399, contextLabel: "window" }],
          }),
          makeRegion({
            regionId: "scene-2",
            order: 1,
            heading: "Food complaint",
            spanStart: 400,
            spanEnd: 472,
            evidence: [{ snippet: "gomboc", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-money-1",
              regionId: "scene-1",
              order: 0,
              statement: "Jozsi took Milan shopping but gave him 5000 less, which upset him.",
              evidence: [{ snippet: "shopping 5000 less", spanStart: 219, spanEnd: 295, contextLabel: "window" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-money-2",
              regionId: "scene-1",
              order: 1,
              statement: "The dreamer gave Milan the missing money, though would not have done so while awake.",
              evidence: [{ snippet: "gave him the money", spanStart: 296, spanEnd: 370, contextLabel: "window" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-money-3",
              regionId: "scene-1",
              order: 2,
              statement: "The dreamer told Milan to keep asking for the missing amount.",
              evidence: [{ snippet: "keep asking", spanStart: 371, spanEnd: 399, contextLabel: "window" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-food-1",
              regionId: "scene-2",
              order: 0,
              statement: "Mama cooked, but the dreamer could only eat dumplings.",
              evidence: [{ snippet: "could only eat dumplings", spanStart: 400, spanEnd: 436, contextLabel: "window" }],
              uncertainty: "The exact food detail is somewhat uncertain.",
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-food-2",
              regionId: "scene-2",
              order: 1,
              statement: "The dreamer complained that Mama always cooks in a way they cannot eat.",
              evidence: [{ snippet: "always cooks in a way", spanStart: 437, spanEnd: 472, contextLabel: "window" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-1",
            order: 0,
            heading: "Money restatement",
            spanStart: 219,
            spanEnd: 399,
            evidence: [{ snippet: "money exchange", spanStart: 219, spanEnd: 399, contextLabel: "window" }],
          }),
          makeRegion({
            regionId: "recovery-2",
            order: 1,
            heading: "Food restatement",
            spanStart: 400,
            spanEnd: 472,
            evidence: [{ snippet: "gomboc", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-money",
              regionId: "recovery-1",
              order: 0,
              statement: "Jozsi took Milan shopping, gave him 5000 less, and the dreamer ended up giving Milan the missing money even though they would not have done so while awake.",
              source: "recovery",
              evidence: [{ snippet: "shopping and gave money", spanStart: 296, spanEnd: 370, contextLabel: "window" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-money-1",
                physicalGapId: "gap-money-1",
                extractionLocalRegionId: "recovery-1",
                semanticSignature: "jozsi took milan shopping gave him 5000 less and the dreamer gave the missing money",
                entitySignature: ["dreamer", "jozsi", "milan", "money"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-food",
              regionId: "recovery-2",
              order: 0,
              statement: "Mama cooked, but the dreamer could only eat dumplings and complained that Mama always cooks in a way they cannot eat.",
              source: "recovery",
              evidence: [{ snippet: "dumplings and complaint", spanStart: 400, spanEnd: 472, contextLabel: "window" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-food-1",
                physicalGapId: "gap-food-1",
                extractionLocalRegionId: "recovery-2",
                semanticSignature: "mama cooked but the dreamer could only eat dumplings and complained",
                entitySignature: ["complained", "dreamer", "dumplings", "mama"],
                eventStateType: "state",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    });

    expect(result.composedUnits.map((unit) => unit.observationId)).not.toContain("recovery-money");
    expect(result.composedUnits.map((unit) => unit.observationId)).not.toContain("recovery-food");
    expect(result.composedUnits.map((unit) => unit.observationId)).toEqual([
      "obs-money-1",
      "obs-money-2",
      "obs-money-3",
      "obs-food-1",
      "obs-food-2",
    ]);
    expect(result.duplicateAnalysis.unresolvedOverlaps).toEqual([]);
    expect(result.duplicateAnalysis.overlapGovernance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplementalObservationId: "recovery-money",
          decision: "abstain_redundant_supplemental",
          independentlySurvives: false,
        }),
      ]),
    );
    expect(result.composedUnits.find((unit) => unit.observationId === "obs-food-1")?.uncertainty).toBe(
      "The exact food detail is somewhat uncertain.",
    );
  });

  it("preserves unresolved coexistence when supplemental overlap adds materially distinct detail", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 1800,
      baseline: {
        regions: [
          makeRegion({
            regionId: "room",
            order: 0,
            heading: "Upper room",
            spanStart: 600,
            spanEnd: 980,
            evidence: [{ snippet: "upper room", spanStart: 600, spanEnd: 980, contextLabel: "room" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-bed",
              regionId: "room",
              order: 0,
              statement: "There was a bizarre bed high on the wall.",
              evidence: [{ snippet: "bizarre bed", spanStart: 730, spanEnd: 780, contextLabel: "room" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-ladder",
              regionId: "room",
              order: 1,
              statement: "A slanted ladder could be used like stairs to reach it.",
              evidence: [{ snippet: "slanted ladder", spanStart: 781, spanEnd: 840, contextLabel: "room" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-room",
            order: 0,
            heading: "Recovered room detail",
            spanStart: 730,
            spanEnd: 1120,
            evidence: [{ snippet: "room detail", spanStart: 730, spanEnd: 1120, contextLabel: "room" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-room-1",
              regionId: "recovery-room",
              order: 0,
              statement: "The high wall bed used an unusual slanted ladder that had to be made rigid and hooked into place as shown on the first night.",
              source: "recovery",
              evidence: [{ snippet: "rigid and hooked into place", spanStart: 760, spanEnd: 910, contextLabel: "room" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-room-1",
                physicalGapId: "gap-room-1",
                extractionLocalRegionId: "recovery-room",
                semanticSignature: "high wall bed slanted ladder made rigid and hooked into place on the first night",
                entitySignature: ["first", "hooked", "ladder", "night", "place", "rigid"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    });

    expect(result.composedUnits.map((unit) => unit.observationId)).toContain("recovery-room-1");
    expect(result.duplicateAnalysis.unresolvedOverlaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rightObservationId: "recovery-room-1",
          classification: "partial_overlap",
        }),
      ]),
    );
    expect(result.duplicateAnalysis.overlapGovernance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          supplementalObservationId: "recovery-room-1",
          decision: "retain_as_unresolved_alternative",
          independentlySurvives: true,
        }),
      ]),
    );
  });

  it("replays deterministically and preserves stable reason ordering", () => {
    const request = {
      dreamTextLength: 1651,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-ballagas",
            order: 5,
            heading: "Ballagas",
            spanStart: 62,
            spanEnd: 238,
            evidence: [{ snippet: "ballagas", spanStart: 62, spanEnd: 238, contextLabel: "early" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "baseline-ballagas",
              regionId: "scene-ballagas",
              order: 0,
              statement: "Ballagasi konfliktus tortenik.",
              evidence: [{ snippet: "ballagas", spanStart: 62, spanEnd: 238, contextLabel: "early" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-tail-a",
            order: 0,
            heading: "Region 1",
            spanStart: 1250,
            spanEnd: 1651,
            evidence: [{ snippet: "late a", spanStart: 1250, spanEnd: 1651, contextLabel: "late" }],
          }),
          makeRegion({
            regionId: "recovery-tail-b",
            order: 1,
            heading: "Region 2",
            spanStart: 1250,
            spanEnd: 1651,
            evidence: [{ snippet: "late b", spanStart: 1250, spanEnd: 1651, contextLabel: "late" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-a-1",
              regionId: "recovery-tail-a",
              order: 0,
              statement: "Vegul Ugandaba nem mentunk, mert a repuloteren felebredtem.",
              evidence: [{ snippet: "repuloteren felebredtem", spanStart: 1499, spanEnd: 1541, contextLabel: "late" }],
              source: "recovery",
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-tail-1",
                physicalGapId: "physical-gap-tail-1",
                extractionLocalRegionId: "region-a",
                semanticSignature: "vegul ugandaba nem mentunk mert a repuloteren felebredtem",
                entitySignature: ["uganda"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-b-1",
              regionId: "recovery-tail-b",
              order: 0,
              statement: "Vegul nem mentunk el Ugandaba, mert a repuloteren felebredtem.",
              evidence: [{ snippet: "repuloteren felebredtem", spanStart: 1499, spanEnd: 1541, contextLabel: "late" }],
              source: "recovery",
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-tail-1",
                physicalGapId: "physical-gap-tail-1",
                extractionLocalRegionId: "region-b",
                semanticSignature: "vegul nem mentunk el ugandaba mert a repuloteren felebredtem",
                entitySignature: ["uganda"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    };

    const first = composeMemoryPackages(request);
    const second = composeMemoryPackages(request);

    expect(second).toEqual(first);
    expect(fingerprintMemoryComposition(first)).toBe(fingerprintMemoryComposition(second));
  });

  it("matches the experimental reconciliation adapter output on identical input", () => {
    const input = {
      dreamTextLength: 96,
      baselineRegions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          heading: "Kozmo",
          spanStart: 0,
          spanEnd: 71,
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        }),
      ],
      baselineUnits: [
        {
          ...makeUnit({
            observationId: "obs-1",
            regionId: "scene-1",
            order: 0,
            statement: "Kozmo meghal.",
            evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
          }),
          admissionStatus: "accepted" as const,
        },
      ],
      recoveryRegions: [
        makeRegion({
          regionId: "recovery-1",
          order: 0,
          heading: "Duplicate tail",
          spanStart: 0,
          spanEnd: 95,
          evidence: [{ snippet: "kozmo meghal ... uj eletre kel", spanStart: 0, spanEnd: 95, contextLabel: "window" }],
        }),
      ],
      recoveryUnits: [
        {
          ...makeUnit({
            observationId: "recovery-1",
            regionId: "recovery-1",
            order: 0,
            statement: "kozmo meghal",
            evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 10, contextLabel: null }],
            source: "recovery",
            recoveryProvenance: {
              canonicalRecoveryWindowId: "window-1",
              physicalGapId: "physical-gap-1",
              extractionLocalRegionId: "recovery-1",
              semanticSignature: "kozmo meghal",
              entitySignature: ["kozmo"],
              eventStateType: "event",
            },
          }),
          admissionStatus: "accepted" as const,
        },
      ],
    };

    const experimental = reconcileTargetedRecoveryCandidate(input);
    const composition = composeMemoryPackages({
      dreamTextLength: input.dreamTextLength,
      baseline: {
        regions: input.baselineRegions,
        units: input.baselineUnits,
      },
      supplemental: {
        regions: input.recoveryRegions,
        units: input.recoveryUnits,
      },
    });

    const comparison = compareMemoryCompositionOutputs({
      experimental: {
        ...experimental,
        overlapGovernance: [],
      },
      composition,
    });

    expect(comparison.classification).toBe("equivalent");
  });

  it("builds the required composition artifacts without leaking source text", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 96,
      baseline: {
        regions: [makeRegion({ regionId: "scene-1", order: 0 })],
        units: [makeUnit({ observationId: "obs-1", regionId: "scene-1", order: 0, statement: "Kozmo meghal." })],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    const artifacts = buildMemoryCompositionArtifacts({
      result,
      baselinePackage: {
        regionCount: 1,
        unitCount: 1,
      },
      supplementalPackage: {
        regionCount: 0,
        unitCount: 0,
      },
    });

    expect(Object.keys(artifacts).sort()).toEqual([
      "chronology-composition",
      "coexistence-analysis",
      "composition-inputs",
      "composition-summary",
      "composition-trace",
      "duplicate-analysis",
      "duplicate-decisions",
      "locality-composition",
      "locality-decisions",
      "overlap-governance",
      "provenance-composition",
      "provenance-map",
      "provisional-identity-transition",
      "transition-composition",
      "transition-decisions",
    ]);
    expect(JSON.stringify(artifacts)).not.toContain("Kozmo meghal");
    expect(artifacts["provisional-identity-transition"]).toEqual(
      expect.objectContaining({
        classification: expect.any(String),
        nativeIdentity: expect.objectContaining({
          candidateId: expect.any(String),
          candidateHash: expect.any(String),
        }),
      }),
    );
  });

  it("normalizes baseline and supplemental inputs deterministically", () => {
    const normalized = normalizeCompositionRequest({
      dreamTextLength: 96,
      baseline: {
        regions: [makeRegion({ regionId: "scene-1", order: 0 })],
        units: [makeUnit({ observationId: "obs-1", regionId: "scene-1", order: 0, statement: "Kozmo meghal." })],
      },
      supplemental: {
        regions: [makeRegion({ regionId: "recovery-1", order: 0 })],
        units: [makeUnit({ observationId: "obs-2", regionId: "recovery-1", order: 0, statement: "Kozmo uj eletre kel.", source: "recovery" })],
      },
    });

    expect(normalized.baselineUnits[0]?.origin).toBe("baseline");
    expect(normalized.supplementalUnits[0]?.origin).toBe("recovery");
    expect(normalized.allUnits.map((unit) => unit.observationId)).toEqual(["obs-1", "obs-2"]);
  });

  it("exposes duplicate and coexistence stages independently", () => {
    const normalized = normalizeCompositionRequest({
      dreamTextLength: 96,
      baseline: {
        regions: [makeRegion({ regionId: "scene-1", order: 0 })],
        units: [makeUnit({
          observationId: "obs-1",
          regionId: "scene-1",
          order: 0,
          statement: "Kozmo meghal.",
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        })],
      },
      supplemental: {
        regions: [makeRegion({ regionId: "recovery-1", order: 0 })],
        units: [makeUnit({
          observationId: "obs-2",
          regionId: "recovery-1",
          order: 0,
          statement: "Kozmo meghal.",
          source: "recovery",
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        })],
      },
    });

    const overlapStage = classifyCompositionOverlaps(normalized.allUnits);

    expect(overlapStage.duplicateAnalysis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leftObservationId: "obs-1",
          rightObservationId: "obs-2",
        }),
      ]),
    );
    expect(overlapStage.duplicateResolution).toHaveLength(1);
    expect(overlapStage.unresolvedOverlaps).toHaveLength(0);
  });

  it("orders localities deterministically after locality composition", () => {
    const normalized = normalizeCompositionRequest({
      dreamTextLength: 96,
      baseline: {
        regions: [
          makeRegion({ regionId: "late", order: 1, spanStart: 40, spanEnd: 80 }),
          makeRegion({ regionId: "early", order: 0, spanStart: 0, spanEnd: 20 }),
        ],
        units: [
          makeUnit({ observationId: "late-1", regionId: "late", order: 0, statement: "Later.", evidence: [{ snippet: "later", spanStart: 40, spanEnd: 50, contextLabel: "late" }] }),
          makeUnit({ observationId: "early-1", regionId: "early", order: 0, statement: "Earlier.", evidence: [{ snippet: "earlier", spanStart: 0, spanEnd: 10, contextLabel: "early" }] }),
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    const overlapStage = classifyCompositionOverlaps(normalized.allUnits);
    const localityStage = composeMemoryLocalities({
      baselineRegions: normalized.baselineRegions,
      supplementalRegions: normalized.supplementalRegions,
      retainedUnits: overlapStage.retainedUnits,
    });
    const chronology = orderComposedRegions(localityStage.regions, localityStage.units);

    expect(chronology.regions.map((region) => region.regionId)).toEqual(["early", "late"]);
    expect(chronology.assembly.finalLocalityOrderValid).toBe(true);
  });

  it("does not import prohibited runtime dependencies", async () => {
    const files = [
      "src/cognition/observation-v3/memory-composition/memory-composition-contract.ts",
      "src/cognition/observation-v3/memory-composition/composition-diagnostics.ts",
      "src/cognition/observation-v3/memory-composition/composition-fingerprint.ts",
      "src/cognition/observation-v3/memory-composition/memory-composition.ts",
      "src/cognition/observation-v3/memory-composition/shadow-memory-composition.ts",
    ];

    for (const file of files) {
      const source = await fs.readFile(path.resolve(process.cwd(), file), "utf8");
      expect(source).not.toContain("openai");
      expect(source).not.toContain("descriptive-extraction");
      expect(source).not.toContain("supplemental-realization");
      expect(source).not.toContain("authority-admission");
      expect(source).not.toContain("createObservationV2WriteStore");
      expect(source).not.toContain("generateGlossaryCandidatesForReflectiveObject");
      expect(source).not.toContain("legacy projection");
    }
  });

  it("does not delegate to targeted-recovery legacy reconciliation", async () => {
    const source = await fs.readFile(
      path.resolve(process.cwd(), "src/cognition/observation-v3/memory-composition/memory-composition.ts"),
      "utf8",
    );

    expect(source).not.toContain("reconcileTargetedRecoveryCandidate");
    expect(source).not.toContain("targeted-recovery-refinement");
  });
});
