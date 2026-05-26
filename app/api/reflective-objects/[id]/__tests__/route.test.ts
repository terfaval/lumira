import { beforeEach, describe, expect, it, vi } from "vitest";

const getById = vi.fn();
const update = vi.fn();
const archive = vi.fn();
const resolveRequestUserContext = vi.fn();

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    getById,
    update,
    archive,
  }),
}));

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

describe("/api/reflective-objects/[id] route isolation", () => {
  beforeEach(() => {
    getById.mockReset();
    update.mockReset();
    archive.mockReset();
    resolveRequestUserContext.mockReset();
  });

  it("scopes get by id to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getById.mockResolvedValue({ id: "obj-1" });

    const { GET } = await import("@/app/api/reflective-objects/[id]/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects/obj-1"), {
      params: Promise.resolve({ id: "obj-1" }),
    });

    expect(response.status).toBe(200);
    expect(getById).toHaveBeenCalledWith("obj-1", "user-a");
  });

  it("scopes archive to resolved user", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    archive.mockResolvedValue({ id: "obj-1" });

    const { DELETE } = await import("@/app/api/reflective-objects/[id]/route");
    const response = await DELETE(new Request("http://localhost/api/reflective-objects/obj-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "obj-1" }),
    });

    expect(response.status).toBe(200);
    expect(archive).toHaveBeenCalledWith("obj-1", "user-a");
  });
});
