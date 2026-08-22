import { describe, expect, it, vi } from "vitest";

import { SupabaseFortuneSessionTurnRepository } from "@/src/infrastructure/supabase/repositories/fortune-session-turn-supabase-repository";

describe("SupabaseFortuneSessionTurnRepository", () => {
  it("stores an owned Fortune turn", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "turn-1",
        session_id: "session-1",
        user_id: "user-a",
        round_index: 0,
        role: "assistant",
        turn_kind: "reflective_prompt",
        content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
        created_at: "2026-08-19T12:00:00.000Z",
      },
      error: null,
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    const from = vi.fn().mockReturnValue({ insert });

    const repository = new SupabaseFortuneSessionTurnRepository({ from } as never);
    const turn = await repository.createTurn({
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 0,
      role: "assistant",
      turnKind: "reflective_prompt",
      content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
    });

    expect(insert).toHaveBeenCalledWith({
      session_id: "session-1",
      user_id: "user-a",
      round_index: 0,
      role: "assistant",
      turn_kind: "reflective_prompt",
      content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
    });
    expect(turn.turnKind).toBe("reflective_prompt");
  });

  it("loads ordered turns only for the owning user", async () => {
    const order = vi.fn();
    order
      .mockReturnValueOnce({ order })
      .mockResolvedValueOnce({
      data: [
        {
          id: "turn-1",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 0,
          role: "assistant",
          turn_kind: "reflective_prompt",
          content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
          created_at: "2026-08-19T12:00:00.000Z",
        },
        {
          id: "turn-2",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 0,
          role: "user",
          turn_kind: "reflective_reply",
          content: "Az latszik, hogy valami kozelebb jott.",
          created_at: "2026-08-19T12:01:00.000Z",
        },
        {
          id: "turn-3",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 1,
          role: "assistant",
          turn_kind: "reflective_prompt",
          content: "{\"reflection\":\"Most valami melyebbre fordul.\",\"question\":\"Mi valik itt hangsulyosabba?\"}",
          created_at: "2026-08-19T12:02:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "session_id") {
        return { eq };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseFortuneSessionTurnRepository({ from } as never);
    const turns = await repository.listTurnsBySession("session-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "session_id", "session-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(order).toHaveBeenNthCalledWith(1, "round_index", { ascending: true });
    expect(order).toHaveBeenNthCalledWith(2, "created_at", { ascending: true });
    expect(turns.map((turn) => [turn.roundIndex, turn.turnKind])).toEqual([
      [0, "reflective_prompt"],
      [0, "reflective_reply"],
      [1, "reflective_prompt"],
    ]);
  });

  it("returns the persisted assistant prompt after a uniqueness conflict", async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "turn-1",
        session_id: "session-1",
        user_id: "user-a",
        round_index: 0,
        role: "assistant",
        turn_kind: "reflective_prompt",
        content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
        created_at: "2026-08-19T12:00:00.000Z",
      },
      error: null,
    });
    const order = vi.fn();
    order
      .mockReturnValueOnce({ order })
      .mockReturnValueOnce({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "session_id" || column === "user_id" || column === "role" || column === "turn_kind") {
        return { eq, order };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ insert, select });

    const repository = new SupabaseFortuneSessionTurnRepository({ from } as never);
    const turn = await repository.createAssistantPromptTurnOrReadExisting({
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 0,
      role: "assistant",
      turnKind: "reflective_prompt",
      content: "{\"reflection\":\"Valami mar formalkozik.\",\"question\":\"Mi az, ami inkabb a hatterben marad?\"}",
    });

    expect(turn.id).toBe("turn-1");
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("returns the persisted reflective reply after a uniqueness conflict for the same round", async () => {
    const insertSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single: insertSingle }),
    });
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "turn-2",
        session_id: "session-1",
        user_id: "user-a",
        round_index: 1,
        role: "user",
        turn_kind: "reflective_reply",
        content: "Most valami tisztabban kirajzolodik.",
        created_at: "2026-08-19T12:03:00.000Z",
      },
      error: null,
    });
    const order = vi.fn();
    order
      .mockReturnValueOnce({ order })
      .mockReturnValueOnce({ maybeSingle });
    const eq = vi.fn((column: string) => {
      if (column === "session_id" || column === "user_id" || column === "role" || column === "turn_kind" || column === "round_index") {
        return { eq, order };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ insert, select });

    const repository = new SupabaseFortuneSessionTurnRepository({ from } as never);
    const turn = await repository.createReflectiveReplyTurnOrReadExisting({
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "user",
      turnKind: "reflective_reply",
      content: "Most valami tisztabban kirajzolodik.",
    });

    expect(turn.id).toBe("turn-2");
    expect(maybeSingle).toHaveBeenCalled();
  });

  it("returns the latest unanswered assistant turn for recovery", async () => {
    const order = vi.fn();
    order
      .mockReturnValueOnce({ order })
      .mockResolvedValueOnce({
      data: [
        {
          id: "turn-1",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 0,
          role: "assistant",
          turn_kind: "reflective_prompt",
          content: "{\"mode\":\"question\",\"reflection\":\"Elindult valami.\",\"question\":\"Mi latszik ebbol?\"}",
          created_at: "2026-08-19T12:00:00.000Z",
        },
        {
          id: "turn-2",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 0,
          role: "user",
          turn_kind: "reflective_reply",
          content: "Valami kozelebb jott.",
          created_at: "2026-08-19T12:01:00.000Z",
        },
        {
          id: "turn-3",
          session_id: "session-1",
          user_id: "user-a",
          round_index: 1,
          role: "assistant",
          turn_kind: "reflective_prompt",
          content: "{\"mode\":\"question\",\"reflection\":\"Valami mar szervezodik.\",\"question\":\"Mi ker meg figyelmet?\"}",
          created_at: "2026-08-19T12:04:00.000Z",
        },
      ],
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "session_id") {
        return { eq };
      }

      return { order };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseFortuneSessionTurnRepository({ from } as never);
    const turn = await repository.getLatestUnansweredAssistantTurn("session-1", "user-a");

    expect(turn?.roundIndex).toBe(1);
    expect(eq).toHaveBeenNthCalledWith(1, "session_id", "session-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
  });
});
