import type {
  CreateLatentOpportunityEvidenceBlockInput,
  CreateLatentOpportunityGlossaryLinkInput,
} from "@/src/domain/latent-v2/types";
import type {
  OpportunityRepositoryCreateMapping,
  OpportunityRepositoryCreatePlan,
  ValidatedOpportunityConstructorOutput,
} from "@/src/cognition/latent-v2/opportunity-constructor/types";

function buildIdentityTitle(opportunity: ValidatedOpportunityConstructorOutput["opportunities"][number]): string {
  const nodeLabels = opportunity.opportunityStructure.nodes.map((node) => node.label.trim()).filter(Boolean);
  if (nodeLabels.length >= 2) {
    return nodeLabels.slice(0, 3).join(" -> ");
  }

  return opportunity.manifestation.summaryForInternalUse.slice(0, 120);
}

function buildManifestationStructure(
  opportunity: ValidatedOpportunityConstructorOutput["opportunities"][number],
): OpportunityRepositoryCreatePlan["manifestation"]["structure"] {
  return {
    kind: opportunity.opportunityStructure.structureType,
    label: buildIdentityTitle(opportunity),
    elements: opportunity.opportunityStructure.nodes.map((node) => node.label),
    metadata: {
      nodes: opportunity.opportunityStructure.nodes,
      edges: opportunity.opportunityStructure.edges,
      tensions: opportunity.opportunityStructure.tensions,
      gaps: opportunity.opportunityStructure.gaps,
      continuitySignals: opportunity.opportunityStructure.continuitySignals,
    },
  };
}

function buildEvidenceBlocks(
  opportunity: ValidatedOpportunityConstructorOutput["opportunities"][number],
  validated: ValidatedOpportunityConstructorOutput,
): CreateLatentOpportunityEvidenceBlockInput[] {
  const observationsById = new Map(
    validated.inputPacket.observations.map((observation) => [observation.observationV2SceneObservationId, observation] as const),
  );

  return opportunity.evidenceBlocks.map((block, index) => ({
    reflectiveObjectId: block.reflectiveObjectId,
    role: block.role,
    summary: block.summary,
    position: index,
    observations: block.observationRefs.map((observationRef) => {
      const canonicalObservation = observationsById.get(observationRef.observationV2SceneObservationId);
      if (!canonicalObservation) {
        throw new Error(`Missing canonical observation for ${observationRef.observationV2SceneObservationId}.`);
      }

      return {
        observationV2SceneObservationId: observationRef.observationV2SceneObservationId,
        sceneId: canonicalObservation.sceneRowId,
        role: observationRef.role,
        supportsNodeKeys: [...observationRef.supportsNodeKeys],
        supportsEdgeIndexes: [...observationRef.supportsEdgeIndexes],
      };
    }),
  }));
}

function buildGlossaryLinks(
  opportunity: ValidatedOpportunityConstructorOutput["opportunities"][number],
): CreateLatentOpportunityGlossaryLinkInput[] {
  const deduped = new Map<string, CreateLatentOpportunityGlossaryLinkInput>();
  for (const glossaryRef of opportunity.evidenceBlocks.flatMap((block) => block.confirmedGlossaryRefs)) {
    const key = `${glossaryRef.glossaryTermId}:${glossaryRef.relationshipRole}`;
    if (!deduped.has(key)) {
      deduped.set(key, {
        glossaryTermId: glossaryRef.glossaryTermId,
        role: glossaryRef.relationshipRole,
      });
    }
  }

  return Array.from(deduped.values());
}

export function mapValidatedOpportunityConstructorOutputToRepositoryInputs(
  validated: ValidatedOpportunityConstructorOutput,
): OpportunityRepositoryCreateMapping {
  return {
    creates: validated.opportunities.map((opportunity) => {
      const identityId =
        opportunity.identityDecision.mode === "reuse_existing"
          ? opportunity.identityDecision.existingIdentityId!
          : crypto.randomUUID();

      const manifestation = {
        identityId,
        userId: validated.inputPacket.generationContext.userId,
        priorityReflectiveObjectId: validated.inputPacket.generationContext.priorityReflectiveObjectId,
        summary: opportunity.manifestation.summaryForInternalUse,
        structure: buildManifestationStructure(opportunity),
        primaryCategory: opportunity.opportunityStructure.primaryCategory,
        secondaryCategories: opportunity.opportunityStructure.secondaryCategories,
        credibilityScore: opportunity.manifestation.salience.credibility,
        reflectivePotentialScore: opportunity.manifestation.salience.reflectivePotential,
        salienceBand: opportunity.manifestation.salience.salienceBand,
        salienceRationale: {
          credibilityRationale: opportunity.manifestation.salience.credibilityRationale,
          reflectivePotentialRationale: opportunity.manifestation.salience.reflectivePotentialRationale,
        },
        constructionMetadata: {
          runtimeVersion: validated.generationContext.runtimeVersion,
          clientOpportunityKey: opportunity.clientOpportunityKey,
          priorityReflectiveObjectRole: opportunity.manifestation.priorityReflectiveObjectRole,
          identityDecision: opportunity.identityDecision,
        },
        glossaryLinks: buildGlossaryLinks(opportunity),
        evidenceBlocks: buildEvidenceBlocks(opportunity, validated),
      };

      if (opportunity.identityDecision.mode === "reuse_existing") {
        return {
          clientOpportunityKey: opportunity.clientOpportunityKey,
          identity: {
            mode: "reuse_existing",
            identityId,
          },
          manifestation,
        };
      }

      return {
        clientOpportunityKey: opportunity.clientOpportunityKey,
        identity: {
          mode: "create_new",
          input: {
            id: identityId,
            userId: validated.inputPacket.generationContext.userId,
            title: buildIdentityTitle(opportunity),
            primaryCategory: opportunity.opportunityStructure.primaryCategory,
            secondaryCategories: opportunity.opportunityStructure.secondaryCategories,
            lifecycleState: "emerging",
            status: "active",
          },
        },
        manifestation,
      };
    }),
  };
}
