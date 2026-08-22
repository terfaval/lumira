import fs from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import {
  analyzeObservationCompleteness,
  analyzeComposedCandidateCompleteness,
  analyzeObservationCompletenessPreCalibration,
  compareCompletenessWithV2Diagnostics,
  fingerprintCompletenessAnalysis,
} from "@/src/cognition/observation-v3/completeness-analysis";
import { composeMemoryPackages } from "@/src/cognition/observation-v3/memory-composition";

function buildBundle(input?: {
  dreamText?: string;
  sceneSpans?: Array<{ sceneId: string; start: number | null; end: number | null }>;
  observationSpans?: Array<{
    observationId: string;
    sceneId: string;
    position: number;
    start: number | null;
    end: number | null;
    text?: string;
  }>;
}): { dreamText: string; bundle: ObservationV2Bundle } {
  const dreamText = input?.dreamText ?? "First scene. Then another scene. At the end a guide appears.";
  const sceneSpans = input?.sceneSpans ?? [{ sceneId: "scene-1", start: 0, end: dreamText.length }];
  const observationSpans = input?.observationSpans ?? [{
    observationId: "obs-1",
    sceneId: "scene-1",
    position: 0,
    start: 0,
    end: dreamText.length,
    text: "The dream covers the full source.",
  }];

  const scenes = sceneSpans.map((scene, sceneIndex) => ({
    sceneId: scene.sceneId,
    position: sceneIndex,
    summary: `Scene ${sceneIndex + 1}`,
    boundaryReasoning: [],
    evidenceContext: {
      snippet: dreamText.slice(Math.max(0, scene.start ?? 0), Math.max(0, scene.end ?? 0)) || `scene-${sceneIndex + 1}`,
      spanStart: scene.start,
      spanEnd: scene.end,
      contextLabel: "scene",
    },
    observations: observationSpans
      .filter((observation) => observation.sceneId === scene.sceneId)
      .map((observation) => ({
        observationId: observation.observationId,
        position: observation.position,
        text: observation.text ?? observation.observationId,
        evidence: [{
          snippet: observation.start !== null && observation.end !== null
            ? dreamText.slice(Math.max(0, observation.start), Math.max(0, observation.end))
            : observation.observationId,
          spanStart: observation.start,
          spanEnd: observation.end,
          contextLabel: "quoted_support",
        }],
        uncertaintyNote: null,
      })),
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
  }));

  return {
    dreamText,
    bundle: {
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes,
    },
  };
}

describe("observation v3 completeness analysis", () => {
  it("generates deterministic reports for identical source and candidate input", () => {
    const { dreamText, bundle } = buildBundle();

    const first = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });
    const second = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(first).toEqual(second);
  });

  it("detects a prefix discrepancy even when endpoint-derived coverage remains 1.0", () => {
    const dreamText = "Prelude. Main event. Ending.";
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 8, end: dreamText.length }],
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 8,
        end: dreamText.length,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.coverageRatio).toBe(1);
    expect(report.coverage.uncoveredPrefix).toEqual({ start: 0, end: 8 });
    expect(report.metricDiscrepancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "coverage_ratio_vs_uncovered_range",
        }),
      ]),
    );
  });

  it("detects and canonicalizes one tail gap with multiple reasons", () => {
    const dreamText = [
      "Opening at work.",
      "Middle transition into a city.",
      "At the end a guide appears near the coastline.",
    ].join(" ");
    const retainedEnd = dreamText.indexOf("At the end");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: retainedEnd - 1 }],
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 0,
        end: retainedEnd - 1,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.gaps.gaps).toHaveLength(1);
    expect(report.gaps.gaps[0]).toEqual(
      expect.objectContaining({
        id: "gap-001",
        kind: "tail",
        reasons: expect.arrayContaining([
          "coverage_tail_loss_detected",
          "ending_not_retained",
        ]),
      }),
    );
  });

  it("detects internal gaps without collapsing them into endpoint coverage", () => {
    const dreamText = "Alpha segment. Beta segment is long enough to matter. Gamma ending.";
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 14 },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 52, end: dreamText.length },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.coverageRatio).toBe(1);
    expect(report.coverage.internalUncoveredRegions.length).toBeGreaterThan(0);
    expect(report.metricDiscrepancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "coverage_ratio_vs_uncovered_range",
        }),
      ]),
    );
  });

  it("treats fully contiguous evidence as gap-free and adequate", () => {
    const { dreamText, bundle } = buildBundle();

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.gaps.gaps).toEqual([]);
    expect(report.adequacy).toBe("adequate");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
  });

  it("marks missing evidence spans as indeterminate instead of fabricating coverage", () => {
    const { dreamText, bundle } = buildBundle({
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: null,
        end: null,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.status).toBe("evidence_spans_unavailable");
    expect(report.adequacy).toBe("indeterminate");
    expect(report.diagnosticReasons).toContain("evidence_spans_missing");
  });

  it("rejects malformed ranges and preserves unavailable or contradictory state explicitly", () => {
    const { dreamText, bundle } = buildBundle({
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 20,
        end: 10,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.status).toBe("evidence_spans_unavailable");
    expect(report.failure).toEqual(
      expect.objectContaining({
        code: "evidence_spans_unavailable",
      }),
    );
  });

  it("normalizes overlapping ranges without creating false internal gaps", () => {
    const dreamText = "One two three four five six seven.";
    const { bundle } = buildBundle({
      dreamText,
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 16 },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 10, end: dreamText.length },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.internalUncoveredRegions).toEqual([]);
    expect(report.gaps.gaps).toEqual([]);
  });

  it("classifies thin late retention deterministically", () => {
    const dreamText = [
      "Opening segment is descriptive.",
      "Middle segment keeps shifting.",
      "Ending segment has multiple meaningful late sentences. Another late sentence remains uncovered. A final late sentence also matters here.",
    ].join(" ");
    const lateStart = Math.floor(dreamText.length * 0.75);
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 20 },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: lateStart, end: lateStart + 5 },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.lateRetention.status).toBe("thin");
  });

  it("detects ending-retention false-negative discrepancies explicitly", () => {
    const dreamText = "Intro. Middle. Ending has a final guide arrival and still matters.";
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length - 8 }],
      observationSpans: [{ observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: dreamText.length - 8 }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.endingRetention.status).toBe("not_retained");
    expect(report.diagnosticReasons).toContain("ending_not_retained");
  });

  it("keeps a measured reflective tail observable without forcing recoverable inadequacy", () => {
    const dreamText = [
      "I walk through a station.",
      "A friend waves from the final platform.",
      "Afterwards I just remember feeling odd about it.",
    ].join(" ");
    const retainedEnd = dreamText.indexOf(" Afterwards");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: retainedEnd }],
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 0,
        end: retainedEnd,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });
    const preCalibrationReport = analyzeObservationCompletenessPreCalibration({
      dreamText,
      bundle,
    });

    expect(report.coverage.uncoveredTail).toEqual({ start: retainedEnd, end: dreamText.length });
    expect(report.lateRetention.status).toBe("not_applicable");
    expect(report.adequacy).toBe("adequate_with_observations");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
    expect(preCalibrationReport.adequacy).toBe("inadequate_recoverable");
  });

  it("treats a one-sentence late section as not applicable instead of thin or missing", () => {
    const dreamText = [
      "Opening scene establishes the room and the people nearby.",
      "The dream ends quietly.",
    ].join(" ");
    const coveredEnd = dreamText.indexOf(" The dream ends quietly.");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: coveredEnd }],
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 0,
        end: coveredEnd,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.uncoveredTail).toEqual({ start: coveredEnd, end: dreamText.length });
    expect(report.lateRetention.lateSectionSentenceUnits).toBe(1);
    expect(report.lateRetention.status).toBe("not_applicable");
  });

  it("keeps a low-confidence internal gap observable without automatically requiring recovery", () => {
    const dreamText = [
      "I stand in a kitchen and look at the door.",
      "There is a vague stretch of hard-to-place detail that I do not hold onto clearly at all.",
      "Then I open the door and step outside into daylight.",
    ].join(" ");
    const secondStart = dreamText.indexOf("Then I open the door");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 43 },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: secondStart, end: dreamText.length },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.internalUncoveredRegions).toHaveLength(1);
    expect(report.gaps.gaps).toEqual([
      expect.objectContaining({
        kind: "internal",
        confidence: "low",
      }),
    ]);
    expect(report.adequacy).toBe("adequate_with_observations");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
  });

  it("does not require recovery when an uncovered internal region only repeats grounded descriptive content", () => {
    const repeated = "A red door appears beside a cracked mirror.";
    const dreamText = [
      repeated,
      repeated,
      "Then I wake up in bed.",
    ].join(" ");
    const wakeStart = dreamText.indexOf("Then I wake up in bed.");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: repeated.length, text: repeated },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: wakeStart, end: dreamText.length, text: "Then I wake up in bed." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.internalUncoveredRegions).toHaveLength(1);
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
    expect(report.materialGapAssessment?.gaps).toEqual([
      expect.objectContaining({
        gapId: "gap-001",
        classification: "already_represented",
      }),
    ]);
  });

  it("keeps a large internal descriptive omission recovery-relevant even when endpoint coverage reaches the ending", () => {
    const dreamText = [
      "I stand in the empty station and wait.",
      "Then the ceiling opens into a black sky and birds begin speaking from the rafters.",
      "I feel my body become heavy and I cannot tell whether I am awake inside the dream.",
      "Finally I am back at the platform entrance.",
    ].join(" ");
    const endingStart = dreamText.indexOf("Finally I am back at the platform entrance.");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 38, text: "I stand in the empty station and wait." },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: endingStart, end: dreamText.length, text: "Finally I am back at the platform entrance." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.coverageRatio).toBe(1);
    expect(report.coverage.internalUncoveredRegions).toHaveLength(1);
    expect(report.adequacy).toBe("inadequate_recoverable");
    expect(report.recoveryRecommendation.disposition).toBe("required_before_admission");
    expect(report.recoveryRecommendation.targetedPhysicalGapIds).toEqual(["gap-001"]);
  });

  it("classifies bounded reflective tail text as non-material rather than recoverable loss", () => {
    const dreamText = [
      "I walk through a station.",
      "A friend waves from the final platform.",
      "Afterwards I just remember feeling odd about it.",
    ].join(" ");
    const retainedEnd = dreamText.indexOf(" Afterwards");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: retainedEnd }],
      observationSpans: [{
        observationId: "obs-1",
        sceneId: "scene-1",
        position: 0,
        start: 0,
        end: retainedEnd,
      }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.recoveryRecommendation.disposition).toBe("not_required");
    expect(report.materialGapAssessment?.gaps).toEqual([
      expect.objectContaining({
        gapId: "gap-001",
        classification: "non_material",
      }),
    ]);
  });

  it("stops requesting recovery after composition once the material distinction has been recovered", () => {
    const endingSnippet = "Then the ceiling opens into a black sky and birds begin speaking from the rafters.";
    const dreamText = [
      "I stand in the empty station and wait.",
      endingSnippet,
      "Finally I am back at the platform entrance.",
    ].join(" ");
    const endingStart = dreamText.indexOf(endingSnippet);
    const finalStart = dreamText.indexOf("Finally I am back at the platform entrance.");

    const composition = composeMemoryPackages({
      dreamTextLength: dreamText.length,
      baseline: {
        regions: [{
          regionId: "scene-1",
          order: 0,
          heading: "Station",
          spanStart: 0,
          spanEnd: dreamText.length,
          evidence: [{ snippet: dreamText, spanStart: 0, spanEnd: dreamText.length, contextLabel: "scene" }],
          boundaryConfidence: "medium",
          uncertainty: null,
          transitionCues: [],
        }],
        units: [{
          observationId: "baseline-1",
          regionId: "scene-1",
          order: 0,
          statement: "I stand in the empty station and wait.",
          evidence: [{ snippet: "I stand in the empty station and wait.", spanStart: 0, spanEnd: 38, contextLabel: "quoted_support" }],
          uncertainty: null,
          source: "baseline",
          recoveryProvenance: null,
        }, {
          observationId: "baseline-2",
          regionId: "scene-1",
          order: 1,
          statement: "Finally I am back at the platform entrance.",
          evidence: [{ snippet: "Finally I am back at the platform entrance.", spanStart: finalStart, spanEnd: dreamText.length, contextLabel: "quoted_support" }],
          uncertainty: null,
          source: "baseline",
          recoveryProvenance: null,
        }],
      },
      supplemental: {
        regions: [{
          regionId: "recovery-1",
          order: 0,
          heading: "Recovered middle",
          spanStart: endingStart,
          spanEnd: endingStart + endingSnippet.length,
          evidence: [{ snippet: endingSnippet, spanStart: endingStart, spanEnd: endingStart + endingSnippet.length, contextLabel: "window" }],
          boundaryConfidence: "medium",
          uncertainty: null,
          transitionCues: [],
        }],
        units: [{
          observationId: "recovery-1",
          regionId: "recovery-1",
          order: 0,
          statement: endingSnippet,
          evidence: [{ snippet: endingSnippet, spanStart: endingStart, spanEnd: endingStart + endingSnippet.length, contextLabel: "window" }],
          uncertainty: null,
          source: "recovery",
          recoveryProvenance: {
            canonicalRecoveryWindowId: "window-1",
            physicalGapId: "gap-001",
            extractionLocalRegionId: "recovery-1",
            semanticSignature: "ending snippet",
            entitySignature: ["birds", "ceiling"],
            eventStateType: "event",
          },
        }],
      },
    });

    const report = analyzeComposedCandidateCompleteness({
      dreamText,
      composedCandidate: composition.composedCandidate,
      composedCandidateHash: composition.composedCandidateIdentity.composedCandidateHash,
    });

    expect(["adequate", "adequate_with_observations"]).toContain(report.adequacy);
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
    expect(report.recoveryRecommendation.targetedPhysicalGapIds).toEqual([]);
  });

  it("treats a short coherent tail-only endpoint miss as observational rather than recoverable inadequacy", () => {
    const dreamText = "Kozmo dies, I am devastated, and then by some miracle he comes back to life.";
    const coveredEnd = dreamText.indexOf(" and then");
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: dreamText.length }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 10, text: "Kozmo dies." },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 12, end: 30, text: "I am devastated." },
        { observationId: "obs-3", sceneId: "scene-1", position: 2, start: 31, end: coveredEnd + 29, text: "By some miracle he comes back to life." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.lateRetention.status).toBe("not_applicable");
    expect(report.adequacy).toBe("adequate_with_observations");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
  });

  it("treats explicit wake-up terminal cues as ending false-negative observations rather than automatic inadequacy", () => {
    const dreamText = [
      "I am at a conference with strangers.",
      "Then I cross into a world ruled by birds and keep running.",
      "I realize it is only a dream and wake up.",
      "The feeling lingers for a moment after waking.",
    ].join(" ");
    const wakeStart = dreamText.indexOf("I realize it is only a dream and wake up.");
    const wakeEnd = wakeStart + "I realize it is only a dream and wake up.".length;
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: wakeEnd }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 34, text: "I am at a conference with strangers." },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 36, end: 98, text: "I cross into a world ruled by birds and keep running." },
        { observationId: "obs-3", sceneId: "scene-1", position: 2, start: wakeStart, end: wakeEnd, text: "I realize it is only a dream and wake up." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.endingRetention.status).toBe("not_retained");
    expect(report.metricDiscrepancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ending_metric_false_negative",
        }),
      ]),
    );
    expect(report.adequacy).toBe("adequate_with_observations");
    expect(report.recoveryRecommendation.disposition).toBe("not_required");
  });

  it("does not let an explicit wake-up cue erase a large late omission", () => {
    const dreamText = [
      "I walk through a school hallway and keep meeting strangers with documents.",
      "Then I move into a collapsing city and search for my brother.",
      "The search continues through several rooms, stairs, and courtyards while people keep interrupting me.",
      "Eventually I realize this is a dream and wake up.",
      "But after that the dream continues into another long courtyard sequence with more searching, noise, and confusion before it finally stops.",
      "Then there is another extended section with locked doors, missing papers, and repeated calls from people I cannot find.",
      "Finally the whole place stretches into a final impossible corridor while the search keeps going without resolution.",
    ].join(" ");
    const wakeStart = dreamText.indexOf("Eventually I realize this is a dream and wake up.");
    const wakeEnd = wakeStart + "Eventually I realize this is a dream and wake up.".length;
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 0, end: wakeEnd }],
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 68, text: "I walk through a school hallway and keep meeting strangers with documents." },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 70, end: 132, text: "I move into a collapsing city and search for my brother." },
        { observationId: "obs-3", sceneId: "scene-1", position: 2, start: wakeStart, end: wakeEnd, text: "Eventually I realize this is a dream and wake up." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.coverage.uncoveredTail).not.toBeNull();
    expect(report.coverage.uncoveredTail!.end - report.coverage.uncoveredTail!.start).toBeGreaterThan(32);
    expect(report.adequacy).toBe("inadequate_recoverable");
  });

  it("maps single-scene lexical overmerge signals into structural weakness and non-recoverable inadequacy", () => {
    const dreamText = "Long dream text ".repeat(300);
    const { bundle } = buildBundle({
      dreamText,
      observationSpans: [
        { observationId: "obs-1", sceneId: "scene-1", position: 0, start: 0, end: 60, text: "Then later after that the dreamer keeps moving." },
        { observationId: "obs-2", sceneId: "scene-1", position: 1, start: 61, end: 120, text: "Trying to search and find while the world rules changed." },
        { observationId: "obs-3", sceneId: "scene-1", position: 2, start: 121, end: 180, text: "Later there is conflict and mocking and helping." },
        { observationId: "obs-4", sceneId: "scene-1", position: 3, start: 181, end: 240, text: "Then the dreamer escapes through a maze and transformed space." },
        { observationId: "obs-5", sceneId: "scene-1", position: 4, start: 241, end: 300, text: "At the end they wander, resist, and realize the dream is unstable." },
      ],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    expect(report.structuralAssessment.weaknessSignals).toContain("single_scene_overmerge_risk");
    expect(report.adequacy).toBe("inadequate_non_recoverable");
    expect(report.recoveryRecommendation.disposition).toBe("not_recoverable");
  });

  it("compares V2 guard pass with V3 inadequacy as v3_stricter", () => {
    const dreamText = "Prelude. Main event. Ending.";
    const { bundle } = buildBundle({
      dreamText,
      sceneSpans: [{ sceneId: "scene-1", start: 8, end: dreamText.length }],
      observationSpans: [{ observationId: "obs-1", sceneId: "scene-1", position: 0, start: 8, end: dreamText.length }],
    });

    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    const comparison = compareCompletenessWithV2Diagnostics({
      report,
      v2AttemptDiagnostics: {
        guardVerdict: "pass",
        fallbackReason: null,
        coverageRatio: 1,
        uncoveredTailChars: 0,
        lateSectionObservationCount: 1,
        overmergeMatchedCueGroups: 0,
        overmergeTotalCueMatches: 0,
      },
    });

    expect(comparison.classification).toBe("v3_stricter");
  });

  it("compares V2 guard failure with V3 adequacy as v3_more_permissive", () => {
    const { dreamText, bundle } = buildBundle();
    const report = analyzeObservationCompleteness({
      dreamText,
      bundle,
    });

    const comparison = compareCompletenessWithV2Diagnostics({
      report,
      v2AttemptDiagnostics: {
        guardVerdict: "coverage_guard_failed",
        fallbackReason: "coverage_guard_failed",
        coverageRatio: 0.3,
        uncoveredTailChars: 1200,
        lateSectionObservationCount: 0,
        overmergeMatchedCueGroups: 0,
        overmergeTotalCueMatches: 0,
      },
    });

    expect(comparison.classification).toBe("v3_more_permissive");
  });

  it("produces stable fingerprints for contract, analyzer, rules, and comparator", async () => {
    const fingerprints = await fingerprintCompletenessAnalysis();

    expect(fingerprints.contractHash).toBeTruthy();
    expect(fingerprints.analyzerHash).toBeTruthy();
    expect(fingerprints.rulesHash).toBeTruthy();
    expect(fingerprints.equivalenceHash).toBeTruthy();
  });

  it("keeps completeness-analysis dependencies bounded away from providers, recovery, admission, persistence, and benchmark verdict logic", async () => {
    const directory = path.resolve("src/cognition/observation-v3/completeness-analysis");
    const fileNames = await fs.readdir(directory);
    const sourceFiles = fileNames.filter((fileName) => fileName.endsWith(".ts") && !fileName.endsWith(".test.ts"));
    const contents = await Promise.all(sourceFiles.map((fileName) => fs.readFile(path.join(directory, fileName), "utf8")));

    for (const source of contents) {
      expect(source).not.toMatch(/from "openai"/);
      expect(source).not.toMatch(/observation-v3\/recovery/);
      expect(source).not.toMatch(/observation-v3\/reconciliation/);
      expect(source).not.toMatch(/observation-v3\/memory-realization/);
      expect(source).not.toMatch(/observation-v3\/authority-admission/);
      expect(source).not.toMatch(/supabase/i);
      expect(source).not.toMatch(/benchmark verdict/i);
    }
  });
});
