import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const markCompleted = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-fortune-session-repository", () => ({
  createFortuneSessionRepository: () => ({
    markCompleted,
  }),
}));

describe("/api/fortune/sessions/[id]/complete route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    markCompleted.mockReset();
  });

  it("completes an owned Fortune session explicitly", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    markCompleted.mockResolvedValue({
      id: "session-1",
      state: "completed",
      completedAt: "2026-08-19T12:05:00.000Z",
    });

    const { POST } = await import("@/app/api/fortune/sessions/[id]/complete/route");
    const response = await POST(new Request("http://localhost/api/fortune/sessions/session-1/complete", { method: "POST" }), {
      params: Promise.resolve({ id: "session-1" }),
    });

    expect(response.status).toBe(200);
    expect(markCompleted).toHaveBeenCalledWith({
      sessionId: "session-1",
      userId: "user-a",
    });
  });
});
