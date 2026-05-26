import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const createServerSupabaseAuthClient = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/create-server-supabase-auth-client", () => ({
  createServerSupabaseAuthClient,
}));

describe("/api/auth/sign-in route", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    createServerSupabaseAuthClient.mockReset();
    createServerSupabaseAuthClient.mockResolvedValue({
      auth: { signInWithPassword },
    });
  });

  it("returns 400 when credentials are missing", async () => {
    const { POST } = await import("@/app/api/auth/sign-in/route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email: "", password: "" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns session payload after successful sign in", async () => {
    signInWithPassword.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-a", email: "a@example.com" },
        },
      },
      error: null,
    });

    const { POST } = await import("@/app/api/auth/sign-in/route");
    const response = await POST(
      new Request("http://localhost/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ email: "a@example.com", password: "topsecret" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      session: {
        userId: "user-a",
        email: "a@example.com",
      },
    });
  });
});
