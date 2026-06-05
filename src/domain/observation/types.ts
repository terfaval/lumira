import type {
  ObservationFragmentId,
  ObservationId,
  ReflectiveObjectId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const OBSERVATION_CATEGORIES = [
  "scene",
  "actor",
  "interaction",
  "emotion",
  "location",
  "transition",
  "object",
  "body_state",
  "dream_quality",
  "recurrence_candidate",
  "agency_state",
  "metacognitive_moment",
  "affect_transition",
  "emotional_contradiction",
  "affective_atmosphere",
  "spatial_instability",
  "dream_state_quality",
  "continuity_fragment",
  "altered_realism",
] as const;

export type ObservationCategory = (typeof OBSERVATION_CATEGORIES)[number];

export const OBSERVATION_SOURCES = ["system_descriptive_extract", "system_llm_extract", "user_descriptive_note"] as const;

export type ObservationSource = (typeof OBSERVATION_SOURCES)[number];
export type ObservationStatus = "active" | "archived";

export const OBSERVATION_SEMANTIC_POLICY_RESULTS = [
  "accept",
  "accept_with_uncertainty",
  "reject_interpretive",
  "defer_insufficient_evidence",
] as const;
export type ObservationSemanticPolicyResult = (typeof OBSERVATION_SEMANTIC_POLICY_RESULTS)[number];

export const OBSERVATION_PROVENANCE_TIERS = [
  "manual_user",
  "system_extract",
  "imported_transform",
  "reviewed",
] as const;
export type ObservationProvenanceTier = (typeof OBSERVATION_PROVENANCE_TIERS)[number];

export const OBSERVATION_EVIDENCE_ADEQUACY_LEVELS = ["strong_span", "snippet_only", "weak_fallback"] as const;
export type ObservationEvidenceAdequacy = (typeof OBSERVATION_EVIDENCE_ADEQUACY_LEVELS)[number];

export interface ObservationSummaryTrace {
  fragmentPosition: number;
  reason: "explicit_anchor" | "inferred_overlap";
  strength: "strong" | "weak";
}

export interface ObservationFragmentEvidence {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationFragment extends VersionedTimestamps {
  id: ObservationFragmentId;
  observationId: ObservationId;
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  category: ObservationCategory;
  fragmentText: string;
  evidenceAdequacy: ObservationEvidenceAdequacy;
  evidence: ObservationFragmentEvidence;
  uncertaintyNote: string | null;
  position: number;
}

export interface Observation extends VersionedTimestamps {
  id: ObservationId;
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  summary: string;
  uncertaintyNotes: string[];
  semanticPolicyResult: ObservationSemanticPolicyResult;
  semanticPolicyReasons: string[];
  provenanceTier: ObservationProvenanceTier;
  summaryTrace: ObservationSummaryTrace[];
  latentBackflowGuard: "observation_only";
  boundaryVersion: string;
  status: ObservationStatus;
  fragments: ObservationFragment[];
}

export interface CreateObservationFragmentInput {
  category: ObservationCategory;
  fragmentText: string;
  evidenceAdequacy?: ObservationEvidenceAdequacy;
  evidence: ObservationFragmentEvidence;
  uncertaintyNote?: string | null;
  position: number;
}

export interface CreateObservationInput {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  summary: string;
  uncertaintyNotes?: string[];
  provenanceTier: ObservationProvenanceTier;
  semanticPolicyResult: ObservationSemanticPolicyResult;
  semanticPolicyReasons: string[];
  summaryTrace: ObservationSummaryTrace[];
  latentBackflowGuard: "observation_only";
  boundaryVersion: string;
  fragments: CreateObservationFragmentInput[];
}

export interface ObservationListQuery {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  limit?: number;
}
