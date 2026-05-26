import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getMembershipByUserId = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-admin-repository", () => ({
  createAdminRepository: () => ({
    getMembershipByUserId,
  }),
}));

describe("/api/admin/me route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getMembershipByUserId.mockReset();
  });

  it("returns 401 when user identity is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/admin/me/route");
    const response = await GET(new Request("http://localhost/api/admin/me"));

    expect(response.status).toBe(401);
  });

  it("returns non-admin payload when membership is absent", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getMembershipByUserId.mockResolvedValue(null);

    const { GET } = await import("@/app/api/admin/me/route");
    const response = await GET(new Request("http://localhost/api/admin/me"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      isAdmin: false,
      membership: null,
    });
  });
});
