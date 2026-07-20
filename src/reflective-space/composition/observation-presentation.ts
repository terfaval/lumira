import type { ObservationV2Bundle, ObservationV2Observation, ObservationV2Scene } from "@/src/domain/observation/v2-runtime";

function compareScenes(left: ObservationV2Scene, right: ObservationV2Scene): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.sceneId.localeCompare(right.sceneId);
}

function compareObservations(left: ObservationV2Observation, right: ObservationV2Observation): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.observationId.localeCompare(right.observationId);
}

function normalizeSentence(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[.]+$/g, "");
}

function finalizeSentenceSequence(parts: string[]): string | null {
  const normalized = parts.map(normalizeSentence).filter(Boolean);
  if (normalized.length === 0) {
    return null;
  }

  return `${normalized.join(". ")}.`;
}

export function buildObservationV2PresentationText(bundle: ObservationV2Bundle | null | undefined): string | null {
  if (!bundle) {
    return null;
  }

  const sceneSummaryText = finalizeSentenceSequence(
    [...bundle.scenes].sort(compareScenes).map((scene) => scene.summary),
  );
  if (sceneSummaryText) {
    return sceneSummaryText;
  }

  return finalizeSentenceSequence(
    [...bundle.scenes]
      .sort(compareScenes)
      .flatMap((scene) => [...scene.observations].sort(compareObservations))
      .map((observation) => observation.text),
  );
}
