import type { LatentConfidenceBand } from "@/src/domain/latent/types";
import type {
  GlossaryTermId,
  LatentSnapshotId,
  ObservationId,
  OpeningId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const OPENING_TYPES = [
  "reflective_question",
  "continuity_noticing",
  "reflective_recall",
  "atmospheric_reflection",
  "juxtaposition",
] as const;
export type OpeningType = (typeof OPENING_TYPES)[number];

export const OPENING_VISIBILITIES = ["invitation_surface", "opened"] as const;
export type OpeningVisibility = (typeof OPENING_VISIBILITIES)[number];

export const OPENING_SUPPRESSION_STATES = ["none", "suppressed"] as const;
export type OpeningSuppressionState = (typeof OPENING_SUPPRESSION_STATES)[number];

export const OPENING_SUPPRESSION_DURATIONS = ["temporary", "indefinite", "user_reactivated"] as const;
export type SuppressionDuration = (typeof OPENING_SUPPRESSION_DURATIONS)[number];

export const OPENING_SUPPRESSION_REVISIT_ELIGIBILITIES = ["hidden", "revisitable_dormant", "user_reactivated"] as const;
export type SuppressionRevisitEligibility = (typeof OPENING_SUPPRESSION_REVISIT_ELIGIBILITIES)[number];

export const OPENING_TONES = ["gentle", "curious", "spacious", "calm"] as const;
export type OpeningTone = (typeof OPENING_TONES)[number];

export const OPENING_STATES = ["available", "activated", "dismissed", "archived"] as const;
export type OpeningState = (typeof OPENING_STATES)[number];

export const OPENING_SURFACE_EVENT_TYPES = ["surface_viewed", "activated", "dismissed", "suppressed", "reactivated"] as const;
export type OpeningSurfaceEventType = (typeof OPENING_SURFACE_EVENT_TYPES)[number];

export const OPENING_SIMILARITY_SCOPES = [
  "latent_lineage_overlap",
  "glossary_overlap",
  "reflective_object_overlap",
  "utterance_pattern_overlap",
] as const;
export type OpeningSimilarityScope = (typeof OPENING_SIMILARITY_SCOPES)[number];

export const NO_OPENING_REASONS = [
  "low_confidence",
  "repetition_risk",
  "pacing_overload",
  "recent_resurfacing",
  "suppression_overlap",
  "no_candidates",
] as const;
export type NoOpeningReason = (typeof NO_OPENING_REASONS)[number];

export interface SuppressionExpiry {
  at: string | null;
}

export type SuppressionReason =
  | "emotional_density"
  | "repetition_fatigue"
  | "continuity_overload"
  | "not_now"
  | "user_custom";

export interface OpeningFingerprint {
  seed: string;
  scopes: OpeningSimilarityScope[];
  latentSnapshotReference: LatentSnapshotId | null;
}

export interface OpeningCadenceWindow {
  maxOpeningsPerInvocation: number;
  globalCooldownMinutes: number;
  similarityWindowHours: number;
  suppressionWindowDays: number;
}

export type OpeningKind = "question";

export interface OpeningContextPayload {
  context: string;
  sourceOpportunityManifestationId: string | null;
  openingKind: OpeningKind | null;
  sourceRuntime: string | null;
}

export interface OpeningProvenance {
  sourceObjects: ReflectiveObjectId[];
  sourceObservations: ObservationId[];
  sourceGlossaryTerms: GlossaryTermId[];
  sourceThreads: ThreadId[];
  sourceResponses: ReflectiveResponseId[];
  latentSnapshotReference: LatentSnapshotId | null;
  confidenceBand: LatentConfidenceBand;
  openingGenerationContext: string;
  openingContext?: OpeningContextPayload | null;
  sourceOpportunityManifestationId?: string | null;
}

export interface OpeningCandidate {
  userId: UserId;
  openingType: OpeningType;
  tone: OpeningTone;
  utterance: string;
  visibility: OpeningVisibility;
  provenance: OpeningProvenance;
}

export interface Opening extends VersionedTimestamps {
  id: OpeningId;
  userId: UserId;
  openingType: OpeningType;
  tone: OpeningTone;
  utterance: string;
  state: OpeningState;
  visibility: OpeningVisibility;
  suppressionState: OpeningSuppressionState;
  suppressionDuration: SuppressionDuration | null;
  suppressionReason: string | null;
  suppressionExpiry: SuppressionExpiry;
  suppressionRevisitEligibility: SuppressionRevisitEligibility;
  suppressionReactivatedAt: string | null;
  provenance: OpeningProvenance;
  activatedAt: string | null;
  dismissedAt: string | null;
  archivedAt: string | null;
}

export interface OpeningSurface {
  openingId: OpeningId;
  userId: UserId;
  openingType: OpeningType;
  tone: OpeningTone;
  visibility: OpeningVisibility;
  suppressionState: OpeningSuppressionState;
  suppressionDuration: SuppressionDuration | null;
  suppressionRevisitEligibility: SuppressionRevisitEligibility;
  state: OpeningState;
  preview: string;
  activated: boolean;
  createdAt: string;
}

export interface OpeningSurfaceEvent extends VersionedTimestamps {
  id: string;
  openingId: OpeningId;
  userId: UserId;
  eventType: OpeningSurfaceEventType;
  source: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
}

export interface CreateOpeningInput {
  userId: UserId;
  openingType: OpeningType;
  tone: OpeningTone;
  utterance: string;
  visibility?: OpeningVisibility;
  provenance: OpeningProvenance;
}

export interface OpeningSuppressionInput {
  openingId: OpeningId;
  userId: UserId;
  nextState: OpeningSuppressionState;
  duration?: SuppressionDuration | null;
  suppressionReasonCode?: SuppressionReason | null;
  suppressionReason?: string | null;
  suppressionExpiryMinutes?: number | null;
  suppressionRevisitEligibility?: SuppressionRevisitEligibility | null;
}

export interface OpeningActivationInput {
  openingId: OpeningId;
  userId: UserId;
  source: OpeningSurfaceEvent["source"];
}

export interface OpeningReactivationInput {
  openingId: OpeningId;
  userId: UserId;
  source: OpeningSurfaceEvent["source"];
}

export type ReflectiveOpening = Opening;
export type ReflectiveOpeningCandidate = OpeningCandidate;
