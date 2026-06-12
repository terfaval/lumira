/**
 * Native Observation V2 persistence seam for the live generated path.
 */
import { buildObservationV2Bundle, type ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";

export interface ObservationV2WriteStore {
  createFromBundle(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle>;
}

class NativeObservationV2WriteStore implements ObservationV2WriteStore {
  async createFromBundle(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle> {
    const repository = createObservationV2Repository();
    const hardenedBundle = buildObservationV2Bundle(bundle);

    return repository.create(hardenedBundle);
  }
}

export function createObservationV2WriteStore(): ObservationV2WriteStore {
  return new NativeObservationV2WriteStore();
}
