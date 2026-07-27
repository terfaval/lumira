import type { ContinuityNeighborhoodReader } from "@/src/domain/anchor-v1/continuity-neighborhood-reader";
import { createSupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { SupabaseContinuityNeighborhoodReader } from "@/src/infrastructure/supabase/repositories/anchor-continuity-neighborhood-reader";

export function createContinuityNeighborhoodReader(): ContinuityNeighborhoodReader {
  const client = createSupabaseInfrastructureClient();

  return new SupabaseContinuityNeighborhoodReader(client);
}
