import type { OpeningRepository } from "@/src/domain/openings/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseOpeningRepository } from "@/src/infrastructure/supabase/repositories/opening-supabase-repository";

export function createOpeningRepository(): OpeningRepository {
  const client = createSupabaseInfrastructureClient();
  return new SupabaseOpeningRepository(client);
}
