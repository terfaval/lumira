import type { ObservationRepository } from "@/src/domain/observation/contracts";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";

export type ObservationStore = ObservationRepository;

export function createObservationStore(): ObservationStore {
  return createObservationRepository();
}
