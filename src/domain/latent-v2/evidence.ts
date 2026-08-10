import type { LatentOpportunityEvidenceObservation } from "@/src/domain/latent-v2/types";

export function requireObservationV2SceneObservationId(
  observation: LatentOpportunityEvidenceObservation,
): string {
  if (observation.family !== "observation_v2") {
    throw new Error("Latent V2 runtime received non-V2 observation evidence.");
  }

  return observation.observationV2SceneObservationId;
}
