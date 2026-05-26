import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getResponseById = vi.fn();
const createThreadAssociation = vi.fn();
const removeThreadAssociation = vi.fn();
const getThreadById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    getResponseById,
    createThreadAssociation,
    removeThreadAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    getThreadById,
  }),
}));

describe("/api/responses/[id]/threads route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getResponseById.mockReset();
    createThreadAssociation.mockReset();
    removeThreadAssociation.mockReset();
    getThreadById.mockReset();
  });

  it("requires response and thread ownership before linking", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getResponseById.mockResolvedValue({ id: "response-1" });
    getThreadById.mockResolvedValue({ id: "thread-1" });
    createThreadAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/responses/[id]/threads/route");
    const response = await POST(
      new Request("http://localhost/api/responses/response-1/threads", {
        method: "POST",
        body: JSON.stringify({ threadId: "thread-1" }),
      }),
      { params: Promise.resolve({ id: "response-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getResponseById).toHaveBeenCalledWith("response-1", "user-a");
    expect(getThreadById).toHaveBeenCalledWith("thread-1", "user-a");
  });

  it("removes thread association when target exists", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getResponseById.mockResolvedValue({ id: "response-1" });
    removeThreadAssociation.mockResolvedValue(true);

    const { DELETE } = await import("@/app/api/responses/[id]/threads/route");
    const response = await DELETE(
      new Request("http://localhost/api/responses/response-1/threads", {
        method: "DELETE",
        body: JSON.stringify({ threadId: "thread-1" }),
      }),
      { params: Promise.resolve({ id: "response-1" }) },
    );

    expect(response.status).toBe(200);
    expect(removeThreadAssociation).toHaveBeenCalledWith("response-1", "thread-1", "user-a");
  });
});
