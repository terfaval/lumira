import { afterEach, describe, expect, it } from "vitest";

import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
}

describe("readRuntimeEnvironment", () => {
  afterEach(() => {
    resetEnv();
  });

  it("prefers NEXT_PUBLIC legacy anon key when present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy-anon";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";

    const env = readRuntimeEnvironment();

    expect(env.supabaseUrl).toBe("https://example.supabase.co");
    expect(env.supabaseAnonKey).toBe("legacy-anon");
  });

  it("falls back to NEXT_PUBLIC publishable key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable";

    const env = readRuntimeEnvironment();

    expect(env.supabaseAnonKey).toBe("publishable");
  });

  it("falls back to server-side Supabase variable names", () => {
    process.env.SUPABASE_URL = "https://server-example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "server-anon";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "server-service-role";

    const env = readRuntimeEnvironment();

    expect(env.supabaseUrl).toBe("https://server-example.supabase.co");
    expect(env.supabaseAnonKey).toBe("server-anon");
    expect(env.supabaseServiceRoleKey).toBe("server-service-role");
  });
});
