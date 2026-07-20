import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();
let mockOpenAiApiKey: string | null = "sk-test";

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: responsesCreateMock,
    };
  },
}));

vi.mock("@/src/infrastructure/environment/env", () => ({
  readRuntimeEnvironment: () => ({
    nodeEnv: "test",
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    openAiApiKey: mockOpenAiApiKey,
  }),
}));

import {
  generateExperimentalOpportunityConstructorOutput,
  type ExperimentalOpportunityConstructorInputPacket,
} from "@/src/cognition/latent-v2/experimental-opportunity-constructor";

function createExperimentalPacket(): ExperimentalOpportunityConstructorInputPacket {
  return {
    generationContext: {
      runtimeVersion: "latent_experimental_opportunity_constructor_v1",
      priorityReflectiveObjectId: "object-1",
      observationBundleId: "bundle-1",
    },
    authorityBoundary: {
      discoveryRole: "mandatory_to_consider_candidate_map",
      constructionRole: "authoritative_opportunity_gate",
      discoveryIsAdditiveToFullEvidence: true,
      fullEvidenceAccessRequired: true,
      discoveryPromotionRule: "mandatory_to_consider_not_mandatory_to_promote",
      allowedConstructionBehaviors: ["reject", "merge", "split", "discover_missed_structure"],
    },
    fullEvidence: {
      generationContext: {
        runtimeVersion: "latent_opportunity_constructor_v1",
        userId: "user-1",
        priorityReflectiveObjectId: "object-1",
        priorityReflectiveObjectType: "dream",
        priorityReflectiveObjectTitle: "Test dream",
        objectLanguage: "en",
        observationBundleId: "bundle-1",
        observationRuntimeVersion: "observation_v2_phase1",
        semanticPolicyResult: "accept",
        bundleUncertaintyNotes: [],
      },
      priorityObject: {
        content: "A test dream.",
      },
      scenes: [],
      observations: [],
      glossaryContext: {
        confirmedTerms: [
          {
            glossaryTermId: "term-1",
            displayLabel: "Known term",
            normalizedKey: "known_term",
            termType: "concept",
            userNotes: null,
            appearanceCount: 1,
            recentAppearanceObjectIds: ["object-1"],
          },
        ],
        appearanceRecords: [],
        candidates: [
          {
            glossaryCandidateId: "candidate-1",
            displayLabel: "Possible candidate",
            normalizedKey: "possible_candidate",
            sourceCategory: "concept",
            candidateClass: "new_candidate",
            state: "candidate",
            sourceObservationStableId: null,
          },
        ],
      },
      existingOpportunityContext: {
        identities: [],
      },
      reflectionContext: {
        reflections: [],
      },
    },
    discoveryResult: {
      generationContext: {
        runtimeVersion: "latent_discovery_v1",
        priorityReflectiveObjectId: "object-1",
        observationBundleId: "bundle-1",
      },
      candidateStructures: [],
    },
  };
}

describe("generateExperimentalOpportunityConstructorOutput", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
    mockOpenAiApiKey = "sk-test";
  });

  it("sends a strict response schema whose observation refs require sceneRowId and sceneStableId", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        generationContext: {
          runtimeVersion: "latent_experimental_opportunity_constructor_v1",
          priorityReflectiveObjectId: "object-1",
          observationBundleId: "bundle-1",
        },
        consideration: {
          consideredCandidateIds: [],
          promotedDiscoveryCandidateIds: [],
          rejectedCandidateIds: [],
          candidateOutcomes: [],
          mergeDecisions: [],
          splitDecisions: [],
          missedStructure: [],
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "none",
        },
        opportunities: [],
      }),
    });

    await generateExperimentalOpportunityConstructorOutput({
      packet: createExperimentalPacket(),
    });

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    const observationRefSchema =
      requestBody?.text?.format?.schema?.properties?.opportunities?.items?.properties?.opportunity?.properties?.evidenceBlocks?.items?.properties?.observationRefs?.items;

    expect(observationRefSchema.required).toEqual(
      expect.arrayContaining([
        "observationV2SceneObservationId",
        "sceneRowId",
        "sceneStableId",
        "observationStableId",
        "role",
        "supportsNodeKeys",
        "supportsEdgeIndexes",
      ]),
    );

    const confirmedGlossaryRefSchema =
      requestBody?.text?.format?.schema?.properties?.opportunities?.items?.properties?.opportunity?.properties?.evidenceBlocks?.items?.properties?.confirmedGlossaryRefs?.items;
    const candidateGlossaryMentionSchema =
      requestBody?.text?.format?.schema?.properties?.opportunities?.items?.properties?.opportunity?.properties?.evidenceBlocks?.items?.properties?.candidateGlossaryMentions?.items;

    expect(confirmedGlossaryRefSchema).toEqual(
      expect.objectContaining({
        type: "object",
        additionalProperties: false,
        required: ["glossaryTermId", "relationshipRole", "note"],
      }),
    );
    expect(candidateGlossaryMentionSchema).toEqual(
      expect.objectContaining({
        type: "object",
        additionalProperties: false,
        required: ["glossaryCandidateId", "note"],
      }),
    );
    expect(confirmedGlossaryRefSchema.properties.glossaryTermId.enum).toEqual(["term-1"]);
    expect(candidateGlossaryMentionSchema.properties.glossaryCandidateId.enum).toEqual(["candidate-1"]);
  });
});
