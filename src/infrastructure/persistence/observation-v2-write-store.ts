/**
 * Legacy backend quarantine:
 * This adapter preserves the old write path that flattens Observation V2 output
 * into the current pre-clean-room persistence substrate.
 *
 * Keep for protected compatibility only. Do not use as Backend V2 authority.
 */
import type { Observation } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";

export interface ObservationV2WriteStore {
  createFromBundle(bundle: ObservationV2Bundle): Promise<Observation>;
}

class LegacyObservationCompatibilityWriteStore implements ObservationV2WriteStore {
  async createFromBundle(bundle: ObservationV2Bundle): Promise<Observation> {
    const repository = createObservationRepository();
    const payload = projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["observation_v2_temporary_storage_adapter"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });

    return repository.create(payload);
  }
}

export function createObservationV2WriteStore(): ObservationV2WriteStore {
  return new LegacyObservationCompatibilityWriteStore();
}
