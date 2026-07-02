import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOpportunity,
  OpportunityDecisionMode,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import type { ReflectiveObjectId } from "@/src/shared/types";

export const EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION =
  "latent_experimental_opportunity_constructor_v1";

export type ExperimentalOpportunitySourceKind =
  | "discovery_candidate"
  | "merged_discovery_candidates"
  | "split_discovery_candidate"
  | "constructed_from_full_evidence";

export interface ExperimentalOpportunityConstructorInputPacket {
  generationContext: {
    runtimeVersion: typeof EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION;
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  authorityBoundary: {
    discoveryRole: "mandatory_to_consider_candidate_map";
    constructionRole: "authoritative_opportunity_gate";
    discoveryIsAdditiveToFullEvidence: true;
    fullEvidenceAccessRequired: true;
    discoveryPromotionRule: "mandatory_to_consider_not_mandatory_to_promote";
    allowedConstructionBehaviors: Array<
      "reject" | "merge" | "split" | "discover_missed_structure"
    >;
  };
  fullEvidence: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
}

export interface ExperimentalOpportunityConstructorOutputPacket {
  generationContext: {
    runtimeVersion: typeof EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION;
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  consideration: {
    consideredCandidateIds: string[];
    promotedDiscoveryCandidateIds: string[];
    rejectedCandidateIds: string[];
    candidateOutcomes: Array<{
      candidateId: string;
      outcome: "promoted" | "rejected" | "merged" | "split";
      opportunityKeys: string[];
      rationale: string;
    }>;
    mergeDecisions: Array<{
      candidateIds: string[];
      opportunityKey: string;
      rationale: string;
    }>;
    splitDecisions: Array<{
      candidateId: string;
      opportunityKeys: string[];
      rationale: string;
    }>;
    missedStructure: Array<{
      opportunityKey: string;
      rationale: string;
      supportingObservationIds: string[];
    }>;
  };
  decision: {
    mode: OpportunityDecisionMode;
    silenceReason: string | null;
  };
  opportunities: ExperimentalOpportunityConstructorWrappedOpportunity[];
}

export interface ExperimentalOpportunityConstructorWrappedOpportunity {
  sourceKind: ExperimentalOpportunitySourceKind;
  relatedDiscoveryCandidateIds: string[];
  missedStructureRationale: string | null;
  opportunity: OpportunityConstructorOpportunity;
}

export interface ValidatedExperimentalOpportunityConstructorOutput
  extends ExperimentalOpportunityConstructorOutputPacket {
  inputPacket: ExperimentalOpportunityConstructorInputPacket;
}

export type ExperimentalOpportunityConstructorValidationResult =
  | {
      ok: true;
      value: ValidatedExperimentalOpportunityConstructorOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export type ExperimentalOpportunityConstructorGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };
