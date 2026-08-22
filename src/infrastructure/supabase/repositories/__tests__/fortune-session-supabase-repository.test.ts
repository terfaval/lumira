import { describe, expect, it, vi } from "vitest";

import { SupabaseFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/fortune-session-supabase-repository";

describe("SupabaseFortuneSessionRepository", () => {
  it("creates an owned Fortune session while persisting only card references", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: "Munkahelyi atmenet",
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
      ],
      first_interpretation: null,
      state: "active",
      paused_at: null,
      completed_at: null,
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:00:00.000Z",
      },
      error: null,
    });
    const insert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ single }),
    });
    const from = vi.fn().mockReturnValue({ insert });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.createSession({
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: "Munkahelyi atmenet",
      cardSelections: [
        { positionKey: "visible", cardId: "the_fool" },
        { positionKey: "hidden", cardId: "the_magician" },
      ],
    });

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-a",
      mode_id: "situation_unfolding",
      focus_text: "Munkahelyi atmenet",
      card_selections: [
        { positionKey: "visible", cardId: "the_fool" },
        { positionKey: "hidden", cardId: "the_magician" },
      ],
      first_interpretation: null,
      state: "active",
      paused_at: null,
      completed_at: null,
    });
    const insertedRow = insert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(insertedRow).sort()).toEqual(
      ["card_selections", "completed_at", "first_interpretation", "focus_text", "mode_id", "paused_at", "state", "user_id"].sort(),
    );
    expect(session.cardSelections).toEqual([
      { positionKey: "visible", cardId: "the_fool" },
      { positionKey: "hidden", cardId: "the_magician" },
    ]);
  });

  it("loads a Fortune session by id only for the owning user", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: null,
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
      ],
      first_interpretation: null,
      state: "active",
      paused_at: null,
      completed_at: null,
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:00:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { maybeSingle };
    });
    const select = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ select });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.getSessionById("fortune-1", "user-a");

    expect(eq).toHaveBeenNthCalledWith(1, "id", "fortune-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(session?.id).toBe("fortune-1");
  });

  it("stores the first interpretation while keeping the Fortune session active", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: "Munkahelyi atmenet",
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
      ],
      first_interpretation: "Eloszor feszultseget es kivancsisagot erzek.",
      state: "active",
      paused_at: null,
      completed_at: null,
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:05:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { select: vi.fn().mockReturnValue({ maybeSingle: single }) };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.storeFirstInterpretation({
      sessionId: "fortune-1",
      userId: "user-a",
      firstInterpretation: "Eloszor feszultseget es kivancsisagot erzek.",
    });

    expect(update).toHaveBeenCalledWith({
      first_interpretation: "Eloszor feszultseget es kivancsisagot erzek.",
    });
    expect(eq).toHaveBeenNthCalledWith(1, "id", "fortune-1");
    expect(eq).toHaveBeenNthCalledWith(2, "user_id", "user-a");
    expect(session?.state).toBe("active");
  });

  it("marks a Fortune session completed without changing the stored first interpretation", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: "Munkahelyi atmenet",
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
      ],
      first_interpretation: "Eloszor feszultseget es kivancsisagot erzek.",
      state: "completed",
      paused_at: null,
      completed_at: "2026-08-19T10:05:00.000Z",
      created_at: "2026-08-19T10:00:00.000Z",
      updated_at: "2026-08-19T10:05:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { select: vi.fn().mockReturnValue({ maybeSingle: single }) };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.markCompleted({
      sessionId: "fortune-1",
      userId: "user-a",
    });

    expect(update).toHaveBeenCalledWith({
      state: "completed",
      paused_at: null,
      completed_at: expect.any(String),
    });
    expect(session?.state).toBe("completed");
  });

  it("pauses an active Fortune session without mutating interpretation content", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: "Munkahelyi atmenet",
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        first_interpretation: "Eloszor feszultseget es kivancsisagot erzek.",
        state: "paused",
        paused_at: "2026-08-19T10:06:00.000Z",
        completed_at: null,
        created_at: "2026-08-19T10:00:00.000Z",
        updated_at: "2026-08-19T10:06:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { select: vi.fn().mockReturnValue({ maybeSingle: single }) };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.pauseSession({
      sessionId: "fortune-1",
      userId: "user-a",
    });

    expect(update).toHaveBeenCalledWith({
      state: "paused",
      paused_at: expect.any(String),
      completed_at: null,
    });
    expect(session?.state).toBe("paused");
    expect(session?.pausedAt).toBe("2026-08-19T10:06:00.000Z");
    expect(session?.firstInterpretation).toBe("Eloszor feszultseget es kivancsisagot erzek.");
  });

  it("resumes a paused Fortune session back to active without changing stored turns", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "fortune-1",
        user_id: "user-a",
        mode_id: "situation_unfolding",
        focus_text: "Munkahelyi atmenet",
        card_selections: [
          { positionKey: "visible", cardId: "the_fool" },
          { positionKey: "hidden", cardId: "the_magician" },
        ],
        first_interpretation: "Eloszor feszultseget es kivancsisagot erzek.",
        state: "active",
        paused_at: null,
        completed_at: null,
        created_at: "2026-08-19T10:00:00.000Z",
        updated_at: "2026-08-19T10:07:00.000Z",
      },
      error: null,
    });
    const eq = vi.fn((column: string) => {
      if (column === "id") {
        return { eq };
      }

      return { select: vi.fn().mockReturnValue({ maybeSingle: single }) };
    });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });

    const repository = new SupabaseFortuneSessionRepository({ from } as never);
    const session = await repository.resumeSession({
      sessionId: "fortune-1",
      userId: "user-a",
    });

    expect(update).toHaveBeenCalledWith({
      state: "active",
      paused_at: null,
    });
    expect(session?.state).toBe("active");
    expect(session?.pausedAt).toBeNull();
  });
});
