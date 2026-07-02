import type { AnchorRepository } from "@/src/domain/anchor-v1/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseAnchorRepository } from "@/src/infrastructure/supabase/repositories/anchor-supabase-repository";

export function createAnchorRepository(): AnchorRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseAnchorRepository(client);
}
