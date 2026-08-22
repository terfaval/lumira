import type {
  AnchorParticipationConfidence,
  AnchorParticipationRole,
  AnchorParticipationSource,
  AnchorSourceType,
  AnchorType,
  CreateAnchorIdentityInput,
  CreateAnchorManifestationInput,
  CreateAnchorParticipationInput,
} from "@/src/domain/anchor-v1/types";
import type {
  LatentOpportunityCategory,
  LatentOpportunityEvidenceObservationRole,
  LatentOpportunityEvidenceRole,
  LatentOpportunitySalienceBand,
} from "@/src/domain/latent-v2/types";
import type {
  AnchorIdentityId,
  GlossaryCandidateId,
  GlossaryTermId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";

export interface AnchorConstructorInputPacket {
  reflectiveObject: {
    id: ReflectiveObjectId;
    userId: UserId;
    title: string;
    content?: string;
  };
  observationSet: {
    observationFamily: "v2" | "v3";
    observationAuthorityId: string;
    runtimeVersion: string;
    objectLanguage: string;
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
      observationReferenceId: string;
      sceneRowId: string;
      sceneStableId: string;
      observationStableId: string;
      position: number;
      text: string;
      evidence: Array<{
        snippet: string;
        spanStart: number | null;
        spanEnd: number | null;
      }>;
      uncertaintyNote: string | null;
    }>;
  };
  opportunitySet: {
    opportunities: Array<{
      opportunityIdentityId: LatentOpportunityIdentityId;
      opportunityManifestationId: LatentOpportunityManifestationId;
      primaryCategory: LatentOpportunityCategory;
      secondaryCategories: LatentOpportunityCategory[];
      structure: {
        kind: string;
        label: string;
        elements: string[];
        metadata?: Record<string, unknown>;
      };
      summary: string;
      salience: {
        credibilityScore: number;
        reflectivePotentialScore: number;
        salienceBand: LatentOpportunitySalienceBand;
      };
      evidenceBlocks: Array<{
        evidenceBlockId: string;
        reflectiveObjectId: ReflectiveObjectId;
        role: LatentOpportunityEvidenceRole;
        summary: string | null;
        position: number;
      }>;
    }>;
  };
  opportunityEvidenceTrace: {
    entries: Array<{
      opportunityManifestationId: LatentOpportunityManifestationId;
      opportunityIdentityId: LatentOpportunityIdentityId;
      evidenceBlockId: string;
      evidenceBlockRole: LatentOpportunityEvidenceRole;
      observationReferenceId: string;
      sceneId: string | null;
      observationRole: LatentOpportunityEvidenceObservationRole;
      supportsNodeKeys: string[];
      supportsEdgeIndexes: number[];
    }>;
  };
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
}

export type AnchorConstructorDecisionMode = "anchors_found" | "no_anchor";
export type AnchorConstructorIdentityDecisionMode = "create_new" | "reuse_existing";
export type AnchorConstructorEvidenceObservationRole = "primary_support" | "context_support";
export type AnchorConstructorEvidenceOpportunityRole = "supporting_opportunity";

export interface AnchorConstructorOutput {
  generationContext: {
    runtimeVersion: string;
    priorityReflectiveObjectId: ReflectiveObjectId;
  };
  decision: {
    mode: AnchorConstructorDecisionMode;
    silenceReason: string | null;
  };
  anchors: AnchorConstructorAnchor[];
}

export interface AnchorConstructorAnchor {
  clientAnchorKey: string;
  identityDecision: {
    mode: AnchorConstructorIdentityDecisionMode;
    existingAnchorId: AnchorIdentityId | null;
    reuseConfidence: string | null;
    reuseRationale: string | null;
  };
  anchorIdentity: {
    anchorType: AnchorType;
    identityLabel: string;
    normalizationRationale: string;
  };
  anchorManifestation: {
    manifestationLabel: string;
    sourceType: AnchorSourceType;
    reflectiveObjectId: ReflectiveObjectId;
  };
  participations: Array<{
    opportunityManifestationId: LatentOpportunityManifestationId;
    participationRole: AnchorParticipationRole;
    confidence: AnchorParticipationConfidence;
    source: Extract<AnchorParticipationSource, "LLM_CONSTRUCTED">;
  }>;
  evidence: {
    observationRefs: Array<{
      observationReferenceId: string;
      role: AnchorConstructorEvidenceObservationRole;
    }>;
    opportunityRefs: Array<{
      opportunityManifestationId: LatentOpportunityManifestationId;
      role: AnchorConstructorEvidenceOpportunityRole;
    }>;
    traceRefs: Array<{
      opportunityManifestationId: LatentOpportunityManifestationId;
      evidenceBlockId: string;
      observationReferenceId: string;
      supportsNodeKeys: string[];
      supportsEdgeIndexes: number[];
    }>;
  };
  safety: {
    containsInterpretation: boolean;
    containsDiagnosis: boolean;
    containsIdentityClaim: boolean;
    containsAdvice: boolean;
    userFacingReady: boolean;
  };
}

export interface ValidatedAnchorConstructorOutput extends AnchorConstructorOutput {
  inputPacket: AnchorConstructorInputPacket;
}

export type AnchorConstructorValidationResult =
  | {
      ok: true;
      value: ValidatedAnchorConstructorOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export interface AnchorRepositoryCreatePlan {
  clientAnchorKey: string;
  identity: {
    mode: "create_new";
    input: CreateAnchorIdentityInput;
  };
  manifestation: CreateAnchorManifestationInput;
  participations: CreateAnchorParticipationInput[];
}

export interface AnchorRepositoryCreateMapping {
  creates: AnchorRepositoryCreatePlan[];
}

export type AnchorConstructorLlmGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };

export type AnchorConstructorExecutionResult =
  | {
      mode: "validated";
      output: ValidatedAnchorConstructorOutput;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };
