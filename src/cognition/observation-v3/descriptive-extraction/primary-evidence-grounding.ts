import type {
  ObservationV2EvidenceRef,
  ObservationV2Observation,
  ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";
import { reconcileEvidenceToSource, type GroundingScope } from "@/src/cognition/observation-v3/grounding";

export function groundPrimaryEvidenceRefToSource(input: {
  sourceText: string;
  evidence: ObservationV2EvidenceRef;
  allowedScope?: GroundingScope;
  afterAnchor?: number | null;
  beforeAnchor?: number | null;
  fallbackToSourceScope?: boolean;
  requireAbsoluteCoordinatesWithinScope?: boolean;
}): ObservationV2EvidenceRef | null {
  const result = reconcileEvidenceToSource(input);
  return result.status === "grounded_certain" || result.status === "grounded_uncertain"
    ? result.evidence
    : null;
}

function groundObservation(input: {
  sourceText: string;
  observation: ObservationV2Observation;
  allowedScope?: GroundingScope;
  afterAnchor?: number | null;
}): ObservationV2Observation | null {
  if (input.observation.evidence.length === 0) {
    return null;
  }

  const groundedEvidence = input.observation.evidence.map((evidence) =>
    groundPrimaryEvidenceRefToSource({
      sourceText: input.sourceText,
      evidence,
      allowedScope: input.allowedScope,
      afterAnchor: input.afterAnchor,
      fallbackToSourceScope: true,
      requireAbsoluteCoordinatesWithinScope: Boolean(input.allowedScope),
    }));

  if (groundedEvidence.some((entry) => entry === null)) {
    return null;
  }

  return {
    ...input.observation,
    evidence: groundedEvidence.filter((entry): entry is ObservationV2EvidenceRef => entry !== null),
  };
}

export function groundPrimarySceneToSource(input: {
  sourceText: string;
  scene: ObservationV2Scene;
}): ObservationV2Scene | null {
  const groundedSceneEvidence = groundPrimaryEvidenceRefToSource({
    sourceText: input.sourceText,
    evidence: input.scene.evidenceContext,
  });
  if (!groundedSceneEvidence) {
    return null;
  }

  const allowedScope = (
    typeof groundedSceneEvidence.spanStart === "number"
    && typeof groundedSceneEvidence.spanEnd === "number"
  )
    ? {
        start: groundedSceneEvidence.spanStart,
        end: groundedSceneEvidence.spanEnd,
      }
    : undefined;

  let previousGroundedEnd: number | null = null;
  const groundedObservations: ObservationV2Observation[] = [];
  for (const observation of input.scene.observations) {
    const groundedObservation = groundObservation({
      sourceText: input.sourceText,
      observation,
      allowedScope,
      afterAnchor: previousGroundedEnd,
    });
    if (!groundedObservation) {
      continue;
    }
    groundedObservations.push(groundedObservation);
    const nextAnchor = groundedObservation.evidence
      .map((entry) => entry.spanEnd)
      .filter((value): value is number => typeof value === "number")
      .reduce<number | null>((largest, value) => largest === null ? value : Math.max(largest, value), null);
    previousGroundedEnd = nextAnchor ?? previousGroundedEnd;
  }

  if (groundedObservations.length === 0) {
    return null;
  }

  return {
    ...input.scene,
    evidenceContext: groundedSceneEvidence,
    observations: groundedObservations,
  };
}

export function groundPrimaryScenesToSource(input: {
  sourceText: string;
  scenes: ObservationV2Scene[];
}): ObservationV2Scene[] {
  return input.scenes
    .map((scene) => groundPrimarySceneToSource({
      sourceText: input.sourceText,
      scene,
    }))
    .filter((scene): scene is ObservationV2Scene => scene !== null);
}
