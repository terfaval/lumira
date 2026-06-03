import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readRuntimeEnvironment, type RuntimeEnvironment } from "@/src/infrastructure/environment/env";

export type SupabaseInfrastructureClient = SupabaseClient;

export function createSupabaseInfrastructureClient(
  env: RuntimeEnvironment = readRuntimeEnvironment(),
): SupabaseInfrastructureClient {
  const accessKey = env.supabaseServiceRoleKey ?? env.supabaseAnonKey;

  if (!env.supabaseUrl || !accessKey) {
    throw new Error("Supabase environment is not configured for infrastructure access.");
  }

  return createClient(env.supabaseUrl, accessKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
