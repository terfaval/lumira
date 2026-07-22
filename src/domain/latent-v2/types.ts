import type {
  GlossaryTermId,
  LatentGenerationRunId,
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

export const LATENT_GENERATION_RUN_STATUSES = [
  "pending",
  "current",
  "superseded",
  "empty",
  "no_change",
  "failed",
  "rejected",
] as const;
export type LatentGenerationRunStatus = (typeof LATENT_GENERATION_RUN_STATUSES)[number];

export const LATENT_GENERATION_RUN_INVALIDATION_SOURCE_LAYERS = ["observation"] as const;
export type LatentGenerationRunInvalidationSourceLayer =
  (typeof LATENT_GENERATION_RUN_INVALIDATION_SOURCE_LAYERS)[number];

export const LATENT_GENERATION_RUN_INVALIDATION_SOURCE_ENTITY_TYPES = ["observation_v2_bundle"] as const;
export type LatentGenerationRunInvalidationSourceEntityType =
  (typeof LATENT_GENERATION_RUN_INVALIDATION_SOURCE_ENTITY_TYPES)[number];

export const LATENT_GENERATION_RUN_INVALIDATION_REASONS = ["observation_bundle_archived"] as const;
export type LatentGenerationRunInvalidationReason = (typeof LATENT_GENERATION_RUN_INVALIDATION_REASONS)[number];

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

export interface LatentAuthorityDreamProvenance {
  priorityReflectiveObjectId: ReflectiveObjectId;
  title: string;
  objectLanguage: string;
  content: string | null;
  summary: string | null;
}

export interface LatentAuthorityObservationProvenance {
  observationBundleId: string;
  observationRuntimeVersion: string;
  semanticPolicyResult: "accept" | "accept_with_uncertainty";
  bundleUncertaintyNotes: string[];
  scenes: Array<{
    sceneRowId: string;
    sceneStableId: string;
    position: number;
    summary: string;
    evidenceSnippet: string;
    boundarySignals: Array<{
      kind: string;
      note: string;
    }>;
    derivedStructures: Record<string, string[]>;
  }>;
  observations: Array<{
    observationV2SceneObservationId: string;
    sceneRowId: string;
    sceneStableId: string;
    observationStableId: string;
    position: number;
    text: string;
    category: string;
    evidence: Array<{
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
    }>;
    uncertaintyNote: string | null;
  }>;
}

export interface LatentAuthorityGlossaryProvenance {
  confirmedTerms: Array<{
    glossaryTermId: GlossaryTermId;
    displayLabel: string;
    normalizedKey: string;
    termType: "motif" | "concept" | "other";
    userNotes: string | null;
    appearanceCount: number;
    recentAppearanceObjectIds: ReflectiveObjectId[];
  }>;
  appearanceRecords: Array<{
    appearanceRecordId: string;
    glossaryTermId: GlossaryTermId;
    reflectiveObjectId: ReflectiveObjectId;
    displayLabelAtAppearance: string;
    sourceObservationId: string | null;
  }>;
}

export interface LatentAuthorityReflectionProvenance {
  reflectionId: string;
  threadId: string;
  sourceResponseId: string;
  sourceOpeningId: string | null;
  sourceReflectiveObjectIds: ReflectiveObjectId[];
  statement: string;
  pattern: string[];
  admittedAt: string;
}

export interface LatentAuthorityProvenance {
  dream: LatentAuthorityDreamProvenance;
  observation: LatentAuthorityObservationProvenance;
  glossary: LatentAuthorityGlossaryProvenance;
  reflections: LatentAuthorityReflectionProvenance[];
}

export interface LatentContextProvenance {
  existingOpportunityContext: {
    identities: Array<{
      identityId: LatentOpportunityIdentityId;
      primaryCategory: LatentOpportunityCategory;
      secondaryCategories: LatentOpportunityCategory[];
      lifecycleState: string;
      latestStructure: {
        structureType: string;
        nodes: string[];
      };
      recentManifestationSummaries: Array<{
        manifestationId: string;
        priorityReflectiveObjectId: ReflectiveObjectId;
        structure: Record<string, unknown>;
        primaryEvidenceObservationTexts: string[];
      }>;
    }>;
  };
  truncationNote: string | null;
}

export interface LatentExecutionProvenance {
  constructorRuntimeVersion: string;
  llm: {
    provider: string;
    model: string;
    requestTimeoutMs: number;
    responseFormat: {
      type: string;
      schemaName: string;
      strict: boolean;
    };
  };
}

export interface LatentGenerationRun extends VersionedTimestamps {
  id: LatentGenerationRunId;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  status: LatentGenerationRunStatus;
  inputFingerprint: string;
  authorityFingerprint: string | null;
  authorityProvenance: LatentAuthorityProvenance | null;
  contextProvenance: LatentContextProvenance | null;
  executionProvenance: LatentExecutionProvenance | null;
  triggerReason: string | null;
  predecessorRunId: LatentGenerationRunId | null;
  acceptedAt: string | null;
  supersededAt: string | null;
}

export interface LatentGenerationRunInvalidationEvent {
  id: string;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  targetGenerationRunId: LatentGenerationRunId;
  sourceLayer: LatentGenerationRunInvalidationSourceLayer;
  sourceEntityType: LatentGenerationRunInvalidationSourceEntityType;
  sourceEntityId: string;
  sourceRevision: string;
  reason: LatentGenerationRunInvalidationReason;
  createdAt: string;
}

export interface AcceptedGenerationReuseResolution {
  reusable: boolean;
  generationRun: LatentGenerationRun | null;
  invalidation: LatentGenerationRunInvalidationEvent | null;
}

export interface AcceptedAuthorityEvidence {
  authorityProvenance: LatentAuthorityProvenance;
  authorityFingerprint?: string;
}

export interface CandidateAuthorityEvidence {
  authorityProvenance: LatentAuthorityProvenance;
  authorityFingerprint?: string;
}

export const AUTHORITY_SAMENESS_OUTCOMES = [
  "constitutionally_identical",
  "materially_changed",
] as const;
export type AuthoritySamenessOutcome =
  (typeof AUTHORITY_SAMENESS_OUTCOMES)[number];

export interface AuthorityEvaluationResult {
  outcome: AuthoritySamenessOutcome;
  acceptedFingerprint: string;
  candidateFingerprint: string;
}

export interface AcceptedOpportunityStalenessTarget {
  priorityReflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
}

export const ACCEPTED_OPPORTUNITY_STALENESS_OUTCOMES = [
  "current",
  "stale",
] as const;
export type AcceptedOpportunityStalenessOutcome =
  (typeof ACCEPTED_OPPORTUNITY_STALENESS_OUTCOMES)[number];

export const ACCEPTED_OPPORTUNITY_STALE_GROUNDS = [
  "authority_divergence",
  "invalidation_currentness_failure",
  "accepted_surface_divergence",
] as const;
export type AcceptedOpportunityStaleGround =
  (typeof ACCEPTED_OPPORTUNITY_STALE_GROUNDS)[number];

export interface AcceptedOpportunityStalenessResult {
  outcome: AcceptedOpportunityStalenessOutcome;
  grounds: AcceptedOpportunityStaleGround[];
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
  generationRunId: LatentGenerationRunId;
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

export interface CreateLatentGenerationRunInput {
  id?: LatentGenerationRunId;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  status: LatentGenerationRunStatus;
  inputFingerprint: string;
  authorityFingerprint?: string | null;
  authorityProvenance?: LatentAuthorityProvenance | null;
  contextProvenance?: LatentContextProvenance | null;
  executionProvenance?: LatentExecutionProvenance | null;
  triggerReason?: string | null;
  predecessorRunId?: LatentGenerationRunId | null;
}

export interface CreateLatentGenerationRunInvalidationEventInput {
  id?: string;
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  targetGenerationRunId: LatentGenerationRunId;
  sourceLayer: LatentGenerationRunInvalidationSourceLayer;
  sourceEntityType: LatentGenerationRunInvalidationSourceEntityType;
  sourceEntityId: string;
  sourceRevision: string;
  reason: LatentGenerationRunInvalidationReason;
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
  generationRunId: LatentGenerationRunId;
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
