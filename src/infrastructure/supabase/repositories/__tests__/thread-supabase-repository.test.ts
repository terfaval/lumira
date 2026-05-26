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
});
