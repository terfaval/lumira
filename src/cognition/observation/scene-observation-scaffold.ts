import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import type { ObservationSource } from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export function buildSceneObservationScaffold(input: {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  sourceText: string;
}) {
  const snippet = input.sourceText.trim();

  return createSceneDiscoveryBundle({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    scenes: [
      {
        sceneId: "scene-0",
        position: 0,
        summary: "Fallback scene reconstructed from source text.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet,
          spanStart: 0,
          spanEnd: snippet.length,
          contextLabel: "fallback_scene",
        },
        observations: [
          {
            observationId: "scene-0-observation-0",
            position: 0,
            text: snippet,
            evidence: [
              {
                snippet,
                spanStart: 0,
                spanEnd: snippet.length,
                contextLabel: "fallback_observation",
              },
            ],
            uncertaintyNote: "Fallback scaffold used because scene extraction was unavailable.",
          },
        ],
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  });
}
