import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";

describe("createSupabaseInfrastructureClient", () => {
  afterEach(() => {
    createClientMock.mockReset();
  });

  it("prefers the service role key for server-side infrastructure access when available", () => {
    createClientMock.mockReturnValue({ client: "service-role" });

    createSupabaseInfrastructureClient({
      nodeEnv: "development",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-anon",
      supabaseServiceRoleKey: "service-role",
      openAiApiKey: null,
      observationCaptureAuthorityMode: null,
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "service-role",
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }),
    );
  });

  it("falls back to the anon/publishable key when the service role key is unavailable", () => {
    createClientMock.mockReturnValue({ client: "public-anon" });

    createSupabaseInfrastructureClient({
      nodeEnv: "development",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "public-anon",
      supabaseServiceRoleKey: null,
      openAiApiKey: null,
      observationCaptureAuthorityMode: null,
    });

    expect(createClientMock).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-anon",
      expect.any(Object),
    );
  });
});
