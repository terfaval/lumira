import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseReflectiveResponseRepository } from "@/src/infrastructure/supabase/repositories/response-supabase-repository";

export function createResponseRepository(): ReflectiveResponseRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseReflectiveResponseRepository(client);
}
