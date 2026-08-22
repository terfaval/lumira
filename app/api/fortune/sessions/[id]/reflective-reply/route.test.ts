import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSessionById = vi.fn();
const getLatestUnansweredAssistantTurn = vi.fn();
const createReflectiveReplyTurnOrReadExisting = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    getSessionById,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository", () => ({
  createFortuneSessionTurnRepository: () => ({
    getLatestUnansweredAssistantTurn,
    createReflectiveReplyTurnOrReadExisting,
  }),
}));

describe("/api/fortune/sessions/[id]/reflective-reply route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSessionById.mockReset();
    getLatestUnansweredAssistantTurn.mockReset();
    createReflectiveReplyTurnOrReadExisting.mockReset();
  });

  it("persists a non-empty reflective reply for the current unanswered round without completing the session", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: "Munkahelyi atmenet",
      cardSelections: [],
      firstInterpretation: "Valami ket reteget mutat.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue({
      id: "turn-1",
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "assistant",
      turnKind: "reflective_prompt",
      content: "{}",
      createdAt: "2026-08-19T12:01:00.000Z",
    });
    createReflectiveReplyTurnOrReadExisting.mockResolvedValue({
      id: "turn-2",
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "user",
      turnKind: "reflective_reply",
      content: "Ez most jobban megmutat valamit.",
      createdAt: "2026-08-19T12:02:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/reflective-reply/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions/session-1/reflective-reply", {
        method: "POST",
        body: JSON.stringify({ content: "Ez most jobban megmutat valamit." }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.turn.turnKind).toBe("reflective_reply");
    expect(createReflectiveReplyTurnOrReadExisting).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-a",
      roundIndex: 1,
      role: "user",
      turnKind: "reflective_reply",
      content: "Ez most jobban megmutat valamit.",
    });
  });

  it("rejects empty reflective replies", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/reflective-reply/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions/session-1/reflective-reply", {
        method: "POST",
        body: JSON.stringify({ content: "   " }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(400);
    expect(createReflectiveReplyTurnOrReadExisting).not.toHaveBeenCalled();
  });

  it("rejects replies when there is no unanswered assistant turn", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({
      id: "session-1",
      userId: "user-a",
      modeId: "situation_unfolding",
      focusText: "Munkahelyi atmenet",
      cardSelections: [],
      firstInterpretation: "Valami ket reteget mutat.",
      state: "active",
      pausedAt: null,
      completedAt: null,
      createdAt: "2026-08-19T12:00:00.000Z",
      updatedAt: "2026-08-19T12:00:00.000Z",
    });
    getLatestUnansweredAssistantTurn.mockResolvedValue(null);

    const { POST } = await import("@/app/api/fortune/sessions/[id]/reflective-reply/route");
    const response = await POST(
      new Request("http://localhost/api/fortune/sessions/session-1/reflective-reply", {
        method: "POST",
        body: JSON.stringify({ content: "Ez most jobban megmutat valamit." }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "session-1" }) },
    );

    expect(response.status).toBe(409);
    expect(createReflectiveReplyTurnOrReadExisting).not.toHaveBeenCalled();
  });
});
