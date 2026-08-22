import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const pauseSession = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    pauseSession,
  }),
}));

describe("/api/fortune/sessions/[id]/pause route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    pauseSession.mockReset();
  });

  it("pauses an owned Fortune session", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    pauseSession.mockResolvedValue({
      id: "session-1",
      state: "paused",
      pausedAt: "2026-08-19T12:03:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/pause/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/pause", { method: "POST" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(pauseSession).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-a",
    });
  });
});
