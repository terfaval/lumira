import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseGlossaryRepository } from "@/src/infrastructure/supabase/repositories/glossary-supabase-repository";

export function createGlossaryRepository(): GlossaryRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseGlossaryRepository(client);
}
