import { describe, expect, it } from "vitest";

import { fromLatentRows, toLatentSnapshotInsertRow, type LatentSnapshotRow } from "@/src/infrastructure/supabase/adapters/latent-row";

describe("latent row adapters", () => {
  it("preserves provenance references in snapshot insert row", () => {
    const row = toLatentSnapshotInsertRow({
      userId: "user-1",
      summary: "summary",
      confidenceBand: "tentative",
      visibility: "internal_only",
      provenance: {
        generationContext: "phase6_test",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: ["term-1"],
        sourceThreads: ["thread-1"],
        sourceResponses: ["response-1"],
      },
      signals: [],
      suggestions: [],
    });

    expect(row.source_reflective_objects).toEqual(["obj-1"]);
    expect(row.source_observations).toEqual(["obs-1"]);
    expect(row.source_glossary_terms).toEqual(["term-1"]);
    expect(row.source_threads).toEqual(["thread-1"]);
    expect(row.source_responses).toEqual(["response-1"]);
    expect(row.generation_context).toBe("phase6_test");
  });

  it("stores empty lifecycle payload object when lifecycle is missing", () => {
    const row = toLatentSnapshotInsertRow({
      userId: "user-1",
      summary: "summary",
      confidenceBand: "tentative",
      visibility: "internal_only",
      provenance: {
        generationContext: "phase6_test",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      signals: [],
      suggestions: [],
    });

    expect(row.lifecycle_payload).toEqual({});
    expect(row.center_state).toBeNull();
  });

  it("falls back to legacy columns when lifecycle payload is empty", () => {
    const snapshot = fromLatentRows(
      {
        id: "latent-1",
        user_id: "user-1",
        summary: "summary",
        confidence_band: "tentative",
        visibility: "internal_only",
        generation_context: "phase6_test",
        source_reflective_objects: ["obj-1"],
        source_observations: [],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        center_category: "agency_state",
        center_state: "emerging",
        center_score: 1.2,
        center_persistence_streak: 2,
        center_cooldown_until: null,
        lifecycle_payload: {},
        archived_at: null,
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      } satisfies LatentSnapshotRow,
      [],
      [],
    );

    expect(snapshot.lifecycle?.centerState).toBe("emerging");
    expect(snapshot.lifecycle?.centerCategory).toBe("agency_state");
  });

  it("degrades invalid payload and returns lifecycle-null when no valid legacy state exists", () => {
    const snapshot = fromLatentRows(
      {
        id: "latent-2",
        user_id: "user-1",
        summary: "summary",
        confidence_band: "low",
        visibility: "internal_only",
        generation_context: "phase6_test",
        source_reflective_objects: ["obj-1"],
        source_observations: [],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        center_category: null,
        center_state: null,
        center_score: 0,
        center_persistence_streak: 0,
        center_cooldown_until: null,
        lifecycle_payload: {
          centerState: "invalid",
        },
        archived_at: null,
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      } satisfies LatentSnapshotRow,
      [],
      [],
    );

    expect(snapshot.lifecycle).toBeUndefined();
  });

  it("normalizes malformed lifecycle payload fields safely", () => {
    const snapshot = fromLatentRows(
      {
        id: "latent-3",
        user_id: "user-1",
        summary: "summary",
        confidence_band: "moderate",
        visibility: "internal_only",
        generation_context: "phase6_test",
        source_reflective_objects: ["obj-1"],
        source_observations: [],
        source_glossary_terms: [],
        source_threads: [],
        source_responses: [],
        center_category: "affect_transition",
        center_state: "stabilized",
        center_score: 1.8,
        center_persistence_streak: 4,
        center_cooldown_until: null,
        lifecycle_payload: {
          centerCategory: "affect_transition",
          centerState: "stabilized",
          centerScore: 999,
          persistenceStreak: -4,
          cooldownUntil: "bad-date",
          noCenterReason: null,
          salience: {
            userOwnedScore: 7,
          },
          attenuation: {
            repetitionDecay: -1,
            refractoryPenalty: 9,
            cooldownPenalty: 1,
          },
          neighborhood: {
            relatedCategories: ["affect_transition", "bad_category"],
            glossaryAnchors: [" fear ", ""],
            affectAdjacency: ["affective_atmosphere", "bad"],
            continuityCues: [" cue ", null],
          },
        },
        archived_at: null,
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      } satisfies LatentSnapshotRow,
      [],
      [],
    );

    expect(snapshot.lifecycle?.centerScore).toBe(100);
    expect(snapshot.lifecycle?.persistenceStreak).toBe(0);
    expect(snapshot.lifecycle?.cooldownUntil).toBeNull();
    expect(snapshot.lifecycle?.salience.userOwnedScore).toBe(4);
    expect(snapshot.lifecycle?.attenuation.repetitionDecay).toBe(0);
    expect(snapshot.lifecycle?.neighborhood.relatedCategories).toEqual(["affect_transition"]);
  });

  it("keeps adapter contract consistent across write/read lifecycle normalization", () => {
    const insert = toLatentSnapshotInsertRow({
      userId: "user-1",
      summary: "summary",
      confidenceBand: "moderate",
      visibility: "internal_only",
      provenance: {
        generationContext: "phase6_test",
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: [],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
      },
      signals: [],
      suggestions: [],
      lifecycle: {
        centerCategory: "agency_state",
        centerState: "stabilized",
        centerScore: 1.9,
        persistenceStreak: 5,
        cooldownUntil: "2026-05-26T12:00:00.000Z",
        noCenterReason: null,
        salience: {
          userOwnedScore: 1.5,
          highlightScore: 0.5,
          glossaryDensityScore: 0.5,
          revisitationScore: 0.4,
          explicitEmphasisScore: 0.3,
          persistenceSignalScore: 0.2,
        },
        attenuation: {
          repetitionDecay: 0.9,
          refractoryPenalty: 0.9,
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
              rationale: ["agency and metacognitive cues are locally dominant"],
            },
          ],
          modeConfidence: 0.74,
          uncertainty: 0.22,
          rationaleTrace: ["agency and metacognitive cues are locally dominant"],
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
    });

    const snapshot = fromLatentRows(
      {
        id: "latent-4",
        user_id: "user-1",
        summary: insert.summary,
        confidence_band: insert.confidence_band,
        visibility: insert.visibility,
        generation_context: insert.generation_context,
        source_reflective_objects: insert.source_reflective_objects,
        source_observations: insert.source_observations,
        source_glossary_terms: insert.source_glossary_terms,
        source_threads: insert.source_threads,
        source_responses: insert.source_responses,
        center_category: insert.center_category ?? null,
        center_state: insert.center_state ?? null,
        center_score: insert.center_score ?? null,
        center_persistence_streak: insert.center_persistence_streak ?? null,
        center_cooldown_until: insert.center_cooldown_until ?? null,
        lifecycle_payload: insert.lifecycle_payload,
        archived_at: null,
        created_at: "2026-05-26T00:00:00.000Z",
        updated_at: "2026-05-26T00:00:00.000Z",
      } satisfies LatentSnapshotRow,
      [],
      [],
    );

    expect(snapshot.lifecycle?.centerState).toBe("stabilized");
    expect(snapshot.lifecycle?.centerCategory).toBe("agency_state");
    expect(snapshot.lifecycle?.persistenceStreak).toBe(5);
    expect(snapshot.lifecycle?.processingMode.selectedMode).toBe("agency_oriented");
    expect(snapshot.lifecycle?.processingMode.candidateModes[0]?.mode).toBe("agency_oriented");
  });
});
