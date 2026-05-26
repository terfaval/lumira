import { describe, expect, it, vi } from "vitest";

import { SupabaseReflectiveResponseRepository } from "@/src/infrastructure/supabase/repositories/response-supabase-repository";

describe("SupabaseReflectiveResponseRepository isolation", () => {
  it("scopes response listing by user and non-archived state", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const is = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ is });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectiveResponseRepository({ from } as never);
    await repository.listResponsesByUser("user-a");

    expect(eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(is).toHaveBeenCalledWith("archived_at", null);
  });

  it("scopes thread-association removal by response, thread, and user", async () => {
    const eq = vi.fn((column: string) => {
      if (column === "response_id") return { eq };
      if (column === "thread_id") return { eq };
      return Promise.resolve({ error: null, count: 1 });
    });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });

    const repository = new SupabaseReflectiveResponseRepository({ from } as never);
    const removed = await repository.removeThreadAssociation("response-1", "thread-1", "user-a");

    expect(removed).toBe(true);
    expect(eq).toHaveBeenNthCalledWith(1, "response_id", "response-1");
    expect(eq).toHaveBeenNthCalledWith(2, "thread_id", "thread-1");
    expect(eq).toHaveBeenNthCalledWith(3, "user_id", "user-a");
  });

  it("records activation_without_response events without creating responses", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "event-1",
        user_id: "user-a",
        opening_id: "opening-1",
        activation_source: "reflective_space_surface",
        activation_context: "reflective_space_surface",
        opening_response_context: "activation_without_response",
        response_id: null,
        created_at: "2026-05-25T00:00:00.000Z",
        updated_at: "2026-05-25T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn().mockReturnValue({ single });
    const insert = vi.fn().mockReturnValue({ select });
    const from = vi.fn().mockReturnValue({ insert });

    const repository = new SupabaseReflectiveResponseRepository({ from } as never);
    const event = await repository.createOpeningActivationEvent({
      userId: "user-a",
      openingId: "opening-1",
      activationSource: "reflective_space_surface",
      activationContext: "reflective_space_surface",
      openingResponseContext: "activation_without_response",
    });

    expect(event.responseId).toBeNull();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        opening_response_context: "activation_without_response",
      }),
    );
  });

  it("scopes opening-response association removal by opening, response, and user", async () => {
    const eq = vi.fn((column: string) => {
      if (column === "opening_id") return { eq };
      if (column === "response_id") return { eq };
      return Promise.resolve({ error: null, count: 1 });
    });
    const del = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ delete: del });

    const repository = new SupabaseReflectiveResponseRepository({ from } as never);
    const removed = await repository.removeOpeningResponseAssociation("opening-1", "response-1", "user-a");

    expect(removed).toBe(true);
    expect(eq).toHaveBeenNthCalledWith(1, "opening_id", "opening-1");
    expect(eq).toHaveBeenNthCalledWith(2, "response_id", "response-1");
    expect(eq).toHaveBeenNthCalledWith(3, "user_id", "user-a");
  });

  it("lists opening activation events in a bounded user-scoped window", async () => {
    const query = {
      eq: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    };
    query.eq.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockResolvedValue({ data: [], error: null });
    const select = vi.fn().mockReturnValue(query);
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseReflectiveResponseRepository({ from } as never);
    await repository.listOpeningActivationEventsByWindow({
      userId: "user-a",
      openingId: "opening-1",
      beforeCreatedAt: "2026-05-25T00:00:00.000Z",
      limit: 12,
    });

    expect(query.eq).toHaveBeenCalledWith("user_id", "user-a");
    expect(query.lt).toHaveBeenCalledWith("created_at", "2026-05-25T00:00:00.000Z");
    expect(query.eq).toHaveBeenCalledWith("opening_id", "opening-1");
    expect(query.limit).toHaveBeenCalledWith(12);
  });
});
