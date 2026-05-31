export interface RuntimeEnvironment {
  nodeEnv: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
}

export function readRuntimeEnvironment(): RuntimeEnvironment {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    null;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    null;

  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    supabaseUrl,
    supabaseAnonKey,
  };
}
