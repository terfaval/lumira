import { describe, expect, it } from "vitest";

import { LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS, toInternalLatentSnapshot, toPublicLatentSnapshot } from "@/src/domain/latent/transport";
import type { LatentSnapshot } from "@/src/domain/latent/types";

const baseSnapshot: LatentSnapshot = {
  id: "latent-1",
  userId: "user-1",
  summary: "Center candidate selected: agency_state (agency_oriented) with lifecycle state stabilized.",
  confidenceBand: "moderate",
  visibility: "internal_only",
  provenance: {
    generationContext: "phase6_latent_scaffold",
    sourceReflectiveObjects: ["obj-1"],
    sourceObservations: ["obs-1"],
    sourceGlossaryTerms: ["term-1"],
    sourceThreads: ["thread-1"],
    sourceResponses: ["response-1"],
  },
  signals: [
    {
      id: "signal-optional",
      snapshotId: "latent-1",
      userId: "user-1",
      signalType: "recurrence_possibility",
      label: "Possible recurrence nearby",
      description: "A recurrence-oriented observation fragment appears in current material.",
      confidenceBand: "tentative",
      visibility: "reflective_space_optional",
      provenance: {
        generationContext: "phase6_latent_scaffold",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    },
    {
      id: "signal-internal",
      snapshotId: "latent-1",
      userId: "user-1",
      signalType: "reflective_opportunity_possibility",
      label: "Reflective center candidate: agency_state",
      description: "Weighted center remains provisional (agency_oriented); uncertainty and demotion remain active.",
      confidenceBand: "moderate",
      visibility: "internal_only",
      provenance: {
        generationContext: "phase6_latent_scaffold",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    },
  ],
  suggestions: [
    {
      id: "suggestion-optional",
      snapshotId: "latent-1",
      userId: "user-1",
      suggestionType: "possible_opening",
      phrasing: "A gentle opening around agency or awareness shift may be worth considering.",
      confidenceBand: "moderate",
      visibility: "reflective_space_optional",
      provenance: {
        generationContext: "phase6_latent_scaffold",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    },
    {
      id: "suggestion-internal",
      snapshotId: "latent-1",
      userId: "user-1",
      suggestionType: "possible_opening",
      phrasing: "internal",
      confidenceBand: "low",
      visibility: "internal_only",
      provenance: {
        generationContext: "phase6_latent_scaffold",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      createdAt: "2026-05-31T10:00:00.000Z",
      updatedAt: "2026-05-31T10:00:00.000Z",
    },
  ],
  lifecycle: {
    centerCategory: "agency_state",
    centerState: "stabilized",
    centerScore: 1.8,
    persistenceStreak: 4,
    cooldownUntil: "2026-05-31T10:30:00.000Z",
    noCenterReason: null,
    salience: {
      userOwnedScore: 1.5,
      highlightScore: 0.8,
      glossaryDensityScore: 0.4,
      revisitationScore: 0.6,
      explicitEmphasisScore: 0.5,
      persistenceSignalScore: 0.5,
    },
    attenuation: {
      repetitionDecay: 0.9,
      refractoryPenalty: 1,
      cooldownPenalty: 1,
    },
    neighborhood: {
      relatedCategories: ["agency_state"],
      glossaryAnchors: ["Hallway"],
      affectAdjacency: [],
      continuityCues: ["hallway return"],
    },
    processingMode: {
      selectedMode: "agency_oriented",
      candidateModes: [
        {
          mode: "agency_oriented",
          score: 1.6,
          confidenceBand: "moderate",
          rationale: ["base=1.60"],
        },
      ],
      modeConfidence: 0.74,
      uncertainty: 0.22,
      rationaleTrace: ["top=agency_oriented:1.60"],
      noModeReason: null,
      materialPriorities: {
        observations: 1.1,
        glossary: 0.4,
        notes: 0.2,
        responses: 0.3,
        neighborhood: 0.8,
      },
    },
  },
  archivedAt: null,
  createdAt: "2026-05-31T10:00:00.000Z",
  updatedAt: "2026-05-31T10:00:00.000Z",
};

describe("latent transport projection", () => {
  it("excludes internal orchestration payloads from default public projection", () => {
    const projected = toPublicLatentSnapshot(baseSnapshot);

    expect(projected.summary.toLowerCase()).not.toContain("agency_oriented");
    expect(projected.signals).toHaveLength(1);
    expect(projected.suggestions).toHaveLength(1);
    expect(projected.lifecycle).toEqual({
      centerState: "stabilized",
      noCenterReason: null,
    });
    expect(projected.lifecycle).not.toHaveProperty("centerCategory");
    expect(projected.lifecycle).not.toHaveProperty("processingMode");
  });

  it("keeps internal orchestration payload available via explicit internal projection", () => {
    const internal = toInternalLatentSnapshot(baseSnapshot);
    expect(internal.lifecycle?.processingMode.selectedMode).toBe("agency_oriented");
    expect(internal.lifecycle?.processingMode.candidateModes).toHaveLength(1);
    expect(internal.lifecycle?.processingMode.rationaleTrace).toHaveLength(1);
    expect(internal.lifecycle?.processingMode.materialPriorities.observations).toBeGreaterThan(0);
  });

  it("maintains explicit internal-only field registry for future boundary audits", () => {
    expect(LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS).toContain("processingMode");
    expect(LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS).toContain("candidateModes");
    expect(LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS).toContain("rationaleTrace");
    expect(LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS).toContain("materialPriorities");
  });

  it("keeps backward-compatible snapshot envelope when lifecycle is absent", () => {
    const projected = toPublicLatentSnapshot({
      ...baseSnapshot,
      lifecycle: undefined,
    });

    expect(projected.id).toBe("latent-1");
    expect(projected.lifecycle).toBeNull();
    expect(projected.createdAt).toBe(baseSnapshot.createdAt);
    expect(projected.updatedAt).toBe(baseSnapshot.updatedAt);
  });

  it("keeps no-mode state mode-silent in public payload while preserving internal no-mode metadata", () => {
    const noModeSnapshot: LatentSnapshot = {
      ...baseSnapshot,
      summary: "Center candidate selected: affect_transition (no_mode) with lifecycle state possible.",
      lifecycle: {
        ...baseSnapshot.lifecycle!,
        centerCategory: "affect_transition",
        centerState: "possible",
        processingMode: {
          ...baseSnapshot.lifecycle!.processingMode,
          selectedMode: null,
          noModeReason: "competing_weak_modes",
        },
      },
    };

    const projected = toPublicLatentSnapshot(noModeSnapshot);
    expect(projected.summary.toLowerCase()).not.toContain("no_mode");
    expect(projected.summary.toLowerCase()).not.toContain("exploratory");
    expect(projected.summary.toLowerCase()).not.toContain("affective");
    expect(projected.lifecycle).toEqual({
      centerState: "possible",
      noCenterReason: null,
    });

    const internal = toInternalLatentSnapshot(noModeSnapshot);
    expect(internal.lifecycle?.processingMode.selectedMode).toBeNull();
    expect(internal.lifecycle?.processingMode.noModeReason).toBe("competing_weak_modes");
  });
});
