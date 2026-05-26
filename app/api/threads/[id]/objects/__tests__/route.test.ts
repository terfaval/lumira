import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getThreadById = vi.fn();
const createObjectAssociation = vi.fn();
const getById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-thread-repository", () => ({
  createThreadRepository: () => ({
    getThreadById,
    createObjectAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
  }),
}));

describe("/api/threads/[id]/objects route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getThreadById.mockReset();
    createObjectAssociation.mockReset();
    getById.mockReset();
  });

  it("requires thread and object ownership before linking", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getThreadById.mockResolvedValue({ id: "thread-1" });
    getById.mockResolvedValue({ id: "obj-1" });
    createObjectAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/threads/[id]/objects/route");
    const response = await POST(
      new Request("http://localhost/api/threads/thread-1/objects", {
        method: "POST",
        body: JSON.stringify({ reflectiveObjectId: "obj-1" }),
      }),
      { params: Promise.resolve({ id: "thread-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getThreadById).toHaveBeenCalledWith("thread-1", "user-a");
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
  });

  it("returns 404 when thread is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getThreadById.mockResolvedValue(null);

    const { POST } = await import("@/app/api/threads/[id]/objects/route");
    const response = await POST(
      new Request("http://localhost/api/threads/thread-1/objects", {
        method: "POST",
        body: JSON.stringify({ reflectiveObjectId: "obj-1" }),
      }),
      { params: Promise.resolve({ id: "thread-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
