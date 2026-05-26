import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseThreadRepository } from "@/src/infrastructure/supabase/repositories/thread-supabase-repository";

export function createThreadRepository(): ThreadRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseThreadRepository(client);
}
