import { describe, expect, it, vi } from "vitest";

import { buildAuthorityFingerprint, type LatentAuthorityProvenance } from "@/src/cognition/latent-v2/opportunity-constructor/provenance";
import { SupabaseGlossaryRepository } from "@/src/infrastructure/supabase/repositories/glossary-supabase-repository";

describe("SupabaseGlossaryRepository isolation", () => {
  it("uses generalNote as the authoritative note when creating terms", async () => {
    const insertedRow = {
      id: "term-1",
      user_id: "user-a",
      normalized_key: "bridge",
      display_label: "Bridge",
      canonical_label: "Bridge",
      type: "place",
      aliases: ["the bridge"],
      general_note: "Recurring crossing point.",
      appearance_count: 0,
      notes: "Recurring crossing point.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-20T00:00:00.000Z",
      updated_at: "2026-06-20T00:00:00.000Z",
    };
    const single = vi.fn().mockResolvedValue({ data: insertedRow, error: null });
    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single }) });
    const from = vi.fn().mockReturnValue({ insert });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const term = await repository.createTerm({
      userId: "user-a",
      normalizedKey: "bridge",
      displayLabel: "Bridge",
      canonicalLabel: "Bridge",
      type: "place",
      aliases: ["the bridge"],
      generalNote: "Recurring crossing point.",
      notes: "Stale compatibility note.",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        general_note: "Recurring crossing point.",
        notes: "Recurring crossing point.",
      }),
    );
    expect(term.generalNote).toBe("Recurring crossing point.");
    expect(term.notes).toBe("Recurring crossing point.");
  });

  it("uses generalNote as the authoritative note when updating terms", async () => {
    const existingRow = {
      id: "term-1",
      user_id: "user-a",
      normalized_key: "bridge",
      display_label: "Bridge",
      canonical_label: "Bridge",
      type: "place",
      aliases: ["the bridge"],
      general_note: "Old note.",
      appearance_count: 1,
      notes: "Stale legacy note.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-20T00:00:00.000Z",
      updated_at: "2026-06-20T00:00:00.000Z",
    };
    const maybeSingleForLoad = vi.fn().mockResolvedValue({ data: existingRow, error: null });
    const isForLoad = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForLoad });
    const eqForLoad = vi.fn((column: string) => {
      if (column === "id") return { eq: eqForLoad };
      return { is: isForLoad };
    });
    const selectForLoad = vi.fn().mockReturnValue({ eq: eqForLoad });

    const maybeSingleForUpdate = vi.fn().mockResolvedValue({
      data: {
        ...existingRow,
        canonical_label: "Bridge",
        display_label: "Bridge",
        general_note: "Recurring crossing point.",
        notes: "Recurring crossing point.",
        updated_at: "2026-06-20T01:00:00.000Z",
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

    const from = vi.fn().mockReturnValue({ select: selectForLoad, update });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const term = await repository.updateTerm({
      termId: "term-1",
      userId: "user-a",
      canonicalLabel: "Bridge",
      generalNote: "Recurring crossing point.",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        general_note: "Recurring crossing point.",
        notes: "Recurring crossing point.",
      }),
    );
    expect(term?.generalNote).toBe("Recurring crossing point.");
    expect(term?.notes).toBe("Recurring crossing point.");
  });

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
    const select = vi.fn().mockImplementation(() => {
      const query = {
        eq: vi.fn(() => query),
        is: vi.fn(() => query),
        maybeSingle,
      };

      return query;
    });
    const from = vi.fn().mockReturnValue({ select, insert });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        identityKey: "doorway",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
      },
    ]);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        identity_key: "doorway",
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
      }),
    );
  });

  it("rehydrates persisted candidate identity and preserves historical null identity rows", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
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
          proposed_entity_ids: ["11111111-1111-4111-8111-111111111111"],
          state: "candidate",
          suppression_state: "none",
          suppression_reason: null,
          suppressed_at: null,
          last_seen_at: "2026-06-12T10:00:00.000Z",
          archived_at: null,
          created_at: "2026-06-12T10:00:00.000Z",
          updated_at: "2026-06-12T10:00:00.000Z",
        },
        {
          id: "cand-legacy",
          user_id: "user-a",
          reflective_object_id: "obj-2",
          identity_key: null,
          normalized_key: "bridge",
          display_label: "Bridge",
          source_category: "location",
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
      ],
      error: null,
    });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { is };
      return { is };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const candidates = await repository.listCandidates("user-a");

    expect(candidates[0]?.identityKey).toBe("father");
    expect(candidates[1]?.identityKey).toBeNull();
  });

  it("drops non-uuid proposed entity ids from candidate inserts and falls back to new_candidate", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "cand-obs",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        normalized_key: "father",
        display_label: "Father",
        source_category: "actor",
        source_observation_id: "scene-1",
        source_observation_fragment_id: "obs1_1",
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
    const candidates = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "father",
        displayLabel: "Father",
        sourceCategory: "actor",
        sourceObservationId: "scene-1",
        sourceObservationFragmentId: "obs1_1",
        candidateClass: "match_candidate",
        proposedEntityIds: ["obs1_1"],
      },
    ]);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
      }),
    );
    expect(candidates[0]?.candidateClass).toBe("new_candidate");
    expect(candidates[0]?.proposedEntityIds).toEqual([]);
  });

  it("retries candidate upsert without metadata columns when the live schema is behind", async () => {
    const insert = vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          "candidate_class" in payload
            ? {
                data: null,
                error: {
                  code: "42703",
                  message:
                    "Could not find the 'candidate_class' column of 'glossary_candidate_states' in the schema cache",
                },
              }
            : {
                data: {
                  id: "cand-legacy",
                  user_id: "user-a",
                  reflective_object_id: "obj-1",
                  normalized_key: "door",
                  display_label: "Door",
                  source_category: "object",
                  source_observation_id: null,
                  source_observation_fragment_id: null,
                  recurrence_count: 1,
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
              },
        ),
      }),
    }));
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "cand-legacy",
          user_id: "user-a",
          reflective_object_id: "obj-1",
          normalized_key: "door",
          display_label: "Door",
          source_category: "object",
          source_observation_id: null,
          source_observation_fragment_id: null,
          recurrence_count: 1,
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
    const candidateIs = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { eq };
      if (column === "reflective_object_id") return { eq };
      if (column === "normalized_key") return { eq };
      if (column === "source_category") return { is: candidateIs };
      return { is: candidateIs };
    });
    const select = vi.fn().mockReturnValue({ eq });

    const updateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: updateEq };
      return {
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "cand-legacy",
                user_id: "user-a",
                reflective_object_id: "obj-1",
                normalized_key: "door",
                display_label: "Door",
                source_category: "object",
                source_observation_id: null,
                source_observation_fragment_id: null,
                recurrence_count: 3,
                state: "candidate",
                suppression_state: "none",
                suppression_reason: null,
                suppressed_at: null,
                last_seen_at: "2026-06-12T10:05:00.000Z",
                archived_at: null,
                created_at: "2026-06-12T10:00:00.000Z",
                updated_at: "2026-06-12T10:05:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      };
    });
    const update = vi.fn((payload: Record<string, unknown>) =>
      "candidate_class" in payload
        ? {
            eq: vi.fn((column: string) => {
              if (column === "id") return { eq: updateEq };
              return {
                is: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: {
                        code: "42703",
                        message:
                          "Could not find the 'candidate_class' column of 'glossary_candidate_states' in the schema cache",
                      },
                    }),
                  }),
                }),
              };
            }),
          }
        : { eq: updateEq },
    );

    const from = vi.fn((table: string) => {
      if (table !== "glossary_candidate_states") {
        throw new Error(`Unexpected table ${table}`);
      }

      return { select, insert, update };
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const created = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
      },
    ]);

    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        candidate_class: expect.anything(),
      }),
    );
    expect(created[0]?.candidateClass).toBe("new_candidate");
    expect(created[0]?.proposedEntityIds).toEqual([]);

    const updated = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
        recurrenceCount: 2,
      },
    ]);

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.not.objectContaining({
        candidate_class: expect.anything(),
        proposed_entity_ids: expect.anything(),
      }),
    );
    expect(updated[0]?.candidateClass).toBe("new_candidate");
    expect(updated[0]?.proposedEntityIds).toEqual([]);
  });

  it("retries candidate upsert when postgrest schema cache misses candidate metadata columns", async () => {
    const insert = vi.fn((payload: Record<string, unknown>) => ({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(
          "candidate_class" in payload
            ? {
                data: null,
                error: {
                  code: "PGRST204",
                  message:
                    "Could not find the 'candidate_class' column of 'glossary_candidate_states' in the schema cache",
                },
              }
            : {
                data: {
                  id: "cand-postgrest",
                  user_id: "user-a",
                  reflective_object_id: "obj-1",
                  normalized_key: "door",
                  display_label: "Door",
                  source_category: "object",
                  source_observation_id: null,
                  source_observation_fragment_id: null,
                  recurrence_count: 1,
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
              },
        ),
      }),
    }));
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "cand-postgrest",
          user_id: "user-a",
          reflective_object_id: "obj-1",
          normalized_key: "door",
          display_label: "Door",
          source_category: "object",
          source_observation_id: null,
          source_observation_fragment_id: null,
          recurrence_count: 1,
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
    const candidateIs = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "user_id") return { eq };
      if (column === "reflective_object_id") return { eq };
      if (column === "normalized_key") return { eq };
      if (column === "source_category") return { is: candidateIs };
      return { is: candidateIs };
    });
    const select = vi.fn().mockReturnValue({ eq });

    const updateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: updateEq };
      return {
        is: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "cand-postgrest",
                user_id: "user-a",
                reflective_object_id: "obj-1",
                normalized_key: "door",
                display_label: "Door",
                source_category: "object",
                source_observation_id: null,
                source_observation_fragment_id: null,
                recurrence_count: 3,
                state: "candidate",
                suppression_state: "none",
                suppression_reason: null,
                suppressed_at: null,
                last_seen_at: "2026-06-12T10:05:00.000Z",
                archived_at: null,
                created_at: "2026-06-12T10:00:00.000Z",
                updated_at: "2026-06-12T10:05:00.000Z",
              },
              error: null,
            }),
          }),
        }),
      };
    });
    const update = vi.fn((payload: Record<string, unknown>) =>
      "candidate_class" in payload
        ? {
            eq: vi.fn((column: string) => {
              if (column === "id") return { eq: updateEq };
              return {
                is: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: null,
                      error: {
                        code: "PGRST204",
                        message:
                          "Could not find the 'candidate_class' column of 'glossary_candidate_states' in the schema cache",
                      },
                    }),
                  }),
                }),
              };
            }),
          }
        : { eq: updateEq },
    );

    const from = vi.fn().mockReturnValue({ select, insert, update });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const created = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
      },
    ]);

    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        candidate_class: expect.anything(),
      }),
    );
    expect(created[0]?.candidateClass).toBe("new_candidate");
    expect(created[0]?.proposedEntityIds).toEqual([]);

    const updated = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        normalizedKey: "door",
        displayLabel: "Door",
        sourceCategory: "object",
        recurrenceCount: 2,
      },
    ]);

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.not.objectContaining({
        candidate_class: expect.anything(),
        proposed_entity_ids: expect.anything(),
      }),
    );
    expect(updated[0]?.candidateClass).toBe("new_candidate");
    expect(updated[0]?.proposedEntityIds).toEqual([]);
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

  it("prefers identity key for candidate dedupe when present", async () => {
    const matchedRow = {
      id: "cand-father",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      identity_key: "father",
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
      last_seen_at: "2026-06-12T10:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-12T10:00:00.000Z",
      updated_at: "2026-06-12T10:00:00.000Z",
    };
    const lookupFilters = new Map<string, unknown>();
    const maybeSingle = vi.fn().mockImplementation(async () => ({
      data: lookupFilters.get("identity_key") === "father" ? matchedRow : null,
      error: null,
    }));
    const query = {
      eq: vi.fn((column: string, value: unknown) => {
        lookupFilters.set(column, value);
        return query;
      }),
      is: vi.fn((column: string, value: unknown) => {
        lookupFilters.set(column, value);
        return { maybeSingle };
      }),
    };
    const select = vi.fn().mockImplementation(() => {
      lookupFilters.clear();
      return query;
    });

    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "cand-father",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        identity_key: "father",
        normalized_key: "father figure",
        display_label: "Father figure",
        source_category: "actor",
        source_observation_id: "obs-2",
        source_observation_fragment_id: "frag-2",
        recurrence_count: 3,
        candidate_class: "match_candidate",
        proposed_entity_ids: ["term-1"],
        state: "candidate",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        last_seen_at: "2026-06-12T10:05:00.000Z",
        archived_at: null,
        created_at: "2026-06-12T10:00:00.000Z",
        updated_at: "2026-06-12T10:05:00.000Z",
      },
      error: null,
    });
    const insertSingle = vi.fn().mockResolvedValue({
      data: {
        ...matchedRow,
        id: "cand-inserted",
        identity_key: "father",
        normalized_key: "father figure",
        display_label: "Father figure",
        recurrence_count: 2,
      },
      error: null,
    });
    const insert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: insertSingle }) });
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
    const updateIs = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: updateEq };
      if (column === "user_id") return { is: updateIs };
      return { is: updateIs };
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select, insert, update });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const [candidate] = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        identityKey: "father",
        normalizedKey: "father figure",
        displayLabel: "Father figure",
        sourceCategory: "actor",
        sourceObservationId: "obs-2",
        sourceObservationFragmentId: "frag-2",
        recurrenceCount: 2,
        candidateClass: "match_candidate",
        proposedEntityIds: ["term-1"],
      },
    ]);

    expect(query.eq).toHaveBeenCalledWith("identity_key", "father");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        identity_key: "father",
        display_label: "Father figure",
        recurrence_count: 3,
      }),
    );
    expect(from).not.toHaveBeenCalledWith("glossary_appearance_records");
    expect(candidate?.id).toBe("cand-father");
    expect(candidate?.normalizedKey).toBe("father figure");
  });

  it("falls back to normalized key only for historical null-identity candidates", async () => {
    const legacyRow = {
      id: "cand-legacy",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      identity_key: null,
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
    };
    const selectCalls: Array<Map<string, unknown>> = [];
    const maybeSingle = vi.fn().mockImplementation(async () => {
      const filters = selectCalls[selectCalls.length - 1] ?? new Map<string, unknown>();

      if (filters.get("identity_key") === "father") {
        return { data: null, error: null };
      }

      if (filters.get("normalized_key") === "apa") {
        return { data: legacyRow, error: null };
      }

      return { data: null, error: null };
    });
    const select = vi.fn().mockImplementation(() => {
      const filters = new Map<string, unknown>();
      selectCalls.push(filters);

      const query = {
        eq: vi.fn((column: string, value: unknown) => {
          filters.set(column, value);
          return query;
        }),
        is: vi.fn((column: string, value: unknown) => {
          filters.set(column, value);
          return query;
        }),
        maybeSingle,
      };

      return query;
    });

    const updateSingle = vi.fn().mockResolvedValue({
      data: {
        id: "cand-legacy",
        user_id: "user-a",
        reflective_object_id: "obj-1",
        identity_key: "father",
        normalized_key: "apa",
        display_label: "Apa",
        source_category: "actor",
        source_observation_id: "obs-1",
        source_observation_fragment_id: "frag-1",
        recurrence_count: 2,
        candidate_class: "new_candidate",
        proposed_entity_ids: [],
        state: "candidate",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        last_seen_at: "2026-06-12T10:05:00.000Z",
        archived_at: null,
        created_at: "2026-06-12T10:00:00.000Z",
        updated_at: "2026-06-12T10:05:00.000Z",
      },
      error: null,
    });
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
    const updateIs = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: updateEq };
      if (column === "user_id") return { is: updateIs };
      return { is: updateIs };
    });
    const update = vi.fn().mockReturnValue({ eq: updateEq });

    const from = vi.fn().mockReturnValue({ select, update });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const [candidate] = await repository.upsertCandidates([
      {
        userId: "user-a",
        reflectiveObjectId: "obj-1",
        identityKey: "father",
        normalizedKey: "apa",
        displayLabel: "Apa",
        sourceCategory: "actor",
        recurrenceCount: 1,
      },
    ]);

    expect(select).toHaveBeenCalledTimes(2);
    expect(Array.from(selectCalls[0]?.entries() ?? [])).toEqual(
      expect.arrayContaining([
        ["identity_key", "father"],
      ]),
    );
    expect(Array.from(selectCalls[1]?.entries() ?? [])).toEqual(
      expect.arrayContaining([
        ["normalized_key", "apa"],
      ]),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        identity_key: "father",
        recurrence_count: 2,
      }),
    );
    expect(candidate?.identityKey).toBe("father");
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
      if (column === "user_id") return { is: objectIs };
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

  it("renames an existing continuity entity during match candidate resolution before creating the appearance", async () => {
    const candidateRow = {
      id: "cand-1",
      user_id: "user-a",
      reflective_object_id: "obj-1",
      normalized_key: "apa",
      display_label: "Apa",
      source_category: "actor",
      source_observation_id: "obs-1",
      source_observation_fragment_id: "frag-1",
      recurrence_count: 2,
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

    const existingTermRow = {
      id: "term-1",
      user_id: "user-a",
      normalized_key: "apa",
      display_label: "Apa",
      canonical_label: "Apa",
      type: "person",
      aliases: ["Apa"],
      general_note: "Recurring father figure.",
      appearance_count: 1,
      notes: "Recurring father figure.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
    };

    const renamedTermRow = {
      id: "term-1",
      user_id: "user-a",
      normalized_key: "apu",
      display_label: "Apu",
      canonical_label: "Apu",
      type: "person",
      aliases: ["Apa"],
      general_note: "Recurring father figure.",
      appearance_count: 1,
      notes: "Recurring father figure.",
      state: "active",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      archived_at: null,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T01:00:00.000Z",
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
      .mockResolvedValueOnce({ data: existingTermRow, error: null })
      .mockResolvedValueOnce({ data: existingTermRow, error: null })
      .mockResolvedValueOnce({ data: renamedTermRow, error: null });
    const termIs = vi.fn().mockReturnValue({ maybeSingle: termMaybeSingle });
    const termEq = vi.fn((column: string) => {
      if (column === "id") return { eq: termEq };
      return { is: termIs };
    });
    const termSelect = vi.fn().mockReturnValue({ eq: termEq });
    const termUpdateSelect = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: renamedTermRow, error: null }) });
    const termUpdateIs = vi.fn().mockReturnValue({ select: termUpdateSelect });
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
      if (column === "user_id") return { is: objectIs };
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
      canonicalLabel: "Apu",
      appearanceNote: "Clearly the same father figure.",
    });

    expect(termUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        canonical_label: "Apu",
        display_label: "Apu",
      }),
    );
    expect(resolved?.term.canonicalLabel).toBe("Apu");
    expect(resolved?.appearanceRecord?.entityId).toBe("term-1");
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
      if (column === "user_id") return { is: objectIs };
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
      generalNote: "Observed as a recurring mammoth figure.",
    });

    expect(termInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        canonical_label: "Mammut",
        type: "object",
        general_note: "Observed as a recurring mammoth figure.",
        notes: "Observed as a recurring mammoth figure.",
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
      if (column === "user_id") return { is: objectIs };
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

  it("resolves candidates against reflective objects without requiring dream object_type", async () => {
    const candidateRow = {
      id: "cand-generic-object",
      user_id: "user-a",
      reflective_object_id: "obj-9",
      normalized_key: "lantern guide",
      display_label: "Lantern Guide",
      source_category: "actor",
      source_observation_id: "obs-9",
      source_observation_fragment_id: "frag-9",
      recurrence_count: 1,
      candidate_class: "new_candidate",
      proposed_entity_ids: [],
      state: "candidate",
      suppression_state: "none",
      suppression_reason: null,
      suppressed_at: null,
      last_seen_at: "2026-06-19T08:00:00.000Z",
      archived_at: null,
      created_at: "2026-06-19T08:00:00.000Z",
      updated_at: "2026-06-19T08:00:00.000Z",
    };

    const createdTermRow = {
      id: "term-lantern-guide",
      user_id: "user-a",
      normalized_key: "lantern guide",
      display_label: "Lantern Guide",
      canonical_label: "Lantern Guide",
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
      created_at: "2026-06-19T08:05:00.000Z",
      updated_at: "2026-06-19T08:05:00.000Z",
    };

    const appearanceRow = {
      id: "appearance-lantern-guide",
      user_id: "user-a",
      entity_id: "term-lantern-guide",
      dream_id: "obj-9",
      appearance_note: null,
      confirmed_at: "2026-06-19T08:05:00.000Z",
      created_at: "2026-06-19T08:05:00.000Z",
      updated_at: "2026-06-19T08:05:00.000Z",
    };

    const resolvedCandidateRow = {
      ...candidateRow,
      state: "pinned",
      updated_at: "2026-06-19T08:05:00.000Z",
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
        id: "assoc-lantern-guide",
        user_id: "user-a",
        glossary_term_id: "term-lantern-guide",
        reflective_object_id: "obj-9",
        observation_id: "obs-9",
        observation_fragment_id: "frag-9",
        association_label: "Created continuity entity from glossary candidate resolution.",
        created_at: "2026-06-19T08:05:00.000Z",
        updated_at: "2026-06-19T08:05:00.000Z",
      },
      error: null,
    });
    const associationInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: associationInsertSingle }) });

    const objectMaybeSingle = vi.fn().mockResolvedValue({ data: { id: "obj-9" }, error: null });
    const objectIs = vi.fn().mockReturnValue({ maybeSingle: objectMaybeSingle });
    const objectEq = vi.fn((column: string) => {
      if (column === "id") return { eq: objectEq };
      if (column === "user_id") return { is: objectIs };
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
      candidateId: "cand-generic-object",
      userId: "user-a",
      resolutionType: "create_new_entity",
      canonicalLabel: "Lantern Guide",
      type: "role",
    });

    expect(resolved?.candidate.state).toBe("pinned");
    expect(resolved?.appearanceRecord?.dreamId).toBe("obj-9");
    expect(objectEq).not.toHaveBeenCalledWith("object_type", "dream");
  });

  it("stabilizes confirmed term ordering when association timestamps are equal", async () => {
    const associationRows = [
      { glossary_term_id: "term-b", created_at: "2026-06-20T00:00:00.000Z" },
      { glossary_term_id: "term-a", created_at: "2026-06-20T00:00:00.000Z" },
      { glossary_term_id: "term-b", created_at: "2026-06-20T00:00:00.000Z" },
    ];
    const termRows = [
      {
        id: "term-b",
        user_id: "user-a",
        normalized_key: "bridge",
        display_label: "Bridge",
        canonical_label: "Bridge",
        type: "concept",
        aliases: [],
        general_note: null,
        appearance_count: 1,
        notes: null,
        state: "active",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        archived_at: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "term-a",
        user_id: "user-a",
        normalized_key: "apple",
        display_label: "Apple",
        canonical_label: "Apple",
        type: "concept",
        aliases: [],
        general_note: null,
        appearance_count: 1,
        notes: null,
        state: "active",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        archived_at: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
    ];

    const termIn = vi.fn().mockResolvedValue({ data: termRows, error: null });
    const termIs = vi.fn().mockReturnValue({ in: termIn });
    const termEq = vi.fn().mockReturnValue({ is: termIs });
    const termSelect = vi.fn().mockReturnValue({ eq: termEq });

    const associationEq = vi.fn((column: string) => {
      if (column === "user_id") return { eq: associationEq };
      return Promise.resolve({ data: associationRows, error: null });
    });
    const associationSelect = vi.fn().mockReturnValue({ eq: associationEq });

    const from = vi.fn((table: string) => {
      if (table === "glossary_associations") {
        return { select: associationSelect };
      }
      if (table === "glossary_terms") {
        return { select: termSelect };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const terms = await repository.listTermsByReflectiveObject("user-a", "obj-1");

    expect(terms.map((term) => term.id)).toEqual(["term-a", "term-b"]);
    expect(termIn).toHaveBeenCalledWith("id", ["term-a", "term-b"]);
  });

  it("stabilizes recent appearance ordering when confirmation timestamps are equal", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "appearance-b",
          user_id: "user-a",
          entity_id: "term-1",
          dream_id: "object-b",
          appearance_note: null,
          confirmed_at: "2026-06-20T00:00:00.000Z",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
        {
          id: "appearance-a",
          user_id: "user-a",
          entity_id: "term-1",
          dream_id: "object-a",
          appearance_note: null,
          confirmed_at: "2026-06-20T00:00:00.000Z",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      error: null,
    });
    const appearanceEq = vi.fn((column: string) => {
      if (column === "entity_id") return { eq: appearanceEq };
      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq: appearanceEq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    const appearances = await repository.listAppearanceRecordsByTerm("term-1", "user-a");

    expect(appearances.map((record) => record.id)).toEqual(["appearance-a", "appearance-b"]);
    expect(appearances.map((record) => record.dreamId)).toEqual(["object-a", "object-b"]);
  });

  it("yields an identical authority fingerprint for equivalent glossary authority despite raw row-order differences", async () => {
    const termRows = [
      {
        id: "term-b",
        user_id: "user-a",
        normalized_key: "bridge",
        display_label: "Bridge",
        canonical_label: "Bridge",
        type: "concept",
        aliases: [],
        general_note: null,
        appearance_count: 1,
        notes: null,
        state: "active",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        archived_at: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
      {
        id: "term-a",
        user_id: "user-a",
        normalized_key: "apple",
        display_label: "Apple",
        canonical_label: "Apple",
        type: "concept",
        aliases: [],
        general_note: "fruit",
        appearance_count: 2,
        notes: "fruit",
        state: "active",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        archived_at: null,
        created_at: "2026-06-20T00:00:00.000Z",
        updated_at: "2026-06-20T00:00:00.000Z",
      },
    ];

    const createRepository = (options: {
      associations: Array<{ glossary_term_id: string; created_at: string }>;
      termRows: typeof termRows;
      appearanceRowsByTermId: Record<string, Array<Record<string, unknown>>>;
    }) => {
      const termIn = vi.fn().mockResolvedValue({ data: options.termRows, error: null });
      const termIs = vi.fn().mockReturnValue({ in: termIn });
      const termEq = vi.fn().mockReturnValue({ is: termIs });
      const termSelect = vi.fn().mockReturnValue({ eq: termEq });

      const associationEq = vi.fn((column: string) => {
        if (column === "user_id") {
          return { eq: associationEq };
        }

        return Promise.resolve({ data: options.associations, error: null });
      });
      const associationSelect = vi.fn().mockReturnValue({ eq: associationEq });

      let currentAppearanceTermId = "";
      const appearanceSelect = vi.fn().mockReturnValue({
        eq: vi.fn((column: string, value: string) => {
          if (column === "entity_id") {
            currentAppearanceTermId = value;
            return {
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: options.appearanceRowsByTermId[currentAppearanceTermId] ?? [],
                  error: null,
                }),
              })),
            };
          }
          throw new Error(`Unexpected appearance column ${column}`);
        }),
      });

      const from = vi.fn((table: string) => {
        if (table === "glossary_associations") {
          return { select: associationSelect };
        }
        if (table === "glossary_terms") {
          return { select: termSelect };
        }
        if (table === "glossary_appearance_records") {
          return { select: appearanceSelect };
        }
        throw new Error(`Unexpected table ${table}`);
      });

      return new SupabaseGlossaryRepository({ from } as never);
    };

    const appearanceRowsByTermIdA = {
      "term-a": [
        {
          id: "appearance-b",
          user_id: "user-a",
          entity_id: "term-a",
          dream_id: "object-b",
          appearance_note: null,
          confirmed_at: "2026-06-20T00:00:00.000Z",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
        {
          id: "appearance-a",
          user_id: "user-a",
          entity_id: "term-a",
          dream_id: "object-a",
          appearance_note: null,
          confirmed_at: "2026-06-20T00:00:00.000Z",
          created_at: "2026-06-20T00:00:00.000Z",
          updated_at: "2026-06-20T00:00:00.000Z",
        },
      ],
      "term-b": [],
    };

    const repositoryA = createRepository({
      associations: [
        { glossary_term_id: "term-b", created_at: "2026-06-20T00:00:00.000Z" },
        { glossary_term_id: "term-a", created_at: "2026-06-20T00:00:00.000Z" },
      ],
      termRows,
      appearanceRowsByTermId: appearanceRowsByTermIdA,
    });
    const repositoryB = createRepository({
      associations: [
        { glossary_term_id: "term-a", created_at: "2026-06-20T00:00:00.000Z" },
        { glossary_term_id: "term-b", created_at: "2026-06-20T00:00:00.000Z" },
      ],
      termRows: [...termRows].reverse(),
      appearanceRowsByTermId: {
        "term-a": [...appearanceRowsByTermIdA["term-a"]].reverse(),
        "term-b": [],
      },
    });

    const buildGlossaryAuthority = async (repository: SupabaseGlossaryRepository): Promise<LatentAuthorityProvenance> => {
      const terms = await repository.listTermsByReflectiveObject("user-a", "obj-1");
      const appearanceLists = await Promise.all(
        terms.map(async (term) => ({
          termId: term.id,
          appearances: await repository.listAppearanceRecordsByTerm(term.id, "user-a"),
        })),
      );
      const appearanceRecords = appearanceLists.flatMap((entry) => entry.appearances);

      return {
        dream: {
          priorityReflectiveObjectId: "obj-1",
          title: "Dream",
          objectLanguage: "en",
          content: "dream content",
          summary: "dream summary",
        },
        observation: {
          observationBundleId: "bundle-1",
          observationRuntimeVersion: "observation_v2_phase1",
          semanticPolicyResult: "accept",
          bundleUncertaintyNotes: [],
          scenes: [],
          observations: [],
        },
        glossary: {
          confirmedTerms: terms.map((term) => ({
            glossaryTermId: term.id,
            displayLabel: term.displayLabel,
            normalizedKey: term.normalizedKey,
            termType: term.type === "concept" ? "concept" : "other",
            userNotes: term.generalNote,
            appearanceCount: term.appearanceCount,
            recentAppearanceObjectIds:
              appearanceLists.find((entry) => entry.termId === term.id)?.appearances.map((record) => record.dreamId) ?? [],
          })),
          appearanceRecords: appearanceRecords.map((record) => ({
            appearanceRecordId: record.id,
            glossaryTermId: record.entityId,
            reflectiveObjectId: record.dreamId,
            displayLabelAtAppearance: terms.find((term) => term.id === record.entityId)?.displayLabel ?? record.entityId,
            sourceObservationId: null,
          })),
        },
        reflections: [],
      };
    };

    expect(buildAuthorityFingerprint(await buildGlossaryAuthority(repositoryA))).toBe(
      buildAuthorityFingerprint(await buildGlossaryAuthority(repositoryB)),
    );
  });
});
