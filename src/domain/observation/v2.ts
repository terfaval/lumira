import type {
  Observation,
  ObservationCategory,
  ObservationEvidenceAdequacy,
  ObservationFragment,
  ObservationFragmentEvidence,
  ObservationProvenanceTier,
  ObservationSemanticPolicyResult,
  ObservationSource,
  ObservationStatus,
} from "@/src/domain/observation/types";
import type { ObservationSalienceProfile } from "@/src/domain/observation/salience";

export type DescriptiveObservationRole = "structure" | "relation" | "phenomenology" | "continuity";

export interface DescriptiveObservationEvidenceSpan {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface DescriptiveObservationEvidence {
  spans: DescriptiveObservationEvidenceSpan[];
  adequacy: ObservationEvidenceAdequacy;
}

export interface DescriptiveObservation {
  id: string;
  language: "hu";
  text: string;
  category: ObservationCategory;
  role: DescriptiveObservationRole;
  salience?: ObservationSalienceProfile;
  evidence: DescriptiveObservationEvidence;
  position: number;
  uncertaintyNote: string | null;
}

export interface ObservationBundleV2LikeMetadata {
  source: ObservationSource;
  provenanceTier: ObservationProvenanceTier;
  semanticPolicyResult: ObservationSemanticPolicyResult;
  semanticPolicyReasons: string[];
  boundaryVersion: string;
  uncertaintyNotes: string[];
  status: ObservationStatus;
}

export interface ObservationBundleV2Like {
  id: Observation["id"];
  reflectiveObjectId: Observation["reflectiveObjectId"];
  observations: DescriptiveObservation[];
  summary: Observation["summary"];
  metadata: ObservationBundleV2LikeMetadata;
}

const CATEGORY_ROLE_MAP: Record<ObservationCategory, DescriptiveObservationRole> = {
  scene: "structure",
  actor: "structure",
  object: "structure",
  location: "structure",
  interaction: "relation",
  transition: "relation",
  affect_transition: "relation",
  emotion: "phenomenology",
  body_state: "phenomenology",
  dream_quality: "phenomenology",
  agency_state: "phenomenology",
  metacognitive_moment: "phenomenology",
  emotional_contradiction: "phenomenology",
  affective_atmosphere: "phenomenology",
  spatial_instability: "phenomenology",
  dream_state_quality: "phenomenology",
  altered_realism: "phenomenology",
  recurrence_candidate: "continuity",
  continuity_fragment: "continuity",
};

function toDescriptiveObservationEvidenceSpan(
  evidence: ObservationFragmentEvidence,
): DescriptiveObservationEvidenceSpan {
  return {
    snippet: evidence.snippet,
    spanStart: evidence.spanStart,
    spanEnd: evidence.spanEnd,
    contextLabel: evidence.contextLabel,
  };
}

function compareFragments(left: ObservationFragment, right: ObservationFragment): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.id.localeCompare(right.id);
}

export function getObservationCategoryRole(category: ObservationCategory): DescriptiveObservationRole {
  return CATEGORY_ROLE_MAP[category];
}

export function buildDescriptiveObservationLocalId(fragment: ObservationFragment): string {
  return `obsv2:${fragment.observationId}:${fragment.id}`;
}

export function adaptFragmentToDescriptiveObservation(fragment: ObservationFragment): DescriptiveObservation {
  return {
    id: buildDescriptiveObservationLocalId(fragment),
    language: "hu",
    text: fragment.fragmentText,
    category: fragment.category,
    role: getObservationCategoryRole(fragment.category),
    evidence: {
      adequacy: fragment.evidenceAdequacy,
      spans: [toDescriptiveObservationEvidenceSpan(fragment.evidence)],
    },
    position: fragment.position,
    uncertaintyNote: fragment.uncertaintyNote,
  };
}

export function projectObservationToBundleV2Like(observation: Observation): ObservationBundleV2Like {
  const observations = [...observation.fragments]
    .sort(compareFragments)
    .map(adaptFragmentToDescriptiveObservation);

  return {
    id: observation.id,
    reflectiveObjectId: observation.reflectiveObjectId,
    observations,
    summary: observation.summary,
    metadata: {
      source: observation.source,
      provenanceTier: observation.provenanceTier,
      semanticPolicyResult: observation.semanticPolicyResult,
      semanticPolicyReasons: [...observation.semanticPolicyReasons],
      boundaryVersion: observation.boundaryVersion,
      uncertaintyNotes: [...observation.uncertaintyNotes],
      status: observation.status,
    },
  };
}
