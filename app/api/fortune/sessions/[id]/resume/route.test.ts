import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const resumeSession = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    resumeSession,
  }),
}));

describe("/api/fortune/sessions/[id]/resume route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    resumeSession.mockReset();
  });

  it("resumes a paused owned Fortune session", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    resumeSession.mockResolvedValue({
      id: "session-1",
      state: "active",
      pausedAt: null,
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/resume/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/resume", { method: "POST" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(resumeSession).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-a",
    });
  });
});
