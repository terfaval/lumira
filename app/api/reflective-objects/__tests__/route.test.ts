import { beforeEach, describe, expect, it, vi } from "vitest";

const listByUser = vi.fn();
const create = vi.fn();
const resolveRequestUserContext = vi.fn();

vi.mock("@/src/infrastructure/supabase/repositories/create-reflective-object-repository", () => ({
  createReflectiveObjectRepository: () => ({
    listByUser,
    create,
  }),
}));

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

describe("/api/reflective-objects route isolation", () => {
  beforeEach(() => {
    listByUser.mockReset();
    create.mockReset();
    resolveRequestUserContext.mockReset();
  });

  it("returns 401 when authenticated user is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/reflective-objects/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects"));

    expect(response.status).toBe(401);
  });

  it("lists reflective objects only for resolved user id", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    listByUser.mockResolvedValue([]);

    const { GET } = await import("@/app/api/reflective-objects/route");
    const response = await GET(new Request("http://localhost/api/reflective-objects"));

    expect(response.status).toBe(200);
    expect(listByUser).toHaveBeenCalledWith("user-a");
  });
});
