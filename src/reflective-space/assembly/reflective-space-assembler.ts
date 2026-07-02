import type { ReflectiveRuntimeSnapshot } from "@/src/runtime/types";
import type { LatentSuggestion } from "@/src/domain/latent/types";
import type { Observation } from "@/src/domain/observation/types";
import type { ReflectiveResponse } from "@/src/domain/responses/types";
import { deriveGlossaryCuesFromObservations } from "@/src/reflective-space/composition/derive-glossary-cues";
import { deriveLatentHints } from "@/src/reflective-space/composition/derive-latent-hints";
import { deriveOpeningSurfaces } from "@/src/reflective-space/composition/derive-opening-surfaces";
import { deriveResponseSurfaces } from "@/src/reflective-space/composition/derive-response-surfaces";
import { deriveThreadSurfaces } from "@/src/reflective-space/composition/derive-thread-surfaces";
import type { ReflectiveSpaceViewport } from "@/src/reflective-space/types";

interface AssembleReflectiveSpaceInput {
  snapshot: ReflectiveRuntimeSnapshot;
  observations: Observation[];
  responses: ReflectiveResponse[];
  latentSuggestions: LatentSuggestion[];
}

export function assembleReflectiveSpace(input: AssembleReflectiveSpaceInput): ReflectiveSpaceViewport {
  return {
    center: input.snapshot.center,
    ambientThreads: input.snapshot.threads,
    ambientResponses: input.responses,
    openings: input.snapshot.openings,
    openingSurfaces: deriveOpeningSurfaces(input.snapshot.openings),
    threadSurfaces: deriveThreadSurfaces(input.snapshot.threads),
    responseSurfaces: deriveResponseSurfaces(input.responses),
    latentHints: deriveLatentHints(input.latentSuggestions),
    glossaryCues: deriveGlossaryCuesFromObservations(input.observations),
    summary: "Minimal reflective composition is available with descriptive orientation and continuity cues.",
  };
}
