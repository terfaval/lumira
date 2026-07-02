import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository";

export function createLatentOpportunityRepository(): LatentOpportunityRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseLatentOpportunityRepository(client);
}
