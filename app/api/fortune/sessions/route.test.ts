import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const createSession = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    createSession,
  }),
}));

describe("/api/fortune/sessions route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    createSession.mockReset();
    vi.restoreAllMocks();
  });

  it("creates an authenticated Fortune session for any authored mode using the selected card ids", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    createSession.mockResolvedValue({
      id: "fortune-1",
      userId: "user-a",
      modeId: "timeline",
      focusText: null,
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:00:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions", {
        method: "POST",
        body: JSON.stringify({
          modeId: "timeline",
          selectedCardIds: ["the_fool", "the_magician", "the_high_priestess"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(createSession).toHaveBeenCalledWith({
      userId: "user-a",
      modeId: "timeline",
      focusText: null,
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
    });
  });

  it("normalizes and persists optional focus text at session creation", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    createSession.mockResolvedValue({
      id: "fortune-2",
      userId: "user-a",
      modeId: "timeline",
      focusText: "Munkahelyváltás körüli bizonytalanság",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
      firstInterpretation: null,
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T10:00:00.000Z",
      updatedAt: "2026-08-19T10:00:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions", {
        method: "POST",
        body: JSON.stringify({
          modeId: "timeline",
          focusText: "  Munkahelyváltás körüli bizonytalanság  ",
          selectedCardIds: ["the_fool", "the_magician", "the_high_priestess"],
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(201);
    expect(createSession).toHaveBeenCalledWith({
      userId: "user-a",
      modeId: "timeline",
      focusText: "Munkahelyváltás körüli bizonytalanság",
      cardSelections: [
        { positionKey: "past_trace", cardId: "the_fool" },
        { positionKey: "present_dynamic", cardId: "the_magician" },
        { positionKey: "forming", cardId: "the_high_priestess" },
      ],
    });
  });

  it("rejects unauthenticated Fortune session creation", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { POST } = await import("@/app/api/fortune/sessions/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions", {
        method: "POST",
        body: JSON.stringify({ modeId: "situation_unfolding" }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    expect(response.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });
});
