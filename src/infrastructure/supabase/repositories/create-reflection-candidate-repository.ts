import type { ReflectionCandidateRepository } from "@/src/domain/reflection-candidates/contracts";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseReflectionCandidateRepository } from "@/src/infrastructure/supabase/repositories/reflection-candidate-supabase-repository";

export function createReflectionCandidateRepository(): ReflectionCandidateRepository {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseReflectionCandidateRepository(client);
}
