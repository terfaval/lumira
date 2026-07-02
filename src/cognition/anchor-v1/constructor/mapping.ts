import type {
  AnchorRepositoryCreateMapping,
  ValidatedAnchorConstructorOutput,
} from "@/src/cognition/anchor-v1/constructor/types";

function buildOpportunityIdentityByManifestationMap(validated: ValidatedAnchorConstructorOutput): Map<string, string> {
  return new Map(
    validated.inputPacket.opportunitySet.opportunities.map((opportunity) => [
      opportunity.opportunityManifestationId,
      opportunity.opportunityIdentityId,
    ]),
  );
}

export function mapValidatedAnchorConstructorOutputToRepositoryInputs(
  validated: ValidatedAnchorConstructorOutput,
): AnchorRepositoryCreateMapping {
  const opportunityIdentityByManifestation = buildOpportunityIdentityByManifestationMap(validated);

  return {
    creates: validated.anchors.map((anchor) => {
      const anchorId = crypto.randomUUID();
      const anchorManifestationId = crypto.randomUUID();

      return {
        clientAnchorKey: anchor.clientAnchorKey,
        identity: {
          mode: "create_new" as const,
          input: {
            id: anchorId,
            userId: validated.inputPacket.reflectiveObject.userId,
            anchorType: anchor.anchorIdentity.anchorType,
            identityLabel: anchor.anchorIdentity.identityLabel,
          },
        },
        manifestation: {
          id: anchorManifestationId,
          anchorId,
          userId: validated.inputPacket.reflectiveObject.userId,
          reflectiveObjectId: validated.inputPacket.reflectiveObject.id,
          manifestationLabel: anchor.anchorManifestation.manifestationLabel,
          sourceType: anchor.anchorManifestation.sourceType,
        },
        participations: anchor.participations.map((participation) => {
          const opportunityId = opportunityIdentityByManifestation.get(participation.opportunityManifestationId);
          if (!opportunityId) {
            throw new Error(`Missing opportunity identity for manifestation ${participation.opportunityManifestationId}.`);
          }

          return {
            id: crypto.randomUUID(),
            userId: validated.inputPacket.reflectiveObject.userId,
            anchorId,
            anchorManifestationId,
            opportunityId,
            opportunityManifestationId: participation.opportunityManifestationId,
            participationRole: participation.participationRole,
            confidence: participation.confidence,
            source: participation.source,
          };
        }),
      };
    }),
  };
}
