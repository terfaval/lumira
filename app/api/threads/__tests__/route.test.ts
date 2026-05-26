import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const listThreadsByUser = vi.fn();
const createThread = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    listThreadsByUser,
    createThread,
  }),
}));

describe("/api/threads route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    listThreadsByUser.mockReset();
    createThread.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/threads/route");
    const response = await GET(new Request("http://localhost/api/threads"));

    expect(response.status).toBe(401);
  });

  it("lists threads for resolved user id", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listThreadsByUser.mockResolvedValue([]);

    const { GET } = await import("@/app/api/threads/route");
    const response = await GET(new Request("http://localhost/api/threads"));

    expect(response.status).toBe(200);
    expect(listThreadsByUser).toHaveBeenCalledWith("user-a");
  });
});
