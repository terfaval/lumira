import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { analyzeComposedCandidateCompleteness } from "@/src/cognition/observation-v3/completeness-analysis";
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

function makeSourceText(length: number): string {
  return "x".repeat(length);
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

  it("preserves a retained locality end when grounded region evidence extends beyond the last retained unit", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 300,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-tail",
            order: 0,
            heading: "Broader grounded locality",
            spanStart: 100,
            spanEnd: 220,
            evidence: [{ snippet: "broader locality", spanStart: 100, spanEnd: 220, contextLabel: "scene" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-tail-1",
              regionId: "scene-tail",
              order: 0,
              statement: "First retained unit.",
              evidence: [{ snippet: "first", spanStart: 100, spanEnd: 140, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-tail-2",
              regionId: "scene-tail",
              order: 1,
              statement: "Last retained unit.",
              evidence: [{ snippet: "last", spanStart: 150, spanEnd: 180, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    expect(result.composedRegions).toEqual([
      expect.objectContaining({
        regionId: "scene-tail",
        spanStart: 100,
        spanEnd: 220,
      }),
    ]);
    expect(result.composedUnits.map((unit) => ({
      observationId: unit.observationId,
      spanStart: unit.evidence[0]?.spanStart,
      spanEnd: unit.evidence[0]?.spanEnd,
    }))).toEqual([
      { observationId: "obs-tail-1", spanStart: 100, spanEnd: 140 },
      { observationId: "obs-tail-2", spanStart: 150, spanEnd: 180 },
    ]);
  });

  it("preserves OBS-C-003-shaped ending retention through final completeness after composition", () => {
    const dreamText = makeSourceText(2188);
    const composition = composeMemoryPackages({
      dreamTextLength: dreamText.length,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene1",
            order: 0,
            heading: "Scene 1",
            spanStart: 35,
            spanEnd: 463,
            evidence: [{ snippet: "scene1", spanStart: 35, spanEnd: 463, contextLabel: "scene" }],
          }),
          makeRegion({
            regionId: "scene2",
            order: 1,
            heading: "Scene 2",
            spanStart: 531,
            spanEnd: 967,
            evidence: [{ snippet: "scene2", spanStart: 531, spanEnd: 967, contextLabel: "scene" }],
          }),
          makeRegion({
            regionId: "scene3",
            order: 2,
            heading: "Scene 3",
            spanStart: 1014,
            spanEnd: 1506,
            evidence: [{ snippet: "scene3", spanStart: 968, spanEnd: 1506, contextLabel: "scene" }],
          }),
          makeRegion({
            regionId: "scene4",
            order: 3,
            heading: "Scene 4",
            spanStart: 1515,
            spanEnd: 1984,
            evidence: [{ snippet: "scene4-full", spanStart: 1515, spanEnd: 1984, contextLabel: "scene" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs1",
              regionId: "scene1",
              order: 0,
              statement: "Scene 1.",
              evidence: [{ snippet: "scene1", spanStart: 35, spanEnd: 135, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs2",
              regionId: "scene2",
              order: 0,
              statement: "Scene 2.",
              evidence: [{ snippet: "scene2", spanStart: 843, spanEnd: 967, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs3",
              regionId: "scene3",
              order: 0,
              statement: "Scene 3.",
              evidence: [{ snippet: "scene3", spanStart: 1409, spanEnd: 1506, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs4_1",
              regionId: "scene4",
              order: 0,
              statement: "Late scene setup.",
              evidence: [{ snippet: "setup", spanStart: 1515, spanEnd: 1618, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs4_2",
              regionId: "scene4",
              order: 1,
              statement: "Fight starts.",
              evidence: [{ snippet: "fight", spanStart: 1619, spanEnd: 1691, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs4_3",
              regionId: "scene4",
              order: 2,
              statement: "Fight detail.",
              evidence: [{ snippet: "detail", spanStart: 1726, spanEnd: 1791, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    const report = analyzeComposedCandidateCompleteness({
      dreamText,
      composedCandidate: composition.composedCandidate,
      composedCandidateHash: composition.composedCandidateIdentity.composedCandidateHash,
      sourceIdentity: composition.composedCandidate.sourceIdentity,
    });

    expect(composition.composedRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          regionId: "scene4",
          spanStart: 1515,
          spanEnd: 1984,
        }),
      ]),
    );
    expect(report.endingRetention.status).toBe("retained");
    expect(report.adequacy).toBe("adequate_with_observations");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
  });

  it("leaves ordinary locality bounds unchanged when region extent already matches retained unit extent", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 240,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene-equal",
            order: 0,
            heading: "Equal bounds",
            spanStart: 40,
            spanEnd: 120,
            evidence: [{ snippet: "equal", spanStart: 40, spanEnd: 120, contextLabel: "scene" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-equal-1",
              regionId: "scene-equal",
              order: 0,
              statement: "Equal bounds unit 1.",
              evidence: [{ snippet: "part1", spanStart: 40, spanEnd: 80, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-equal-2",
              regionId: "scene-equal",
              order: 1,
              statement: "Equal bounds unit 2.",
              evidence: [{ snippet: "part2", spanStart: 80, spanEnd: 120, contextLabel: "scene" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    expect(result.composedRegions).toEqual([
      expect.objectContaining({
        regionId: "scene-equal",
        spanStart: 40,
        spanEnd: 120,
      }),
    ]);
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

  it("reconciles baseline and recovery refinements, preserves uncertainty, and folds redundant recovery localities", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 3435,
      baseline: {
        regions: [
          makeRegion({
            regionId: "scene1",
            order: 0,
            heading: "Emma flat arrival and collecting belongings",
            spanStart: 400,
            spanEnd: 1106,
            evidence: [{ snippet: "Emma flat arrival", spanStart: 400, spanEnd: 1106, contextLabel: "scene" }],
          }),
          makeRegion({
            regionId: "scene2",
            order: 1,
            heading: "Conflict, tools, and intimacy",
            spanStart: 1108,
            spanEnd: 2800,
            evidence: [{ snippet: "Conflict and intimacy", spanStart: 1108, spanEnd: 2800, contextLabel: "scene" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "obs-wake-baseline",
              regionId: "scene1",
              order: 0,
              statement: "When the narrator woke up, they started collecting their belongings.",
              evidence: [{ snippet: "when I woke up I started collecting my belongings", spanStart: 602, spanEnd: 655, contextLabel: "quoted_support" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-tension-baseline",
              regionId: "scene2",
              order: 1,
              statement: "After they understood neither of them meant the silence against the other, they quieted down, though the silence remained tense.",
              evidence: [{ snippet: "we quieted down but it was still a tense silence", spanStart: 1667, spanEnd: 1797, contextLabel: "quoted_support" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-tools-baseline",
              regionId: "scene2",
              order: 2,
              statement: "Emma showed her newly acquired machine tools for a craft-like activity, though the narrator could not identify them precisely.",
              evidence: [{ snippet: "she showed what machine tools she had acquired", spanStart: 1797, spanEnd: 2043, contextLabel: "quoted_support" }],
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "obs-kiss-baseline",
              regionId: "scene2",
              order: 3,
              statement: "Their tension disappeared as they gave themselves to each other, and the narrator carried Emma into the bedroom.",
              evidence: [{ snippet: "all tension disappeared and I carried her into the bedroom", spanStart: 2588, spanEnd: 2702, contextLabel: "quoted_support" }],
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
      supplemental: {
        regions: [
          makeRegion({
            regionId: "recovery-wake",
            order: 0,
            heading: "Wake and belongings",
            spanStart: 557,
            spanEnd: 819,
            evidence: [{ snippet: "wake and belongings", spanStart: 557, spanEnd: 819, contextLabel: "recovery_region" }],
          }),
          makeRegion({
            regionId: "recovery-conflict",
            order: 1,
            heading: "Conflict resolution and tools",
            spanStart: 1286,
            spanEnd: 1920,
            evidence: [{ snippet: "conflict and tools", spanStart: 1286, spanEnd: 1920, contextLabel: "recovery_region" }],
          }),
          makeRegion({
            regionId: "recovery-kiss",
            order: 2,
            heading: "Kiss",
            spanStart: 2291,
            spanEnd: 2614,
            evidence: [{ snippet: "kiss", spanStart: 2291, spanEnd: 2614, contextLabel: "recovery_region" }],
          }),
        ],
        units: [
          {
            ...makeUnit({
              observationId: "recovery-wake-1",
              regionId: "recovery-wake",
              order: 0,
              statement: "I woke up and started collecting my belongings.",
              source: "recovery",
              evidence: [{ snippet: "I woke up and started collecting my belongings", spanStart: 602, spanEnd: 654, contextLabel: "bounded gap text" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-wake-1",
                physicalGapId: "gap-wake-1",
                extractionLocalRegionId: "recovery-wake",
                semanticSignature: "i woke up and started collecting my belongings",
                entitySignature: ["belongings", "collecting", "woke"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-wake-2",
              regionId: "recovery-wake",
              order: 1,
              statement: "There were belongings in several rooms and I needed a sack because I could not carry everything by hand.",
              source: "recovery",
              evidence: [{ snippet: "several rooms and a sack", spanStart: 712, spanEnd: 817, contextLabel: "bounded gap text" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-wake-1",
                physicalGapId: "gap-wake-1",
                extractionLocalRegionId: "recovery-wake",
                semanticSignature: "there were belongings in several rooms and i needed a sack",
                entitySignature: ["belongings", "rooms", "sack"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-tension",
              regionId: "recovery-conflict",
              order: 0,
              statement: "Once they understood neither was at fault, they calmed down, though the silence stayed tense.",
              source: "recovery",
              evidence: [{ snippet: "they calmed down but the silence stayed tense", spanStart: 1667, spanEnd: 1795, contextLabel: "bounded gap text" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-conflict-1",
                physicalGapId: "gap-conflict-1",
                extractionLocalRegionId: "recovery-conflict",
                semanticSignature: "once they understood neither was at fault they calmed down though the silence stayed tense",
                entitySignature: ["calmed", "silence", "tense"],
                eventStateType: "state",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-tools",
              regionId: "recovery-conflict",
              order: 1,
              statement: "Emma showed the machine tools she had acquired, though their exact type was not fully determined.",
              source: "recovery",
              evidence: [{ snippet: "showed the machine tools she acquired", spanStart: 1797, spanEnd: 1920, contextLabel: "bounded gap text" }],
              uncertainty: "not fully determined",
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-conflict-1",
                physicalGapId: "gap-conflict-1",
                extractionLocalRegionId: "recovery-conflict",
                semanticSignature: "emma showed the machine tools she had acquired though their exact type was not fully determined",
                entitySignature: ["acquired", "emma", "machine", "tools"],
                eventStateType: "state",
              },
            }),
            admissionStatus: "accepted" as const,
          },
          {
            ...makeUnit({
              observationId: "recovery-kiss",
              regionId: "recovery-kiss",
              order: 0,
              statement: "Emma turned toward the narrator and they began kissing, and all tension disappeared.",
              source: "recovery",
              evidence: [{ snippet: "she turned toward me and we started kissing, all tension disappeared", spanStart: 2541, spanEnd: 2614, contextLabel: "bounded gap text" }],
              recoveryProvenance: {
                canonicalRecoveryWindowId: "window-kiss-1",
                physicalGapId: "gap-kiss-1",
                extractionLocalRegionId: "recovery-kiss",
                semanticSignature: "emma turned toward the narrator and they began kissing and all tension disappeared",
                entitySignature: ["disappeared", "emma", "kissing", "tension"],
                eventStateType: "event",
              },
            }),
            admissionStatus: "accepted" as const,
          },
        ],
      },
    });

    expect(result.composedUnits.map((unit) => unit.observationId)).toContain("obs-wake-baseline");
    expect(result.composedUnits.map((unit) => unit.observationId)).not.toContain("recovery-wake-1");
    expect(result.composedUnits.map((unit) => unit.observationId)).not.toContain("recovery-tension");
    expect(result.composedUnits.map((unit) => unit.observationId)).not.toContain("recovery-tools");
    expect(result.composedUnits.find((unit) => unit.observationId === "obs-tools-baseline")?.uncertainty).toBe("not fully determined");
    expect(result.composedUnits.find((unit) => unit.observationId === "obs-tools-baseline")?.supersedesObservationIds).toContain("recovery-tools");
    expect(result.composedUnits.find((unit) => unit.observationId === "obs-wake-baseline")?.supersedesObservationIds).toContain("recovery-wake-1");
    expect(result.composedUnits.find((unit) => unit.observationId === "obs-tension-baseline")?.supersedesObservationIds).toContain("recovery-tension");
    expect(result.composedRegions.map((region) => region.regionId)).toEqual(["scene1", "recovery-wake", "scene2", "recovery-kiss"]);
    expect(result.composedUnits.find((unit) => unit.observationId === "recovery-kiss")?.regionId).toBe("recovery-kiss");
    expect(result.duplicateAnalysis.unresolvedOverlaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leftObservationId: "obs-kiss-baseline",
          rightObservationId: "recovery-kiss",
        }),
      ]),
    );
  });

  it("detects possible duplicates before generic partial-overlap classification", () => {
    const overlap = classifyCompositionOverlaps([
      {
        ...makeUnit({
          observationId: "baseline-1",
          regionId: "scene-1",
          order: 0,
          statement: "The narrator woke up and started collecting belongings.",
          evidence: [{ snippet: "woke and started collecting", spanStart: 602, spanEnd: 655, contextLabel: "quoted_support" }],
        }),
        admissionStatus: "accepted" as const,
        origin: "baseline" as const,
        reconciliationStatus: "retained" as const,
      },
      {
        ...makeUnit({
          observationId: "recovery-1",
          regionId: "recovery-1",
          order: 0,
          statement: "The narrator woke up and started collecting belongings from several rooms.",
          source: "recovery",
          evidence: [{ snippet: "collecting belongings from several rooms", spanStart: 640, spanEnd: 712, contextLabel: "quoted_support" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-1",
            physicalGapId: "gap-1",
            extractionLocalRegionId: "recovery-1",
            semanticSignature: "the narrator woke up and started collecting belongings from several rooms",
            entitySignature: ["belongings", "collecting", "rooms", "woke"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "recovery" as const,
        reconciliationStatus: "retained" as const,
      },
    ]);

    expect(overlap.duplicateAnalysis).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classification: "possible_duplicate",
        }),
      ]),
    );
  });

  it("collapses differently worded same-evidence duplicates instead of retaining them in parallel", () => {
    const overlap = classifyCompositionOverlaps([
      {
        ...makeUnit({
          observationId: "baseline-emma",
          regionId: "scene-emma",
          order: 0,
          statement: "Emma got angry when she came home and found me in the apartment.",
          evidence: [{ snippet: "she came home and was shocked that I was there", spanStart: 1180, spanEnd: 1295, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-emma-1",
            physicalGapId: "gap-emma-1",
            extractionLocalRegionId: "scene-emma",
            semanticSignature: "emma got angry when she came home and found me there",
            entitySignature: ["angry", "apartment", "emma", "home"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "baseline" as const,
        reconciliationStatus: "retained" as const,
      },
      {
        ...makeUnit({
          observationId: "recovery-emma",
          regionId: "recovery-emma",
          order: 0,
          statement: "When Emma returned, my presence there shocked her and she reacted with anger.",
          source: "recovery",
          evidence: [{ snippet: "she came home and was shocked that I was there", spanStart: 1180, spanEnd: 1295, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-emma-1",
            physicalGapId: "gap-emma-1",
            extractionLocalRegionId: "recovery-emma",
            semanticSignature: "emma returned and reacted with anger after seeing me there",
            entitySignature: ["anger", "emma", "presence", "returned"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "recovery" as const,
        reconciliationStatus: "retained" as const,
      },
    ]);

    expect(overlap.retainedUnits).toHaveLength(1);
    expect(overlap.duplicateResolution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          retainedObservationId: "baseline-emma",
          discardedObservationId: "recovery-emma",
        }),
      ]),
    );
    expect(overlap.unresolvedOverlaps).toEqual([]);
  });

  it("resolves broad plus more specific same-fact overlap as refinement rather than coexistence", () => {
    const overlap = classifyCompositionOverlaps([
      {
        ...makeUnit({
          observationId: "baseline-wake",
          regionId: "scene-wake",
          order: 0,
          statement: "After waking up, the narrator started gathering belongings.",
          evidence: [{ snippet: "when I woke up I started gathering my things", spanStart: 602, spanEnd: 655, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-wake-1",
            physicalGapId: "gap-wake-1",
            extractionLocalRegionId: "scene-wake",
            semanticSignature: "after waking up the narrator started gathering belongings",
            entitySignature: ["belongings", "gathering", "narrator", "waking"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "baseline" as const,
        reconciliationStatus: "retained" as const,
      },
      {
        ...makeUnit({
          observationId: "recovery-wake",
          regionId: "recovery-wake",
          order: 0,
          statement: "After waking up, the narrator gathered belongings from several rooms and needed a sack because everything could not be carried by hand.",
          source: "recovery",
          evidence: [
            { snippet: "when I woke up I started gathering my things", spanStart: 602, spanEnd: 655, contextLabel: "scene" },
            { snippet: "there were things in several rooms and I needed a sack", spanStart: 712, spanEnd: 817, contextLabel: "scene" },
          ],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-wake-1",
            physicalGapId: "gap-wake-1",
            extractionLocalRegionId: "recovery-wake",
            semanticSignature: "after waking up the narrator gathered belongings from several rooms and needed a sack",
            entitySignature: ["belongings", "narrator", "rooms", "sack"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "recovery" as const,
        reconciliationStatus: "retained" as const,
      },
    ]);

    expect(overlap.retainedUnits.map((unit) => unit.observationId)).toEqual(["recovery-wake"]);
    expect(overlap.retainedUnits[0]?.origin).toBe("merged");
    expect(overlap.retainedUnits[0]?.supersedesObservationIds).toContain("baseline-wake");
    expect(overlap.duplicateResolution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          retainedObservationId: "recovery-wake",
          discardedObservationId: "baseline-wake",
        }),
      ]),
    );
    expect(overlap.unresolvedOverlaps).toEqual([]);
  });

  it("keeps partial-overlap units separate when each contributes distinct descriptive evidence", () => {
    const overlap = classifyCompositionOverlaps([
      {
        ...makeUnit({
          observationId: "baseline-door",
          regionId: "scene-door",
          order: 0,
          statement: "There was a second door beside the bed.",
          evidence: [{ snippet: "there was a second door beside the bed", spanStart: 2840, spanEnd: 2910, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-door-1",
            physicalGapId: "gap-door-1",
            extractionLocalRegionId: "scene-door",
            semanticSignature: "there was a second door beside the bed",
            entitySignature: ["bed", "door", "second"],
            eventStateType: "state",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "baseline" as const,
        reconciliationStatus: "retained" as const,
      },
      {
        ...makeUnit({
          observationId: "recovery-door",
          regionId: "recovery-door",
          order: 0,
          statement: "The loose door could only be hung by fitting its top nails onto the bed's headboard.",
          source: "recovery",
          evidence: [{ snippet: "the top nails had to be hooked carefully onto the bed headboard", spanStart: 2890, spanEnd: 2995, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-door-1",
            physicalGapId: "gap-door-1",
            extractionLocalRegionId: "recovery-door",
            semanticSignature: "the loose door had to be hung by hooking top nails onto the headboard",
            entitySignature: ["door", "headboard", "nails"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "recovery" as const,
        reconciliationStatus: "retained" as const,
      },
    ]);

    expect(overlap.retainedUnits.map((unit) => unit.observationId)).toEqual(["baseline-door", "recovery-door"]);
    expect(overlap.unresolvedOverlaps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          leftObservationId: "baseline-door",
          rightObservationId: "recovery-door",
        }),
      ]),
    );
  });

  it("does not merge same-scene same-entity observations when their descriptive facts are distinct", () => {
    const overlap = classifyCompositionOverlaps([
      {
        ...makeUnit({
          observationId: "baseline-emma-tools",
          regionId: "scene-emma",
          order: 0,
          statement: "Emma showed the tools she had acquired.",
          evidence: [{ snippet: "she showed the machine tools she had acquired", spanStart: 1797, spanEnd: 1920, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-emma-tools-1",
            physicalGapId: "gap-emma-tools-1",
            extractionLocalRegionId: "scene-emma",
            semanticSignature: "emma showed the tools she had acquired",
            entitySignature: ["acquired", "emma", "tools"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "baseline" as const,
        reconciliationStatus: "retained" as const,
      },
      {
        ...makeUnit({
          observationId: "recovery-emma-kiss",
          regionId: "recovery-emma",
          order: 1,
          statement: "Emma turned toward the narrator and they began kissing.",
          source: "recovery",
          evidence: [{ snippet: "she turned toward me and we started kissing", spanStart: 2541, spanEnd: 2598, contextLabel: "scene" }],
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-emma-kiss-1",
            physicalGapId: "gap-emma-kiss-1",
            extractionLocalRegionId: "recovery-emma",
            semanticSignature: "emma turned toward the narrator and they began kissing",
            entitySignature: ["emma", "kissing", "narrator", "turned"],
            eventStateType: "event",
          },
        }),
        admissionStatus: "accepted" as const,
        origin: "recovery" as const,
        reconciliationStatus: "retained" as const,
      },
    ]);

    expect(overlap.duplicateAnalysis).toEqual([]);
    expect(overlap.retainedUnits.map((unit) => unit.observationId)).toEqual(["baseline-emma-tools", "recovery-emma-kiss"]);
    expect(overlap.unresolvedOverlaps).toEqual([]);
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

  it("reports a representation-only difference from the experimental reconciliation adapter when locality end preservation broadens the composed region", () => {
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

    expect(comparison.classification).toBe("equivalent_with_representation_difference");
    expect(comparison.reasons).toEqual(["substantive_representation_difference_detected"]);
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
    expect(chronology.assembly.outOfOrderLocalityCount).toBe(1);
    expect(chronology.assembly.outOfOrderUnitCount).toBe(0);
    expect(chronology.assembly.finalLocalityOrderValid).toBe(true);
  });

  it("reports no pre-repair disorder when composition input is already ordered", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 120,
      baseline: {
        regions: [
          makeRegion({ regionId: "early", order: 0, spanStart: 0, spanEnd: 30 }),
          makeRegion({ regionId: "late", order: 1, spanStart: 40, spanEnd: 90 }),
        ],
        units: [
          makeUnit({
            observationId: "early-1",
            regionId: "early",
            order: 0,
            statement: "Earlier event.",
            evidence: [{ snippet: "earlier", spanStart: 0, spanEnd: 10, contextLabel: "early" }],
          }),
          makeUnit({
            observationId: "late-1",
            regionId: "late",
            order: 0,
            statement: "Later event.",
            evidence: [{ snippet: "later", spanStart: 50, spanEnd: 60, contextLabel: "late" }],
          }),
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    expect(result.composedRegions.map((region) => region.regionId)).toEqual(["early", "late"]);
    expect(result.chronology.outOfOrderLocalityCount).toBe(0);
    expect(result.chronology.outOfOrderUnitCount).toBe(0);
    expect(result.chronology.finalLocalityOrderValid).toBe(true);
  });

  it("reports repaired pre-repair unit and locality disorder without flattening final validity", () => {
    const result = composeMemoryPackages({
      dreamTextLength: 160,
      baseline: {
        regions: [
          makeRegion({ regionId: "late", order: 1, spanStart: 60, spanEnd: 120 }),
          makeRegion({ regionId: "early", order: 0, spanStart: 0, spanEnd: 40 }),
        ],
        units: [
          makeUnit({
            observationId: "late-1",
            regionId: "late",
            order: 0,
            statement: "Later event.",
            evidence: [{ snippet: "later", spanStart: 90, spanEnd: 100, contextLabel: "late" }],
          }),
          makeUnit({
            observationId: "early-1",
            regionId: "early",
            order: 0,
            statement: "Earlier event.",
            evidence: [{ snippet: "earlier", spanStart: 10, spanEnd: 20, contextLabel: "early" }],
          }),
        ],
      },
      supplemental: {
        regions: [],
        units: [],
      },
    });

    expect(result.composedUnits.map((unit) => unit.observationId)).toEqual(["early-1", "late-1"]);
    expect(result.composedRegions.map((region) => region.regionId)).toEqual(["early", "late"]);
    expect(result.chronology.outOfOrderUnitCount).toBe(1);
    expect(result.chronology.outOfOrderLocalityCount).toBe(1);
    expect(result.chronology.finalLocalityOrderValid).toBe(true);
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
