import { describe, expect, it } from "vitest";

import {
  isLatentCenterLifecycleState,
  isLatentConfidenceBand,
  isLatentSignalType,
  isLatentSuggestionType,
  isLatentVisibility,
  normalizeLatentCenterLifecyclePayload,
} from "@/src/domain/latent/validation";

describe("latent validation", () => {
  it("validates confidence bands", () => {
    expect(isLatentConfidenceBand("low")).toBe(true);
    expect(isLatentConfidenceBand("tentative")).toBe(true);
    expect(isLatentConfidenceBand("moderate")).toBe(true);
    expect(isLatentConfidenceBand("high")).toBe(false);
  });

  it("validates latent visibility values", () => {
    expect(isLatentVisibility("internal_only")).toBe(true);
    expect(isLatentVisibility("reflective_space_optional")).toBe(true);
    expect(isLatentVisibility("public")).toBe(false);
  });

  it("validates signal and suggestion type boundaries", () => {
    expect(isLatentSignalType("recurrence_possibility")).toBe(true);
    expect(isLatentSignalType("deterministic_truth")).toBe(false);
    expect(isLatentSuggestionType("possible_connection")).toBe(true);
    expect(isLatentSuggestionType("you_should")).toBe(false);
  });

  it("validates center lifecycle state boundaries", () => {
    expect(isLatentCenterLifecycleState("possible")).toBe(true);
    expect(isLatentCenterLifecycleState("stabilized")).toBe(true);
    expect(isLatentCenterLifecycleState("destiny")).toBe(false);
  });

  it("returns null for empty lifecycle payload", () => {
    expect(normalizeLatentCenterLifecyclePayload({})).toBeNull();
  });

  it("normalizes partial nested lifecycle fields while preserving core state", () => {
    const normalized = normalizeLatentCenterLifecyclePayload({
      centerCategory: "agency_state",
      centerState: "emerging",
      centerScore: 1.4,
      persistenceStreak: 2,
      cooldownUntil: null,
      noCenterReason: null,
      salience: {
        userOwnedScore: 1.2,
      },
      attenuation: {
        repetitionDecay: 0.8,
      },
      neighborhood: {
        relatedCategories: ["agency_state"],
      },
      processingMode: {
        selectedMode: "agency_oriented",
        candidateModes: [{ mode: "agency_oriented", score: 1.2, confidenceBand: "tentative", rationale: ["agency cues"] }],
        modeConfidence: 0.62,
        uncertainty: 0.28,
        rationaleTrace: ["agency cues"],
        noModeReason: null,
        materialPriorities: {
          observations: 0.8,
          glossary: 0.3,
          notes: 0.2,
          responses: 0.1,
          neighborhood: 0.4,
        },
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.salience.highlightScore).toBe(0);
    expect(normalized?.attenuation.refractoryPenalty).toBe(1);
    expect(normalized?.neighborhood.relatedCategories).toEqual(["agency_state"]);
    expect(normalized?.processingMode.selectedMode).toBe("agency_oriented");
  });

  it("rejects invalid lifecycle states", () => {
    expect(
      normalizeLatentCenterLifecyclePayload({
        centerCategory: "agency_state",
        centerState: "mythic",
        centerScore: 1.2,
        persistenceStreak: 2,
      }),
    ).toBeNull();
  });

  it("sanitizes invalid cooldown timestamps to null", () => {
    const normalized = normalizeLatentCenterLifecyclePayload({
      centerCategory: "agency_state",
      centerState: "possible",
      centerScore: 1.2,
      persistenceStreak: 1,
      cooldownUntil: "not-a-date",
      salience: {},
      attenuation: {},
      neighborhood: {},
    });

    expect(normalized?.cooldownUntil).toBeNull();
  });

  it("sanitizes malformed neighborhood arrays", () => {
    const normalized = normalizeLatentCenterLifecyclePayload({
      centerCategory: "affect_transition",
      centerState: "stabilized",
      centerScore: 1.8,
      persistenceStreak: 4,
      cooldownUntil: null,
      salience: {},
      attenuation: {},
      neighborhood: {
        relatedCategories: ["affect_transition", "invalid_category", "affect_transition"],
        glossaryAnchors: [" fear ", "", 7],
        affectAdjacency: ["affective_atmosphere", "wrong"],
        continuityCues: [" cue ", null, "cue"],
      },
    });

    expect(normalized?.neighborhood.relatedCategories).toEqual(["affect_transition"]);
    expect(normalized?.neighborhood.glossaryAnchors).toEqual(["fear"]);
    expect(normalized?.neighborhood.affectAdjacency).toEqual(["affective_atmosphere"]);
    expect(normalized?.neighborhood.continuityCues).toEqual(["cue"]);
  });

  it("returns null for lifecycle payloads missing numeric core fields", () => {
    expect(
      normalizeLatentCenterLifecyclePayload({
        centerCategory: "agency_state",
        centerState: "possible",
        cooldownUntil: null,
        salience: {},
        attenuation: {},
        neighborhood: {},
      }),
    ).toBeNull();
  });

  it("normalizes malformed processing-mode payload toward bounded defaults", () => {
    const normalized = normalizeLatentCenterLifecyclePayload({
      centerCategory: "affect_transition",
      centerState: "possible",
      centerScore: 1.1,
      persistenceStreak: 1,
      cooldownUntil: null,
      salience: {},
      attenuation: {},
      neighborhood: {},
      processingMode: {
        selectedMode: "mythic",
        candidateModes: [{ mode: "affective", score: "bad", confidenceBand: "high" }],
        modeConfidence: 99,
        uncertainty: -7,
        rationaleTrace: ["  soft ", "", 7],
        noModeReason: 42,
        materialPriorities: {
          observations: 5,
        },
      },
    });

    expect(normalized?.processingMode.selectedMode).toBeNull();
    expect(normalized?.processingMode.candidateModes).toEqual([]);
    expect(normalized?.processingMode.modeConfidence).toBe(1);
    expect(normalized?.processingMode.uncertainty).toBe(0);
    expect(normalized?.processingMode.rationaleTrace).toEqual(["soft"]);
    expect(normalized?.processingMode.materialPriorities.observations).toBe(1.5);
  });
});
