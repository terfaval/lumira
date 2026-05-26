import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import { createServerSupabaseAuthClient } from "@/src/infrastructure/supabase/auth/create-server-supabase-auth-client";
import { LUMIRA_USER_ID_HEADER, resolveUserIdFromHeaders } from "@/src/shared/request-user-id";
import type { UserId } from "@/src/shared/types";

export type RequestUserSource = "supabase_auth" | "dev_header_fallback" | "none";

export interface RequestUserContext {
  userId: UserId | null;
  source: RequestUserSource;
}

export interface RequestUserContextDependencies {
  loadTrustedUserId: () => Promise<UserId | null>;
  nodeEnv: string;
}

async function loadTrustedUserIdFromSupabase(): Promise<UserId | null> {
  const env = readRuntimeEnvironment();
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }

  const supabase = await createServerSupabaseAuthClient(env);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

function defaultDependencies(): RequestUserContextDependencies {
  const env = readRuntimeEnvironment();

  return {
    loadTrustedUserId: loadTrustedUserIdFromSupabase,
    nodeEnv: env.nodeEnv,
  };
}

export async function resolveRequestUserContext(
  requestHeaders: Headers,
  dependencies: RequestUserContextDependencies = defaultDependencies(),
): Promise<RequestUserContext> {
  const trustedUserId = await dependencies.loadTrustedUserId();

  if (trustedUserId) {
    return {
      userId: trustedUserId,
      source: "supabase_auth",
    };
  }

  const fallbackHeaderUserId = resolveUserIdFromHeaders(requestHeaders);
  const allowDevFallback = dependencies.nodeEnv !== "production";

  if (allowDevFallback && fallbackHeaderUserId) {
    return {
      userId: fallbackHeaderUserId,
      source: "dev_header_fallback",
    };
  }

  return {
    userId: null,
    source: "none",
  };
}

export const DEV_FALLBACK_HEADER = LUMIRA_USER_ID_HEADER;
