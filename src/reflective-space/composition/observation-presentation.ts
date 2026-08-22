import type { ObservationV2Bundle, ObservationV2Observation, ObservationV2Scene } from "@/src/domain/observation/v2-runtime";
import type {
  CanonicalDescriptiveUnit,
  CanonicalLocality,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";
import type { NativeObservationReadResult } from "@/src/domain/observation/native-read";
import type { ObservationV3AuthorityRecord } from "@/src/domain/observation/v3-authority";

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

function compareCanonicalLocalities(left: CanonicalLocality, right: CanonicalLocality): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.canonicalLocalityId.localeCompare(right.canonicalLocalityId);
}

function compareCanonicalUnits(left: CanonicalDescriptiveUnit, right: CanonicalDescriptiveUnit): number {
  if (left.order !== right.order) {
    return left.order - right.order;
  }

  return left.canonicalUnitId.localeCompare(right.canonicalUnitId);
}

export function buildObservationV3PresentationText(
  authority: ObservationV3AuthorityRecord | null | undefined,
): string | null {
  if (!authority) {
    return null;
  }

  const descriptiveText = finalizeSentenceSequence(
    [...authority.canonicalCandidate.descriptiveUnits]
      .sort(compareCanonicalUnits)
      .map((unit) => unit.statement),
  );
  if (descriptiveText) {
    return descriptiveText;
  }

  return finalizeSentenceSequence(
    [...authority.canonicalCandidate.localities]
      .sort(compareCanonicalLocalities)
      .map((locality) => locality.label ?? ""),
  );
}

export function buildNativeObservationPresentationText(
  observation: NativeObservationReadResult | null | undefined,
): string | null {
  if (!observation) {
    return null;
  }

  return observation.family === "v2"
    ? buildObservationV2PresentationText(observation.native)
    : buildObservationV3PresentationText(observation.native);
}
