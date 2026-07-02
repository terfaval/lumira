import type { DiscoveryOutputPacket } from "@/src/cognition/latent-v2/discovery";
import type { OpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor";
import {
  EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION,
  type ExperimentalConstructionHandoffPacket,
} from "@/src/cognition/latent-v2/experimental-construction-handoff/types";

export function composeExperimentalConstructionHandoffPacket(input: {
  constructionPacket: OpportunityConstructorInputPacket;
  discoveryResult: DiscoveryOutputPacket;
}): ExperimentalConstructionHandoffPacket {
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
      runtimeVersion: EXPERIMENTAL_CONSTRUCTION_HANDOFF_RUNTIME_VERSION,
      priorityReflectiveObjectId:
        input.constructionPacket.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.constructionPacket.generationContext.observationBundleId,
    },
    authorityBoundary: {
      discoveryRole: "mandatory_to_consider_candidate_map",
      constructionRole: "authoritative_opportunity_gate",
      discoveryIsAdditiveToFullEvidence: true,
      fullEvidenceAccessRequired: true,
      missedStructureQualityWarning:
        "frequent_missed_structures_indicate_discovery_quality_risk",
    },
    fullEvidence: input.constructionPacket,
    discoveryResult: input.discoveryResult,
  };
}
