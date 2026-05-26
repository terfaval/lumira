import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { readRuntimeEnvironment, type RuntimeEnvironment } from "@/src/infrastructure/environment/env";

export type ServerSupabaseAuthClient = SupabaseClient;

export async function createServerSupabaseAuthClient(
  env: RuntimeEnvironment = readRuntimeEnvironment(),
): Promise<ServerSupabaseAuthClient> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Supabase environment is not configured for auth access.");
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
