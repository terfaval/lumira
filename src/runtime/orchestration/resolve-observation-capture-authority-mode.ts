import type { ObservationNativeReadResolution } from "@/src/domain/observation/native-read";
import {
  readRuntimeEnvironment,
  type RuntimeEnvironment,
} from "@/src/infrastructure/environment/env";
import { resolveObservationRuntimeAuthorityMode } from "@/src/runtime/orchestration/resolve-observation-runtime-authority-mode";

export type ObservationCaptureAuthorityMode = "v2" | "v3";

export interface ObservationCaptureAuthoritySelection {
  mode: ObservationCaptureAuthorityMode;
  observationResolution: ObservationNativeReadResolution;
}

export function resolveObservationCaptureAuthorityMode(
  env: RuntimeEnvironment = readRuntimeEnvironment(),
): ObservationCaptureAuthoritySelection {
  const mode = resolveObservationRuntimeAuthorityMode(env);

  return {
    mode,
    observationResolution: mode === "v3" ? "explicit_v3" : "explicit_v2",
  };
}
