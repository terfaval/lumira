import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";

export type ObservationStore = ObservationRepository;
export type ObservationV2Store = ObservationV2Repository;

export function createObservationStore(): ObservationStore {
  return createObservationRepository();
}

export function createObservationV2Store(): ObservationV2Store {
  return createObservationV2Repository();
}
