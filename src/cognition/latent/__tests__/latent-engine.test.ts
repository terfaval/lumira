import { describe, expect, it } from "vitest";

import { buildLatentSnapshotScaffold } from "@/src/cognition/latent/latent-engine";
import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { GlossaryTerm } from "@/src/domain/glossary/types";
import type { Observation } from "@/src/domain/observation/types";
import type { ObservationCategory } from "@/src/domain/observation/types";
import type { Opening } from "@/src/domain/openings/types";
import type { ReflectiveResponse } from "@/src/domain/responses/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";

function baseObservation(): Observation {
  return {
    id: "obs-1",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    source: "system_descriptive_extract",
    summary: "summary",
    uncertaintyNotes: [],
    semanticPolicyResult: "accept",
    semanticPolicyReasons: [],
    provenanceTier: "system_extract",
    summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_semantic_guardrails_v1",
    status: "active",
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    fragments: [
      {
        id: "frag-1",
        observationId: "obs-1",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "recurrence_candidate",
        fragmentText: "same hallway again",
        evidenceAdequacy: "snippet_only",
        evidence: { snippet: "same hallway again", spanStart: null, spanEnd: null, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function observationWithRecurrence(): Observation {
  return baseObservation();
}

function observationWithAgencyAndMetacognition(): Observation {
  return {
    ...baseObservation(),
    id: "obs-2",
    fragments: [
      {
        id: "frag-2",
        observationId: "obs-2",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "agency_state",
        fragmentText: "I could not speak.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "I could not speak.", spanStart: 0, spanEnd: 17, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-3",
        observationId: "obs-2",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "metacognitive_moment",
        fragmentText: "I realized I was dreaming.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "I realized I was dreaming.", spanStart: 0, spanEnd: 25, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 1,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function observationWithAffectStructure(): Observation {
  return {
    ...baseObservation(),
    id: "obs-3",
    fragments: [
      {
        id: "frag-4",
        observationId: "obs-3",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "affect_transition",
        fragmentText: "Unease gradually intensified into fear.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "Unease gradually intensified into fear.", spanStart: 0, spanEnd: 38, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-5",
        observationId: "obs-3",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "emotional_contradiction",
        fragmentText: "Fear and curiosity appeared simultaneously.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "Fear and curiosity appeared simultaneously.", spanStart: 0, spanEnd: 41, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 1,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-6",
        observationId: "obs-3",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "affective_atmosphere",
        fragmentText: "The environment carried diffuse tension.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "The environment carried diffuse tension.", spanStart: 0, spanEnd: 39, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 2,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function observationWithSpatialDreamStatePhenomenology(): Observation {
  return {
    ...baseObservation(),
    id: "obs-4",
    fragments: [
      {
        id: "frag-7",
        observationId: "obs-4",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "spatial_instability",
        fragmentText: "The hallway looped back on itself.",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "The hallway looped back on itself.", spanStart: 0, spanEnd: 33, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-8",
        observationId: "obs-4",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "dream_state_quality",
        fragmentText: "I woke up in bed and realized I was still dreaming.",
        evidenceAdequacy: "strong_span",
        evidence: {
          snippet: "I woke up in bed and realized I was still dreaming.",
          spanStart: 0,
          spanEnd: 49,
          contextLabel: "raw_sentence",
        },
        uncertaintyNote: null,
        position: 1,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function observationWithHungarianPhenomenologicalCenter(): Observation {
  return {
    ...baseObservation(),
    id: "obs-hu-phenom",
    summary: "Movement difficulty, dream awareness, and mirror anomaly appear together.",
    fragments: [
      {
        id: "frag-hu-1",
        observationId: "obs-hu-phenom",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "agency_state",
        fragmentText: "The dreamer must run down the stairs but cannot move quickly enough.",
        evidenceAdequacy: "strong_span",
        evidence: {
          snippet: "Futnom kellett le a l\\u00e9pcs\\u0151n, de nem tudtam volna el\\u00e9g gyorsan haladni.",
          spanStart: 0,
          spanEnd: 69,
          contextLabel: "raw_sentence",
        },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-hu-2",
        observationId: "obs-hu-phenom",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "metacognitive_moment",
        fragmentText: "The dreamer realizes this is a dream.",
        evidenceAdequacy: "strong_span",
        evidence: {
          snippet: "K\\u00e9s\\u0151bb r\\u00e1j\\u00f6ttem, hogy \\u00e1lmodom.",
          spanStart: 70,
          spanEnd: 106,
          contextLabel: "raw_sentence",
        },
        uncertaintyNote: null,
        position: 1,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-hu-3",
        observationId: "obs-hu-phenom",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "altered_realism",
        fragmentText: "The mirror does not show the dreamer's reflection.",
        evidenceAdequacy: "strong_span",
        evidence: {
          snippet: "A t\\u00fck\\u00f6rben nem l\\u00e1tsz\\u00f3dtam.",
          spanStart: 107,
          spanEnd: 138,
          contextLabel: "raw_sentence",
        },
        uncertaintyNote: null,
        position: 2,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function observationWithWeakUncertainPhenomenology(): Observation {
  const observation = observationWithAffectStructure();
  observation.id = "obs-5";
  observation.summaryTrace = [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "weak" }];
  observation.semanticPolicyResult = "accept_with_uncertainty";
  observation.provenanceTier = "system_extract";
  observation.uncertaintyNotes = ["ambiguous"];
  observation.fragments = observation.fragments.map((fragment) => ({
    ...fragment,
    evidenceAdequacy: "weak_fallback",
    uncertaintyNote: "weak cue",
  }));
  return observation;
}

function observationWithRepeatedWeakRecurrence(fragmentCount: number): Observation {
  const fragments = Array.from({ length: fragmentCount }, (_, index) => ({
    id: `frag-weak-${index + 1}`,
    observationId: "obs-6",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    category: "recurrence_candidate" as const,
    fragmentText: "same pattern again",
    evidenceAdequacy: "weak_fallback" as const,
    evidence: { snippet: "same pattern again", spanStart: null, spanEnd: null, contextLabel: "raw_sentence" },
    uncertaintyNote: "weak support",
    position: index,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
  }));

  return {
    ...baseObservation(),
    id: "obs-6",
    summaryTrace: [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "weak" }],
    fragments,
  };
}

function unrelatedObservation(id: string, text: string): Observation {
  return {
    ...baseObservation(),
    id,
    summary: text,
    summaryTrace: [],
    fragments: [
      {
        ...baseObservation().fragments[0],
        id: `frag-${id}`,
        observationId: id,
        category: "scene",
        fragmentText: text,
        evidenceAdequacy: "strong_span",
        uncertaintyNote: null,
      },
    ],
  };
}

const dormantThread: ReflectiveThread = {
  id: "thread-1",
  userId: "user-1",
  title: "hallway continuity",
  contextNote: null,
  state: "dormant",
  visibility: "ambient",
  dormantSince: "2026-05-24T00:00:00.000Z",
  archivedAt: null,
  continuityCues: [],
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

const unrelatedDormantThread: ReflectiveThread = {
  ...dormantThread,
  id: "thread-2",
  title: "old ocean motif",
  continuityCues: [{ label: "ocean", phrasing: "ocean tide", source: "manual_note" }],
};

const relatedDormantThread: ReflectiveThread = {
  ...dormantThread,
  id: "thread-3",
  title: "hallway return",
  continuityCues: [{ label: "hallway", phrasing: "same hallway pattern", source: "manual_note" }],
};

const response: ReflectiveResponse = {
  id: "response-1",
  userId: "user-1",
  title: "response",
  responseText: "text",
  state: "active",
  visibility: "ambient",
  source: "manual_entry",
  archivedAt: null,
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

const localResponse: ReflectiveResponse = {
  ...response,
  id: "response-local",
  title: "hallway note",
  responseText: "the hallway returned with the same pattern",
};

const unrelatedResponse: ReflectiveResponse = {
  ...response,
  id: "response-unrelated",
  title: "separate note",
  responseText: "shopping list and weather details",
};

const glossaryTermWithUserNote: GlossaryTerm = {
  id: "term-1",
  userId: "user-1",
  normalizedKey: "hallway",
  displayLabel: "Hallway",
  notes: "This feels central whenever it appears.",
  state: "active",
  suppression: {
    state: "none",
    suppressedAt: null,
    reason: null,
  },
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

const glossaryTermWithoutContext: GlossaryTerm = {
  ...glossaryTermWithUserNote,
  id: "term-2",
  normalizedKey: "bridge",
  displayLabel: "Bridge",
  notes: null,
};

function lifecycleSnapshot(
  id: string,
  category: ObservationCategory,
  state: "possible" | "emerging" | "stabilized" | "weakening" | "dormant" | "suppressed",
  createdAt: string,
  options?: {
    cooldownUntil?: string | null;
    centerScore?: number;
    persistenceStreak?: number;
  },
): LatentSnapshot {
  return {
    id,
    userId: "user-1",
    summary: `Center candidate selected: ${category}`,
    confidenceBand: "tentative",
    visibility: "internal_only",
    provenance: {
      sourceReflectiveObjects: ["obj-1"],
      sourceObservations: [],
      sourceGlossaryTerms: [],
      sourceThreads: [],
      sourceResponses: [],
      generationContext: "test",
    },
    signals: [],
    suggestions: [],
    archivedAt: null,
    lifecycle: {
      centerCategory: category,
      centerState: state,
      centerScore: options?.centerScore ?? 1.2,
      persistenceStreak: options?.persistenceStreak ?? (state === "stabilized" ? 3 : state === "emerging" ? 2 : 1),
      cooldownUntil: options?.cooldownUntil ?? null,
      noCenterReason: null,
      salience: {
        userOwnedScore: 1.05,
        highlightScore: 0.2,
        glossaryDensityScore: 0.2,
        revisitationScore: 0.2,
        explicitEmphasisScore: 0.2,
        persistenceSignalScore: 0.25,
      },
      attenuation: {
        repetitionDecay: 0.85,
        refractoryPenalty: 0.9,
        cooldownPenalty: 1,
      },
      neighborhood: {
        relatedCategories: [category],
        glossaryAnchors: [],
        affectAdjacency: [],
        continuityCues: [],
      },
      processingMode: {
        selectedMode: null,
        candidateModes: [],
        modeConfidence: 0,
        uncertainty: 1,
        rationaleTrace: [],
        noModeReason: "test_fixture",
        materialPriorities: {
          observations: 0,
          glossary: 0,
          notes: 0,
          responses: 0,
          neighborhood: 0,
        },
      },
    },
    createdAt,
    updatedAt: createdAt,
  };
}

function suppressedOpening(
  snapshotRef: string,
  createdAt: string,
  overrides?: Partial<Opening["provenance"]>,
): Opening {
  return {
    id: "opening-suppressed-1",
    userId: "user-1",
    openingType: "reflective_question",
    tone: "gentle",
    utterance: "Not now.",
    state: "available",
    visibility: "invitation_surface",
    suppressionState: "suppressed",
    suppressionDuration: "indefinite",
    suppressionReason: "not_now",
    suppressionExpiry: { at: null },
    suppressionRevisitEligibility: "hidden",
    suppressionReactivatedAt: null,
    provenance: {
      sourceObjects: ["obj-1"],
      sourceObservations: ["obs-2"],
      sourceGlossaryTerms: [],
      sourceThreads: [],
      sourceResponses: [],
      latentSnapshotReference: snapshotRef,
      confidenceBand: "tentative",
      openingGenerationContext: "phase7_opening_scaffold",
      ...overrides,
    },
    activatedAt: null,
    dismissedAt: null,
    archivedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

describe("buildLatentSnapshotScaffold", () => {
  it("preserves provenance across suggestions and signals", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [dormantThread],
      responses: [response],
    });

    expect(snapshot.provenance.sourceReflectiveObjects).toContain("obj-1");
    expect(snapshot.provenance.sourceObservations).toContain("obs-1");
    expect(snapshot.provenance.sourceGlossaryTerms).toContain("term-1");
    expect(snapshot.provenance.sourceThreads).toContain("thread-1");
    expect(snapshot.provenance.sourceResponses).toHaveLength(0);
  });

  it("narrows response provenance to local reflective overlap only", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [],
      threads: [],
      responses: [localResponse, unrelatedResponse],
    });

    expect(snapshot.provenance.sourceResponses).toContain("response-local");
    expect(snapshot.provenance.sourceResponses).not.toContain("response-unrelated");
  });

  it("keeps observation provenance continuity-local under broad object history", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [
        observationWithAgencyAndMetacognition(),
        observationWithAffectStructure(),
        unrelatedObservation("obs-10", "weather report from unrelated daytime memory"),
        unrelatedObservation("obs-11", "shopping notes with no reflective continuity cues"),
        unrelatedObservation("obs-12", "logistics about commuting and groceries"),
      ],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    expect(snapshot.provenance.sourceObservations).toContain("obs-2");
    expect(snapshot.provenance.sourceObservations).not.toContain("obs-10");
    expect(snapshot.provenance.sourceObservations).not.toContain("obs-11");
    expect(snapshot.provenance.sourceObservations).not.toContain("obs-12");
  });

  it("caps local observation lineage persistence to a bounded provenance window", () => {
    const denseLocalHistory = Array.from({ length: 12 }, (_, index) => {
      const id = `obs-local-${index + 1}`;
      const observation = observationWithAgencyAndMetacognition();
      return {
        ...observation,
        id,
        fragments: observation.fragments.map((fragment, fragmentIndex) => ({
          ...fragment,
          id: `frag-local-${index + 1}-${fragmentIndex + 1}`,
          observationId: id,
        })),
      };
    });

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: denseLocalHistory,
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    expect(snapshot.provenance.sourceObservations.length).toBeLessThanOrEqual(8);
  });

  it("keeps suggestion phrasing non-authoritative", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const text = snapshot.suggestions.map((suggestion) => suggestion.phrasing.toLowerCase()).join(" ");
    expect(text).not.toContain("means");
    expect(text).not.toContain("proves");
    expect(text).not.toContain("you should");
  });

  it("does not elevate weak recurrence fragments into recurrence signals", () => {
    const weakRecurrenceObservation = observationWithRecurrence();
    weakRecurrenceObservation.fragments[0].evidenceAdequacy = "weak_fallback";

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [weakRecurrenceObservation],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const signalTypes = snapshot.signals.map((signal) => signal.signalType);
    expect(signalTypes).not.toContain("recurrence_possibility");
  });

  it("adds internal reflective opportunity seam signal for agency/metacognition fragments", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const signalTypes = snapshot.signals.map((signal) => signal.signalType);
    expect(signalTypes).toContain("reflective_opportunity_possibility");
  });

  it("adds internal reflective opportunity seam signal for affect structure fragments", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const signalTypes = snapshot.signals.map((signal) => signal.signalType);
    expect(signalTypes).toContain("reflective_opportunity_possibility");
  });

  it("adds internal reflective opportunity seam signal for spatial/dream-state phenomenology fragments", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithSpatialDreamStatePhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const signalTypes = snapshot.signals.map((signal) => signal.signalType);
    expect(signalTypes).toContain("reflective_opportunity_possibility");
  });

  it("treats combined agency, metacognition, and altered-realism fragments as center-relevant latent material", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithHungarianPhenomenologicalCenter()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("reflective_opportunity_possibility");
    expect(snapshot.lifecycle?.centerState).not.toBe("dormant");
  });

  it("keeps no-center silence path when evidence is weak and uncertain", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithWeakUncertainPhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const signalTypes = snapshot.signals.map((signal) => signal.signalType);
    expect(signalTypes).toContain("continuity_possibility");
    expect(signalTypes).not.toContain("reflective_opportunity_possibility");
    expect(snapshot.suggestions).toHaveLength(0);
  });

  it("uses provenance-aware weighting so reviewed evidence outranks weak extractor recurrence", () => {
    const weakRecurrence = observationWithRecurrence();
    weakRecurrence.summaryTrace = [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "weak" }];
    weakRecurrence.provenanceTier = "system_extract";
    weakRecurrence.fragments[0].evidenceAdequacy = "snippet_only";

    const reviewedPhenomenology = observationWithAgencyAndMetacognition();
    reviewedPhenomenology.provenanceTier = "reviewed";

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [weakRecurrence, reviewedPhenomenology],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [],
      responses: [],
    });

    expect(snapshot.confidenceBand).toBe("moderate");
    const reflectiveSignal = snapshot.signals.find((signal) => signal.signalType === "reflective_opportunity_possibility");
    expect(reflectiveSignal?.confidenceBand).toBe("moderate");
  });

  it("applies recurrence saturation penalty for repeated weak lexical overlap", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRepeatedWeakRecurrence(8)],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const recurrenceSignal = snapshot.signals.find((signal) => signal.signalType === "recurrence_possibility");
    expect(recurrenceSignal).toBeUndefined();
    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("continuity_possibility");
  });

  it("enforces scope discipline by suppressing unrelated dormant thread resurfacing", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [],
      threads: [unrelatedDormantThread],
      responses: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).not.toContain("dormant_thread_resurfacing_possibility");
  });

  it("allows dormant thread resurfacing only when local overlap exists", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [],
      threads: [relatedDormantThread],
      responses: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("dormant_thread_resurfacing_possibility");
  });

  it("keeps center selection stable regardless of input observation ordering", () => {
    const first = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition(), observationWithAffectStructure()],
      glossaryTerms: [glossaryTermWithUserNote, glossaryTermWithoutContext],
      threads: [relatedDormantThread],
      responses: [response],
    });
    const second = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure(), observationWithAgencyAndMetacognition()],
      glossaryTerms: [glossaryTermWithoutContext, glossaryTermWithUserNote],
      threads: [relatedDormantThread],
      responses: [response],
    });

    expect(first.summary).toBe(second.summary);
    expect(first.signals.map((signal) => signal.signalType)).toEqual(second.signals.map((signal) => signal.signalType));
  });

  it("progresses lifecycle state from possible to emerging to stabilized for sustained center continuity", () => {
    const first = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [],
      responses: [response],
      recentSnapshots: [],
      recentOpenings: [],
    });

    const second = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [],
      responses: [response],
      recentSnapshots: [lifecycleSnapshot("latent-1", "agency_state", "possible", "2026-05-26T08:00:00.000Z")],
      recentOpenings: [],
    });

    const third = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [],
      responses: [response],
      recentSnapshots: [lifecycleSnapshot("latent-2", "agency_state", "emerging", "2026-05-26T08:20:00.000Z")],
      recentOpenings: [],
    });

    expect(first.lifecycle?.centerState).toBe("possible");
    expect(second.lifecycle?.centerState).toBe("emerging");
    expect(third.lifecycle?.centerState).toBe("stabilized");
  });

  it("demotes stabilized center toward weakening when no-center evidence appears", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithWeakUncertainPhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [lifecycleSnapshot("latent-prev", "affect_transition", "stabilized", "2026-05-26T08:20:00.000Z")],
      recentOpenings: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("continuity_possibility");
    expect(snapshot.lifecycle?.centerState).toBe("weakening");
  });

  it("preserves silence and transitions weakening center to dormant under continued sparse input", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithWeakUncertainPhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [lifecycleSnapshot("latent-prev", "affect_transition", "weakening", "2026-05-26T09:20:00.000Z")],
      recentOpenings: [],
    });

    expect(snapshot.suggestions).toHaveLength(0);
    expect(snapshot.lifecycle?.centerState).toBe("dormant");
  });

  it("honors suppression history by moving lifecycle to suppressed when overlapping suppression exists", () => {
    const prev = lifecycleSnapshot("latent-prev", "agency_state", "emerging", "2026-05-26T09:20:00.000Z");
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z")],
    });

    expect(snapshot.lifecycle?.centerState).toBe("suppressed");
  });

  it("does not globally suppress unrelated center candidates on the same reflective object", () => {
    const prev = lifecycleSnapshot("latent-prev", "affect_transition", "emerging", "2026-05-26T09:20:00.000Z");
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [
        suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z", {
          sourceObservations: ["obs-2"],
        }),
      ],
    });

    expect(snapshot.lifecycle?.centerState).not.toBe("suppressed");
  });

  it("does not suppress based on response overlap alone when other locality signals are absent", () => {
    const prev = lifecycleSnapshot("latent-prev", "affect_transition", "emerging", "2026-05-26T09:20:00.000Z");
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [response],
      recentSnapshots: [prev],
      recentOpenings: [
        suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z", {
          sourceObservations: [],
          sourceGlossaryTerms: [],
          sourceThreads: [],
          sourceResponses: ["response-1"],
        }),
      ],
    });

    expect(snapshot.lifecycle?.centerState).not.toBe("suppressed");
  });

  it("degrades broad observation-only lineage toward non-suppression when locality is ambiguous", () => {
    const prev = lifecycleSnapshot("latent-prev", "agency_state", "emerging", "2026-05-26T09:20:00.000Z");
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [
        suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z", {
          sourceObservations: ["obs-2", "obs-10", "obs-11", "obs-12", "obs-13", "obs-14", "obs-15"],
          sourceGlossaryTerms: [],
          sourceThreads: [],
          sourceResponses: [],
        }),
      ],
    });

    expect(snapshot.lifecycle?.centerState).not.toBe("suppressed");
  });

  it("applies suppression when continuity overlap is neighborhood-local via glossary lineage", () => {
    const prev = lifecycleSnapshot("latent-prev", "affect_transition", "emerging", "2026-05-26T09:20:00.000Z");
    const localGlossary: GlossaryTerm = {
      ...glossaryTermWithUserNote,
      id: "term-fear",
      normalizedKey: "fear",
      displayLabel: "Fear",
      notes: "This line is too intense right now.",
    };
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [localGlossary],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [
        suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z", {
          sourceObservations: [],
          sourceGlossaryTerms: ["term-fear"],
          sourceThreads: [],
        }),
      ],
    });

    expect(snapshot.lifecycle?.centerState).toBe("suppressed");
  });

  it("keeps no-center valid when suppression exists but does not overlap current continuity line", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithWeakUncertainPhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [lifecycleSnapshot("latent-prev", "affect_transition", "weakening", "2026-05-26T09:20:00.000Z")],
      recentOpenings: [
        suppressedOpening("latent-other", "2026-05-26T09:30:00.000Z", {
          sourceObservations: ["obs-2"],
          sourceThreads: ["thread-2"],
          sourceGlossaryTerms: ["term-2"],
        }),
      ],
    });

    expect(snapshot.lifecycle?.centerState).toBe("dormant");
    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("continuity_possibility");
  });

  it("prioritizes suppression over cooldown when overlap is center-local", () => {
    const prev = lifecycleSnapshot("latent-prev", "agency_state", "stabilized", "2026-05-26T09:20:00.000Z", {
      cooldownUntil: "2099-01-01T00:00:00.000Z",
      centerScore: 1.3,
      persistenceStreak: 4,
    });
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z")],
    });

    expect(snapshot.lifecycle?.centerState).toBe("suppressed");
    expect(snapshot.lifecycle?.noCenterReason).toBe("suppression_active");
  });

  it("applies anti-thrashing hysteresis by retaining prior stabilized center against marginal challenger", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-1", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z"),
        lifecycleSnapshot("latent-2", "affect_transition", "possible", "2026-05-26T09:20:00.000Z"),
        lifecycleSnapshot("latent-3", "agency_state", "stabilized", "2026-05-26T09:00:00.000Z"),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.centerCategory).toBe("agency_state");
  });

  it("attenuates repeated recurrence across snapshots without user salience reinforcement", () => {
    const recurrenceOnly = observationWithRecurrence();
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [recurrenceOnly],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-r1", "continuity_fragment", "possible", "2026-05-26T08:00:00.000Z"),
        lifecycleSnapshot("latent-r2", "continuity_fragment", "possible", "2026-05-26T08:30:00.000Z"),
        lifecycleSnapshot("latent-r3", "continuity_fragment", "possible", "2026-05-26T09:00:00.000Z"),
      ],
      recentOpenings: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("continuity_possibility");
    expect(snapshot.signals.map((signal) => signal.signalType)).not.toContain("recurrence_possibility");
  });

  it("allows user-owned salience to outrank recurrence attenuation and stabilize center", () => {
    const recurrenceAndPhenomenology = observationWithAgencyAndMetacognition();
    recurrenceAndPhenomenology.fragments.push({
      ...baseObservation().fragments[0],
      id: "frag-rec-extra",
      observationId: recurrenceAndPhenomenology.id,
      category: "recurrence_candidate",
      fragmentText: "same hallway again",
      evidenceAdequacy: "snippet_only",
      position: 2,
    });

    const strongGlossary = {
      ...glossaryTermWithUserNote,
      notes: "This keeps returning and matters deeply.",
    };
    const salientResponse: ReflectiveResponse = {
      ...response,
      responseText: "I keep returning to this exact line and want to stay with it.",
    };

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [recurrenceAndPhenomenology],
      glossaryTerms: [strongGlossary],
      threads: [],
      responses: [salientResponse],
      recentSnapshots: [
        lifecycleSnapshot("latent-s1", "agency_state", "emerging", "2026-05-26T07:00:00.000Z"),
        lifecycleSnapshot("latent-s2", "agency_state", "emerging", "2026-05-26T08:00:00.000Z"),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.centerState).toBe("stabilized");
  });

  it("persists bounded continuity neighborhood metadata for local adjacent context", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure(), observationWithSpatialDreamStatePhenomenology()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [relatedDormantThread],
      responses: [response],
      recentSnapshots: [],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.neighborhood.relatedCategories.length).toBeGreaterThan(0);
    expect(snapshot.lifecycle?.neighborhood.relatedCategories.length).toBeLessThanOrEqual(4);
  });

  it("blocks rapid challenger reactivation while cooldown is active", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-c1", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z", {
          cooldownUntil: "2099-01-01T00:00:00.000Z",
          centerScore: 1.35,
          persistenceStreak: 4,
        }),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.centerCategory).toBe("agency_state");
  });

  it("allows challenger progression after cooldown expiry", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-c2", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z", {
          cooldownUntil: "2020-01-01T00:00:00.000Z",
          centerScore: 1.05,
          persistenceStreak: 3,
        }),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.centerCategory).toBe("affect_transition");
  });

  it("keeps no-center outcome valid under active cooldown with weak evidence", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithWeakUncertainPhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-c3", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z", {
          cooldownUntil: "2099-01-01T00:00:00.000Z",
          centerScore: 1.35,
          persistenceStreak: 4,
        }),
      ],
      recentOpenings: [],
    });

    expect(snapshot.signals.map((signal) => signal.signalType)).toContain("continuity_possibility");
    expect(snapshot.suggestions).toHaveLength(0);
    expect(snapshot.lifecycle?.centerState).toBe("weakening");
  });

  it("extends cooldown window when challenge pressure appears during active cooldown", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        lifecycleSnapshot("latent-c4", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z", {
          cooldownUntil: "2099-01-01T00:00:00.000Z",
          centerScore: 1.35,
          persistenceStreak: 4,
        }),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.cooldownUntil).not.toBeNull();
    expect(Date.parse(snapshot.lifecycle!.cooldownUntil!)).toBeGreaterThan(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  it("does not unfairly block strong user-owned salience during active cooldown", () => {
    const strongSalienceObservation = observationWithAffectStructure();
    strongSalienceObservation.provenanceTier = "manual_user";
    strongSalienceObservation.summaryTrace = strongSalienceObservation.summaryTrace.map((trace) => ({
      ...trace,
      reason: "explicit_anchor",
      strength: "strong",
    }));

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [strongSalienceObservation],
      glossaryTerms: [
        {
          ...glossaryTermWithUserNote,
          notes: "This reflective line is actively important right now.",
        },
      ],
      threads: [],
      responses: [response, { ...response, id: "response-2", responseText: "I want to stay with this now." }],
      reflectiveObjectMetadata: {
        highlightCount: 8,
        explicitEmphasis: 3,
      },
      recentSnapshots: [
        lifecycleSnapshot("latent-c5", "agency_state", "stabilized", "2026-05-26T09:40:00.000Z", {
          cooldownUntil: "2099-01-01T00:00:00.000Z",
          centerScore: 1.2,
          persistenceStreak: 4,
        }),
      ],
      recentOpenings: [],
    });

    expect(snapshot.lifecycle?.centerCategory).toBe("affect_transition");
    expect(snapshot.lifecycle?.centerState).not.toBe("dormant");
  });

  it("selects agency-oriented processing mode for agency/metacognitive gravity", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBe("agency_oriented");
  });

  it("selects affective processing mode for affect-dense gravity", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBe("affective");
  });

  it("selects existential processing mode for dream-state instability gravity", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithSpatialDreamStatePhenomenology()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBe("existential");
  });

  it("selects continuity-oriented processing mode for strong recurrence continuity", () => {
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithRecurrence()],
      glossaryTerms: [glossaryTermWithUserNote],
      threads: [relatedDormantThread],
      responses: [localResponse],
      recentSnapshots: [
        lifecycleSnapshot("latent-k1", "continuity_fragment", "emerging", "2026-05-26T08:00:00.000Z"),
        lifecycleSnapshot("latent-k2", "continuity_fragment", "emerging", "2026-05-26T07:00:00.000Z"),
      ],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBe("continuity_oriented");
  });

  it("keeps exploratory distinct from no-mode when moderate uncertainty has local reflective gravity", () => {
    const exploratoryGravity: Observation = {
      ...baseObservation(),
      id: "obs-explore-mid",
      summary: "A hallway and a figure were present, but details stayed partially unclear.",
      semanticPolicyResult: "accept",
      uncertaintyNotes: [],
      fragments: [
        {
          ...baseObservation().fragments[0],
          id: "frag-explore-mid-1",
          observationId: "obs-explore-mid",
          category: "scene",
          fragmentText: "A hallway appeared.",
          evidenceAdequacy: "snippet_only",
          uncertaintyNote: "partial cue",
        },
        {
          ...baseObservation().fragments[0],
          id: "frag-explore-mid-2",
          observationId: "obs-explore-mid",
          category: "actor",
          fragmentText: "A figure stood nearby.",
          evidenceAdequacy: "snippet_only",
          uncertaintyNote: null,
          position: 1,
        },
      ],
    };

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [exploratoryGravity],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBe("exploratory");
    expect(mode?.noModeReason).toBeNull();
    expect(mode?.uncertainty).toBeGreaterThan(0.4);
  });

  it("prefers no-mode silence over weak exploratory under extreme uncertainty", () => {
    const uncertainScene = observationWithWeakUncertainPhenomenology();
    uncertainScene.id = "obs-explore-high";
    uncertainScene.fragments = uncertainScene.fragments.map((fragment, index) => ({
      ...fragment,
      id: `frag-explore-high-${index + 1}`,
      observationId: "obs-explore-high",
      category: index % 2 === 0 ? "scene" : "actor",
    }));

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [uncertainScene],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBeNull();
    expect(mode?.noModeReason).toBe("high_uncertainty");
  });

  it("keeps no-mode legitimacy when mode competition remains ambiguous", () => {
    const affectiveAmbiguous: Observation = {
      ...baseObservation(),
      id: "obs-amb-1",
      summary: "fear rose and then softened",
      uncertaintyNotes: [],
      fragments: [
        {
          ...baseObservation().fragments[0],
          id: "frag-amb-a-1",
          observationId: "obs-amb-1",
          category: "affect_transition",
          fragmentText: "Fear rose and then softened.",
          evidenceAdequacy: "snippet_only",
          uncertaintyNote: null,
        },
      ],
    };
    const agencyAmbiguous: Observation = {
      ...baseObservation(),
      id: "obs-amb-2",
      summary: "I tried to act but paused",
      uncertaintyNotes: [],
      fragments: [
        {
          ...baseObservation().fragments[0],
          id: "frag-amb-b-1",
          observationId: "obs-amb-2",
          category: "agency_state",
          fragmentText: "I tried to act but paused.",
          evidenceAdequacy: "snippet_only",
          uncertaintyNote: null,
        },
      ],
    };

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [affectiveAmbiguous, agencyAmbiguous],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBeNull();
    expect(typeof mode?.noModeReason).toBe("string");
  });

  it("keeps center-eligible no-mode phrasing mode-silent without derived fallback flavor", () => {
    const affectiveCompetitive: Observation = {
      ...baseObservation(),
      id: "obs-no-mode-center-a",
      provenanceTier: "reviewed",
      summaryTrace: [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "weak" }],
      uncertaintyNotes: [],
      semanticPolicyResult: "accept",
      fragments: [
        {
          ...baseObservation().fragments[0],
          id: "frag-no-mode-center-a",
          observationId: "obs-no-mode-center-a",
          category: "affect_transition",
          fragmentText: "Fear shifted into relief.",
          evidenceAdequacy: "strong_span",
          uncertaintyNote: null,
        },
      ],
    };
    const agencyCompetitive: Observation = {
      ...baseObservation(),
      id: "obs-no-mode-center-b",
      provenanceTier: "reviewed",
      summaryTrace: [{ fragmentPosition: 0, reason: "inferred_overlap", strength: "weak" }],
      uncertaintyNotes: [],
      semanticPolicyResult: "accept",
      fragments: [
        {
          ...baseObservation().fragments[0],
          id: "frag-no-mode-center-b",
          observationId: "obs-no-mode-center-b",
          category: "agency_state",
          fragmentText: "I tried to respond but paused.",
          evidenceAdequacy: "strong_span",
          uncertaintyNote: null,
        },
      ],
    };

    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [affectiveCompetitive, agencyCompetitive],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(mode?.selectedMode).toBeNull();
    expect(snapshot.summary).toContain("(no_mode)");
    const opening = snapshot.suggestions.find((suggestion) => suggestion.suggestionType === "possible_opening");
    expect(opening?.phrasing).toBe("A gentle reflective opening might relate here.");
    const reflectiveSignal = snapshot.signals.find((signal) => signal.signalType === "reflective_opportunity_possibility");
    expect(reflectiveSignal?.description).not.toContain("(exploratory)");
    expect(reflectiveSignal?.description).not.toContain("(affective)");
    expect(reflectiveSignal?.description).not.toContain("(agency_oriented)");
    expect(reflectiveSignal?.description).not.toContain("(existential)");
    expect(reflectiveSignal?.description).not.toContain("(continuity_oriented)");
  });

  it("propagates cooldown/suppression calmness into processing-mode confidence", () => {
    const prev = lifecycleSnapshot("latent-p1", "agency_state", "stabilized", "2026-05-26T09:20:00.000Z", {
      cooldownUntil: "2099-01-01T00:00:00.000Z",
      centerScore: 1.3,
      persistenceStreak: 4,
    });
    const snapshot = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [prev],
      recentOpenings: [suppressedOpening(prev.id, "2026-05-26T09:30:00.000Z")],
    });

    const mode = snapshot.lifecycle?.processingMode;
    expect(snapshot.lifecycle?.centerState).toBe("suppressed");
    expect(mode?.modeConfidence).toBeLessThan(0.7);
  });

  it("keeps processing-mode selection revisable across snapshots", () => {
    const early = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAffectStructure()],
      glossaryTerms: [],
      threads: [],
      responses: [],
    });
    const followUp = buildLatentSnapshotScaffold({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observationWithAgencyAndMetacognition()],
      glossaryTerms: [],
      threads: [],
      responses: [],
      recentSnapshots: [
        {
          ...lifecycleSnapshot("latent-rev-1", "affect_transition", "emerging", "2026-05-26T08:00:00.000Z"),
          lifecycle: early.lifecycle,
        },
      ],
    });

    const earlyMode = early.lifecycle?.processingMode;
    const followUpMode = followUp.lifecycle?.processingMode;
    expect(earlyMode?.selectedMode).toBe("affective");
    expect(followUpMode?.selectedMode).toBe("agency_oriented");
  });
});
