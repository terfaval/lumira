import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getThreadById = vi.fn();
const listAssociationsByThread = vi.fn();
const updateThread = vi.fn();
const archiveThread = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    getThreadById,
    listAssociationsByThread,
    updateThread,
    archiveThread,
  }),
}));

describe("/api/threads/[id] route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getThreadById.mockReset();
    listAssociationsByThread.mockReset();
    updateThread.mockReset();
    archiveThread.mockReset();
  });

  it("scopes thread lookup to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getThreadById.mockResolvedValue({ id: "thread-1" });
    listAssociationsByThread.mockResolvedValue([]);

    const { GET } = await import("@/app/api/threads/[id]/route");
    const response = await GET(new Request("http://localhost/api/threads/thread-1"), {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(getThreadById).toHaveBeenCalledWith("thread-1", "user-a");
    expect(listAssociationsByThread).toHaveBeenCalledWith("thread-1", "user-a");
  });

  it("scopes archive operation to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    archiveThread.mockResolvedValue({ id: "thread-1" });

    const { DELETE } = await import("@/app/api/threads/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/threads/thread-1"), {
      params: Promise.resolve({ id: "thread-1" }),
    });

    expect(response.status).toBe(200);
    expect(archiveThread).toHaveBeenCalledWith("thread-1", "user-a");
  });
});
