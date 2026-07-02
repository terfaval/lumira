import { describe, expect, it, vi } from "vitest";

import {
  generateAnchorsForReflectiveObject,
  type GenerateAnchorsForReflectiveObjectRepositories,
} from "@/src/runtime/orchestration/generate-anchors-for-reflective-object";
import type {
  AnchorConstructorInputPacket,
  AnchorConstructorOutput,
} from "@/src/cognition/anchor-v1/constructor";
import type { AnchorRepository } from "@/src/domain/anchor-v1/contracts";
import type { AnchorIdentity, AnchorManifestation, AnchorParticipation } from "@/src/domain/anchor-v1/types";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";

function createPacket(): AnchorConstructorInputPacket {
  return {
    reflectiveObject: {
      id: "reflective-object-1",
      userId: "user-1",
      title: "Dream about searching and being guided",
      content: "I searched through a house for a phone while my father guided me toward the stairwell.",
    },
    observationSet: {
      observationBundleId: "bundle-1",
      runtimeVersion: "observation_v2",
      objectLanguage: "en",
      scenes: [
        {
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          position: 1,
          summary: "Searching through the house with the father present.",
          evidenceSnippet: "searched through a house for a phone while my father guided me",
          boundarySignals: [
            {
              kind: "goal_change",
              note: "Searching becomes guided movement.",
            },
          ],
          derivedStructures: {
            actors: ["father", "dreamer"],
            locations: ["house", "stairwell"],
            objects: ["phone"],
            interactions: ["searching", "guiding"],
            affect: [],
            agency: [],
            metacognition: [],
            phenomenology: [],
          },
        },
      ],
      observations: [
        {
          observationV2SceneObservationId: "bundle-1:scene-a:obs-1",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-1",
          position: 1,
          text: "The dreamer searches for a phone in the house.",
          evidence: [
            {
              snippet: "searched through a house for a phone",
              spanStart: 2,
              spanEnd: 38,
            },
          ],
          uncertaintyNote: null,
        },
        {
          observationV2SceneObservationId: "bundle-1:scene-a:obs-2",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-2",
          position: 2,
          text: "The father guides the movement toward the stairwell.",
          evidence: [
            {
              snippet: "my father guided me toward the stairwell",
              spanStart: 45,
              spanEnd: 84,
            },
          ],
          uncertaintyNote: null,
        },
      ],
    },
    opportunitySet: {
      opportunities: [
        {
          opportunityIdentityId: "opportunity-identity-1",
          opportunityManifestationId: "opportunity-manifestation-1",
          primaryCategory: "transition",
          secondaryCategories: ["relationship"],
          structure: {
            kind: "A_TO_B",
            label: "search -> guided movement",
            elements: ["search", "guided movement"],
            metadata: {},
          },
          summary: "Searching shifts into guided movement toward an unknown place.",
          salience: {
            credibilityScore: 0.84,
            reflectivePotentialScore: 0.76,
            salienceBand: "high",
          },
          evidenceBlocks: [
            {
              evidenceBlockId: "evidence-block-1",
              reflectiveObjectId: "reflective-object-1",
              role: "priority",
              summary: "The search and guidance are both present in the same scene.",
              position: 0,
            },
          ],
        },
      ],
    },
    opportunityEvidenceTrace: {
      entries: [
        {
          opportunityManifestationId: "opportunity-manifestation-1",
          opportunityIdentityId: "opportunity-identity-1",
          evidenceBlockId: "evidence-block-1",
          evidenceBlockRole: "priority",
          observationV2SceneObservationId: "bundle-1:scene-a:obs-2",
          sceneId: "scene-a",
          observationRole: "primary_support",
          supportsNodeKeys: ["B"],
          supportsEdgeIndexes: [0],
        },
      ],
    },
    glossaryContext: {
      confirmedTerms: [
        {
          glossaryTermId: "term-1",
          displayLabel: "search motif",
          normalizedKey: "search_motif",
          termType: "motif",
          userNotes: null,
          appearanceCount: 3,
          recentAppearanceObjectIds: ["reflective-object-0", "reflective-object-1"],
        },
      ],
      candidates: [
        {
          glossaryCandidateId: "candidate-1",
          displayLabel: "father",
          normalizedKey: "father",
          sourceCategory: "actor",
          candidateClass: "possible_match",
          state: "candidate",
          sourceObservationStableId: "obs-2",
        },
      ],
    },
  };
}

function createValidOutput(packet: AnchorConstructorInputPacket): AnchorConstructorOutput {
  return {
    generationContext: {
      runtimeVersion: "anchor_constructor_v1",
      priorityReflectiveObjectId: packet.reflectiveObject.id,
    },
    decision: {
      mode: "anchors_found",
      silenceReason: null,
    },
    anchors: [
      {
        clientAnchorKey: "anchor-entity-1",
        identityDecision: {
          mode: "create_new",
          existingAnchorId: null,
          reuseConfidence: null,
          reuseRationale: null,
        },
        anchorIdentity: {
          anchorType: "ENTITY",
          identityLabel: "Father",
          normalizationRationale: "Observed person recurring as the same continuity candidate.",
        },
        anchorManifestation: {
          manifestationLabel: "Father guiding through the house",
          sourceType: "DREAM_DERIVED",
          reflectiveObjectId: packet.reflectiveObject.id,
        },
        participations: [
          {
            opportunityManifestationId: "opportunity-manifestation-1",
            participationRole: "EVIDENCE",
            confidence: "HIGH",
            source: "LLM_CONSTRUCTED",
          },
        ],
        evidence: {
          observationRefs: [
            {
              observationV2SceneObservationId: "bundle-1:scene-a:obs-2",
              role: "primary_support",
            },
          ],
          opportunityRefs: [
            {
              opportunityManifestationId: "opportunity-manifestation-1",
              role: "supporting_opportunity",
            },
          ],
          traceRefs: [
            {
              opportunityManifestationId: "opportunity-manifestation-1",
              evidenceBlockId: "evidence-block-1",
              observationV2SceneObservationId: "bundle-1:scene-a:obs-2",
              supportsNodeKeys: ["B"],
              supportsEdgeIndexes: [0],
            },
          ],
        },
        safety: {
          containsInterpretation: false,
          containsDiagnosis: false,
          containsIdentityClaim: false,
          containsAdvice: false,
          userFacingReady: false,
        },
      },
    ],
  };
}

function createPersistedIdentity(id: string): AnchorIdentity {
  return {
    id,
    userId: "user-1",
    anchorType: "ENTITY",
    identityLabel: "Father",
    createdAt: "2026-06-17T12:00:00.000Z",
    updatedAt: "2026-06-17T12:00:00.000Z",
  };
}

function createPersistedManifestation(id: string, anchorId: string): AnchorManifestation {
  return {
    id,
    anchorId,
    userId: "user-1",
    reflectiveObjectId: "reflective-object-1",
    manifestationLabel: "Father guiding through the house",
    sourceType: "DREAM_DERIVED",
    createdAt: "2026-06-17T12:00:00.000Z",
    updatedAt: "2026-06-17T12:00:00.000Z",
  };
}

function createPersistedParticipation(id: string, anchorId: string, anchorManifestationId: string): AnchorParticipation {
  return {
    id,
    userId: "user-1",
    anchorId,
    anchorManifestationId,
    opportunityId: "opportunity-identity-1",
    opportunityManifestationId: "opportunity-manifestation-1",
    participationRole: "EVIDENCE",
    confidence: "HIGH",
    source: "LLM_CONSTRUCTED",
    createdAt: "2026-06-17T12:00:00.000Z",
    updatedAt: "2026-06-17T12:00:00.000Z",
  };
}

function createRepositories(): GenerateAnchorsForReflectiveObjectRepositories {
  const reflectiveObjectRepository: ReflectiveObjectRepository = {
    create: vi.fn(),
    getById: vi.fn(),
    listByUser: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  const observationV2Repository: ObservationV2Repository = {
    create: vi.fn(),
    getByBundleId: vi.fn(),
    getByReflectiveObjectId: vi.fn(),
  };

  const glossaryRepository: GlossaryRepository = {
    listTerms: vi.fn(),
    listTermsByReflectiveObject: vi.fn(),
    getTermById: vi.fn(),
    listAppearanceRecordsByTerm: vi.fn(),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
    renameTerm: vi.fn(),
    listCandidates: vi.fn(),
    listCandidatesByReflectiveObject: vi.fn(),
    getCandidateById: vi.fn(),
    upsertCandidates: vi.fn(),
    setCandidateLifecycle: vi.fn(),
    resolveCandidate: vi.fn(),
    createAssociation: vi.fn(),
    createAppearanceRecord: vi.fn(),
  };

  const latentOpportunityRepository: LatentOpportunityRepository = {
    createIdentity: vi.fn(),
    createManifestation: vi.fn(),
    deleteIdentity: vi.fn(),
    deleteManifestation: vi.fn(),
    getManifestationById: vi.fn(),
    listManifestationsByPriorityReflectiveObject: vi.fn(),
    listManifestationsByIdentity: vi.fn(),
    listRecentManifestationsByUser: vi.fn(),
  };

  const anchorRepository: AnchorRepository = {
    createIdentity: vi.fn(),
    deleteIdentity: vi.fn(),
    getIdentityById: vi.fn(),
    createManifestation: vi.fn(),
    getManifestationById: vi.fn(),
    createParticipation: vi.fn(),
    getParticipationById: vi.fn(),
  } as AnchorRepository & { deleteIdentity: ReturnType<typeof vi.fn> };

  return {
    reflectiveObjectRepository,
    observationV2Repository,
    glossaryRepository,
    latentOpportunityRepository,
    anchorRepository: anchorRepository as GenerateAnchorsForReflectiveObjectRepositories["anchorRepository"],
  };
}

describe("generateAnchorsForReflectiveObject", () => {
  it("composes the packet, calls the constructor, persists identity/manifestation/participation, and reports counts", async () => {
    const packet = createPacket();
    const output = createValidOutput(packet);
    const repositories = createRepositories();
    const anchorRepository = repositories.anchorRepository as AnchorRepository & {
      createIdentity: ReturnType<typeof vi.fn>;
      createManifestation: ReturnType<typeof vi.fn>;
      createParticipation: ReturnType<typeof vi.fn>;
    };

    anchorRepository.createIdentity.mockResolvedValueOnce(createPersistedIdentity("anchor-id-1"));
    anchorRepository.createManifestation.mockResolvedValueOnce(
      createPersistedManifestation("anchor-manifestation-id-1", "anchor-id-1"),
    );
    anchorRepository.createParticipation.mockResolvedValueOnce(
      createPersistedParticipation("anchor-participation-id-1", "anchor-id-1", "anchor-manifestation-id-1"),
    );

    const composeInputPacket = vi.fn().mockResolvedValue(packet);
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify(output),
    });

    const result = await generateAnchorsForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      repositories,
      composeInputPacket,
      generateOutput,
    });

    expect(composeInputPacket).toHaveBeenCalledWith({
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      reflectiveObjectRepository: repositories.reflectiveObjectRepository,
      observationV2Repository: repositories.observationV2Repository,
      glossaryRepository: repositories.glossaryRepository,
      latentOpportunityRepository: repositories.latentOpportunityRepository,
    });
    expect(generateOutput).toHaveBeenCalledWith({ packet });
    expect(anchorRepository.createIdentity).toHaveBeenCalledTimes(1);
    expect(anchorRepository.createManifestation).toHaveBeenCalledTimes(1);
    expect(anchorRepository.createParticipation).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      mode: "persisted",
      success: true,
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "anchors_found",
          silenceReason: null,
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "anchors_found",
          silenceReason: null,
        },
      }),
      mappedPayload: expect.objectContaining({
        creates: [expect.objectContaining({ clientAnchorKey: "anchor-entity-1" })],
      }),
      persistedIdentities: [createPersistedIdentity("anchor-id-1")],
      persistedManifestations: [createPersistedManifestation("anchor-manifestation-id-1", "anchor-id-1")],
      persistedParticipations: [
        createPersistedParticipation("anchor-participation-id-1", "anchor-id-1", "anchor-manifestation-id-1"),
      ],
      identitiesCreated: 1,
      manifestationsCreated: 1,
      participationsCreated: 1,
      anchorIds: ["anchor-id-1"],
    });
  });

  it("returns success with zero writes when the constructor returns no_anchor", async () => {
    const packet = createPacket();
    const repositories = createRepositories();
    const anchorRepository = repositories.anchorRepository as AnchorRepository & {
      createIdentity: ReturnType<typeof vi.fn>;
      createManifestation: ReturnType<typeof vi.fn>;
      createParticipation: ReturnType<typeof vi.fn>;
    };

    const result = await generateAnchorsForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify({
          generationContext: {
            runtimeVersion: "anchor_constructor_v1",
            priorityReflectiveObjectId: packet.reflectiveObject.id,
          },
          decision: {
            mode: "no_anchor",
            silenceReason: "No sufficiently grounded continuity candidate was found.",
          },
          anchors: [],
        }),
      }),
    });

    expect(result).toEqual({
      mode: "no_anchor",
      success: true,
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "no_anchor",
          silenceReason: "No sufficiently grounded continuity candidate was found.",
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "no_anchor",
          silenceReason: "No sufficiently grounded continuity candidate was found.",
        },
      }),
      identitiesCreated: 0,
      manifestationsCreated: 0,
      participationsCreated: 0,
      anchorIds: [],
    });
    expect(anchorRepository.createIdentity).not.toHaveBeenCalled();
    expect(anchorRepository.createManifestation).not.toHaveBeenCalled();
    expect(anchorRepository.createParticipation).not.toHaveBeenCalled();
  });

  it("returns validation failure without persisting", async () => {
    const packet = createPacket();
    const output = createValidOutput(packet);
    output.anchors[0].anchorIdentity.normalizationRationale = "This means the user is learning who they truly are.";

    const repositories = createRepositories();
    const anchorRepository = repositories.anchorRepository as AnchorRepository & {
      createIdentity: ReturnType<typeof vi.fn>;
      createManifestation: ReturnType<typeof vi.fn>;
      createParticipation: ReturnType<typeof vi.fn>;
    };

    const result = await generateAnchorsForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      success: false,
      stage: "validation",
      reason: "prohibited_interpretive_language",
      details: expect.objectContaining({
        clientAnchorKey: "anchor-entity-1",
      }),
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "anchors_found",
          silenceReason: null,
        },
      }),
    });
    expect(anchorRepository.createIdentity).not.toHaveBeenCalled();
    expect(anchorRepository.createManifestation).not.toHaveBeenCalled();
    expect(anchorRepository.createParticipation).not.toHaveBeenCalled();
  });

  it("returns persistence failure and cleans up created identities", async () => {
    const packet = createPacket();
    const output = createValidOutput(packet);
    output.anchors.push({
      ...output.anchors[0],
      clientAnchorKey: "anchor-role-1",
      anchorIdentity: {
        anchorType: "ROLE",
        identityLabel: "Guide",
        normalizationRationale: "Observed function rather than identity.",
      },
      anchorManifestation: {
        manifestationLabel: "Father acting as Guide",
        sourceType: "REFLECTIVE_OBJECT_DERIVED",
        reflectiveObjectId: packet.reflectiveObject.id,
      },
    });

    const repositories = createRepositories();
    const anchorRepository = repositories.anchorRepository as AnchorRepository & {
      createIdentity: ReturnType<typeof vi.fn>;
      createManifestation: ReturnType<typeof vi.fn>;
      createParticipation: ReturnType<typeof vi.fn>;
      deleteIdentity: ReturnType<typeof vi.fn>;
    };

    anchorRepository.createIdentity
      .mockResolvedValueOnce(createPersistedIdentity("anchor-id-1"))
      .mockResolvedValueOnce({
        ...createPersistedIdentity("anchor-id-2"),
        anchorType: "ROLE",
        identityLabel: "Guide",
      });
    anchorRepository.createManifestation
      .mockResolvedValueOnce(createPersistedManifestation("anchor-manifestation-id-1", "anchor-id-1"))
      .mockResolvedValueOnce({
        ...createPersistedManifestation("anchor-manifestation-id-2", "anchor-id-2"),
        manifestationLabel: "Father acting as Guide",
        sourceType: "REFLECTIVE_OBJECT_DERIVED",
      });
    anchorRepository.createParticipation
      .mockResolvedValueOnce(createPersistedParticipation("anchor-participation-id-1", "anchor-id-1", "anchor-manifestation-id-1"))
      .mockRejectedValueOnce(new Error("participation_write_failed"));

    const result = await generateAnchorsForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "reflective-object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      success: false,
      stage: "persistence",
      reason: "participation_write_failed",
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "anchors_found",
          silenceReason: null,
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "anchors_found",
          silenceReason: null,
        },
      }),
      mappedPayload: expect.objectContaining({
        creates: [
          expect.objectContaining({ clientAnchorKey: "anchor-entity-1" }),
          expect.objectContaining({ clientAnchorKey: "anchor-role-1" }),
        ],
      }),
      cleanup: {
        attempted: true,
        completed: true,
        resourceCount: 2,
      },
    });
    expect(anchorRepository.deleteIdentity).toHaveBeenCalledWith("anchor-id-2", "user-1");
    expect(anchorRepository.deleteIdentity).toHaveBeenCalledWith("anchor-id-1", "user-1");
  });
});
