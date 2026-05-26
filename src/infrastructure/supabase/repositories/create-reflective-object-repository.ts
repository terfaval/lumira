import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/reflective-object-supabase-repository";

export function createReflectiveObjectRepository(): ReflectiveObjectRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseReflectiveObjectRepository(client);
}
