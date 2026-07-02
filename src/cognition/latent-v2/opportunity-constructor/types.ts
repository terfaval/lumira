import {
  LATENT_OPPORTUNITY_CATEGORIES,
} from "@/src/domain/latent-v2/types";
import type {
  CreateLatentOpportunityIdentityInput,
  CreateLatentOpportunityManifestationInput,
  LatentOpportunityCategory,
  LatentOpportunityEvidenceObservationRole,
  LatentOpportunityEvidenceRole,
  LatentOpportunityGlossaryLinkRole,
  LatentOpportunitySalienceBand,
} from "@/src/domain/latent-v2/types";
import type {
  GlossaryCandidateId,
  GlossaryTermId,
  LatentOpportunityIdentityId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";

export type OpportunityConstructorSemanticPolicyResult = "accept" | "accept_with_uncertainty";
export type OpportunityConstructorPriorityReflectiveObjectType = "dream";
export type OpportunityConstructorObservationCategory =
  | "actor"
  | "location"
  | "object"
  | "interaction"
  | "affect"
  | "agency"
  | "metacognition"
  | "phenomenology"
  | "event"
  | "other";
export type OpportunityConstructorBoundarySignalKind =
  | "spatial_change"
  | "temporal_change"
  | "actor_change"
  | "goal_change"
  | "perspective_change"
  | "world_rule_change"
  | "other";
export type OpportunityIdentityDecisionMode = "create_new" | "reuse_existing";
export type OpportunityReuseConfidence = "tentative" | "moderate";
export type OpportunityDecisionMode = "opportunities_found" | "no_opportunity";
export type OpportunityContinuitySignalKind = "confirmed_glossary_term" | "existing_opportunity" | "none";
export type OpportunityPriorityReflectiveObjectRole = "primary_source";
export const OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES = LATENT_OPPORTUNITY_CATEGORIES;
export type OpportunityConstructorCategory = (typeof OPPORTUNITY_CONSTRUCTOR_ALLOWED_CATEGORIES)[number];

export const OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES = [
  "A_TO_B",
  "A_TO_B_TO_C",
  "A_VS_B",
  "A_WITH_B",
  "A_WITHOUT_B",
  "RECURRING_A",
  "MISSING_A",
  "RELATIONSHIP",
  "TENSION",
  "CONTRADICTION",
  "AMBIGUITY",
  "GAP",
  "UNRESOLVED_PATTERN",
  "SALIENCE_SIGNAL",
] as const;
export type OpportunityConstructorStructureType = (typeof OPPORTUNITY_CONSTRUCTOR_STRUCTURE_TYPES)[number];

export interface OpportunityConstructorInputPacket {
  generationContext: {
    runtimeVersion: string;
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    priorityReflectiveObjectType: OpportunityConstructorPriorityReflectiveObjectType;
    priorityReflectiveObjectTitle: string;
    objectLanguage: string;
    observationBundleId: string;
    observationRuntimeVersion: string;
    semanticPolicyResult: OpportunityConstructorSemanticPolicyResult;
    bundleUncertaintyNotes: string[];
  };
  priorityObject: {
    content?: string;
    summary?: string;
  };
  scenes: Array<{
    sceneRowId: string;
    sceneStableId: string;
    position: number;
    summary: string;
    evidenceSnippet: string;
    boundarySignals: Array<{
      kind: OpportunityConstructorBoundarySignalKind;
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
    category: OpportunityConstructorObservationCategory;
    evidence: Array<{
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
    }>;
    uncertaintyNote: string | null;
  }>;
  glossaryContext: {
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
    candidates: Array<{
      glossaryCandidateId: GlossaryCandidateId;
      displayLabel: string;
      normalizedKey: string;
      sourceCategory: "actor" | "location" | "object" | "concept" | "other";
      candidateClass: "new_candidate" | "possible_match" | "ambiguous";
      state: "candidate";
      sourceObservationStableId: string | null;
    }>;
  };
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
}

export interface OpportunityConstructorOutputPacket {
  generationContext: {
    runtimeVersion: string;
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  decision: {
    mode: OpportunityDecisionMode;
    silenceReason: string | null;
  };
  opportunities: OpportunityConstructorOpportunity[];
}

export interface OpportunityConstructorOpportunity {
  clientOpportunityKey: string;
  identityDecision: {
    mode: OpportunityIdentityDecisionMode;
    existingIdentityId: LatentOpportunityIdentityId | null;
    reuseConfidence: OpportunityReuseConfidence | null;
    reuseRationale: string | null;
  };
  opportunityStructure: {
    primaryCategory: OpportunityConstructorCategory;
    secondaryCategories: OpportunityConstructorCategory[];
    structureType: OpportunityConstructorStructureType;
    nodes: Array<{
      key: string;
      label: string;
      kind: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      relation: string;
    }>;
    tensions: Array<{
      between: string[];
      description: string;
    }>;
    gaps: Array<{
      description: string;
      supportedByObservationIds: string[];
    }>;
    continuitySignals: Array<{
      kind: OpportunityContinuitySignalKind;
      referenceId: string | null;
      description: string | null;
    }>;
  };
  manifestation: {
    summaryForInternalUse: string;
    priorityReflectiveObjectRole: OpportunityPriorityReflectiveObjectRole;
    salience: {
      credibility: number;
      reflectivePotential: number;
      salienceBand: LatentOpportunitySalienceBand;
      credibilityRationale: string;
      reflectivePotentialRationale: string;
    };
  };
  evidenceBlocks: Array<{
    clientBlockKey: string;
    reflectiveObjectId: ReflectiveObjectId;
    role: LatentOpportunityEvidenceRole;
    summary: string | null;
    observationRefs: Array<{
      observationV2SceneObservationId: string;
      sceneRowId?: string | null;
      sceneStableId?: string | null;
      observationStableId: string;
      role: LatentOpportunityEvidenceObservationRole;
      supportsNodeKeys: string[];
      supportsEdgeIndexes: number[];
    }>;
    confirmedGlossaryRefs: Array<{
      glossaryTermId: GlossaryTermId;
      relationshipRole: LatentOpportunityGlossaryLinkRole;
      note: string;
    }>;
    candidateGlossaryMentions: Array<{
      glossaryCandidateId: GlossaryCandidateId;
      note: string;
    }>;
  }>;
  safety: {
    containsInterpretation: boolean;
    containsDiagnosis: boolean;
    containsIdentityClaim: boolean;
    containsAdvice: boolean;
    userFacingReady: boolean;
  };
}

export interface ValidatedOpportunityConstructorOutput extends OpportunityConstructorOutputPacket {
  inputPacket: OpportunityConstructorInputPacket;
}

export type OpportunityConstructorValidationResult =
  | {
      ok: true;
      value: ValidatedOpportunityConstructorOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export interface OpportunityRepositoryCreatePlan {
  clientOpportunityKey: string;
  identity:
    | {
        mode: "create_new";
        input: CreateLatentOpportunityIdentityInput;
      }
    | {
        mode: "reuse_existing";
        identityId: LatentOpportunityIdentityId;
      };
  manifestation: CreateLatentOpportunityManifestationInput;
}

export interface OpportunityRepositoryCreateMapping {
  creates: OpportunityRepositoryCreatePlan[];
}
