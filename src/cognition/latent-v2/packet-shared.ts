import type {
  ObservationLanguage,
  ObservationV2Bundle,
} from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import type {
  OpportunityConstructorBoundarySignalKind,
  OpportunityConstructorObservationCategory,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";

const OBSERVATION_CATEGORY_PRIORITY = [
  "affect",
  "agency",
  "metacognition",
  "phenomenology",
  "interactions",
  "locations",
  "objects",
  "actors",
] as const;

export function getObservationLanguage(bundle: ObservationV2Bundle, reflectiveObject: ReflectiveObject): ObservationLanguage {
  const fromBundle = bundle.provenance?.dreamLanguage;
  if (fromBundle === "hu" || fromBundle === "en") {
    return fromBundle;
  }

  const fromMetadata = reflectiveObject.metadata.objectLanguage ?? reflectiveObject.metadata.language;
  return fromMetadata === "hu" || fromMetadata === "en" ? fromMetadata : "unknown";
}

export function getPriorityObjectSummary(reflectiveObject: ReflectiveObject): string | undefined {
  const summaryCandidate = reflectiveObject.metadata.conciseSummary ?? reflectiveObject.metadata.summary;
  return typeof summaryCandidate === "string" && summaryCandidate.trim().length > 0 ? summaryCandidate.trim() : undefined;
}

export function mapSemanticPolicyResult(
  bundle: ObservationV2Bundle,
): "accept" | "accept_with_uncertainty" {
  return bundle.provenance?.semanticPolicyResult === "accept" ? "accept" : "accept_with_uncertainty";
}

export function getSceneRowId(bundleId: string, sceneStableId: string): string {
  return `${bundleId}:${sceneStableId}`;
}

export function getObservationRowId(bundleId: string, sceneStableId: string, observationStableId: string): string {
  return `${bundleId}:${sceneStableId}:${observationStableId}`;
}

export function extractDerivedLabels(items: ObservationV2Bundle["scenes"][number]["derived"]["actors"]): string[] {
  return items
    .map((item) => item.displayLabel ?? item.label ?? "")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function mapBoundarySignalKind(
  kind: ObservationV2Bundle["scenes"][number]["boundaryReasoning"][number]["kind"],
): OpportunityConstructorBoundarySignalKind {
  return kind === "narrative_change" ? "other" : kind;
}

export function inferObservationCategory(
  scene: ObservationV2Bundle["scenes"][number],
  observationId: string,
): OpportunityConstructorObservationCategory {
  for (const key of OBSERVATION_CATEGORY_PRIORITY) {
    if (scene.derived[key].some((item) => item.observationIds.includes(observationId))) {
      switch (key) {
        case "actors":
          return "actor";
        case "locations":
          return "location";
        case "objects":
          return "object";
        case "interactions":
          return "interaction";
        case "affect":
          return "affect";
        case "agency":
          return "agency";
        case "metacognition":
          return "metacognition";
        case "phenomenology":
          return "phenomenology";
      }
    }
  }

  return "other";
}
