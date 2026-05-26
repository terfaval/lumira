import type { ObservationRepository } from "@/src/domain/observation/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseObservationRepository } from "@/src/infrastructure/supabase/repositories/observation-supabase-repository";

export function createObservationRepository(): ObservationRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseObservationRepository(client);
}
