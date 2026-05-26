export interface RuntimeEnvironment {
  nodeEnv: string;
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
}

export function readRuntimeEnvironment(): RuntimeEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
  };
}
