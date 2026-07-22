import { describe, expect, it, vi } from "vitest";

import {
  generateLatentOpportunitiesForReflectiveObject,
  type GenerateLatentOpportunitiesForReflectiveObjectRepositories,
} from "@/src/runtime/orchestration/generate-latent-opportunities-for-reflective-object";
import type { OpportunityConstructorInputPacket, OpportunityConstructorOutputPacket } from "@/src/cognition/latent-v2/opportunity-constructor";
import type {
  LatentAuthorityProvenance,
  LatentContextProvenance,
  LatentExecutionProvenance,
} from "@/src/cognition/latent-v2/opportunity-constructor/provenance";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

function createPacket(overrides: Partial<OpportunityConstructorInputPacket> = {}): OpportunityConstructorInputPacket {
  const base: OpportunityConstructorInputPacket = {
    generationContext: {
      runtimeVersion: "latent_opportunity_constructor_v1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: "Search dream",
      objectLanguage: "hu",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "observation_v2_phase1",
      semanticPolicyResult: "accept_with_uncertainty",
      bundleUncertaintyNotes: [],
    },
    priorityObject: {
      content: "I search through a house and then move toward a stairwell.",
      summary: "A house search turns toward a stairwell.",
    },
    scenes: [
      {
        sceneRowId: "bundle-1:scene-1",
        sceneStableId: "scene-1",
        position: 1,
        summary: "Searching through a house.",
        evidenceSnippet: "search through a house",
        boundarySignals: [
          {
            kind: "goal_change",
            note: "Movement narrows into searching.",
          },
        ],
        derivedStructures: {
          actors: ["Álmodó"],
          locations: ["ház"],
          objects: [],
          interactions: ["keresés"],
          affect: ["bizonytalanság"],
          agency: [],
          metacognition: [],
          phenomenology: [],
        },
      },
    ],
    observations: [
      {
        observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
        sceneRowId: "bundle-1:scene-1",
        sceneStableId: "scene-1",
        observationStableId: "obs-1",
        position: 1,
        text: "The dreamer searches through the house.",
        category: "other",
        evidence: [
          {
            snippet: "search through a house",
            spanStart: 2,
            spanEnd: 24,
          },
        ],
        uncertaintyNote: null,
      },
      {
        observationV2SceneObservationId: "bundle-1:scene-1:obs-2",
        sceneRowId: "bundle-1:scene-1",
        sceneStableId: "scene-1",
        observationStableId: "obs-2",
        position: 2,
        text: "Uncertainty builds during the search.",
        category: "other",
        evidence: [
          {
            snippet: "move toward a stairwell",
            spanStart: 36,
            spanEnd: 58,
          },
        ],
        uncertaintyNote: "The emotional source stays open.",
      },
    ],
    glossaryContext: {
      confirmedTerms: [
        {
          glossaryTermId: "term-1",
          displayLabel: "House Search",
          normalizedKey: "house_search",
          termType: "motif",
          userNotes: null,
          appearanceCount: 2,
          recentAppearanceObjectIds: ["object-0", "object-1"],
        },
      ],
      appearanceRecords: [
        {
          appearanceRecordId: "appearance-1",
          glossaryTermId: "term-1",
          reflectiveObjectId: "object-0",
          displayLabelAtAppearance: "House Search",
          sourceObservationId: null,
        },
      ],
      candidates: [
        {
          glossaryCandidateId: "candidate-1",
          displayLabel: "Stairwell",
          normalizedKey: "stairwell",
          sourceCategory: "location",
          candidateClass: "possible_match",
          state: "candidate",
          sourceObservationStableId: "obs-2",
        },
      ],
    },
    existingOpportunityContext: {
      identities: [],
    },
    reflectionContext: {
      reflections: [],
    },
  };

  return {
    ...base,
    ...overrides,
    generationContext: {
      ...base.generationContext,
      ...overrides.generationContext,
    },
    priorityObject: {
      ...base.priorityObject,
      ...overrides.priorityObject,
    },
    glossaryContext: {
      ...base.glossaryContext,
      ...overrides.glossaryContext,
    },
    existingOpportunityContext: {
      ...base.existingOpportunityContext,
      ...overrides.existingOpportunityContext,
    },
    reflectionContext: {
      ...base.reflectionContext,
      ...overrides.reflectionContext,
    },
  };
}

function createOutputForPacket(
  packet: OpportunityConstructorInputPacket,
  overrides: Partial<OpportunityConstructorOutputPacket> = {},
): OpportunityConstructorOutputPacket {
  const base: OpportunityConstructorOutputPacket = {
    generationContext: {
      runtimeVersion: packet.generationContext.runtimeVersion,
      priorityReflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
      observationBundleId: packet.generationContext.observationBundleId,
    },
    decision: {
      mode: "opportunities_found",
      silenceReason: null,
    },
    opportunities: [
      {
        clientOpportunityKey: "op-1",
        identityDecision: {
          mode: "create_new",
          existingIdentityId: null,
          reuseConfidence: null,
          reuseRationale: null,
        },
        opportunityStructure: {
          primaryCategory: "transition",
          secondaryCategories: ["tension"],
          structureType: "A_TO_B",
          nodes: [
            {
              key: "A",
              label: "house search",
              kind: "action_dynamic",
            },
            {
              key: "B",
              label: "uncertainty",
              kind: "affective_shift",
            },
          ],
          edges: [
            {
              from: "A",
              to: "B",
              relation: "shifts_into",
            },
          ],
          tensions: [
            {
              between: ["search", "uncertainty"],
              description: "The search carries unresolved uncertainty.",
            },
          ],
          gaps: [
            {
              description: "The search outcome remains open.",
              supportedByObservationIds: [packet.observations[1].observationV2SceneObservationId],
            },
          ],
          continuitySignals: [
            {
              kind: "confirmed_glossary_term",
              referenceId: "term-1",
              description: "Matches a confirmed recurring motif.",
            },
          ],
        },
        manifestation: {
          summaryForInternalUse: "Search movement shifts into uncertainty without fixed meaning.",
          priorityReflectiveObjectRole: "primary_source",
          salience: {
            credibility: 0.81,
            reflectivePotential: 0.78,
            salienceBand: "high",
            credibilityRationale: "Grounded in multiple priority observations.",
            reflectivePotentialRationale: "Contains unresolved movement and tension.",
          },
        },
        evidenceBlocks: [
          {
            clientBlockKey: "block-priority-1",
            reflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
            role: "priority",
            summary: "Priority evidence for the search-to-uncertainty structure.",
            observationRefs: [
              {
                observationV2SceneObservationId: packet.observations[0].observationV2SceneObservationId,
                sceneRowId: packet.observations[0].sceneRowId,
                observationStableId: packet.observations[0].observationStableId,
                role: "primary_support",
                supportsNodeKeys: ["A"],
                supportsEdgeIndexes: [0],
              },
              {
                observationV2SceneObservationId: packet.observations[1].observationV2SceneObservationId,
                sceneRowId: packet.observations[1].sceneRowId,
                observationStableId: packet.observations[1].observationStableId,
                role: "primary_support",
                supportsNodeKeys: ["B"],
                supportsEdgeIndexes: [0],
              },
            ],
            confirmedGlossaryRefs: [
              {
                glossaryTermId: "term-1",
                relationshipRole: "continuity",
                note: "Confirmed motif continuity.",
              },
            ],
            candidateGlossaryMentions: [
              {
                glossaryCandidateId: "candidate-1",
                note: "Context only.",
              },
            ],
          },
        ],
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

  return {
    ...base,
    ...overrides,
  };
}

function createAuthorityProvenance(
  packet: OpportunityConstructorInputPacket = createPacket(),
): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
      title: packet.generationContext.priorityReflectiveObjectTitle,
      objectLanguage: packet.generationContext.objectLanguage,
      content: packet.priorityObject.content ?? null,
      summary: packet.priorityObject.summary ?? null,
    },
    observation: {
      observationBundleId: packet.generationContext.observationBundleId,
      observationRuntimeVersion: packet.generationContext.observationRuntimeVersion,
      semanticPolicyResult: packet.generationContext.semanticPolicyResult,
      bundleUncertaintyNotes: packet.generationContext.bundleUncertaintyNotes,
      scenes: packet.scenes,
      observations: packet.observations,
    },
    glossary: {
      confirmedTerms: packet.glossaryContext.confirmedTerms,
      appearanceRecords: packet.glossaryContext.appearanceRecords,
    },
    reflections: packet.reflectionContext.reflections,
  };
}

function createContextProvenance(
  packet: OpportunityConstructorInputPacket = createPacket(),
): LatentContextProvenance {
  return {
    existingOpportunityContext: packet.existingOpportunityContext,
    truncationNote: null,
  };
}

function createExecutionProvenance(
  packet: OpportunityConstructorInputPacket = createPacket(),
): LatentExecutionProvenance {
  return {
    constructorRuntimeVersion: packet.generationContext.runtimeVersion,
    llm: {
      provider: "openai",
      model: "gpt-4.1-mini",
      requestTimeoutMs: 180000,
      responseFormat: {
        type: "json_schema",
        schemaName: "lumira_latent_opportunity_constructor_v1",
        strict: true,
      },
    },
  };
}

function createGapOpportunityForPacket(
  packet: OpportunityConstructorInputPacket,
): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-2",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "gap",
      secondaryCategories: ["ambiguity", "salience_signal"],
      structureType: "GAP",
      nodes: [
        {
          key: "G1",
          label: "felt attention or presence",
          kind: "attentional_presence",
        },
        {
          key: "G2",
          label: "barely visible or absent figure",
          kind: "absence_or_uncertainty",
        },
      ],
      edges: [],
      tensions: [],
      gaps: [
        {
          description: "The felt presence exceeds what becomes visibly available.",
          supportedByObservationIds: [
            packet.observations[0].observationV2SceneObservationId,
            packet.observations[1].observationV2SceneObservationId,
          ],
        },
      ],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse: "A felt presence remains structurally stronger than what is visibly present.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.72,
        reflectivePotential: 0.75,
        salienceBand: "moderate",
        credibilityRationale: "Grounded in priority-object observations.",
        reflectivePotentialRationale: "The presence-absence gap remains open without forcing explanation.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-2",
        reflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
        role: "priority",
        summary: "Priority evidence for the presence-absence gap.",
        observationRefs: [
          {
            observationV2SceneObservationId: packet.observations[0].observationV2SceneObservationId,
            sceneRowId: packet.observations[0].sceneRowId,
            observationStableId: packet.observations[0].observationStableId,
            role: "primary_support",
            supportsNodeKeys: ["G1"],
            supportsEdgeIndexes: [],
          },
          {
            observationV2SceneObservationId: packet.observations[1].observationV2SceneObservationId,
            sceneRowId: packet.observations[1].sceneRowId,
            observationStableId: packet.observations[1].observationStableId,
            role: "primary_support",
            supportsNodeKeys: ["G2"],
            supportsEdgeIndexes: [],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createRepairOpportunityForPacket(
  packet: OpportunityConstructorInputPacket,
): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-3",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "transition",
      secondaryCategories: ["relationship", "tension"],
      structureType: "A_TO_B_TO_C",
      nodes: [
        {
          key: "R1",
          label: "accidental harm or disruption",
          kind: "event_dynamic",
        },
        {
          key: "R2",
          label: "apology or repair attempt",
          kind: "repair_dynamic",
        },
        {
          key: "R3",
          label: "reassurance or calming response",
          kind: "relationship_dynamic",
        },
      ],
      edges: [
        {
          from: "R1",
          to: "R2",
          relation: "responded_to_by",
        },
        {
          from: "R2",
          to: "R3",
          relation: "opens_toward",
        },
      ],
      tensions: [
        {
          between: ["R1", "R2"],
          description: "Disruption gives way to an active repair movement.",
        },
      ],
      gaps: [],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse: "An accidental disruption moves into repair and then reassurance.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.74,
        reflectivePotential: 0.71,
        salienceBand: "moderate",
        credibilityRationale: "Supported by multiple priority observations.",
        reflectivePotentialRationale: "The repair sequence preserves tension while opening toward reassurance.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-3",
        reflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
        role: "priority",
        summary: "Priority evidence for harm, repair, and reassurance.",
        observationRefs: [
          {
            observationV2SceneObservationId: packet.observations[0].observationV2SceneObservationId,
            sceneRowId: packet.observations[0].sceneRowId,
            observationStableId: packet.observations[0].observationStableId,
            role: "primary_support",
            supportsNodeKeys: ["R1"],
            supportsEdgeIndexes: [0],
          },
          {
            observationV2SceneObservationId: packet.observations[1].observationV2SceneObservationId,
            sceneRowId: packet.observations[1].sceneRowId,
            observationStableId: packet.observations[1].observationStableId,
            role: "primary_support",
            supportsNodeKeys: ["R2", "R3"],
            supportsEdgeIndexes: [0, 1],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createPhenomenologicalSalienceOpportunityForPacket(
  packet: OpportunityConstructorInputPacket,
): OpportunityConstructorOutputPacket["opportunities"][number] {
  return {
    clientOpportunityKey: "op-4",
    identityDecision: {
      mode: "create_new",
      existingIdentityId: null,
      reuseConfidence: null,
      reuseRationale: null,
    },
    opportunityStructure: {
      primaryCategory: "salience_signal",
      secondaryCategories: ["ambiguity", "novelty"],
      structureType: "SALIENCE_SIGNAL",
      nodes: [
        {
          key: "P1",
          label: "unusually strong felt presence",
          kind: "phenomenological_presence",
        },
        {
          key: "P2",
          label: "altered age-state or identity-state",
          kind: "altered_self_state",
        },
      ],
      edges: [
        {
          from: "P1",
          to: "P2",
          relation: "stands_out_with",
        },
      ],
      tensions: [],
      gaps: [],
      continuitySignals: [
        {
          kind: "none",
          referenceId: null,
          description: null,
        },
      ],
    },
    manifestation: {
      summaryForInternalUse:
        "A strong felt presence and altered self-state stand out as phenomenologically salient.",
      priorityReflectiveObjectRole: "primary_source",
      salience: {
        credibility: 0.69,
        reflectivePotential: 0.79,
        salienceBand: "moderate",
        credibilityRationale: "The unusual awareness structure is grounded in current observations.",
        reflectivePotentialRationale:
          "The altered experiential state remains salient without requiring interpretation.",
      },
    },
    evidenceBlocks: [
      {
        clientBlockKey: "block-priority-4",
        reflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
        role: "priority",
        summary: "Priority evidence for unusual felt presence and altered self-state.",
        observationRefs: [
          {
            observationV2SceneObservationId: packet.observations[1].observationV2SceneObservationId,
            sceneRowId: packet.observations[1].sceneRowId,
            observationStableId: packet.observations[1].observationStableId,
            role: "primary_support",
            supportsNodeKeys: ["P1", "P2"],
            supportsEdgeIndexes: [0],
          },
        ],
        confirmedGlossaryRefs: [],
        candidateGlossaryMentions: [],
      },
    ],
    safety: {
      containsInterpretation: false,
      containsDiagnosis: false,
      containsIdentityClaim: false,
      containsAdvice: false,
      userFacingReady: false,
    },
  };
}

function createPersistedManifestation(input: {
  id: string;
  identityId: string;
  priorityReflectiveObjectId: string;
  generationRunId?: string;
}): LatentOpportunityManifestation {
  return {
    id: input.id,
    identityId: input.identityId,
    userId: "user-1",
    priorityReflectiveObjectId: input.priorityReflectiveObjectId,
    generationRunId: input.generationRunId ?? "run-1",
    summary: "Search movement shifts into uncertainty without fixed meaning.",
    structure: {
      kind: "A_TO_B",
      label: "house search -> uncertainty",
      elements: ["house search", "uncertainty"],
      metadata: {},
    },
    primaryCategory: "transition",
    secondaryCategories: ["tension"],
    credibilityScore: 0.81,
    reflectivePotentialScore: 0.78,
    salienceBand: "high",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: "2026-06-15T12:00:00.000Z",
    updatedAt: "2026-06-15T12:00:00.000Z",
    identity: {
      id: input.identityId,
      userId: "user-1",
      title: "house search -> uncertainty",
      primaryCategory: "transition",
      secondaryCategories: ["tension"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-15T12:00:00.000Z",
      updatedAt: "2026-06-15T12:00:00.000Z",
    },
    evidenceBlocks: [
      {
        id: `${input.id}:block:0`,
        manifestationId: input.id,
        userId: "user-1",
        reflectiveObjectId: input.priorityReflectiveObjectId,
        role: "priority",
        summary: "Priority evidence for the search-to-uncertainty structure.",
        position: 0,
        createdAt: "2026-06-15T12:00:00.000Z",
        observations: [
          {
            id: `${input.id}:block:0:observation:0`,
            evidenceBlockId: `${input.id}:block:0`,
            userId: "user-1",
            observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
            sceneId: "bundle-1:scene-1",
            role: "primary_support",
            supportsNodeKeys: ["A"],
            supportsEdgeIndexes: [0],
            createdAt: "2026-06-15T12:00:00.000Z",
          },
          {
            id: `${input.id}:block:0:observation:1`,
            evidenceBlockId: `${input.id}:block:0`,
            userId: "user-1",
            observationV2SceneObservationId: "bundle-1:scene-1:obs-2",
            sceneId: "bundle-1:scene-1",
            role: "primary_support",
            supportsNodeKeys: ["B"],
            supportsEdgeIndexes: [0],
            createdAt: "2026-06-15T12:00:00.000Z",
          },
        ],
      },
    ],
    glossaryLinks: [],
  };
}

function createActualComposerRepositories(): GenerateLatentOpportunitiesForReflectiveObjectRepositories {
  const reflectiveObjectRepository: ReflectiveObjectRepository = {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue({
      id: "object-1",
      userId: "user-1",
      objectType: "dream",
      title: "Search dream",
      primaryContent: "I search through a house and then move toward a stairwell.",
      sourceContext: "manual",
      state: "active",
      metadata: {
        conciseSummary: "A house search turns toward a stairwell.",
      },
      createdAt: "2026-06-15T11:00:00.000Z",
      updatedAt: "2026-06-15T11:00:00.000Z",
    } satisfies ReflectiveObject),
    listByUser: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  const observationV2Repository: ObservationV2Repository = {
    create: vi.fn(),
    getByBundleId: vi.fn(),
    getByReflectiveObjectId: vi.fn().mockResolvedValue({
      bundleId: "bundle-1",
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      runtimeVersion: "observation_v2_phase1",
      uncertaintyNotes: [],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "hu",
      },
      scenes: [
        {
          sceneId: "scene-1",
          position: 1,
          summary: "Searching through a house.",
          boundaryReasoning: [
            {
              kind: "goal_change",
              note: "Movement narrows into searching.",
            },
          ],
          evidenceContext: {
            snippet: "search through a house",
            spanStart: 2,
            spanEnd: 24,
            contextLabel: "scene",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 1,
              text: "The dreamer searches through the house.",
              evidence: [
                {
                  snippet: "search through a house",
                  spanStart: 2,
                  spanEnd: 24,
                  contextLabel: "quoted_support",
                },
              ],
              uncertaintyNote: null,
            },
            {
              observationId: "obs-2",
              position: 2,
              text: "Uncertainty builds during the search.",
              evidence: [
                {
                  snippet: "move toward a stairwell",
                  spanStart: 36,
                  spanEnd: 58,
                  contextLabel: "quoted_support",
                },
              ],
              uncertaintyNote: "The emotional source stays open.",
            },
          ],
          derived: {
            actors: [
              {
                identityKey: "dreamer",
                displayLabel: "Álmodó",
                sourceLanguage: "hu",
                observationIds: ["obs-1"],
              },
            ],
            locations: [
              {
                identityKey: "house",
                displayLabel: "ház",
                sourceLanguage: "hu",
                observationIds: ["obs-1"],
              },
            ],
            objects: [],
            interactions: [
              {
                identityKey: "search",
                displayLabel: "keresés",
                sourceLanguage: "hu",
                observationIds: ["obs-1", "obs-2"],
              },
            ],
            affect: [
              {
                identityKey: "uncertainty",
                displayLabel: "bizonytalanság",
                sourceLanguage: "hu",
                observationIds: ["obs-2"],
              },
            ],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    } satisfies ObservationV2Bundle),
    archive: vi.fn(),
  };

  const glossaryRepository: GlossaryRepository = {
    listTerms: vi.fn(),
    listTermsByReflectiveObject: vi.fn().mockResolvedValue([
      {
        id: "term-1",
        userId: "user-1",
        normalizedKey: "house_search",
        displayLabel: "House Search",
        canonicalLabel: "House Search",
        type: "concept",
        aliases: [],
        generalNote: null,
        appearanceCount: 2,
        notes: null,
        state: "active",
        suppression: {
          state: "none",
          suppressedAt: null,
          reason: null,
        },
        createdAt: "2026-06-14T11:00:00.000Z",
        updatedAt: "2026-06-14T11:00:00.000Z",
      } satisfies GlossaryTerm,
    ]),
    getTermById: vi.fn(),
    listAppearanceRecordsByTerm: vi.fn().mockResolvedValue([]),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
    listCandidates: vi.fn(),
    listCandidatesByReflectiveObject: vi.fn().mockResolvedValue([
      {
        id: "candidate-1",
        userId: "user-1",
        reflectiveObjectId: "object-1",
        normalizedKey: "stairwell",
        displayLabel: "Stairwell",
        sourceCategory: "location",
        sourceObservationId: "obs-2",
        sourceObservationFragmentId: null,
        recurrenceCount: 1,
        candidateClass: "match_candidate",
        proposedEntityIds: ["550e8400-e29b-41d4-a716-446655440000"],
        state: "candidate",
        suppression: {
          state: "none",
          suppressedAt: null,
          reason: null,
        },
        lastSeenAt: "2026-06-15T11:20:00.000Z",
        createdAt: "2026-06-15T11:20:00.000Z",
        updatedAt: "2026-06-15T11:20:00.000Z",
      } satisfies GlossaryCandidate,
    ]),
    getCandidateById: vi.fn(),
    upsertCandidates: vi.fn(),
    setCandidateLifecycle: vi.fn(),
    resolveCandidate: vi.fn(),
    createAssociation: vi.fn(),
    createAppearanceRecord: vi.fn(),
  };

  const createIdentity = vi.fn().mockImplementation(async (input) => ({
    id: input.id ?? "generated-identity-1",
    userId: input.userId,
    title: input.title,
    primaryCategory: input.primaryCategory,
    secondaryCategories: input.secondaryCategories ?? [],
    lifecycleState: input.lifecycleState,
    status: input.status ?? "active",
    archivedAt: null,
    createdAt: "2026-06-15T12:00:00.000Z",
    updatedAt: "2026-06-15T12:00:00.000Z",
  }));
  const createManifestation = vi.fn().mockImplementation(async (input) =>
    createPersistedManifestation({
      id: input.id ?? "manifestation-1",
      identityId: input.identityId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      generationRunId: input.generationRunId,
    }),
  );

  const latentOpportunityRepository: LatentOpportunityRepository = {
    evaluateAuthoritySameness: vi.fn().mockResolvedValue({
      outcome: "materially_changed",
      acceptedFingerprint: "a".repeat(64),
      candidateFingerprint: "b".repeat(64),
    }),
    determineAcceptedOpportunityStaleness: vi.fn().mockResolvedValue({
      outcome: "current",
      grounds: [],
    }),
    resolveReusableAcceptedGenerationRun: vi.fn().mockResolvedValue({
      reusable: false,
      generationRun: null,
      invalidation: null,
    }),
    createGenerationRun: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "pending",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:00:00.000Z",
    }),
    createIdentity,
    createManifestation,
    getGenerationRunById: vi.fn().mockResolvedValue(null),
    getCurrentGenerationRunForReflectiveObject: vi.fn().mockResolvedValue(null),
    listGenerationRunsForReflectiveObject: vi.fn().mockResolvedValue([]),
    listManifestationsByGenerationRun: vi.fn().mockResolvedValue([]),
    getManifestationById: vi.fn(),
    listManifestationsByPriorityReflectiveObject: vi.fn().mockResolvedValue([]),
    listManifestationsByIdentity: vi.fn(),
    listRecentManifestationsByUser: vi.fn().mockResolvedValue([]),
    createGenerationRunInvalidationIfAbsent: vi.fn().mockResolvedValue(null),
    listGenerationRunInvalidations: vi.fn().mockResolvedValue([]),
    markGenerationRunCurrent: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "current",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: "2026-07-18T12:01:00.000Z",
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    }),
    markGenerationRunFailed: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "failed",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    }),
    markGenerationRunRejected: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "rejected",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    }),
    markGenerationRunNoChange: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "no_change",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    }),
    markGenerationRunEmpty: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "empty",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    }),
    markGenerationRunSuperseded: vi.fn().mockResolvedValue({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "superseded",
      inputFingerprint: "fingerprint:pending",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
      contextProvenance: createContextProvenance(),
      executionProvenance: createExecutionProvenance(),
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: "2026-07-18T12:01:00.000Z",
      supersededAt: "2026-07-18T12:02:00.000Z",
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:02:00.000Z",
    }),
    deleteIdentity: vi.fn().mockResolvedValue(undefined),
    deleteGenerationRun: vi.fn().mockResolvedValue(undefined),
    deleteManifestation: vi.fn().mockResolvedValue(undefined),
  };

  return {
    reflectiveObjectRepository,
    observationV2Repository,
    glossaryRepository,
    latentOpportunityRepository,
  };
}

describe("generateLatentOpportunitiesForReflectiveObject", () => {
  it("runs the successful generation path end to end", async () => {
    const repositories = createActualComposerRepositories();
    const packet = createPacket();
    const generateOutput = vi.fn(async ({ packet }: { packet: OpportunityConstructorInputPacket }) => ({
      mode: "generated" as const,
      rawOutput: JSON.stringify(createOutputForPacket(packet)),
    }));

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput,
    });

    expect(result.mode).toBe("persisted");
    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.createGenerationRun).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.createIdentity).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.markGenerationRunCurrent).toHaveBeenCalledWith("run-1", "user-1");
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.objectContaining({
        generationRunId: "run-1",
        priorityReflectiveObjectId: "object-1",
        glossaryLinks: [
          {
            glossaryTermId: "term-1",
            role: "continuity",
          },
        ],
        evidenceBlocks: [
          expect.objectContaining({
            observations: [
              expect.objectContaining({
                observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
                supportsNodeKeys: ["A"],
                supportsEdgeIndexes: [0],
              }),
              expect.objectContaining({
                observationV2SceneObservationId: "bundle-1:scene-1:obs-2",
                supportsNodeKeys: ["B"],
                supportsEdgeIndexes: [0],
              }),
            ],
          }),
        ],
      }),
    );
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.not.objectContaining({
        glossaryLinks: expect.arrayContaining([
          expect.objectContaining({
            glossaryTermId: "candidate-1",
          }),
        ]),
      }),
    );

    if (result.mode !== "persisted") {
      return;
    }

    expect(result.packet.generationContext.priorityReflectiveObjectId).toBe("object-1");
    expect(result.rawOutput).toEqual(expect.any(String));
    expect(result.parsedOutput).toEqual(
      expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
    );
    expect(result.validatedOutput).toEqual(
      expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
    );
    expect(result.mappedPayload).toEqual(
      expect.objectContaining({
        creates: [
          expect.objectContaining({
            clientOpportunityKey: "op-1",
          }),
        ],
      }),
    );
    expect(result.persistedIdentities).toHaveLength(1);
    expect(result.persistedManifestations).toHaveLength(1);
    expect((result.persistedManifestations[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["A"]);
    expect((result.persistedManifestations[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
  });

  it("records an assessed-empty run when the constructor accepts no opportunities", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const generateOutput = vi.fn(async () => ({
      mode: "generated" as const,
      rawOutput: JSON.stringify({
        generationContext: {
          runtimeVersion: packet.generationContext.runtimeVersion,
          priorityReflectiveObjectId: packet.generationContext.priorityReflectiveObjectId,
          observationBundleId: packet.generationContext.observationBundleId,
        },
        decision: {
          mode: "no_opportunity",
          silenceReason: "Evidence is too sparse for a distinct opportunity.",
        },
        opportunities: [],
      }),
    }));

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput,
    });

    expect(result).toEqual({
      mode: "empty",
      packet,
      generationRunId: "run-1",
      source: "new_assessment",
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "no_opportunity",
          silenceReason: "Evidence is too sparse for a distinct opportunity.",
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "no_opportunity",
          silenceReason: "Evidence is too sparse for a distinct opportunity.",
        },
      }),
    });
    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createManifestation).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.markGenerationRunCurrent).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.markGenerationRunNoChange).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.markGenerationRunEmpty).toHaveBeenCalledWith("run-1", "user-1");
  });

  it("reuses an existing assessed-empty run instead of creating another generation run", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const existingEmptyRun = {
      id: "run-empty-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "empty" as const,
      inputFingerprint: "fingerprint:pending",
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: null,
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    };

    repositories.latentOpportunityRepository.listGenerationRunsForReflectiveObject = vi.fn().mockResolvedValue([
      existingEmptyRun,
    ]);
    const generateOutput = vi.fn();

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput,
    });

    expect(result).toEqual({
      mode: "empty",
      packet,
      generationRunId: "run-empty-1",
      source: "existing_assessment",
    });
    expect(generateOutput).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createGenerationRun).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.markGenerationRunEmpty).not.toHaveBeenCalled();
  });

  it("skips accepted current-run reuse guards when Opening has already resolved reuse as blocked", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    repositories.latentOpportunityRepository.getCurrentGenerationRunForReflectiveObject = vi.fn().mockResolvedValue({
      id: "run-current-invalidated-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "current",
      inputFingerprint: "fingerprint:current",
      triggerReason: null,
      predecessorRunId: null,
      acceptedAt: "2026-07-18T12:01:00.000Z",
      supersededAt: null,
      createdAt: "2026-07-18T12:00:00.000Z",
      updatedAt: "2026-07-18T12:01:00.000Z",
    });
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify(createOutputForPacket(packet)),
    });

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput,
      acceptedRunReuseGuard: "skip",
    });

    expect(result.mode).toBe("persisted");
    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.createGenerationRun).toHaveBeenCalledTimes(1);
  });

  it("skips accepted empty-run reuse guards when Opening has already resolved reuse as blocked", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    repositories.latentOpportunityRepository.listGenerationRunsForReflectiveObject = vi.fn().mockResolvedValue([
      {
        id: "run-empty-invalidated-1",
        userId: "user-1",
        priorityReflectiveObjectId: "object-1",
        status: "empty" as const,
        inputFingerprint: "fingerprint:empty",
        triggerReason: null,
        predecessorRunId: null,
        acceptedAt: null,
        supersededAt: null,
        createdAt: "2026-07-18T12:00:00.000Z",
        updatedAt: "2026-07-18T12:01:00.000Z",
      },
    ]);
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify(createOutputForPacket(packet)),
    });

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput,
      acceptedRunReuseGuard: "skip",
    });

    expect(result.mode).toBe("persisted");
    expect(generateOutput).toHaveBeenCalledTimes(1);
    expect(repositories.latentOpportunityRepository.createGenerationRun).toHaveBeenCalledTimes(1);
  });

  it("returns a parse failure when the LLM output is invalid JSON", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: "{",
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "parse",
      reason: "invalid_output_packet",
      details: undefined,
      packet,
      rawOutput: "{",
    });
    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
  });

  it("returns a validation failure without persisting", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const invalidOutput = createOutputForPacket(packet);
    invalidOutput.opportunities[0].manifestation.summaryForInternalUse = "This means the user is avoiding change.";

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(invalidOutput),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "validation",
      reason: "prohibited_interpretive_language",
      details: expect.objectContaining({
        clientOpportunityKey: "op-1",
      }),
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
    });
    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createManifestation).not.toHaveBeenCalled();
  });

  it("returns a persistence failure and cleans up a create_new identity", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const createIdentity = repositories.latentOpportunityRepository.createIdentity as ReturnType<typeof vi.fn>;
    const createManifestation = repositories.latentOpportunityRepository.createManifestation as ReturnType<typeof vi.fn>;
    const deleteIdentity = repositories.latentOpportunityRepository.deleteIdentity as ReturnType<typeof vi.fn>;
    const deleteGenerationRun = repositories.latentOpportunityRepository.deleteGenerationRun as ReturnType<typeof vi.fn>;

    createIdentity.mockResolvedValueOnce({
      id: "identity-new-1",
      userId: "user-1",
      title: "house search -> uncertainty",
      primaryCategory: "transition",
      secondaryCategories: ["tension"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-15T12:00:00.000Z",
      updatedAt: "2026-06-15T12:00:00.000Z",
    });
    createManifestation.mockRejectedValueOnce(new Error("manifestation_write_failed"));

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "persistence",
      reason: "manifestation_write_failed",
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      mappedPayload: expect.objectContaining({
        creates: [
          expect.objectContaining({
            clientOpportunityKey: "op-1",
          }),
        ],
      }),
      cleanup: {
        attempted: true,
        completed: true,
        resourceCount: 2,
      },
    });
    expect(deleteIdentity).toHaveBeenCalledWith("identity-new-1", "user-1");
    expect(deleteGenerationRun).toHaveBeenCalledWith("run-1", "user-1");
  });

  it("does not persist glossary candidates", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      }),
    });

    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.not.objectContaining({
        glossaryLinks: expect.arrayContaining([
          expect.objectContaining({
            glossaryTermId: "candidate-1",
          }),
        ]),
      }),
    );
  });

  it("persists provenance on generation-run creation before constructor execution", async () => {
    const repositories = createActualComposerRepositories();
    const packet = createPacket();
    const authorityProvenance = createAuthorityProvenance(packet);
    const contextProvenance = createContextProvenance(packet);
    const composeInputPacket = vi.fn().mockResolvedValue({
      packet,
      authorityProvenance,
      contextProvenance,
    });
    const createGenerationRun = repositories.latentOpportunityRepository.createGenerationRun as ReturnType<typeof vi.fn>;
    const generateOutput = vi.fn().mockImplementation(async () => {
      expect(createGenerationRun).toHaveBeenCalledTimes(1);
      return {
        mode: "generated" as const,
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      };
    });

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket,
      generateOutput,
    });

    expect(createGenerationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        inputFingerprint: expect.any(String),
        authorityFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
        authorityProvenance,
        contextProvenance,
        executionProvenance: expect.objectContaining({
          constructorRuntimeVersion: packet.generationContext.runtimeVersion,
        }),
      }),
    );
  });

  it("keeps the authority fingerprint stable across context-only changes", async () => {
    const repositories = createActualComposerRepositories();
    const packet = createPacket();
    const createGenerationRun = repositories.latentOpportunityRepository.createGenerationRun as ReturnType<typeof vi.fn>;
    const composeInputPacket = vi
      .fn()
      .mockResolvedValueOnce({
        packet,
        authorityProvenance: createAuthorityProvenance(packet),
        contextProvenance: createContextProvenance(packet),
      })
      .mockResolvedValueOnce({
        packet: {
          ...packet,
          existingOpportunityContext: {
            identities: [
              {
                identityId: "identity-existing-1",
                primaryCategory: "transition",
                secondaryCategories: ["tension"],
                lifecycleState: "emerging",
                latestStructure: {
                  structureType: "A_TO_B",
                  nodes: ["house search", "uncertainty"],
                },
                recentManifestationSummaries: [],
              },
            ],
          },
        },
        authorityProvenance: createAuthorityProvenance(packet),
        contextProvenance: {
          existingOpportunityContext: {
            identities: [
              {
                identityId: "identity-existing-1",
                primaryCategory: "transition",
                secondaryCategories: ["tension"],
                lifecycleState: "emerging",
                latestStructure: {
                  structureType: "A_TO_B",
                  nodes: ["house search", "uncertainty"],
                },
                recentManifestationSummaries: [],
              },
            ],
          },
          truncationNote: "Different context note.",
        },
      });
    const generateOutput = vi.fn().mockResolvedValue({
      mode: "generated",
      rawOutput: JSON.stringify(createOutputForPacket(packet)),
    });

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket,
      generateOutput,
    });

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket,
      generateOutput,
    });

    expect(createGenerationRun.mock.calls[0]?.[0]?.authorityFingerprint).toBe(
      createGenerationRun.mock.calls[1]?.[0]?.authorityFingerprint,
    );
    expect(createGenerationRun.mock.calls[0]?.[0]?.inputFingerprint).toEqual(expect.any(String));
    expect(createGenerationRun.mock.calls[1]?.[0]?.contextProvenance).toEqual(
      expect.objectContaining({
        truncationNote: "Different context note.",
      }),
    );
  });

  it("persists confirmed glossary links", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      }),
    });

    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.objectContaining({
        glossaryLinks: [
          {
            glossaryTermId: "term-1",
            role: "continuity",
          },
        ],
      }),
    );
  });

  it("supports the create_new identity flow", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      }),
    });

    expect(repositories.latentOpportunityRepository.createIdentity).toHaveBeenCalledTimes(1);
  });

  it("persists multiple materially distinct opportunities from one priority object", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const output = createOutputForPacket(packet);
    output.opportunities.push(
      createGapOpportunityForPacket(packet),
      createRepairOpportunityForPacket(packet),
      createPhenomenologicalSalienceOpportunityForPacket(packet),
    );

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(repositories.latentOpportunityRepository.createIdentity).toHaveBeenCalledTimes(4);
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledTimes(4);
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        primaryCategory: "gap",
        summary: "A felt presence remains structurally stronger than what is visibly present.",
      }),
    );
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        primaryCategory: "transition",
        summary: "An accidental disruption moves into repair and then reassurance.",
      }),
    );
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        primaryCategory: "salience_signal",
        summary: "A strong felt presence and altered self-state stand out as phenomenologically salient.",
      }),
    );
  });

  it("accepts stable scene ids in evidence refs without failing validation", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const output = createOutputForPacket(packet);
    output.opportunities[0].evidenceBlocks[0].observationRefs = output.opportunities[0].evidenceBlocks[0].observationRefs.map(
      (ref, index) => ({
        ...ref,
        sceneRowId: null,
        sceneStableId: packet.observations[index].sceneStableId,
      }),
    );

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(result.mode).toBe("persisted");
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.objectContaining({
        evidenceBlocks: [
          expect.objectContaining({
            observations: expect.arrayContaining([
              expect.objectContaining({
                observationV2SceneObservationId: packet.observations[0].observationV2SceneObservationId,
                sceneId: packet.observations[0].sceneRowId,
              }),
            ]),
          }),
        ],
      }),
    );
  });

  it("supports the reuse_existing identity flow", async () => {
    const packet = createPacket({
      existingOpportunityContext: {
        identities: [
          {
            identityId: "identity-existing-1",
            primaryCategory: "transition",
            secondaryCategories: ["tension"],
            lifecycleState: "emerging",
            latestStructure: {
              structureType: "A_TO_B",
              nodes: ["house search", "uncertainty"],
            },
            recentManifestationSummaries: [],
          },
        ],
      },
    });
    const repositories = createActualComposerRepositories();
    const output = createOutputForPacket(packet);
    output.opportunities[0].identityDecision = {
      mode: "reuse_existing",
      existingIdentityId: "identity-existing-1",
      reuseConfidence: "moderate",
      reuseRationale: "The same structure appears again with current evidence.",
    };

    await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createManifestation).toHaveBeenCalledWith(
      expect.objectContaining({
        identityId: "identity-existing-1",
      }),
    );
  });

  it("cleans up already-persisted resources when a later persistence step fails", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const output = createOutputForPacket(packet);
    output.opportunities.push({
      ...output.opportunities[0],
      clientOpportunityKey: "op-2",
      opportunityStructure: {
        ...output.opportunities[0].opportunityStructure,
        primaryCategory: "gap",
        structureType: "GAP",
        nodes: [
          {
            key: "G1",
            label: "unresolved absence",
            kind: "structural_gap",
          },
        ],
        edges: [],
        tensions: [],
        gaps: [
          {
            description: "Absence remains unresolved.",
            supportedByObservationIds: [packet.observations[0].observationV2SceneObservationId],
          },
        ],
      },
      manifestation: {
        ...output.opportunities[0].manifestation,
        summaryForInternalUse: "An unresolved absence remains open.",
      },
      evidenceBlocks: [
        {
          ...output.opportunities[0].evidenceBlocks[0],
          clientBlockKey: "block-priority-2",
          observationRefs: [
            {
              observationV2SceneObservationId: packet.observations[0].observationV2SceneObservationId,
              sceneRowId: packet.observations[0].sceneRowId,
              observationStableId: packet.observations[0].observationStableId,
              role: "primary_support",
              supportsNodeKeys: ["G1"],
              supportsEdgeIndexes: [],
            },
          ],
        },
      ],
    });

    const createIdentity = repositories.latentOpportunityRepository.createIdentity as ReturnType<typeof vi.fn>;
    const createManifestation = repositories.latentOpportunityRepository.createManifestation as ReturnType<typeof vi.fn>;
    const deleteIdentity = repositories.latentOpportunityRepository.deleteIdentity as ReturnType<typeof vi.fn>;
    const deleteManifestation = repositories.latentOpportunityRepository.deleteManifestation as ReturnType<typeof vi.fn>;
    const deleteGenerationRun = repositories.latentOpportunityRepository.deleteGenerationRun as ReturnType<typeof vi.fn>;

    createIdentity
      .mockResolvedValueOnce({
        id: "identity-new-1",
        userId: "user-1",
        title: "house search -> uncertainty",
        primaryCategory: "transition",
        secondaryCategories: ["tension"],
        lifecycleState: "emerging",
        status: "active",
        archivedAt: null,
        createdAt: "2026-06-15T12:00:00.000Z",
        updatedAt: "2026-06-15T12:00:00.000Z",
      })
      .mockResolvedValueOnce({
        id: "identity-new-2",
        userId: "user-1",
        title: "unresolved absence",
        primaryCategory: "gap",
        secondaryCategories: ["tension"],
        lifecycleState: "emerging",
        status: "active",
        archivedAt: null,
        createdAt: "2026-06-15T12:00:10.000Z",
        updatedAt: "2026-06-15T12:00:10.000Z",
      });

    createManifestation
      .mockResolvedValueOnce(
        createPersistedManifestation({
          id: "manifestation-1",
          identityId: "identity-new-1",
          priorityReflectiveObjectId: "object-1",
        }),
      )
      .mockRejectedValueOnce(new Error("second_manifestation_failed"));

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "persistence",
      reason: "second_manifestation_failed",
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      mappedPayload: expect.objectContaining({
        creates: [
          expect.objectContaining({
            clientOpportunityKey: "op-1",
          }),
          expect.objectContaining({
            clientOpportunityKey: "op-2",
          }),
        ],
      }),
      cleanup: {
        attempted: true,
        completed: true,
        resourceCount: 4,
      },
    });
    expect(deleteIdentity).toHaveBeenCalledWith("identity-new-2", "user-1");
    expect(deleteManifestation).toHaveBeenCalledWith("manifestation-1", "user-1");
    expect(deleteIdentity).toHaveBeenCalledWith("identity-new-1", "user-1");
    expect(deleteGenerationRun).toHaveBeenCalledWith("run-1", "user-1");
  });

  it("preserves the primary persistence failure when rollback cleanup also fails", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const createIdentity = repositories.latentOpportunityRepository.createIdentity as ReturnType<typeof vi.fn>;
    const createManifestation = repositories.latentOpportunityRepository.createManifestation as ReturnType<typeof vi.fn>;
    const deleteIdentity = repositories.latentOpportunityRepository.deleteIdentity as ReturnType<typeof vi.fn>;
    const deleteGenerationRun = repositories.latentOpportunityRepository.deleteGenerationRun as ReturnType<typeof vi.fn>;

    createIdentity.mockResolvedValueOnce({
      id: "identity-new-1",
      userId: "user-1",
      title: "house search -> uncertainty",
      primaryCategory: "transition",
      secondaryCategories: ["tension"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-15T12:00:00.000Z",
      updatedAt: "2026-06-15T12:00:00.000Z",
    });
    createManifestation.mockRejectedValueOnce(new Error("manifestation_write_failed"));
    deleteGenerationRun.mockRejectedValueOnce(new Error("rollback_delete_failed"));

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(createOutputForPacket(packet)),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "persistence",
      reason: "manifestation_write_failed",
      packet,
      rawOutput: expect.any(String),
      parsedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      validatedOutput: expect.objectContaining({
        decision: {
          mode: "opportunities_found",
          silenceReason: null,
        },
      }),
      mappedPayload: expect.objectContaining({
        creates: [
          expect.objectContaining({
            clientOpportunityKey: "op-1",
          }),
        ],
      }),
      cleanup: {
        attempted: true,
        completed: false,
        resourceCount: 2,
      },
    });
    expect(deleteIdentity).toHaveBeenCalledWith("identity-new-1", "user-1");
    expect(deleteGenerationRun).toHaveBeenCalledWith("run-1", "user-1");
  });

  it("does not persist when output drifts into a graph inventory packet", async () => {
    const packet = createPacket();
    const repositories = createActualComposerRepositories();
    const output = createOutputForPacket(packet);
    output.opportunities[0].opportunityStructure.primaryCategory = "relationship";
    output.opportunities[0].opportunityStructure.structureType = "graph" as never;
    output.opportunities[0].opportunityStructure.nodes = [
      { key: "scene_1", label: "house arrival", kind: "scene" },
      { key: "scene_2", label: "hallway search", kind: "scene" },
      { key: "actor_1", label: "dreamer", kind: "actor" },
      { key: "object_1", label: "phone", kind: "object" },
    ];
    output.opportunities[0].opportunityStructure.edges = [
      { from: "scene_1", to: "scene_2", relation: "followed_by" },
      { from: "actor_1", to: "scene_1", relation: "appears_in" },
      { from: "object_1", to: "scene_2", relation: "appears_in" },
    ];
    output.opportunities[0].opportunityStructure.tensions = [];
    output.opportunities[0].opportunityStructure.gaps = [];
    output.opportunities[0].manifestation.summaryForInternalUse =
      "Broad scene and object inventory instead of a focused reflective opportunity.";

    const result = await generateLatentOpportunitiesForReflectiveObject({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      repositories,
      composeInputPacket: vi.fn().mockResolvedValue(packet),
      generateOutput: vi.fn().mockResolvedValue({
        mode: "generated",
        rawOutput: JSON.stringify(output),
      }),
    });

    expect(result).toEqual({
      mode: "failed",
      stage: "parse",
      reason: "invalid_output_packet",
      details: undefined,
      packet,
      rawOutput: expect.any(String),
    });
    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createManifestation).not.toHaveBeenCalled();
  });
});
