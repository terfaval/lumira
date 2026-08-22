import type { FortuneSessionRepository } from "@/src/domain/fortune-sessions/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/fortune-session-supabase-repository";

export function createFortuneSessionRepository(): FortuneSessionRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseFortuneSessionRepository(client);
}
