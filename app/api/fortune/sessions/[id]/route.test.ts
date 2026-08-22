import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getSessionById = vi.fn();
const listTurnsBySession = vi.fn();
const storeFirstInterpretation = vi.fn();
const updateSessionFocus = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    getSessionById,
    storeFirstInterpretation,
    updateSessionFocus,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository", () => ({
  createFortuneSessionTurnRepository: () => ({
    listTurnsBySession,
  }),
}));

describe("/api/fortune/sessions/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getSessionById.mockReset();
    listTurnsBySession.mockReset();
    storeFirstInterpretation.mockReset();
    updateSessionFocus.mockReset();
  });

  it("reads a Fortune session only for the authenticated owner", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getSessionById.mockResolvedValue({ id: "fortune-1" });
    listTurnsBySession.mockResolvedValue([]);

    const { GET } = await import("@/app/api/fortune/sessions/[id]/route");
    const response = await GET(new Request("http://localhost/api/fortune/sessions/fortune-1"), {
      params: Promise.resolve({ id: "fortune-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(getSessionById).toHaveBeenCalledWith("fortune-1", "user-a");
    expect(payload.turns).toEqual([]);
  });

  it("returns 404 instead of leaking another user's session", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-b", source: "supabase_auth" });
    getSessionById.mockResolvedValue(null);

    const { GET } = await import("@/app/api/fortune/sessions/[id]/route");
    const response = await GET(new Request("http://localhost/api/fortune/sessions/fortune-1"), {
      params: Promise.resolve({ id: "fortune-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("rejects attempts to mutate mode or card selections through PATCH", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });

    const { PATCH } = await import("@/app/api/fortune/sessions/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/fortune/sessions/fortune-1", {
        method: "PATCH",
        body: JSON.stringify({
          modeId: "timeline",
          cardSelections: [{ positionKey: "visible", cardId: "death" }],
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "fortune-1" }) },
    );

    expect(response.status).toBe(400);
    expect(storeFirstInterpretation).not.toHaveBeenCalled();
    expect(updateSessionFocus).not.toHaveBeenCalled();
  });

  it("stores the first interpretation while keeping the session active for its owner", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    storeFirstInterpretation.mockResolvedValue({
      id: "fortune-1",
      firstInterpretation: "Eloszor feszultseget es kivancsisagot erzek.",
      state: "active",
    });

    const { PATCH } = await import("@/app/api/fortune/sessions/[id]/route");
    const response = await PATCH(
      new Request("http://localhost/api/fortune/sessions/fortune-1", {
        method: "PATCH",
        body: JSON.stringify({
          firstInterpretation: "Eloszor feszultseget es kivancsisagot erzek.",
        }),
        headers: { "Content-Type": "application/json" },
      }),
      { params: Promise.resolve({ id: "fortune-1" }) },
    );

    expect(response.status).toBe(200);
    expect(storeFirstInterpretation).toHaveBeenCalledWith({
      sessionId: "fortune-1",
      userId: "user-a",
      firstInterpretation: "Eloszor feszultseget es kivancsisagot erzek.",
    });
  });
});
