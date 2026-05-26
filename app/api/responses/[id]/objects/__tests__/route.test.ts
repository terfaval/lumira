import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getResponseById = vi.fn();
const createObjectAssociation = vi.fn();
const removeObjectAssociation = vi.fn();
const getById = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-response-repository", () => ({
  createResponseRepository: () => ({
    getResponseById,
    createObjectAssociation,
    removeObjectAssociation,
  }),
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
  }),
}));

describe("/api/responses/[id]/objects route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getResponseById.mockReset();
    createObjectAssociation.mockReset();
    removeObjectAssociation.mockReset();
    getById.mockReset();
  });

  it("requires response and object ownership before linking", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getResponseById.mockResolvedValue({ id: "response-1" });
    getById.mockResolvedValue({ id: "obj-1" });
    createObjectAssociation.mockResolvedValue({ id: "assoc-1" });

    const { POST } = await import("@/app/api/responses/[id]/objects/route");
    const response = await POST(
      new Request("http://localhost/api/responses/response-1/objects", {
        method: "POST",
        body: JSON.stringify({ reflectiveObjectId: "obj-1" }),
      }),
      { params: Promise.resolve({ id: "response-1" }) },
    );

    expect(response.status).toBe(201);
    expect(getResponseById).toHaveBeenCalledWith("response-1", "user-a");
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
  });

  it("removes object association when target exists", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getResponseById.mockResolvedValue({ id: "response-1" });
    removeObjectAssociation.mockResolvedValue(true);

    const { DELETE } = await import("@/app/api/responses/[id]/objects/route");
    const response = await DELETE(
      new Request("http://localhost/api/responses/response-1/objects", {
        method: "DELETE",
        body: JSON.stringify({ reflectiveObjectId: "obj-1" }),
      }),
      { params: Promise.resolve({ id: "response-1" }) },
    );

    expect(response.status).toBe(200);
    expect(removeObjectAssociation).toHaveBeenCalledWith("response-1", "obj-1", "user-a");
  });
});
