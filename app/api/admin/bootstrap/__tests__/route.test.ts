import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveRequestUserContext = vi.fn();
const bootstrap = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/resolve-request-user-context", () => ({
  DEV_FALLBACK_HEADER: "x-lumira-user-id",
  resolveRequestUserContext,
}));

vi.mock("@/src/infrastructure/supabase/repositories/create-admin-repository", () => ({
  createAdminRepository: () => ({
    bootstrap,
  }),
}));

describe("/api/admin/bootstrap route", () => {
  beforeEach(() => {
    resolveRequestUserContext.mockReset();
    bootstrap.mockReset();
  });

  it("returns 401 when user identity is missing", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: null, source: "none" });

    const { POST } = await import("@/app/api/admin/bootstrap/route");
    const response = await POST(new Request("http://localhost/api/admin/bootstrap", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("returns 403 when bootstrap is already locked", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    bootstrap.mockResolvedValue({
      membership: null,
      status: "bootstrap_locked",
    });

    const { POST } = await import("@/app/api/admin/bootstrap/route");
    const response = await POST(new Request("http://localhost/api/admin/bootstrap", { method: "POST" }));

    expect(response.status).toBe(403);
  });

  it("returns membership payload when bootstrap succeeds", async () => {
    resolveRequestUserContext.mockResolvedValue({ userId: "user-a", source: "supabase_auth" });
    bootstrap.mockResolvedValue({
      status: "bootstrapped",
      membership: {
        userId: "user-a",
        role: "admin",
        grantedBy: "user-a",
        createdAt: "2026-05-25T00:00:00.000Z",
      },
    });

    const { POST } = await import("@/app/api/admin/bootstrap/route");
    const response = await POST(new Request("http://localhost/api/admin/bootstrap", { method: "POST" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "bootstrapped",
      membership: { userId: "user-a", role: "admin" },
    });
  });
});
