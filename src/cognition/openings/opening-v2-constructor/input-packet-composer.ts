import type { ComposeOpeningV2InputPacketInput, OpeningV2ConstructorInputPacket } from "@/src/cognition/openings/opening-v2-constructor/types";

export function composeOpeningV2InputPacket(input: ComposeOpeningV2InputPacketInput): OpeningV2ConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "opening_v2_constructor_mvp",
      objectLanguage: input.objectLanguage ?? "unknown",
      userId: input.manifestation.userId,
      reflectiveObjectId: input.manifestation.priorityReflectiveObjectId,
      sourceOpportunityManifestationId: input.manifestation.id,
    },
    opportunity: {
      manifestationId: input.manifestation.id,
      summary: input.manifestation.summary,
      primaryCategory: input.manifestation.primaryCategory,
      secondaryCategories: input.manifestation.secondaryCategories,
      structure: input.manifestation.structure,
      evidenceBlocks: input.manifestation.evidenceBlocks.map((block) => ({
        reflectiveObjectId: block.reflectiveObjectId,
        role: block.role,
        summary: block.summary,
        observations: block.observations.map((observation) => ({
          observationV2SceneObservationId: observation.observationV2SceneObservationId,
          sceneId: observation.sceneId,
          role: observation.role,
          supportsNodeKeys: observation.supportsNodeKeys,
          supportsEdgeIndexes: observation.supportsEdgeIndexes,
        })),
      })),
      salienceBand: input.manifestation.salienceBand,
      credibilityScore: input.manifestation.credibilityScore,
      reflectivePotentialScore: input.manifestation.reflectivePotentialScore,
    },
  };
}
