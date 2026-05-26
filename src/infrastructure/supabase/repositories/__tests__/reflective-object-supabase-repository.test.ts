import { describe, expect, it, vi } from "vitest";

import { SupabaseReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/reflective-object-supabase-repository";

function makeRow(id: string, userId: string) {
  const now = "2026-01-01T00:00:00.000Z";

  return {
    id,
    user_id: userId,
    object_type: "dream",
    title: "Dream",
    primary_content: "Content",
    source_context: "manual",
    state: "active",
    metadata: {},
    created_at: now,
    updated_at: now,
    archived_at: null,
  };
}

describe("SupabaseReflectiveObjectRepository isolation", () => {
  it("scopes getById by object id, user id, and non-archived state", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: makeRow("obj-1", "user-a"), error: null });
    const is = vi.fn().mockReturnValue({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "id") return { eq, is };
      return { is };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectiveObjectRepository({ from } as never);

    await repository.getById("obj-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "id", "obj-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("scopes archive by object id and user id", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: makeRow("obj-1", "user-a"), error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const is = vi.fn().mockReturnValue({ select });
    const eq = vi.fn((column: string) => {
      if (column === "id") return { eq, is };
      return { is };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseReflectiveObjectRepository({ from } as never);

    await repository.archive("obj-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "id", "obj-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });
});
