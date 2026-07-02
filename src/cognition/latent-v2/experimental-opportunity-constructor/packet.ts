import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type { OpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor";
import {
  EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
  type ExperimentalOpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor/types";

export function composeExperimentalOpportunityConstructorInput(input: {
  constructionPacket: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
}): ExperimentalOpportunityConstructorInputPacket {
  if (
    input.discoveryResult.generationContext.priorityReflectiveObjectId !==
    input.constructionPacket.generationContext.priorityReflectiveObjectId
  ) {
    throw new Error("discovery_result_priority_object_mismatch");
  }

  if (
    input.discoveryResult.generationContext.observationBundleId !==
    input.constructionPacket.generationContext.observationBundleId
  ) {
    throw new Error("discovery_result_bundle_mismatch");
  }

  return {
    generationContext: {
      runtimeVersion: EXPERIMENTAL_OPPORTUNITY_CONSTRUCTOR_RUNTIME_VERSION,
      priorityReflectiveObjectId:
        input.constructionPacket.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.constructionPacket.generationContext.observationBundleId,
    },
    authorityBoundary: {
      discoveryRole: "mandatory_to_consider_candidate_map",
      constructionRole: "authoritative_opportunity_gate",
      discoveryIsAdditiveToFullEvidence: true,
      fullEvidenceAccessRequired: true,
      discoveryPromotionRule: "mandatory_to_consider_not_mandatory_to_promote",
      allowedConstructionBehaviors: [
        "reject",
        "merge",
        "split",
        "discover_missed_structure",
      ],
    },
    fullEvidence: input.constructionPacket,
    discoveryResult: input.discoveryResult,
  };
}
