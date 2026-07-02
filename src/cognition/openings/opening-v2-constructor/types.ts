import type { CreateOpeningInput } from "@/src/domain/openings/types";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";

export interface OpeningV2ConstructorInputPacket {
  generationContext: {
    runtimeVersion: "opening_v2_constructor_mvp";
    objectLanguage: string;
    userId: string;
    reflectiveObjectId: string;
    sourceOpportunityManifestationId: string;
  };
  opportunity: {
    manifestationId: string;
    summary: string;
    primaryCategory: string;
    secondaryCategories: string[];
    structure: {
      kind: string;
      label: string;
      elements: string[];
      metadata?: Record<string, unknown>;
    };
    evidenceBlocks: Array<{
      reflectiveObjectId: string;
      role: string;
      summary: string | null;
      observations: Array<{
        observationV2SceneObservationId: string;
        sceneId: string | null;
        role: string;
        supportsNodeKeys: string[];
        supportsEdgeIndexes: number[];
      }>;
    }>;
    salienceBand: string;
    credibilityScore: number;
    reflectivePotentialScore: number;
  };
}

export interface OpeningV2ConstructorOutputPacket {
  question: string;
  context: string;
  sourceOpportunityManifestationId: string;
  reflectiveObjectId: string;
  openingKind: "question";
  sourceRuntime: "opening_v2_constructor_mvp";
}

export interface ValidatedOpeningV2ConstructorOutput extends OpeningV2ConstructorOutputPacket {
  inputPacket: OpeningV2ConstructorInputPacket;
}

export type OpeningV2ConstructorValidationResult =
  | {
      ok: true;
      value: ValidatedOpeningV2ConstructorOutput;
    }
  | {
      ok: false;
      reason: string;
      details?: Record<string, unknown>;
    };

export interface OpeningV2CreateMapping {
  opening: CreateOpeningInput;
}

export interface ComposeOpeningV2InputPacketInput {
  manifestation: LatentOpportunityManifestation;
  objectLanguage?: string;
}
