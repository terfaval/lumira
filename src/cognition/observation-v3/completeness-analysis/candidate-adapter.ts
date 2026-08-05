import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export interface AdaptedCandidateScene {
  sceneId: string;
  position: number;
  summary: string;
  sceneRange: {
    spanStart: number | null;
    spanEnd: number | null;
  };
}

export interface AdaptedCandidateObservation {
  observationId: string;
  sceneId: string;
  scenePosition: number;
  position: number;
  text: string;
  evidence: Array<{
    spanStart: number | null;
    spanEnd: number | null;
    contextLabel: string | null;
  }>;
}

export interface AdaptedObservationCandidate {
  scenes: AdaptedCandidateScene[];
  observations: AdaptedCandidateObservation[];
}

export function adaptObservationBundle(bundle: ObservationV2Bundle): AdaptedObservationCandidate {
  return {
    scenes: bundle.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      position: scene.position,
      summary: scene.summary,
      sceneRange: {
        spanStart: scene.evidenceContext.spanStart,
        spanEnd: scene.evidenceContext.spanEnd,
      },
    })),
    observations: bundle.scenes.flatMap((scene) =>
      scene.observations.map((observation) => ({
        observationId: observation.observationId,
        sceneId: scene.sceneId,
        scenePosition: scene.position,
        position: observation.position,
        text: observation.text,
        evidence: observation.evidence.map((entry) => ({
          spanStart: entry.spanStart,
          spanEnd: entry.spanEnd,
          contextLabel: entry.contextLabel,
        })),
      })),
    ),
  };
}
