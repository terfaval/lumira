import type { LatentOpportunityEvidenceObservation } from "@/src/domain/latent-v2/types";

export function isObservationV2Evidence(observation: LatentOpportunityEvidenceObservation): boolean {
  return (observation.family ?? "observation_v2") === "observation_v2";
}

export function requireObservationV2SceneObservationId(
  observation: LatentOpportunityEvidenceObservation,
): string {
  if (!isObservationV2Evidence(observation)) {
    throw new Error("Latent V2 runtime received non-V2 observation evidence.");
  }

  if (typeof observation.observationV2SceneObservationId !== "string") {
    throw new Error("Latent V2 runtime received V2 observation evidence without an observation id.");
  }

  return observation.observationV2SceneObservationId;
}

export function formatObservationEvidenceLineageId(
  observation: LatentOpportunityEvidenceObservation,
): string | null {
  if (isObservationV2Evidence(observation)) {
    return typeof observation.observationV2SceneObservationId === "string"
      ? observation.observationV2SceneObservationId
      : null;
  }

  const parts = [
    "observation_v3",
    `authority=${observation.authorityId}`,
    `unit=${observation.unitId}`,
  ];

  if (observation.localityId) {
    parts.push(`locality=${observation.localityId}`);
  }

  if (observation.evidenceId) {
    parts.push(`evidence=${observation.evidenceId}`);
  }

  return parts.join("|");
}
