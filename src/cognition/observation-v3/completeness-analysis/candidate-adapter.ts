import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ComposedProvisionalMemoryCandidate } from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";
import type { ObservationV3NativeC0Candidate } from "@/src/cognition/observation-v3/descriptive-extraction";

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

export function adaptNativeC0Candidate(candidate: ObservationV3NativeC0Candidate): AdaptedObservationCandidate {
  return {
    scenes: candidate.localities.map((locality) => ({
      sceneId: locality.localityId,
      position: locality.order,
      summary: locality.label,
      sceneRange: {
        spanStart: locality.evidenceContext.spanStart,
        spanEnd: locality.evidenceContext.spanEnd,
      },
    })),
    observations: candidate.descriptiveUnits.map((unit) => ({
      observationId: unit.unitId,
      sceneId: unit.localityId,
      scenePosition: candidate.localities.find((locality) => locality.localityId === unit.localityId)?.order ?? 0,
      position: unit.order,
      text: unit.statement,
      evidence: unit.evidenceRefs.map((entry) => ({
        spanStart: entry.spanStart,
        spanEnd: entry.spanEnd,
        contextLabel: entry.contextLabel,
      })),
    })),
  };
}

function buildSyntheticSceneRange(input: {
  evidence: Array<{ spanStart: number | null; spanEnd: number | null }>;
}): { spanStart: number | null; spanEnd: number | null } {
  const starts = input.evidence
    .map((entry) => entry.spanStart)
    .filter((value): value is number => typeof value === "number");
  const ends = input.evidence
    .map((entry) => entry.spanEnd)
    .filter((value): value is number => typeof value === "number");

  return {
    spanStart: starts.length > 0 ? Math.min(...starts) : null,
    spanEnd: ends.length > 0 ? Math.max(...ends) : null,
  };
}

export function adaptComposedCandidate(
  candidate: ComposedProvisionalMemoryCandidate,
): AdaptedObservationCandidate {
  const localityOrder = new Map(candidate.localityRecords.map((locality, index) => [locality.localityId, index]));
  const syntheticEvidence = candidate.descriptiveUnits
    .filter((unit) => unit.localityId === null)
    .flatMap((unit) => unit.evidenceRefs);
  const syntheticSceneRange = buildSyntheticSceneRange({ evidence: syntheticEvidence });

  return {
    scenes: [
      ...candidate.localityRecords.map((locality, index) => ({
        sceneId: locality.localityId,
        position: index,
        summary: locality.label ?? locality.localityId,
        sceneRange: {
          spanStart: locality.sourceStart,
          spanEnd: locality.sourceEnd,
        },
      })),
      ...(syntheticEvidence.length > 0
        ? [{
            sceneId: "__unassigned__",
            position: candidate.localityRecords.length,
            summary: "Unassigned units",
            sceneRange: syntheticSceneRange,
          }]
        : []),
    ],
    observations: candidate.descriptiveUnits.map((unit, index) => ({
      observationId: unit.unitId,
      sceneId: unit.localityId ?? "__unassigned__",
      scenePosition: localityOrder.get(unit.localityId ?? "") ?? candidate.localityRecords.length,
      position: index,
      text: unit.statement,
      evidence: unit.evidenceRefs.map((entry) => ({
        spanStart: entry.spanStart,
        spanEnd: entry.spanEnd,
        contextLabel: entry.contextLabel,
      })),
    })),
  };
}
