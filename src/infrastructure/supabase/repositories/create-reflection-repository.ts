import type { ReflectionRepository } from "@/src/domain/reflections/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseReflectionRepository } from "@/src/infrastructure/supabase/repositories/reflection-supabase-repository";

export function createReflectionRepository(): ReflectionRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseReflectionRepository(client);
}
