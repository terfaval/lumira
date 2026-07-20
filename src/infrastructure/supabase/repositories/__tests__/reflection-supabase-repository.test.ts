import { describe, expect, it, vi } from "vitest";

import { SupabaseReflectionRepository } from "@/src/infrastructure/supabase/repositories/reflection-supabase-repository";

describe("SupabaseReflectionRepository isolation", () => {
  it("loads an admitted active reflection by id with preserved continuity provenance", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "reflection-1",
        user_id: "user-a",
        candidate_id: "candidate-1",
        thread_id: "thread-1",
        source_response_id: "response-1",
        source_opening_id: "opening-1",
        source_reflective_object_ids: ["obj-1", "obj-2"],
        statement: "I keep returning to the same uncertainty during transition.",
        pattern: ["Transition", "Uncertainty", "Return"],
        admitted_at: "2026-07-04T12:00:00.000Z",
        archived_at: null,
        created_at: "2026-07-04T12:00:00.000Z",
        updated_at: "2026-07-04T12:00:00.000Z",
      },
      error: null,
    });
    const is = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { is };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectionRepository({ from } as never);
    const reflection = await repository.getReflectionById("reflection-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "id", "reflection-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(reflection).toEqual(
      expect.objectContaining({
        id: "reflection-1",
        statement: "I keep returning to the same uncertainty during transition.",
        pattern: ["Transition", "Uncertainty", "Return"],
        candidateId: "candidate-1",
        threadId: "thread-1",
        sourceResponseId: "response-1",
        sourceOpeningId: "opening-1",
        sourceReflectiveObjectIds: ["obj-1", "obj-2"],
      }),
    );
  });

  it("lists admitted reflections by user as active continuity inputs only", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [
        {
          id: "reflection-2",
          user_id: "user-a",
          candidate_id: "candidate-2",
          thread_id: "thread-2",
          source_response_id: "response-2",
          source_opening_id: null,
          source_reflective_object_ids: ["obj-2"],
          statement: "A repeated search seems to stay linked to uncertainty.",
          pattern: ["Search", "Uncertainty"],
          admitted_at: "2026-07-05T08:00:00.000Z",
          archived_at: null,
          created_at: "2026-07-05T08:00:00.000Z",
          updated_at: "2026-07-05T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectionRepository({ from } as never);
    const reflections = await repository.listReflectionsByUser("user-a", 8);

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
    expect(order).toHaveBeenCalledWith("admitted_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(8);
    expect(reflections).toEqual([
      expect.objectContaining({
        id: "reflection-2",
        statement: "A repeated search seems to stay linked to uncertainty.",
        pattern: ["Search", "Uncertainty"],
        candidateId: "candidate-2",
        threadId: "thread-2",
        sourceResponseId: "response-2",
        sourceOpeningId: null,
        sourceReflectiveObjectIds: ["obj-2"],
      }),
    ]);
  });

  it("admits a reflection through a single atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        id: "reflection-1",
        user_id: "user-a",
        candidate_id: "candidate-1",
        thread_id: "thread-1",
        source_response_id: "response-1",
        source_opening_id: "opening-1",
        source_reflective_object_ids: ["obj-1"],
        statement: "I keep returning to the same uncertainty during transition.",
        pattern: ["Transition", "Uncertainty", "Return"],
        admitted_at: "2026-07-04T12:00:00.000Z",
        archived_at: null,
        created_at: "2026-07-04T12:00:00.000Z",
        updated_at: "2026-07-04T12:00:00.000Z",
      },
      error: null,
    });

    const repository = new SupabaseReflectionRepository({ rpc } as never);
    const reflection = await repository.admitReflection({
      userId: "user-a",
      candidateId: "candidate-1",
      statement: "I keep returning to the same uncertainty during transition.",
      pattern: ["Transition", "Uncertainty", "Return"],
    });

    expect(rpc).toHaveBeenCalledWith("admit_reflection", {
      p_user_id: "user-a",
      p_candidate_id: "candidate-1",
      p_statement: "I keep returning to the same uncertainty during transition.",
      p_pattern: ["Transition", "Uncertainty", "Return"],
    });
    expect(reflection.candidateId).toBe("candidate-1");
  });
});
