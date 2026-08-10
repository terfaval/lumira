import {
  CreateLatentOpportunityManifestationInput,
  LATENT_OPPORTUNITY_CATEGORIES,
} from "@/src/domain/latent-v2/types";
import type {
  LatentOpportunityCategory,
  LatentOpportunityEvidenceObservationRole,
  LatentOpportunityEvidenceRole,
  LatentOpportunityGlossaryLinkRole,
  LatentOpportunitySalienceBand,
  ObservationV3AuthorityBasis,
} from "@/src/domain/latent-v2/types";
import type {
  GlossaryCandidateId,
  GlossaryTermId,
  LatentOpportunityIdentityId,
  OpeningId,
  ReflectionId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadId,
  UserId,
} from "@/src/shared/types";

export const OPPORTUNITY_CONSTRUCTOR_V3_RUNTIME_VERSION = "latent_opportunity_constructor_v3_shadow_v1";
export const OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES = LATENT_OPPORTUNITY_CATEGORIES;
export type OpportunityConstructorV3Category = (typeof OPPORTUNITY_CONSTRUCTOR_V3_ALLOWED_CATEGORIES)[number];

export const OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES = [
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
export type OpportunityConstructorV3StructureType = (typeof OPPORTUNITY_CONSTRUCTOR_V3_STRUCTURE_TYPES)[number];

export type OpportunityConstructorV3ObservationCategory =
  | "interaction"
  | "affect"
  | "agency"
  | "metacognition"
  | "phenomenology"
  | "location"
  | "object"
  | "other";

export interface ObservationV3LatentInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  priorityReflectiveObjectTitle: string;
  objectLanguage: string;
  priorityObject: {
    content?: string;
    summary?: string;
  };
  authority: ObservationV3AuthorityBasis;
  localities: Array<{
    localityId: string;
    order: number;
    label: string | null;
    sourceStart: number | null;
    sourceEnd: number | null;
    boundaryUncertainty: string | null;
    evidenceRefs: Array<{
      evidenceId: string;
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
      contextLabel: string;
    }>;
  }>;
  descriptiveUnits: Array<{
    unitId: string;
    localityId: string | null;
    order: number;
    statement: string;
    uncertainty: string | null;
    evidenceRefs: Array<{
      evidenceId: string;
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
      contextLabel: string;
    }>;
  }>;
  uncertaintyRecords: Array<{
    canonicalUncertaintyId: string;
    subjectType: "bundle" | "locality" | "unit" | "transition" | "alternative";
    subjectId: string | null;
    uncertaintyType: string;
    note: string | null;
  }>;
  provenance: {
    provenanceId: string;
    sourceId: string;
    sourceHash: string;
    sourceLength: number;
    primaryRealizationRefs: string[];
    supplementalRealizationPackageRefs: string[];
    compositionResultRef: string;
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
  reflectionContext: {
    reflections: Array<{
      reflectionId: ReflectionId;
      threadId: ThreadId;
      sourceResponseId: ReflectiveResponseId;
      sourceOpeningId: OpeningId | null;
      sourceReflectiveObjectIds: ReflectiveObjectId[];
      statement: string;
      pattern: string[];
      admittedAt: string;
    }>;
  };
}

export interface OpportunityConstructorV3InputPacket {
  generationContext: {
    runtimeVersion: typeof OPPORTUNITY_CONSTRUCTOR_V3_RUNTIME_VERSION;
    userId: UserId;
    priorityReflectiveObjectId: ReflectiveObjectId;
    priorityReflectiveObjectType: "dream";
    priorityReflectiveObjectTitle: string;
    objectLanguage: string;
    authority: ObservationV3AuthorityBasis & {
      family: "observation_v3";
    };
  };
  priorityObject: {
    content?: string;
    summary?: string;
  };
  localities: Array<{
    localityId: string;
    position: number;
    label: string | null;
    evidenceSnippet: string | null;
    boundaryUncertainty: string | null;
    evidenceRefs: Array<{
      evidenceId: string;
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
      contextLabel: string;
    }>;
    enrichment: {
      affect: string[];
      agency: string[];
      interactions: string[];
      metacognition: string[];
      phenomenology: string[];
      continuity: string[];
    };
  }>;
  units: Array<{
    authorityId: string;
    unitId: string;
    localityId: string | null;
    position: number;
    statement: string;
    category: OpportunityConstructorV3ObservationCategory;
    uncertaintyNote: string | null;
    evidenceRefs: Array<{
      evidenceId: string;
      snippet: string;
      spanStart: number | null;
      spanEnd: number | null;
      contextLabel: string;
    }>;
    enrichmentTags: string[];
  }>;
  uncertaintyRecords: ObservationV3LatentInput["uncertaintyRecords"];
  provenance: ObservationV3LatentInput["provenance"];
  glossaryContext: ObservationV3LatentInput["glossaryContext"];
  existingOpportunityContext: ObservationV3LatentInput["existingOpportunityContext"];
  reflectionContext: ObservationV3LatentInput["reflectionContext"];
}

export interface OpportunityConstructorV3OutputPacket {
  generationContext: {
    runtimeVersion: string;
    priorityReflectiveObjectId: ReflectiveObjectId;
    authority: ObservationV3AuthorityBasis & {
      family: "observation_v3";
    };
  };
  decision: {
    mode: "opportunities_found" | "no_opportunity";
    silenceReason: string | null;
  };
  opportunities: OpportunityConstructorV3Opportunity[];
}

export interface OpportunityConstructorV3Opportunity {
  clientOpportunityKey: string;
  identityDecision: {
    mode: "create_new" | "reuse_existing";
    existingIdentityId: LatentOpportunityIdentityId | null;
    reuseConfidence: "tentative" | "moderate" | null;
    reuseRationale: string | null;
  };
  opportunityStructure: {
    primaryCategory: OpportunityConstructorV3Category;
    secondaryCategories: OpportunityConstructorV3Category[];
    structureType: OpportunityConstructorV3StructureType;
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
      kind: "confirmed_glossary_term" | "existing_opportunity" | "none";
      referenceId: string | null;
      description: string | null;
    }>;
  };
  manifestation: {
    summaryForInternalUse: string;
    priorityReflectiveObjectRole: "primary_source";
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
      authorityId: string;
      unitId: string;
      localityId?: string | null;
      evidenceId?: string | null;
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

export interface ValidatedOpportunityConstructorV3Output extends OpportunityConstructorV3OutputPacket {
  inputPacket: OpportunityConstructorV3InputPacket;
}

export type OpportunityConstructorV3ValidationResult =
  | { ok: true; value: ValidatedOpportunityConstructorV3Output }
  | { ok: false; reason: string; details?: Record<string, unknown> };

export interface OpportunityRepositoryCreatePlanV3 {
  clientOpportunityKey: string;
  identity:
    | {
        mode: "create_new";
        input: {
          id?: LatentOpportunityIdentityId;
          userId: UserId;
          title: string;
          primaryCategory: LatentOpportunityCategory;
          secondaryCategories?: LatentOpportunityCategory[];
          lifecycleState: "emerging";
          status?: "active";
        };
      }
    | {
        mode: "reuse_existing";
        identityId: LatentOpportunityIdentityId;
      };
  manifestation: Omit<CreateLatentOpportunityManifestationInput, "generationRunId">;
}

export interface OpportunityRepositoryCreateMappingV3 {
  creates: OpportunityRepositoryCreatePlanV3[];
}

export type OpportunityConstructorV3GeneratorResult =
  | { mode: "generated"; rawOutput: string }
  | { mode: "failed"; reason: string; details?: Record<string, unknown> };
