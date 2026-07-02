import type { CreateOpeningInput } from "@/src/domain/openings/types";
import type { ValidatedOpeningV2ConstructorOutput } from "@/src/cognition/openings/opening-v2-constructor/types";

export function mapValidatedOpeningV2OutputToCreateOpeningInput(
  validated: ValidatedOpeningV2ConstructorOutput,
): CreateOpeningInput {
  return {
    userId: validated.inputPacket.generationContext.userId,
    openingType: "reflective_question",
    tone: "gentle",
    utterance: validated.question,
    visibility: "invitation_surface",
    provenance: {
      sourceObjects: [validated.reflectiveObjectId],
      sourceObservations: [],
      sourceGlossaryTerms: [],
      sourceThreads: [],
      sourceResponses: [],
      latentSnapshotReference: null,
      confidenceBand: "moderate",
      openingGenerationContext: validated.sourceRuntime,
      openingContext: {
        context: validated.context,
        sourceOpportunityManifestationId: validated.sourceOpportunityManifestationId,
        openingKind: validated.openingKind,
        sourceRuntime: validated.sourceRuntime,
      },
      sourceOpportunityManifestationId: validated.sourceOpportunityManifestationId,
    },
  };
}
