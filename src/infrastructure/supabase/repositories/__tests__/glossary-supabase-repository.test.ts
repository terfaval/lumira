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
});
