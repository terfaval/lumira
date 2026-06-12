import { describe, expect, it, vi } from "vitest";

import { SupabaseGlossaryRepository } from "@/src/infrastructure/supabase/repositories/glossary-supabase-repository";

describe("SupabaseGlossaryRepository isolation", () => {
  it("scopes candidate listing by user, reflective object, and non-archived rows", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { eq };
      if (column === "reflective_object_id") return { is };
      return { is };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    await repository.listCandidatesByReflectiveObject("user-a", "obj-1");

    expect(eq).toHaveBeenNthCalledWith(1, "user_id", "user-a");
    expect(eq).toHaveBeenNthCalledWith(2, "reflective_object_id", "obj-1");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("applies suppression fields on suppressed lifecycle transition", async () => {
    const maybeSingleForLoad = vi.fn().mockResolvedValue({
      data: {
        id: "cand-1",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        normalized_key: "door",
        display_label: "Door",
        source_category: "object",
        source_observation_id: "obs-1",
        source_observation_fragment_id: "frag-1",
        recurrence_count: 1,
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
        state: "candidate",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        last_seen_at: "2026-05-24T00:00:00.000Z",
        archived_at: null,
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T00:00:00.000Z",
      },
      error: null,
    });

    const isLoad = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForLoad });
    const eqLoad = vi.fn((column: string) => {
      if (column === "id") return { eq: eqLoad };
      return { is: isLoad };
    });
    const selectLoad = vi.fn().mockReturnValue({ eq: eqLoad });

    const maybeSingleForUpdate = vi.fn().mockResolvedValue({
      data: {
        id: "cand-1",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        normalized_key: "door",
        display_label: "Door",
        source_category: "object",
        source_observation_id: "obs-1",
        source_observation_fragment_id: "frag-1",
        recurrence_count: 1,
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
        state: "suppressed",
        suppression_state: "suppressed",
        suppression_reason: "too intense",
        suppressed_at: "2026-05-24T01:00:00.000Z",
        last_seen_at: "2026-05-24T00:00:00.000Z",
        archived_at: null,
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T01:00:00.000Z",
      },
      error: null,
    });

    const selectForUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForUpdate });
    const isForUpdate = vi.fn().mockReturnValue({ select: selectForUpdate });
    const eqForUpdate = vi.fn((column: string) => {
      if (column === "id") return { eq: eqForUpdate };
      return { is: isForUpdate };
    });
    const update = vi.fn().mockReturnValue({ eq: eqForUpdate });

    const from = vi.fn().mockReturnValue({
      select: selectLoad,
      update,
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    await repository.setCandidateLifecycle({
      candidateId: "cand-1",
      userId: "user-a",
      nextState: "suppressed",
      suppressionReason: "too intense",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "suppressed",
        suppression_state: "suppressed",
        suppression_reason: "too intense",
      }),
    );
  });

  it("defaults extracted candidates to new_candidate with no proposed entities", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "cand-1",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        normalized_key: "door",
        display_label: "Door",
        source_category: "object",
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
      },
      error: null,
    });

    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const candidateIs = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { eq };
      if (column === "reflective_object_id") return { eq };
      if (column === "normalized_key") return { eq };
      if (column === "source_category") return { is: candidateIs };
      return { is: candidateIs };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select, insert });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
      },
    ]);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
      }),
    );
  });

  it("preserves distinct candidate identities for the same normalized key across source categories", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const candidateIs = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { eq };
      if (column === "reflective_object_id") return { eq };
      if (column === "normalized_key") return { eq };
      if (column === "source_category") return { is: candidateIs };
      return { is: candidateIs };
    });
    const select = vi.fn().mockReturnValue({ eq });

    const single = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "cand-actor",
          user_id: "user-a",
          reflective_object_id: "obj-1",
          normalized_key: "apa",
          display_label: "Apa",
          source_category: "actor",
          source_observation_id: "obs-1",
          source_observation_fragment_id: "frag-1",
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
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "cand-location",
          user_id: "user-a",
          reflective_object_id: "obj-1",
          normalized_key: "apa",
          display_label: "Apa",
          source_category: "location",
          source_observation_id: "obs-2",
          source_observation_fragment_id: "frag-2",
          recurrence_count: 1,
          candidate_class: "new_candidate",
          proposed_entity_ids: [],
          state: "candidate",
          suppression_state: "none",
          suppression_reason: null,
          suppressed_at: null,
          last_seen_at: "2026-06-12T10:01:00.000Z",
          archived_at: null,
          created_at: "2026-06-12T10:01:00.000Z",
          updated_at: "2026-06-12T10:01:00.000Z",
        },
        error: null,
      });

    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    const from = vi.fn().mockReturnValue({ select, insert });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const candidates = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "apa",
        displayLabel: "Apa",
        sourceCategory: "actor",
        sourceObservationId: "obs-1",
        sourceObservationFragmentId: "frag-1",
      },
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "apa",
        displayLabel: "Apa",
        sourceCategory: "location",
        sourceObservationId: "obs-2",
        sourceObservationFragmentId: "frag-2",
      },
    ]);

    expect(candidates.map((candidate) => candidate.id)).toEqual(["cand-actor", "cand-location"]);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(eq).toHaveBeenCalledWith("source_category", "actor");
    expect(eq).toHaveBeenCalledWith("source_category", "location");
  });

  it("resolves a candidate to an existing continuity entity and creates an appearance", async () => {
    const candidateRow = {
      id: "cand-1",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      normalized_key: "apa",
      display_label: "Apa",
      source_category: "actor",
      source_observation_id: "obs-1",
      source_observation_fragment_id: "frag-1",
      recurrence_count: 1,
      candidate_class: "match_candidate",
      proposed_entity_ids: ["term-1"],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-12T00:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };

    const termRow = {
      id: "term-1",
      user_id: "user-a",
      normalized_key: "apa",
      display_label: "Apa",
      canonical_label: "Apa",
      type: "person",
      aliases: ["apu"],
      general_note: null,
      appearance_count: 1,
      notes: null,
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };

    const appearanceRow = {
      id: "appearance-1",
      user_id: "user-a",
      entity_id: "term-1",
      dream_id: "obj-1",
      appearance_note: "Clearly the same father figure.",
      confirmed_at: "2026-06-12T01:00:00.000Z",
      created_at: "2026-06-12T01:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const resolvedCandidateRow = {
      ...candidateRow,
      state: "pinned",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const candidateMaybeSingle = vi.fn().mockResolvedValue({ data: candidateRow, error: null });
    const candidateIsForLoad = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingle });
    const candidateEqForLoad = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForLoad };
      return { is: candidateIsForLoad };
    });
    const candidateSelectForLoad = vi.fn().mockReturnValue({ eq: candidateEqForLoad });

    const candidateMaybeSingleForPin = vi.fn().mockResolvedValue({ data: resolvedCandidateRow, error: null });
    const candidateSelectForPin = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingleForPin });
    const candidateIsForPin = vi.fn().mockReturnValue({ select: candidateSelectForPin });
    const candidateEqForPin = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForPin };
      return { is: candidateIsForPin };
    });
    const candidateUpdate = vi.fn().mockReturnValue({ eq: candidateEqForPin });

    const termMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: termRow, error: null })
      .mockResolvedValueOnce({ data: termRow, error: null });
    const termIs = vi.fn().mockReturnValue({ maybeSingle: termMaybeSingle });
    const termEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termEq };
      return { is: termIs };
    });
    const termSelect = vi.fn().mockReturnValue({ eq: termEq });
    const termUpdateIs = vi.fn().mockResolvedValue({ error: null });
    const termUpdateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termUpdateEq };
      return { is: termUpdateIs };
    });
    const termUpdate = vi.fn().mockReturnValue({ eq: termUpdateEq });

    const appearanceMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const appearanceEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: appearanceEq };
      if (column === "dream_id") return { eq: appearanceEq };
      return { maybeSingle: appearanceMaybeSingle };
    });
    const appearanceInsertSingle = vi.fn().mockResolvedValue({ data: appearanceRow, error: null });
    const appearanceInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: appearanceInsertSingle }) });
    const appearanceCountEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
      return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
    });
    const appearanceSelect = vi
      .fn()
      .mockReturnValueOnce({ eq: appearanceEq })
      .mockReturnValueOnce({ eq: appearanceCountEq });

    const associationInsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: "assoc-1",
        user_id: "user-a",
        glossary_term_id: "term-1",
        reflective_object_id: "obj-1",
        observation_id: "obs-1",
        observation_fragment_id: "frag-1",
        association_label: "Confirmed existing continuity entity from glossary candidate.",
        created_at: "2026-06-12T01:00:00.000Z",
        updated_at: "2026-06-12T01:00:00.000Z",
      },
      error: null,
    });
    const associationInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: associationInsertSingle }) });

    const objectMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "obj-1" }, error: null });
    const objectIs = vi.fn().mockReturnValue({ maybeSingle: objectMaybeSingle });
    const objectEq = vi.fn((column: string) => {
      if (column === "id") return { eq: objectEq };
      if (column === "user_id") return { eq: objectEq };
      if (column === "object_type") return { is: objectIs };
      return { is: objectIs };
    });
    const objectSelect = vi.fn().mockReturnValue({ eq: objectEq });

    const from = vi.fn((table: string) => {
      if (table === "glossary_candidate_states") {
        return { select: candidateSelectForLoad, update: candidateUpdate };
      }
      if (table === "glossary_terms") {
        return { select: termSelect, update: termUpdate };
      }
      if (table === "glossary_appearance_records") {
        return { select: appearanceSelect, insert: appearanceInsert };
      }
      if (table === "glossary_associations") {
        return { insert: associationInsert };
      }
      if (table === "reflective_objects") {
        return { select: objectSelect };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const resolved = await repository.resolveCandidate({
      candidateId: "cand-1",
      userId: "user-a",
      resolutionType: "confirm_existing_entity",
      entityId: "term-1",
      appearanceNote: "Clearly the same father figure.",
    });

    expect(resolved?.candidate.state).toBe("pinned");
    expect(resolved?.term.id).toBe("term-1");
    expect(resolved?.appearanceRecord?.entityId).toBe("term-1");
    expect(associationInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        glossary_term_id: "term-1",
      }),
    );
  });

  it("creates a new continuity entity during candidate resolution when needed", async () => {
    const candidateRow = {
      id: "cand-2",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      normalized_key: "mammut",
      display_label: "Mammut",
      source_category: "object",
      source_observation_id: "obs-9",
      source_observation_fragment_id: "frag-9",
      recurrence_count: 1,
      candidate_class: "new_candidate",
      proposed_entity_ids: [],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-12T00:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };

    const createdTermRow = {
      id: "term-new",
      user_id: "user-a",
      normalized_key: "mammut",
      display_label: "Mammut",
      canonical_label: "Mammut",
      type: "object",
      aliases: [],
      general_note: null,
      appearance_count: 1,
      notes: null,
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-12T01:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const appearanceRow = {
      id: "appearance-new",
      user_id: "user-a",
      entity_id: "term-new",
      dream_id: "obj-1",
      appearance_note: null,
      confirmed_at: "2026-06-12T01:00:00.000Z",
      created_at: "2026-06-12T01:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const resolvedCandidateRow = {
      ...candidateRow,
      state: "pinned",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const candidateMaybeSingle = vi.fn().mockResolvedValue({ data: candidateRow, error: null });
    const candidateIsForLoad = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingle });
    const candidateEqForLoad = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForLoad };
      return { is: candidateIsForLoad };
    });
    const candidateSelectForLoad = vi.fn().mockReturnValue({ eq: candidateEqForLoad });

    const candidateMaybeSingleForPin = vi.fn().mockResolvedValue({ data: resolvedCandidateRow, error: null });
    const candidateSelectForPin = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingleForPin });
    const candidateIsForPin = vi.fn().mockReturnValue({ select: candidateSelectForPin });
    const candidateEqForPin = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForPin };
      return { is: candidateIsForPin };
    });
    const candidateUpdate = vi.fn().mockReturnValue({ eq: candidateEqForPin });

    const termInsertSingle = vi.fn().mockResolvedValue({ data: createdTermRow, error: null });
    const termInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: termInsertSingle }) });
    const termMaybeSingle = vi.fn().mockResolvedValue({ data: createdTermRow, error: null });
    const termIs = vi.fn().mockReturnValue({ maybeSingle: termMaybeSingle });
    const termEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termEq };
      return { is: termIs };
    });
    const termSelect = vi.fn().mockReturnValue({ eq: termEq });
    const termUpdateIs = vi.fn().mockResolvedValue({ error: null });
    const termUpdateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termUpdateEq };
      return { is: termUpdateIs };
    });
    const termUpdate = vi.fn().mockReturnValue({ eq: termUpdateEq });

    const appearanceMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const appearanceEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: appearanceEq };
      if (column === "dream_id") return { eq: appearanceEq };
      return { maybeSingle: appearanceMaybeSingle };
    });
    const appearanceInsertSingle = vi.fn().mockResolvedValue({ data: appearanceRow, error: null });
    const appearanceInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: appearanceInsertSingle }) });
    const appearanceCountEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
      return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
    });
    const appearanceSelect = vi
      .fn()
      .mockReturnValueOnce({ eq: appearanceEq })
      .mockReturnValueOnce({ eq: appearanceCountEq });

    const associationInsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: "assoc-new",
        user_id: "user-a",
        glossary_term_id: "term-new",
        reflective_object_id: "obj-1",
        observation_id: "obs-9",
        observation_fragment_id: "frag-9",
        association_label: "Created continuity entity from glossary candidate resolution.",
        created_at: "2026-06-12T01:00:00.000Z",
        updated_at: "2026-06-12T01:00:00.000Z",
      },
      error: null,
    });
    const associationInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: associationInsertSingle }) });

    const objectMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "obj-1" }, error: null });
    const objectIs = vi.fn().mockReturnValue({ maybeSingle: objectMaybeSingle });
    const objectEq = vi.fn((column: string) => {
      if (column === "id") return { eq: objectEq };
      if (column === "user_id") return { eq: objectEq };
      if (column === "object_type") return { is: objectIs };
      return { is: objectIs };
    });
    const objectSelect = vi.fn().mockReturnValue({ eq: objectEq });

    const from = vi.fn((table: string) => {
      if (table === "glossary_candidate_states") {
        return { select: candidateSelectForLoad, update: candidateUpdate };
      }
      if (table === "glossary_terms") {
        return { insert: termInsert, select: termSelect, update: termUpdate };
      }
      if (table === "glossary_appearance_records") {
        return { select: appearanceSelect, insert: appearanceInsert };
      }
      if (table === "glossary_associations") {
        return { insert: associationInsert };
      }
      if (table === "reflective_objects") {
        return { select: objectSelect };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const resolved = await repository.resolveCandidate({
      candidateId: "cand-2",
      userId: "user-a",
      resolutionType: "create_new_entity",
    });

    expect(termInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        canonical_label: "Mammut",
        type: "object",
      }),
    );
    expect(resolved?.candidate.state).toBe("pinned");
    expect(resolved?.term.id).toBe("term-new");
  });

  it("allows ambiguous candidates to create a new continuity entity during resolution", async () => {
    const candidateRow = {
      id: "cand-3",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      normalized_key: "ex partner",
      display_label: "Ex-partner",
      source_category: "actor",
      source_observation_id: "obs-5",
      source_observation_fragment_id: "frag-5",
      recurrence_count: 1,
      candidate_class: "ambiguous_match_candidate",
      proposed_entity_ids: ["term-1", "term-2"],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-12T00:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };

    const createdTermRow = {
      id: "term-unknown-ex",
      user_id: "user-a",
      normalized_key: "unknown ex partner",
      display_label: "Unknown Ex-partner",
      canonical_label: "Unknown Ex-partner",
      type: "role",
      aliases: [],
      general_note: null,
      appearance_count: 1,
      notes: null,
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-12T01:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const appearanceRow = {
      id: "appearance-unknown-ex",
      user_id: "user-a",
      entity_id: "term-unknown-ex",
      dream_id: "obj-1",
      appearance_note: "The same role returned, but not a known identity.",
      confirmed_at: "2026-06-12T01:00:00.000Z",
      created_at: "2026-06-12T01:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const resolvedCandidateRow = {
      ...candidateRow,
      state: "pinned",
      updated_at: "2026-06-12T01:00:00.000Z",
    };

    const candidateMaybeSingle = vi.fn().mockResolvedValue({ data: candidateRow, error: null });
    const candidateIsForLoad = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingle });
    const candidateEqForLoad = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForLoad };
      return { is: candidateIsForLoad };
    });
    const candidateSelectForLoad = vi.fn().mockReturnValue({ eq: candidateEqForLoad });

    const candidateMaybeSingleForPin = vi.fn().mockResolvedValue({ data: resolvedCandidateRow, error: null });
    const candidateSelectForPin = vi.fn().mockReturnValue({ maybeSingle: candidateMaybeSingleForPin });
    const candidateIsForPin = vi.fn().mockReturnValue({ select: candidateSelectForPin });
    const candidateEqForPin = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEqForPin };
      return { is: candidateIsForPin };
    });
    const candidateUpdate = vi.fn().mockReturnValue({ eq: candidateEqForPin });

    const termInsertSingle = vi.fn().mockResolvedValue({ data: createdTermRow, error: null });
    const termInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: termInsertSingle }) });
    const termMaybeSingle = vi.fn().mockResolvedValue({ data: createdTermRow, error: null });
    const termIs = vi.fn().mockReturnValue({ maybeSingle: termMaybeSingle });
    const termEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termEq };
      return { is: termIs };
    });
    const termSelect = vi.fn().mockReturnValue({ eq: termEq });
    const termUpdateIs = vi.fn().mockResolvedValue({ error: null });
    const termUpdateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termUpdateEq };
      return { is: termUpdateIs };
    });
    const termUpdate = vi.fn().mockReturnValue({ eq: termUpdateEq });

    const appearanceMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const appearanceEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: appearanceEq };
      if (column === "dream_id") return { eq: appearanceEq };
      return { maybeSingle: appearanceMaybeSingle };
    });
    const appearanceInsertSingle = vi.fn().mockResolvedValue({ data: appearanceRow, error: null });
    const appearanceInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: appearanceInsertSingle }) });
    const appearanceCountEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
      return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
    });
    const appearanceSelect = vi
      .fn()
      .mockReturnValueOnce({ eq: appearanceEq })
      .mockReturnValueOnce({ eq: appearanceCountEq });

    const associationInsertSingle = vi.fn().mockResolvedValue({
      data: {
        id: "assoc-unknown-ex",
        user_id: "user-a",
        glossary_term_id: "term-unknown-ex",
        reflective_object_id: "obj-1",
        observation_id: "obs-5",
        observation_fragment_id: "frag-5",
        association_label: "Created continuity entity from glossary candidate resolution.",
        created_at: "2026-06-12T01:00:00.000Z",
        updated_at: "2026-06-12T01:00:00.000Z",
      },
      error: null,
    });
    const associationInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: associationInsertSingle }) });

    const objectMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "obj-1" }, error: null });
    const objectIs = vi.fn().mockReturnValue({ maybeSingle: objectMaybeSingle });
    const objectEq = vi.fn((column: string) => {
      if (column === "id") return { eq: objectEq };
      if (column === "user_id") return { eq: objectEq };
      if (column === "object_type") return { is: objectIs };
      return { is: objectIs };
    });
    const objectSelect = vi.fn().mockReturnValue({ eq: objectEq });

    const from = vi.fn((table: string) => {
      if (table === "glossary_candidate_states") {
        return { select: candidateSelectForLoad, update: candidateUpdate };
      }
      if (table === "glossary_terms") {
        return { insert: termInsert, select: termSelect, update: termUpdate };
      }
      if (table === "glossary_appearance_records") {
        return { select: appearanceSelect, insert: appearanceInsert };
      }
      if (table === "glossary_associations") {
        return { insert: associationInsert };
      }
      if (table === "reflective_objects") {
        return { select: objectSelect };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const resolved = await repository.resolveCandidate({
      candidateId: "cand-3",
      userId: "user-a",
      resolutionType: "create_new_entity",
      canonicalLabel: "Unknown Ex-partner",
      type: "role",
      appearanceNote: "The same role returned, but not a known identity.",
    });

    expect(termInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        canonical_label: "Unknown Ex-partner",
        type: "role",
      }),
    );
    expect(resolved?.candidate.state).toBe("pinned");
    expect(resolved?.term.id).toBe("term-unknown-ex");
    expect(resolved?.appearanceRecord?.entityId).toBe("term-unknown-ex");
  });
});
