import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationNativeReadRepository } from "@/src/domain/observation/native-read";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";

export type ObservationStore = ObservationRepository;
export type ObservationV2Store = ObservationV2Repository;
export type ObservationNativeStore = ObservationNativeReadRepository;

export function createObservationStore(): ObservationStore {
  return createObservationRepository();
}

export function createObservationV2Store(): ObservationV2Store {
  return createObservationV2Repository();
}

export function createObservationNativeStore(): ObservationNativeStore {
  return createObservationNativeReadStore();
}
