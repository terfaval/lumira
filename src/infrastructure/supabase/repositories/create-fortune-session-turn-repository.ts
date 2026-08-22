import type { FortuneSessionTurnRepository } from "@/src/domain/fortune-sessions/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseFortuneSessionTurnRepository } from "@/src/infrastructure/supabase/repositories/fortune-session-turn-supabase-repository";

export function createFortuneSessionTurnRepository(): FortuneSessionTurnRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseFortuneSessionTurnRepository(client);
}
