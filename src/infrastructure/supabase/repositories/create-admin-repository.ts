import type { AdminRepository } from "@/src/domain/admin/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseAdminRepository } from "@/src/infrastructure/supabase/repositories/admin-supabase-repository";

export function createAdminRepository(): AdminRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseAdminRepository(client);
}
