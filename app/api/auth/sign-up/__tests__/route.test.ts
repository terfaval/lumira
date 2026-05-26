import { beforeEach, describe, expect, it, vi } from "vitest";

const signUp = vi.fn();
const createServerSupabaseAuthClient = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/create-server-supabase-auth-client", () => ({
  createServerSupabaseAuthClient,
}));

describe("/api/auth/sign-up route", () => {
  beforeEach(() => {
    signUp.mockReset();
    createServerSupabaseAuthClient.mockReset();
    createServerSupabaseAuthClient.mockResolvedValue({
      auth: { signUp },
    });
  });

  it("returns 400 when credentials are missing", async () => {
    const { POST } = await import("@/app/api/auth/sign-up/route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns user metadata and session flag", async () => {
    signUp.mockResolvedValue({
      data: {
        user: { id: "user-b", email: "b@example.com" },
        session: null,
      },
      error: null,
    });

    const { POST } = await import("@/app/api/auth/sign-up/route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-up", {
        method: "POST",
        body: JSON.stringify({ email: "b@example.com", password: "topsecret" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        userId: "user-b",
        email: "b@example.com",
      },
      hasSession: false,
    });
  });
});
