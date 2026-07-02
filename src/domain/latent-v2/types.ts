import type {
  GlossaryTermId,
  LatentOpportunityEvidenceBlockId,
  LatentOpportunityEvidenceObservationId,
  LatentOpportunityGlossaryLinkId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const LATENT_OPPORTUNITY_CATEGORIES = [
  "pattern",
  "continuity",
  "relationship",
  "transition",
  "transformation",
  "reversal",
  "tension",
  "contradiction",
  "ambiguity",
  "gap",
  "unresolved_pattern",
  "unknown",
  "curiosity",
  "novelty",
  "salience_signal",
] as const;
export type LatentOpportunityCategory = (typeof LATENT_OPPORTUNITY_CATEGORIES)[number];

export const LATENT_OPPORTUNITY_LIFECYCLE_STATES = [
  "emerging",
  "reinforced",
  "expanded",
  "recontextualized",
  "reversed",
  "weakening",
  "reactivated",
  "split",
  "merged",
  "abandoned",
] as const;
export type LatentOpportunityLifecycleState = (typeof LATENT_OPPORTUNITY_LIFECYCLE_STATES)[number];

export const LATENT_OPPORTUNITY_STATUSES = ["active", "archived"] as const;
export type LatentOpportunityStatus = (typeof LATENT_OPPORTUNITY_STATUSES)[number];

export const LATENT_OPPORTUNITY_SALIENCE_BANDS = ["low", "moderate", "high"] as const;
export type LatentOpportunitySalienceBand = (typeof LATENT_OPPORTUNITY_SALIENCE_BANDS)[number];

export const LATENT_OPPORTUNITY_EVIDENCE_ROLES = [
  "priority",
  "context",
  "historical_resonance",
  "contrast",
] as const;
export type LatentOpportunityEvidenceRole = (typeof LATENT_OPPORTUNITY_EVIDENCE_ROLES)[number];

export const LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES = [
  "primary_support",
  "context_support",
  "historical_resonance_support",
  "contrast_support",
] as const;
export type LatentOpportunityEvidenceObservationRole =
  (typeof LATENT_OPPORTUNITY_EVIDENCE_OBSERVATION_ROLES)[number];

export const LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES = [
  "continuity",
  "contrast",
  "resonance",
  "context",
] as const;
export type LatentOpportunityGlossaryLinkRole = (typeof LATENT_OPPORTUNITY_GLOSSARY_LINK_ROLES)[number];

export interface LatentOpportunityStructure {
  kind: string;
  label: string;
  elements: string[];
  metadata?: Record<string, unknown>;
}

export interface LatentOpportunityIdentity extends VersionedTimestamps {
  id: LatentOpportunityIdentityId;
  userId: UserId;
  title: string;
  primaryCategory: LatentOpportunityCategory;
  secondaryCategories: LatentOpportunityCategory[];
  lifecycleState: LatentOpportunityLifecycleState;
  status: LatentOpportunityStatus;
  archivedAt: string | null;
}

export interface LatentOpportunityGlossaryLink {
  id: LatentOpportunityGlossaryLinkId;
  manifestationId: LatentOpportunityManifestationId;
  userId: UserId;
  glossaryTermId: GlossaryTermId;
  role: LatentOpportunityGlossaryLinkRole;
  createdAt: string;
}

export interface LatentOpportunityEvidenceObservation {
  id: LatentOpportunityEvidenceObservationId;
  evidenceBlockId: LatentOpportunityEvidenceBlockId;
  userId: UserId;
  observationV2SceneObservationId: string;
  sceneId: string | null;
  role: LatentOpportunityEvidenceObservationRole;
  supportsNodeKeys: string[];
  supportsEdgeIndexes: number[];
  createdAt: string;
}

export interface LatentOpportunityEvidenceBlock {
  id: LatentOpportunityEvidenceBlockId;
  manifestationId: LatentOpportunityManifestationId;
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  role: LatentOpportunityEvidenceRole;
  summary: string | null;
  position: number;
  createdAt: string;
  observations: LatentOpportunityEvidenceObservation[];
}

export interface LatentOpportunityManifestation extends VersionedTimestamps {
  id: LatentOpportunityManifestationId;
  identityId: LatentOpportunityIdentityId;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  summary: string;
  structure: LatentOpportunityStructure;
  primaryCategory: LatentOpportunityCategory;
  secondaryCategories: LatentOpportunityCategory[];
  credibilityScore: number;
  reflectivePotentialScore: number;
  salienceBand: LatentOpportunitySalienceBand;
  salienceRationale: Record<string, unknown>;
  constructionMetadata: Record<string, unknown>;
  archivedAt: string | null;
  identity: LatentOpportunityIdentity;
  evidenceBlocks: LatentOpportunityEvidenceBlock[];
  glossaryLinks: LatentOpportunityGlossaryLink[];
}

export interface CreateLatentOpportunityIdentityInput {
  id?: LatentOpportunityIdentityId;
  userId: UserId;
  title: string;
  primaryCategory: LatentOpportunityCategory;
  secondaryCategories?: LatentOpportunityCategory[];
  lifecycleState: LatentOpportunityLifecycleState;
  status?: LatentOpportunityStatus;
}

export interface CreateLatentOpportunityGlossaryLinkInput {
  glossaryTermId: GlossaryTermId;
  role: LatentOpportunityGlossaryLinkRole;
}

export interface CreateLatentOpportunityEvidenceObservationInput {
  observationV2SceneObservationId: string;
  sceneId?: string | null;
  role: LatentOpportunityEvidenceObservationRole;
  supportsNodeKeys?: string[] | null;
  supportsEdgeIndexes?: number[] | null;
}

export interface CreateLatentOpportunityEvidenceBlockInput {
  reflectiveObjectId: ReflectiveObjectId;
  role: LatentOpportunityEvidenceRole;
  summary?: string | null;
  position: number;
  observations: CreateLatentOpportunityEvidenceObservationInput[];
}

export interface CreateLatentOpportunityManifestationInput {
  id?: LatentOpportunityManifestationId;
  identityId: LatentOpportunityIdentityId;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  summary: string;
  structure: LatentOpportunityStructure;
  primaryCategory: LatentOpportunityCategory;
  secondaryCategories?: LatentOpportunityCategory[];
  credibilityScore: number;
  reflectivePotentialScore: number;
  salienceBand: LatentOpportunitySalienceBand;
  salienceRationale?: Record<string, unknown>;
  constructionMetadata?: Record<string, unknown>;
  glossaryLinks?: CreateLatentOpportunityGlossaryLinkInput[];
  evidenceBlocks: CreateLatentOpportunityEvidenceBlockInput[];
}
