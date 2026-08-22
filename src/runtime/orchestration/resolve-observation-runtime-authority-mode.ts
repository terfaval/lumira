import {
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "@/src/infrastructure/environment/env";

export type ObservationRuntimeAuthorityMode = "v2" | "v3";

export function resolveObservationRuntimeAuthorityMode(
  env: RuntimeEnvironment = readRuntimeEnvironment(),
): ObservationRuntimeAuthorityMode {
  if (env.observationCaptureAuthorityMode === "v2") {
    return "v2";
  }

  return "v3";
}
