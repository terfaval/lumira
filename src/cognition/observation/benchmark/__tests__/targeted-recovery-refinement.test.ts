import { describe, expect, it } from "vitest";

import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import {
  analyzeRecoveryGaps,
  buildRecoveryWindows,
  canonicalizeRecoveryGaps,
  classifyObservationOverlap,
  normalizeRecoveryWindows,
  reconcileTargetedRecoveryCandidate,
  selectBestParseableBaselineAttempt,
} from "@/src/cognition/observation/experiment/targeted-recovery-refinement";
import { createBundleFromRegions } from "@/src/cognition/observation/experiment/observation-topology-configuration-helpers";

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

function makeAttempt(input: Partial<ObservationExtractionAttemptEvidence>): ObservationExtractionAttemptEvidence {
  return {
    attempt: 1,
    status: "candidate_rejected",
    startedAt: "2026-07-30T00:00:00.000Z",
    completedAt: "2026-07-30T00:00:01.000Z",
    elapsedMs: 1000,
    providerStatus: "completed",
    providerIncompleteReason: null,
    providerReturnedStructuredOutput: true,
    parseStatus: "parsed",
    schemaValidationStatus: "passed",
    candidateBundle: null,
    diagnostics: null,
    sceneCount: null,
    observationCount: null,
    evidenceSpanCount: null,
    guardVerdict: null,
    rejectionReasons: [],
    retryReason: null,
    inputTokenUsage: null,
    outputTokenUsage: null,
    totalTokenUsage: null,
    acceptedAttempt: false,
    causedFinalFallback: false,
    causedRetry: false,
    rawProviderResponsePreserved: false,
    errorMessage: null,
    ...input,
  };
}

describe("selectBestParseableBaselineAttempt", () => {
  it("prefers accepted baseline output when available", () => {
    const accepted = makeAttempt({
      status: "candidate_accepted",
      acceptedAttempt: true,
      candidateBundle: { scenes: [] } as never,
    });
    const rejected = makeAttempt({ attempt: 2, status: "candidate_rejected" });

    const selected = selectBestParseableBaselineAttempt([rejected, accepted]);

    expect(selected?.admissionStatus).toBe("accepted");
    expect(selected?.attemptEvidence).toBe(accepted);
  });

  it("admits rejected parseable baseline output when no accepted candidate exists", () => {
    const provisional = makeAttempt({ status: "candidate_rejected", candidateBundle: { scenes: [] } as never });

    const selected = selectBestParseableBaselineAttempt([provisional]);

    expect(selected?.admissionStatus).toBe("rejected_parseable");
    expect(selected?.attemptEvidence).toBe(provisional);
  });
});

describe("analyzeRecoveryGaps", () => {
  it("does not trigger recovery for an insignificant short uncovered tail", () => {
    const bundle = createBundleFromRegions({
      reflectiveObjectId: "obs-a-002",
      userId: "benchmark-runner",
      source: "system_llm_extract",
      dreamLanguage: "hu",
      regions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          spanStart: 0,
          spanEnd: 71,
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        }),
      ],
      observations: [
        makeUnit({
          observationId: "obs-1",
          regionId: "scene-1",
          order: 0,
          statement: "Kozmo meghal.",
          evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
        }),
        makeUnit({
          observationId: "obs-2",
          regionId: "scene-1",
          order: 1,
          statement: "Rettenetesen szomoru vagyok.",
          evidence: [{ snippet: "rettenetesen szomoru vagyok", spanStart: 13, spanEnd: 39, contextLabel: "full" }],
        }),
        makeUnit({
          observationId: "obs-3",
          regionId: "scene-1",
          order: 2,
          statement: "Kozmo uj eletre kel.",
          evidence: [{ snippet: "uj eletre kel", spanStart: 44, spanEnd: 71, contextLabel: "full" }],
        }),
      ],
      maximumSpanEnd: 96,
    });

    const gaps = analyzeRecoveryGaps({
      dreamTextLength: 96,
      bundle,
      baselineAttemptDiagnostics: {
        uncoveredTailChars: 25,
        largestCoveredSpanEnd: 71,
        lateSectionObservationCount: 0,
      },
    });

    expect(gaps).toEqual([]);
  });

  it("detects both tail reasons before canonical normalization on long late-loss input", () => {
    const bundle = createBundleFromRegions({
      reflectiveObjectId: "obs-c-002",
      userId: "benchmark-runner",
      source: "system_llm_extract",
      dreamLanguage: "hu",
      regions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          spanStart: 0,
          spanEnd: 1225,
          evidence: [{ snippet: "munkahely", spanStart: 0, spanEnd: 1225, contextLabel: "early" }],
        }),
      ],
      observations: [
        makeUnit({
          observationId: "obs-1",
          regionId: "scene-1",
          order: 0,
          statement: "Workplace hostility escalates.",
          evidence: [{ snippet: "bullying", spanStart: 415, spanEnd: 615, contextLabel: "early" }],
        }),
      ],
      maximumSpanEnd: 4614,
    });

    const gaps = analyzeRecoveryGaps({
      dreamTextLength: 4614,
      bundle,
      baselineAttemptDiagnostics: {
        uncoveredTailChars: 3389,
        largestCoveredSpanEnd: 1225,
        lateSectionObservationCount: 0,
      },
    });

    expect(gaps.map((gap) => gap.gapReason)).toEqual(
      expect.arrayContaining(["uncovered_tail", "missing_late_section"]),
    );
  });
});

describe("canonical gap normalization and window deduplication", () => {
  it("one physical tail with multiple reasons creates one canonical gap", () => {
    const canonical = canonicalizeRecoveryGaps([
      {
        gapId: "gap-tail-1",
        kind: "tail",
        gapReason: "uncovered_tail",
        gapConfidence: "high",
        spanStart: 2375,
        spanEnd: 4614,
        includesEnding: true,
        includesCriticalTransition: true,
        precedingUnitId: "scene2_obs26",
        followingUnitId: null,
      },
      {
        gapId: "gap-late-1",
        kind: "tail",
        gapReason: "missing_late_section",
        gapConfidence: "high",
        spanStart: 2375,
        spanEnd: 4614,
        includesEnding: true,
        includesCriticalTransition: true,
        precedingUnitId: "scene2_obs26",
        followingUnitId: null,
      },
    ]);

    expect(canonical).toHaveLength(1);
    expect(canonical[0]?.contributingGapIds).toEqual(["gap-late-1", "gap-tail-1"]);
    expect(canonical[0]?.reasons).toEqual(["missing_late_section", "uncovered_tail"]);
  });

  it("one canonical gap creates one recovery window and preserves merged reasons", () => {
    const canonicalGaps = canonicalizeRecoveryGaps([
      {
        gapId: "gap-tail-1",
        kind: "tail",
        gapReason: "uncovered_tail",
        gapConfidence: "high",
        spanStart: 2375,
        spanEnd: 4614,
        includesEnding: true,
        includesCriticalTransition: true,
        precedingUnitId: "scene2_obs26",
        followingUnitId: null,
      },
      {
        gapId: "gap-late-1",
        kind: "tail",
        gapReason: "missing_late_section",
        gapConfidence: "high",
        spanStart: 2375,
        spanEnd: 4614,
        includesEnding: true,
        includesCriticalTransition: true,
        precedingUnitId: "scene2_obs26",
        followingUnitId: null,
      },
    ]);

    const rawWindows = buildRecoveryWindows({
      dreamTextLength: 4614,
      gaps: [
        {
          gapId: "gap-tail-1",
          kind: "tail",
          gapReason: "uncovered_tail",
          gapConfidence: "high",
          spanStart: 2375,
          spanEnd: 4614,
          includesEnding: true,
          includesCriticalTransition: true,
          precedingUnitId: "scene2_obs26",
          followingUnitId: null,
        },
        {
          gapId: "gap-late-1",
          kind: "tail",
          gapReason: "missing_late_section",
          gapConfidence: "high",
          spanStart: 2375,
          spanEnd: 4614,
          includesEnding: true,
          includesCriticalTransition: true,
          precedingUnitId: "scene2_obs26",
          followingUnitId: null,
        },
      ],
      maximumWindowLength: 3200,
      contextPadding: 260,
    });

    const normalized = normalizeRecoveryWindows({
      rawWindows,
      canonicalGaps,
    });

    expect(normalized.canonicalWindows).toHaveLength(1);
    expect(normalized.decisions[0]?.contributingWindowIds).toHaveLength(2);
    expect(normalized.decisions[0]?.contributingReasons).toEqual(["missing_late_section", "uncovered_tail"]);
  });

  it("equivalent padded windows are collapsed while distinct internal gaps remain distinct", () => {
    const canonicalGaps = canonicalizeRecoveryGaps([
      {
        gapId: "gap-a",
        kind: "internal",
        gapReason: "uncovered_internal_region",
        gapConfidence: "medium",
        spanStart: 400,
        spanEnd: 520,
        includesEnding: false,
        includesCriticalTransition: false,
        precedingUnitId: "obs-1",
        followingUnitId: "obs-2",
      },
      {
        gapId: "gap-b",
        kind: "internal",
        gapReason: "transition_gap",
        gapConfidence: "medium",
        spanStart: 900,
        spanEnd: 1020,
        includesEnding: false,
        includesCriticalTransition: true,
        precedingUnitId: "obs-3",
        followingUnitId: "obs-4",
      },
    ]);

    const normalized = normalizeRecoveryWindows({
      rawWindows: [
        {
          windowId: "window-1",
          gapId: "gap-a",
          gapStart: 400,
          gapEnd: 520,
          windowStart: 300,
          windowEnd: 620,
          contextStart: 300,
          contextEnd: 620,
          includesEnding: false,
        },
        {
          windowId: "window-2",
          gapId: "gap-a",
          gapStart: 400,
          gapEnd: 520,
          windowStart: 290,
          windowEnd: 630,
          contextStart: 290,
          contextEnd: 630,
          includesEnding: false,
        },
        {
          windowId: "window-3",
          gapId: "gap-b",
          gapStart: 900,
          gapEnd: 1020,
          windowStart: 800,
          windowEnd: 1120,
          contextStart: 800,
          contextEnd: 1120,
          includesEnding: false,
        },
      ],
      canonicalGaps,
    });

    expect(normalized.canonicalWindows).toHaveLength(2);
    expect(normalized.duplicateWindowsRemoved).toBe(1);
  });
});

describe("classifyObservationOverlap", () => {
  it("confirms duplicates despite casing and punctuation differences", () => {
    const left = makeUnit({
      observationId: "baseline-1",
      regionId: "scene-1",
      order: 0,
      statement: "Kozmo meghal.",
      evidence: [{ snippet: "kozmo meghal", spanStart: 0, spanEnd: 11, contextLabel: "full" }],
    });
    const right = makeUnit({
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
    });

    const overlap = classifyObservationOverlap(left, right);

    expect(overlap.classification).toBe("confirmed_duplicate");
  });

  it("detects semantically equivalent units from the same canonical recovery window", () => {
    const left = makeUnit({
      observationId: "recovery-a",
      regionId: "region-a",
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
    });
    const right = makeUnit({
      observationId: "recovery-b",
      regionId: "region-b",
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
    });

    const overlap = classifyObservationOverlap(left, right);

    expect(overlap.classification).toBe("confirmed_duplicate");
  });

  it("keeps partial overlaps visible instead of collapsing them automatically", () => {
    const left = makeUnit({
      observationId: "baseline-1",
      regionId: "scene-1",
      order: 0,
      statement: "A tarsasag tovabb kekeckedik velem.",
      evidence: [{ snippet: "tovabb kekeckednek velem", spanStart: 892, spanEnd: 911, contextLabel: "full" }],
    });
    const right = makeUnit({
      observationId: "recovery-1",
      regionId: "recovery-1",
      order: 0,
      statement: "Egy ideig szarkasztikus odaszurasokkal valaszolgatok.",
      evidence: [{ snippet: "szarkasztikus odaszurassal", spanStart: 905, spanEnd: 1000, contextLabel: "full" }],
      source: "recovery",
    });

    const overlap = classifyObservationOverlap(left, right);

    expect(overlap.classification).toBe("partial_overlap");
  });

  it("does not collapse same entities with distinct events", () => {
    const left = makeUnit({
      observationId: "obs-1",
      regionId: "scene-1",
      order: 0,
      statement: "Az ikrem jon utanam.",
      evidence: [{ snippet: "az ikrem jon utanam", spanStart: 1200, spanEnd: 1230, contextLabel: "full" }],
      source: "recovery",
      recoveryProvenance: {
        canonicalRecoveryWindowId: "window-1",
        physicalGapId: "physical-gap-1",
        extractionLocalRegionId: "region-1",
        semanticSignature: "az ikrem jon utanam",
        entitySignature: ["ikrem"],
        eventStateType: "event",
      },
    });
    const right = makeUnit({
      observationId: "obs-2",
      regionId: "scene-1",
      order: 1,
      statement: "Elveszitem az ikremet es keresni kezdem.",
      evidence: [{ snippet: "elveszitettem az ikrem", spanStart: 2800, spanEnd: 2850, contextLabel: "full" }],
      source: "recovery",
      recoveryProvenance: {
        canonicalRecoveryWindowId: "window-1",
        physicalGapId: "physical-gap-1",
        extractionLocalRegionId: "region-1",
        semanticSignature: "elveszitem az ikremet es keresni kezdem",
        entitySignature: ["ikrem"],
        eventStateType: "event",
      },
    });

    const overlap = classifyObservationOverlap(left, right);

    expect(overlap.classification).toBe("distinct");
  });

  it("surfaces conflicts for overlapping incompatible claims", () => {
    const left = makeUnit({
      observationId: "obs-1",
      regionId: "scene-1",
      order: 0,
      statement: "A tuz meg eg.",
      evidence: [{ snippet: "eget haz", spanStart: 1300, spanEnd: 1330, contextLabel: "full" }],
      source: "recovery",
      recoveryProvenance: {
        canonicalRecoveryWindowId: "window-1",
        physicalGapId: "physical-gap-1",
        extractionLocalRegionId: "region-1",
        semanticSignature: "a tuz meg eg",
        entitySignature: ["tuz"],
        eventStateType: "state",
      },
    });
    const right = makeUnit({
      observationId: "obs-2",
      regionId: "scene-1",
      order: 1,
      statement: "A tuzet mar eloltottak.",
      evidence: [{ snippet: "a tuz el van oltva", spanStart: 1300, spanEnd: 1335, contextLabel: "full" }],
      source: "recovery",
      recoveryProvenance: {
        canonicalRecoveryWindowId: "window-1",
        physicalGapId: "physical-gap-1",
        extractionLocalRegionId: "region-1",
        semanticSignature: "a tuzet mar eloltottak",
        entitySignature: ["tuz"],
        eventStateType: "state",
      },
    });

    const overlap = classifyObservationOverlap(left, right);

    expect(overlap.classification).toBe("conflict");
  });
});

describe("reconcileTargetedRecoveryCandidate", () => {
  it("retains provisional early baseline material and late recovery material in source order", () => {
    const result = reconcileTargetedRecoveryCandidate({
      dreamTextLength: 4614,
      baselineRegions: [
        makeRegion({
          regionId: "scene-1",
          order: 0,
          heading: "Workplace",
          spanStart: 0,
          spanEnd: 1225,
          evidence: [{ snippet: "munkahely", spanStart: 0, spanEnd: 26, contextLabel: "early" }],
        }),
      ],
      baselineUnits: [
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
      recoveryRegions: [
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
      recoveryUnits: [
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
    });

    expect(result.finalUnits.map((unit) => unit.observationId)).toEqual(["baseline-early", "recovery-late"]);
    expect(result.finalRegions.map((region) => region.regionId)).toEqual(["scene-1", "recovery-city"]);
    expect(result.earliestRepresentedPosition).toBe(0);
    expect(result.latestRepresentedPosition).toBe(3391);
    expect(result.sourceOrderAssembly.finalLocalityOrderValid).toBe(true);
  });

  it("collapses confirmed duplicates deterministically and reports no repeated span realization", () => {
    const result = reconcileTargetedRecoveryCandidate({
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
        {
          ...makeUnit({
            observationId: "obs-2",
            regionId: "scene-1",
            order: 1,
            statement: "Rettenetesen szomoru vagyok.",
            evidence: [{ snippet: "rettenetesen szomoru vagyok", spanStart: 13, spanEnd: 39, contextLabel: "full" }],
          }),
          admissionStatus: "accepted" as const,
        },
        {
          ...makeUnit({
            observationId: "obs-3",
            regionId: "scene-1",
            order: 2,
            statement: "Kozmo uj eletre kel.",
            evidence: [{ snippet: "uj eletre kel", spanStart: 44, spanEnd: 71, contextLabel: "full" }],
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
    });

    expect(result.finalUnits).toHaveLength(3);
    expect(result.duplicateResolution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          retainedObservationId: "obs-1",
          discardedObservationId: "recovery-1",
        }),
      ]),
    );
    expect(result.sourceOrderAssembly.repeatedSourceSpanRealizationCount).toBe(0);
  });

  it("merges duplicate recovery localities and prevents recovery localities from preceding earlier baseline localities", () => {
    const result = reconcileTargetedRecoveryCandidate({
      dreamTextLength: 1651,
      baselineRegions: [
        makeRegion({
          regionId: "scene-ballagas",
          order: 5,
          heading: "Ballagas",
          spanStart: 62,
          spanEnd: 238,
          evidence: [{ snippet: "ballagas", spanStart: 62, spanEnd: 238, contextLabel: "early" }],
        }),
      ],
      baselineUnits: [
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
      recoveryRegions: [
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
      recoveryUnits: [
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
    });

    expect(result.finalRegions.map((region) => region.regionId)).toEqual(["scene-ballagas", "recovery-tail-a"]);
    expect(result.localityMergeDecisions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          keptRegionId: "recovery-tail-a",
          mergedRegionId: "recovery-tail-b",
        }),
      ]),
    );
    expect(result.sourceOrderAssembly.outOfOrderLocalityCount).toBe(0);
    expect(result.sourceOrderAssembly.outOfOrderUnitCount).toBe(0);
  });
});
