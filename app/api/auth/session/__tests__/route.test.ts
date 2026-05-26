import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const getMembershipByUserId = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-admin-repository", () => ({
  createAdminRepository: () => ({
    getMembershipByUserId,
  }),
}));

describe("/api/auth/session route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    getMembershipByUserId.mockReset();
  });

  it("returns null user for unauthenticated request", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { GET } = await import("@/app/api/auth/session/route");
    const response = await GET(new Request("http://localhost/api/auth/session"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: null,
      admin: false,
    });
  });

  it("returns user and admin status for authenticated request", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    getMembershipByUserId.mockResolvedValue({
      userId: "user-a",
      role: "admin",
      grantedBy: "user-a",
      createdAt: "2026-05-25T00:00:00.000Z",
    });

    const { GET } = await import("@/app/api/auth/session/route");
    const response = await GET(new Request("http://localhost/api/auth/session"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        userId: "user-a",
        source: "supabase_auth",
      },
      admin: true,
    });
  });
});
