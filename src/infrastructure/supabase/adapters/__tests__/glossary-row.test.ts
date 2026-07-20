import { describe, expect, it } from "vitest";

import {
  fromGlossaryCandidateRow,
  fromGlossaryAppearanceRecordRow,
  fromGlossaryTermRow,
  toGlossaryAppearanceRecordInsertRow,
  toGlossaryCandidateInsertRow,
  toGlossaryCandidateLifecycleUpdateRow,
  toGlossaryTermInsertRow,
} from "@/src/infrastructure/supabase/adapters/glossary-row";

describe("glossary term row mapping", () => {
  it("maps continuity entity fields from glossary term rows", () => {
    const term = fromGlossaryTermRow({
      id: "term-1",
      user_id: "user-1",
      normalized_key: "bridge",
      display_label: "Bridge",
      canonical_label: "Bridge",
      type: "place",
      aliases: ["bridge", "the bridge"],
      general_note: "Recurring crossing point.",
      appearance_count: 3,
      notes: "Recurring crossing point.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-11T00:00:00.000Z",
      updated_at: "2026-06-11T00:00:00.000Z",
    });

    expect(term.canonicalLabel).toBe("Bridge");
    expect(term.type).toBe("place");
    expect(term.aliases).toEqual(["bridge", "the bridge"]);
    expect(term.generalNote).toBe("Recurring crossing point.");
    expect(term.appearanceCount).toBe(3);
    expect(term.displayLabel).toBe("Bridge");
    expect(term.notes).toBe("Recurring crossing point.");
  });

  it("builds continuity entity insert rows with compatibility mirrors", () => {
    const row = toGlossaryTermInsertRow({
      userId: "user-1",
      normalizedKey: "bridge",
      displayLabel: "Bridge",
      canonicalLabel: "Bridge",
      type: "place",
      aliases: ["the bridge"],
      generalNote: "Recurring crossing point.",
      appearanceCount: 2,
      notes: "Stale compatibility note.",
    });

    expect(row.canonical_label).toBe("Bridge");
    expect(row.display_label).toBe("Bridge");
    expect(row.type).toBe("place");
    expect(row.aliases).toEqual(["the bridge"]);
    expect(row.general_note).toBe("Recurring crossing point.");
    expect(row.appearance_count).toBe(2);
    expect(row.notes).toBe("Recurring crossing point.");
  });

  it("rehydrates historical note-only rows through generalNote authority", () => {
    const term = fromGlossaryTermRow({
      id: "term-legacy",
      user_id: "user-1",
      normalized_key: "bridge",
      display_label: "Bridge",
      canonical_label: "Bridge",
      type: "place",
      aliases: [],
      general_note: null,
      appearance_count: 1,
      notes: "Legacy note only.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-11T00:00:00.000Z",
      updated_at: "2026-06-11T00:00:00.000Z",
    });

    expect(term.generalNote).toBe("Legacy note only.");
    expect(term.notes).toBe("Legacy note only.");
  });
});

describe("toGlossaryCandidateLifecycleUpdateRow", () => {
  it("maps canonical candidate class metadata from candidate rows", () => {
    const candidate = fromGlossaryCandidateRow({
      id: "cand-1",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      identity_key: "father",
      normalized_key: "apa",
      display_label: "Apa",
      source_category: "actor",
      source_observation_id: null,
      source_observation_fragment_id: null,
      recurrence_count: 1,
      candidate_class: "match_candidate",
      proposed_entity_ids: ["term-1"],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-12T10:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T10:00:00.000Z",
      updated_at: "2026-06-12T10:00:00.000Z",
    });

    expect(candidate.candidateClass).toBe("match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1"]);
    expect(candidate.identityKey).toBe("father");
  });

  it("preserves missing persisted candidate identity as null-compatible", () => {
    const candidate = fromGlossaryCandidateRow({
      id: "cand-legacy",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      identity_key: null,
      normalized_key: "apa",
      display_label: "Apa",
      source_category: "actor",
      source_observation_id: null,
      source_observation_fragment_id: null,
      recurrence_count: 1,
      candidate_class: "new_candidate",
      proposed_entity_ids: [],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-12T10:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T10:00:00.000Z",
      updated_at: "2026-06-12T10:00:00.000Z",
    });

    expect(candidate.identityKey).toBeNull();
  });

  it("builds candidate insert rows with persisted advisory identity", () => {
    const row = toGlossaryCandidateInsertRow(
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        identityKey: "father",
        normalizedKey: "apa",
        displayLabel: "Apa",
        sourceCategory: "actor",
      },
      "2026-06-12T10:00:00.000Z",
    );

    expect(row.identity_key).toBe("father");
  });

  it("sets suppression fields when state changes to suppressed", () => {
    const now = "2026-05-24T00:00:00.000Z";

    const row = toGlossaryCandidateLifecycleUpdateRow(
      {
        candidateId: "cand-1",
        userId: "user-1",
        nextState: "suppressed",
        suppressionReason: "user paused this motif",
      },
      now,
    );

    expect(row.state).toBe("suppressed");
    expect(row.suppression_state).toBe("suppressed");
    expect(row.suppression_reason).toBe("user paused this motif");
    expect(row.suppressed_at).toBe(now);
  });

  it("clears suppression fields for non-suppressed states", () => {
    const row = toGlossaryCandidateLifecycleUpdateRow(
      {
        candidateId: "cand-1",
        userId: "user-1",
        nextState: "pinned",
      },
      "2026-05-24T00:00:00.000Z",
    );

    expect(row.state).toBe("pinned");
    expect(row.suppression_state).toBe("none");
    expect(row.suppression_reason).toBeNull();
    expect(row.suppressed_at).toBeNull();
  });
});

describe("glossary appearance record row mapping", () => {
  it("maps canonical appearance record fields", () => {
    const appearance = fromGlossaryAppearanceRecordRow({
      id: "appearance-1",
      user_id: "user-1",
      entity_id: "term-1",
      dream_id: "dream-1",
      appearance_note: "Most nagyon tamogato volt.",
      confirmed_at: "2026-06-11T12:00:00.000Z",
      created_at: "2026-06-11T12:00:00.000Z",
      updated_at: "2026-06-11T12:00:00.000Z",
    });

    expect(appearance.id).toBe("appearance-1");
    expect(appearance.entityId).toBe("term-1");
    expect(appearance.dreamId).toBe("dream-1");
    expect(appearance.appearanceNote).toBe("Most nagyon tamogato volt.");
    expect(appearance.confirmedAt).toBe("2026-06-11T12:00:00.000Z");
  });

  it("builds appearance record insert rows", () => {
    const row = toGlossaryAppearanceRecordInsertRow({
      userId: "user-1",
      entityId: "term-1",
      dreamId: "dream-1",
      appearanceNote: "Most nagyon tamogato volt.",
      confirmedAt: "2026-06-11T12:00:00.000Z",
    });

    expect(row.user_id).toBe("user-1");
    expect(row.entity_id).toBe("term-1");
    expect(row.dream_id).toBe("dream-1");
    expect(row.appearance_note).toBe("Most nagyon tamogato volt.");
    expect(row.confirmed_at).toBe("2026-06-11T12:00:00.000Z");
  });
});
