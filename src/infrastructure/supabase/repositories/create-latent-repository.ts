import type { LatentRepository } from "@/src/domain/latent/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseLatentRepository } from "@/src/infrastructure/supabase/repositories/latent-supabase-repository";

export function createLatentRepository(): LatentRepository {
  const client = createSupabaseInfrastructureClient();
  return new SupabaseLatentRepository(client);
}
