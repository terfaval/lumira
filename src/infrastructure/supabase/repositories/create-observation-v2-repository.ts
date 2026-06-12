import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseObservationV2Repository } from "@/src/infrastructure/supabase/repositories/observation-v2-supabase-repository";

export function createObservationV2Repository(): ObservationV2Repository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseObservationV2Repository(client);
}
