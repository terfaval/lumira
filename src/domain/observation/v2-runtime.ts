import type {
  ObservationProvenanceTier,
  ObservationSemanticPolicyResult,
  ObservationSource,
} from "@/src/domain/observation/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const DEFAULT_RUNTIME_VERSION = "observation_v2_phase1";
export type ObservationLanguage = "hu" | "en" | "unknown";

export interface ObservationV2BundleProvenance {
  provenanceTier: ObservationProvenanceTier;
  semanticPolicyResult: ObservationSemanticPolicyResult;
  semanticPolicyReasons: string[];
  latentBackflowGuard: "observation_only";
  boundaryVersion: string;
  dreamLanguage?: ObservationLanguage;
}

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
  identityKey?: string;
  displayLabel?: string;
  sourceLanguage?: ObservationLanguage;
  label?: string;
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
  bundleId?: string;
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  provenance?: ObservationV2BundleProvenance;
  uncertaintyNotes?: string[];
  runtimeVersion?: string;
  scenes: ObservationV2Scene[];
}

function normalizeObservationLanguage(value: string | undefined | null): ObservationLanguage {
  return value === "hu" || value === "en" ? value : "unknown";
}

export function normalizeObservationIdentityKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function getObservationV2DerivedItemDisplayLabel(item: ObservationV2DerivedItem): string {
  return (item.displayLabel ?? item.label ?? "").trim();
}

export function getObservationV2DerivedItemIdentityKey(item: ObservationV2DerivedItem): string {
  const explicit = item.identityKey?.trim() ?? "";
  if (explicit) {
    return normalizeObservationIdentityKey(explicit);
  }

  return normalizeObservationIdentityKey(getObservationV2DerivedItemDisplayLabel(item));
}

export function getObservationV2DerivedItemSourceLanguage(item: ObservationV2DerivedItem): ObservationLanguage {
  return normalizeObservationLanguage(item.sourceLanguage);
}

export function buildObservationV2DerivedItem(input: ObservationV2DerivedItem): ObservationV2DerivedItem {
  const displayLabel = getObservationV2DerivedItemDisplayLabel(input);
  const identityKey = getObservationV2DerivedItemIdentityKey(input);
  const sourceLanguage = getObservationV2DerivedItemSourceLanguage(input);

  return {
    identityKey: identityKey || undefined,
    displayLabel: displayLabel || undefined,
    sourceLanguage,
    // Legacy compatibility for existing readers.
    label: displayLabel || undefined,
    observationIds: [...input.observationIds],
  };
}

function normalizeDerivedItems(items: ObservationV2DerivedItem[]): ObservationV2DerivedItem[] {
  return items.map(buildObservationV2DerivedItem);
}

function normalizeDerivedStructures(derived: ObservationV2DerivedStructures): ObservationV2DerivedStructures {
  return {
    actors: normalizeDerivedItems(derived.actors),
    locations: normalizeDerivedItems(derived.locations),
    objects: normalizeDerivedItems(derived.objects),
    interactions: normalizeDerivedItems(derived.interactions),
    affect: normalizeDerivedItems(derived.affect),
    agency: normalizeDerivedItems(derived.agency),
    phenomenology: normalizeDerivedItems(derived.phenomenology),
    metacognition: normalizeDerivedItems(derived.metacognition),
  };
}

function compareScenes(left: ObservationV2Scene, right: ObservationV2Scene): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.sceneId.localeCompare(right.sceneId);
}

export function buildObservationV2Bundle(input: ObservationV2Bundle): ObservationV2Bundle {
  const runtimeVersion = input.runtimeVersion ?? DEFAULT_RUNTIME_VERSION;
  const provenance: ObservationV2BundleProvenance = input.provenance
    ? {
        ...input.provenance,
        dreamLanguage: normalizeObservationLanguage(input.provenance.dreamLanguage),
      }
    : {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty" as const,
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only" as const,
        boundaryVersion: runtimeVersion,
        dreamLanguage: "unknown" as const,
      };

  return {
    ...input,
    bundleId: input.bundleId ?? `observation-bundle-${input.reflectiveObjectId}-${runtimeVersion}`,
    provenance,
    scenes: [...input.scenes]
      .sort(compareScenes)
      .map((scene) => ({
        ...scene,
        derived: normalizeDerivedStructures(scene.derived),
      })),
    uncertaintyNotes: input.uncertaintyNotes ?? [],
    runtimeVersion,
  };
}

export function getSceneBoundarySignalKinds(scene: ObservationV2Scene): SceneBoundarySignalKind[] {
  return scene.boundaryReasoning.map((reason) => reason.kind);
}
