import { buildObservationV2Bundle, type ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export function createSceneDiscoveryBundle(input: ObservationV2Bundle): ObservationV2Bundle {
  return buildObservationV2Bundle(input);
}
