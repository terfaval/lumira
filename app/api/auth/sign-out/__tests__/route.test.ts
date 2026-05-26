import { beforeEach, describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
const createServerSupabaseAuthClient = vi.fn();

vi.mock("@/src/infrastructure/supabase/auth/create-server-supabase-auth-client", () => ({
  createServerSupabaseAuthClient,
}));

describe("/api/auth/sign-out route", () => {
  beforeEach(() => {
    signOut.mockReset();
    createServerSupabaseAuthClient.mockReset();
    createServerSupabaseAuthClient.mockResolvedValue({
      auth: { signOut },
    });
  });

  it("signs out and returns success payload", async () => {
    signOut.mockResolvedValue({ error: null });

    const { POST } = await import("@/app/api/auth/sign-out/route");
    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ signedOut: true });
  });
});
