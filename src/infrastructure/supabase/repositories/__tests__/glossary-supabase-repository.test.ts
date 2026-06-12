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
    expect(eqForUpdate).toHaveBeenNthCalledWith(1, "id", "cand-1");
    expect(eqForUpdate).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(isForUpdate).toHaveBeenCalledWith("archived_at", null);
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
      if (column === "normalized_key") return { is: candidateIs };
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

  it("creates continuity entity rows when a candidate is pinned", async () => {
    const maybeSingleForLoad = vi
      .fn()
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    const candidateIs = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForLoad });
    const candidateEq = vi.fn((column: string) => {
      if (column === "id") return { eq: candidateEq };
      if (column === "user_id") return { is: candidateIs };
      return { is: candidateIs };
    });
    const candidateSelect = vi.fn().mockReturnValue({ eq: candidateEq });

    const maybeSingleForPinnedUpdate = vi.fn().mockResolvedValue({
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
        state: "pinned",
        suppression_state: "none",
        suppression_reason: null,
        suppressed_at: null,
        last_seen_at: "2026-05-24T00:00:00.000Z",
        archived_at: null,
        created_at: "2026-05-24T00:00:00.000Z",
        updated_at: "2026-05-24T01:00:00.000Z",
      },
      error: null,
    });

    const selectAfterPinnedUpdate = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForPinnedUpdate });
    const isAfterPinnedUpdate = vi.fn().mockReturnValue({ select: selectAfterPinnedUpdate });
    const eqAfterPinnedUpdate = vi.fn((column: string) => {
      if (column === "id") return { eq: eqAfterPinnedUpdate };
      return { is: isAfterPinnedUpdate };
    });

    const update = vi.fn().mockReturnValue({ eq: eqAfterPinnedUpdate });

    const singleForInsert = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "term-1",
          user_id: "user-a",
          normalized_key: "door",
          display_label: "Door",
          canonical_label: "Door",
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
          created_at: "2026-05-24T01:00:00.000Z",
          updated_at: "2026-05-24T01:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "appearance-1",
          user_id: "user-a",
          entity_id: "term-1",
          dream_id: "obj-1",
          appearance_note: "Most nagyon tamogato volt.",
          confirmed_at: "2026-05-24T01:00:00.000Z",
          created_at: "2026-05-24T01:00:00.000Z",
          updated_at: "2026-05-24T01:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "term-1",
          user_id: "user-a",
          normalized_key: "door",
          display_label: "Door",
          canonical_label: "Door",
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
          created_at: "2026-05-24T01:00:00.000Z",
          updated_at: "2026-05-24T01:00:00.000Z",
        },
        error: null,
      })
      .mockResolvedValueOnce({
        count: 1,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: "assoc-1",
          user_id: "user-a",
          glossary_term_id: "term-1",
          reflective_object_id: "obj-1",
          observation_id: "obs-1",
          observation_fragment_id: "frag-1",
          association_label: "Pinned from recurring reflective material.",
          created_at: "2026-05-24T01:00:00.000Z",
          updated_at: "2026-05-24T01:00:00.000Z",
        },
        error: null,
      });

    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleForInsert });
    const insert = vi.fn().mockReturnValue({ select: selectAfterInsert });
    let appearanceSelectCalls = 0;

    const from = vi.fn((table: string) => {
      if (table === "glossary_candidate_states") {
        return { select: candidateSelect, update };
      }

      if (table === "glossary_terms") {
        const termIs = vi.fn().mockReturnValue({ maybeSingle: maybeSingleForLoad });
        const termEq = vi.fn((column: string) => {
          if (column === "user_id") return { eq: termEq };
          if (column === "normalized_key") return { is: termIs };
          return { is: termIs };
        });
        const termSelect = vi.fn().mockReturnValue({ eq: termEq });

        return { select: termSelect, insert, update };
      }

      if (table === "glossary_appearance_records") {
        appearanceSelectCalls += 1;

        if (appearanceSelectCalls === 1) {
          const maybeSingle = vi.fn().mockResolvedValue({
            data: null,
            error: null,
          });
          const eq = vi.fn((column: string) => {
            if (column === "entity_id") return { eq };
            if (column === "dream_id") return { eq };
            return { maybeSingle };
          });

          return {
            insert,
            select: vi.fn().mockReturnValue({ eq }),
          };
        }

        const countEq = vi.fn((column: string) => {
          if (column === "entity_id") {
            return {
              eq: vi.fn().mockResolvedValue({
                count: 1,
                error: null,
              }),
            };
          }

          return {
            eq: vi.fn().mockResolvedValue({
              count: 1,
              error: null,
            }),
          };
        });

        return {
          insert,
          select: vi.fn().mockReturnValue({ eq: countEq }),
        };
      }

      if (table === "reflective_objects") {
        const objectMaybeSingle = vi.fn().mockResolvedValue({
          data: { id: "obj-1" },
          error: null,
        });
        const objectIs = vi.fn().mockReturnValue({ maybeSingle: objectMaybeSingle });
        const objectEq = vi.fn((column: string) => {
          if (column === "id") return { eq: objectEq };
          if (column === "user_id") return { eq: objectEq };
          if (column === "object_type") return { is: objectIs };
          return { is: objectIs };
        });
        const objectSelect = vi.fn().mockReturnValue({ eq: objectEq });

        return { select: objectSelect };
      }

      return { insert };
    });

    const repository = new SupabaseGlossaryRepository({ from } as never);
    await repository.setCandidateLifecycle({
      candidateId: "cand-1",
      userId: "user-a",
      nextState: "pinned",
      appearanceNote: "Most nagyon tamogato volt.",
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-a",
        normalized_key: "door",
        display_label: "Door",
        canonical_label: "Door",
        type: "concept",
        aliases: [],
        general_note: null,
        appearance_count: 0,
      }),
    );
    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        user_id: "user-a",
        entity_id: "term-1",
        dream_id: "obj-1",
        appearance_note: "Most nagyon tamogato volt.",
      }),
    );
  });
});
