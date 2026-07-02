import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type {
  OpportunityConstructorInputPacket,
  OpportunityConstructorOpportunity,
  OpportunityDecisionMode,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";
import type { ReflectiveObjectId } from "@/src/shared/types";

export const EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION =
  "latent_experimental_construction_handoff_v1";

export type ExperimentalConstructionOpportunitySourceKind =
  | "discovery_candidate"
  | "merged_discovery_candidates"
  | "split_discovery_candidate"
  | "constructed_from_full_evidence";

export interface ExperimentalConstructionHandoffPacket {
  generationContext: {
    runtimeVersion: typeof EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION;
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  authorityBoundary: {
    discoveryRole: "mandatory_to_consider_candidate_map";
    constructionRole: "authoritative_opportunity_gate";
    discoveryIsAdditiveToFullEvidence: true;
    fullEvidenceAccessRequired: true;
    missedStructureQualityWarning: "frequent_missed_structures_indicate_discovery_quality_risk";
  };
  fullEvidence: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
}

export interface ExperimentalConstructionOutputPacket {
  generationContext: {
    runtimeVersion: typeof EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION;
    priorityReflectiveObjectId: ReflectiveObjectId;
    observationBundleId: string;
  };
  consideration: {
    consideredCandidateIds: string[];
    promotedDiscoveryCandidateIds: string[];
    mergeDecisions: Array<{
      candidateIds: string[];
      opportunityKey: string;
    }>;
    splitDecisions: Array<{
      candidateId: string;
      opportunityKeys: string[];
    }>;
    missedStructureOpportunityKeys: string[];
  };
  decision: {
    mode: OpportunityDecisionMode;
    silenceReason: string | null;
  };
  opportunities: ExperimentalConstructionWrappedOpportunity[];
}

export interface ExperimentalConstructionWrappedOpportunity {
  sourceKind: ExperimentalConstructionOpportunitySourceKind;
  relatedDiscoveryCandidateIds: string[];
  missedStructureRationale: string | null;
  opportunity: OpportunityConstructorOpportunity;
}

export interface ValidatedExperimentalConstructionOutput
  extends ExperimentalConstructionOutputPacket {
  inputPacket: ExperimentalConstructionHandoffPacket;
}

export type ExperimentalConstructionValidationResult =
  | {
      ok: true;
      value: ValidatedExperimentalConstructionOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export type ExperimentalConstructionGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };
