import type {
  GlossaryTermId,
  LatentSignalId,
  LatentSnapshotId,
  LatentSuggestionId,
  ObservationId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";
import type { ObservationCategory } from "@/src/domain/observation/types";

export const LATENT_CONFIDENCE_BANDS = ["low", "tentative", "moderate"] as const;
export type LatentConfidenceBand = (typeof LATENT_CONFIDENCE_BANDS)[number];

export const LATENT_VISIBILITIES = ["internal_only", "reflective_space_optional"] as const;
export type LatentVisibility = (typeof LATENT_VISIBILITIES)[number];

export const LATENT_PROCESSING_MODES = [
  "exploratory",
  "affective",
  "agency_oriented",
  "existential",
  "continuity_oriented",
] as const;
export type LatentProcessingMode = (typeof LATENT_PROCESSING_MODES)[number];

export const LATENT_SIGNAL_TYPES = [
  "recurrence_possibility",
  "continuity_possibility",
  "dormant_thread_resurfacing_possibility",
  "reflective_opportunity_possibility",
] as const;
export type LatentSignalType = (typeof LATENT_SIGNAL_TYPES)[number];

export const LATENT_SUGGESTION_TYPES = [
  "possible_connection",
  "possible_recurrence",
  "possible_resurfacing",
  "possible_opening",
] as const;
export type LatentSuggestionType = (typeof LATENT_SUGGESTION_TYPES)[number];

export interface LatentProvenance {
  sourceReflectiveObjects: ReflectiveObjectId[];
  sourceObservations: ObservationId[];
  sourceGlossaryTerms: GlossaryTermId[];
  sourceThreads: ThreadId[];
  sourceResponses: ReflectiveResponseId[];
  generationContext: string;
}

export const LATENT_CENTER_LIFECYCLE_STATES = [
  "possible",
  "emerging",
  "stabilized",
  "weakening",
  "dormant",
  "suppressed",
] as const;
export type LatentCenterLifecycleState = (typeof LATENT_CENTER_LIFECYCLE_STATES)[number];

export interface LatentCenterSalience {
  userOwnedScore: number;
  highlightScore: number;
  glossaryDensityScore: number;
  revisitationScore: number;
  explicitEmphasisScore: number;
  persistenceSignalScore: number;
}

export interface LatentCenterAttenuation {
  repetitionDecay: number;
  refractoryPenalty: number;
  cooldownPenalty: number;
}

export interface LatentCenterNeighborhood {
  relatedCategories: ObservationCategory[];
  glossaryAnchors: string[];
  affectAdjacency: ObservationCategory[];
  continuityCues: string[];
}

export interface LatentProcessingModeCandidate {
  mode: LatentProcessingMode;
  score: number;
  confidenceBand: LatentConfidenceBand;
  rationale: string[];
}

export interface LatentProcessingMaterialPriorities {
  observations: number;
  glossary: number;
  notes: number;
  responses: number;
  neighborhood: number;
}

export interface LatentProcessingModeState {
  /**
   * Internal-only orchestration selection.
   * Not for direct user-facing interpretation or default transport exposure.
   */
  selectedMode: LatentProcessingMode | null;
  /**
   * Internal-only orchestration candidates.
   * Not for default downstream/public transport payloads.
   */
  candidateModes: LatentProcessingModeCandidate[];
  /**
   * Internal-only orchestration confidence.
   * Not for default downstream/public transport payloads.
   */
  modeConfidence: number;
  /**
   * Internal-only orchestration uncertainty.
   * Not for default downstream/public transport payloads.
   */
  uncertainty: number;
  /**
   * Internal-only rationale trace.
   * Not for default downstream/public transport payloads.
   */
  rationaleTrace: string[];
  noModeReason: string | null;
  /**
   * Internal-only preparation priorities.
   * Not for default downstream/public transport payloads.
   */
  materialPriorities: LatentProcessingMaterialPriorities;
}

export interface LatentCenterLifecycle {
  centerCategory: ObservationCategory | null;
  centerState: LatentCenterLifecycleState;
  centerScore: number;
  persistenceStreak: number;
  cooldownUntil: string | null;
  noCenterReason: string | null;
  salience: LatentCenterSalience;
  attenuation: LatentCenterAttenuation;
  neighborhood: LatentCenterNeighborhood;
  /**
   * Internal-only orchestration state.
   * Not for default downstream/public transport payloads.
   */
  processingMode: LatentProcessingModeState;
}

export interface LatentSignal extends VersionedTimestamps {
  id: LatentSignalId;
  snapshotId: LatentSnapshotId;
  userId: UserId;
  signalType: LatentSignalType;
  label: string;
  description: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
}

export interface LatentSuggestion extends VersionedTimestamps {
  id: LatentSuggestionId;
  snapshotId: LatentSnapshotId;
  userId: UserId;
  suggestionType: LatentSuggestionType;
  phrasing: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
}

export interface LatentSnapshot extends VersionedTimestamps {
  id: LatentSnapshotId;
  userId: UserId;
  summary: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
  signals: LatentSignal[];
  suggestions: LatentSuggestion[];
  lifecycle?: LatentCenterLifecycle;
  archivedAt: string | null;
}

export interface CreateLatentSignalInput {
  signalType: LatentSignalType;
  label: string;
  description: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
}

export interface CreateLatentSuggestionInput {
  suggestionType: LatentSuggestionType;
  phrasing: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
}

export interface CreateLatentSnapshotInput {
  userId: UserId;
  summary: string;
  confidenceBand: LatentConfidenceBand;
  visibility: LatentVisibility;
  provenance: LatentProvenance;
  signals: CreateLatentSignalInput[];
  suggestions: CreateLatentSuggestionInput[];
  lifecycle?: LatentCenterLifecycle;
}
