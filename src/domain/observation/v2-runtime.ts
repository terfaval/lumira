import type { ObservationSource } from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

export type SceneBoundarySignalKind =
  | "spatial_change"
  | "temporal_change"
  | "actor_change"
  | "goal_change"
  | "narrative_change"
  | "perspective_change"
  | "world_rule_change";

export interface ObservationV2EvidenceRef {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationV2BoundaryReason {
  kind: SceneBoundarySignalKind;
  note: string;
}

export interface ObservationV2Observation {
  observationId: string;
  position: number;
  text: string;
  evidence: ObservationV2EvidenceRef[];
  uncertaintyNote: string | null;
}

export interface ObservationV2DerivedItem {
  label: string;
  observationIds: string[];
}

export interface ObservationV2DerivedStructures {
  actors: ObservationV2DerivedItem[];
  locations: ObservationV2DerivedItem[];
  objects: ObservationV2DerivedItem[];
  interactions: ObservationV2DerivedItem[];
  affect: ObservationV2DerivedItem[];
  agency: ObservationV2DerivedItem[];
  phenomenology: ObservationV2DerivedItem[];
  metacognition: ObservationV2DerivedItem[];
}

export interface ObservationV2Scene {
  sceneId: string;
  position: number;
  summary: string;
  boundaryReasoning: ObservationV2BoundaryReason[];
  evidenceContext: ObservationV2EvidenceRef;
  observations: ObservationV2Observation[];
  derived: ObservationV2DerivedStructures;
}

export interface ObservationV2Bundle {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  scenes: ObservationV2Scene[];
}

function compareScenes(left: ObservationV2Scene, right: ObservationV2Scene): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.sceneId.localeCompare(right.sceneId);
}

export function buildObservationV2Bundle(input: ObservationV2Bundle): ObservationV2Bundle {
  return {
    ...input,
    scenes: [...input.scenes].sort(compareScenes),
  };
}

export function getSceneBoundarySignalKinds(scene: ObservationV2Scene): SceneBoundarySignalKind[] {
  return scene.boundaryReasoning.map((reason) => reason.kind);
}
