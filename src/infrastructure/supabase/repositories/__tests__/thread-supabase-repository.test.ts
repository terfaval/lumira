import { describe, expect, it, vi } from "vitest";

import { SupabaseThreadRepository } from "@/src/infrastructure/supabase/repositories/thread-supabase-repository";

describe("SupabaseThreadRepository isolation", () => {
  it("scopes list threads by user and archived visibility", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseThreadRepository({ from } as never);
    await repository.listThreadsByUser("user-a");

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("writes dormant timestamp on dormant state transition", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const is = vi.fn().mockReturnValue({ select });
    const eq = vi.fn((column: string) => {
      if (column === "id") return { eq };
      return { is };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseThreadRepository({ from } as never);
    await repository.setThreadState("thread-1", "user-a", "dormant");

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "dormant",
        dormant_since: expect.any(String),
      }),
    );
    expect(eq).toHaveBeenNthCalledWith(1, "id", "thread-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("lists threads by reflective object association before loading thread rows", async () => {
    const threadRows = [
      {
        id: "thread-1",
        user_id: "user-a",
        title: "Associated thread",
        context_note: null,
        state: "active",
        visibility: "ambient",
        continuity_cues: [],
        dormant_since: null,
        archived_at: null,
        created_at: "2026-06-18T12:00:00.000Z",
        updated_at: "2026-06-18T12:00:00.000Z",
      },
    ];

    const threadLimit = vi.fn().mockResolvedValue({ data: threadRows, error: null });
    const threadOrder = vi.fn().mockReturnValue({ limit: threadLimit });
    const threadIn = vi.fn().mockReturnValue({ order: threadOrder });
    const threadIs = vi.fn().mockReturnValue({ in: threadIn });
    const threadEq = vi.fn((column: string) => {
      if (column === "user_id") return { is: threadIs };
      return { eq: threadEq };
    });
    const threadSelect = vi.fn().mockReturnValue({ eq: threadEq });

    const associationLimit = vi.fn().mockResolvedValue({
      data: [{ thread_id: "thread-1" }],
      error: null,
    });
    const associationOrder = vi.fn().mockReturnValue({ limit: associationLimit });
    const associationEq = vi.fn((column: string) => {
      if (column === "user_id") return { eq: associationEq };
      return { order: associationOrder };
    });
    const associationSelect = vi.fn().mockReturnValue({ eq: associationEq });

    const from = vi.fn((table: string) => {
      if (table === "thread_object_associations") {
        return { select: associationSelect };
      }

      return { select: threadSelect };
    });

    const repository = new SupabaseThreadRepository({ from } as never);
    const threads = await repository.listThreadsByReflectiveObject("user-a", "obj-1", 1);

    expect(associationEq).toHaveBeenNthCalledWith(1, "user_id", "user-a");
    expect(associationEq).toHaveBeenNthCalledWith(2, "reflective_object_id", "obj-1");
    expect(threadEq).toHaveBeenCalledWith("user_id", "user-a");
    expect(threadIs).toHaveBeenCalledWith("archived_at", null);
    expect(threadIn).toHaveBeenCalledWith("id", ["thread-1"]);
    expect(threads.map((thread) => thread.id)).toEqual(["thread-1"]);
  });
});
