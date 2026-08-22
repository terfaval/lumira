import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseObservationV3Repository } from "@/src/infrastructure/supabase/repositories/observation-v3-supabase-repository";

export function createObservationV3Repository(): SupabaseObservationV3Repository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseObservationV3Repository(client);
}
