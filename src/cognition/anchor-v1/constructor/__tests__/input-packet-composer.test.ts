import { describe, expect, it, vi } from "vitest";

import { composeAnchorConstructorInputPacket } from "@/src/cognition/anchor-v1/constructor/input-packet-composer";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { GlossaryCandidate, GlossaryTerm } from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

function createReflectiveObject(): ReflectiveObject {
  return {
    id: "object-1",
    userId: "user-1",
    objectType: "dream",
    title: "House search dream",
    primaryContent: "I move through a house searching for someone, then the scene shifts to a stairwell.",
    sourceContext: "manual",
    state: "active",
    metadata: {
      conciseSummary: "Searching through a house before the scene shifts to a stairwell.",
      objectLanguage: "hu",
    },
    createdAt: "2026-06-17T08:00:00.000Z",
    updatedAt: "2026-06-17T08:00:00.000Z",
  };
}

function createObservationBundle(input?: { scenes?: ObservationV2Bundle["scenes"] }): ObservationV2Bundle {
  return {
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
    scenes: input?.scenes ?? [
      {
        sceneId: "scene-b",
        position: 2,
        summary: "The dreamer moves into a stairwell.",
        boundaryReasoning: [
          {
            kind: "spatial_change",
            note: "The house interior gives way to a stairwell.",
          },
        ],
        evidenceContext: {
          snippet: "the scene shifts to a stairwell",
          spanStart: 58,
          spanEnd: 87,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-b1",
            position: 1,
            text: "The scene now centers on a stairwell.",
            evidence: [
              {
                snippet: "shifts to a stairwell",
                spanStart: 67,
                spanEnd: 87,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: ["obs-b1"] }],
          locations: [{ identityKey: "stairwell", displayLabel: "lépcsőház", sourceLanguage: "hu", observationIds: ["obs-b1"] }],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-a",
        position: 1,
        summary: "The dreamer searches through a house.",
        boundaryReasoning: [
          {
            kind: "goal_change",
            note: "Wandering sharpens into active searching.",
          },
        ],
        evidenceContext: {
          snippet: "move through a house searching for someone",
          spanStart: 2,
          spanEnd: 43,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-a1",
            position: 1,
            text: "The dreamer searches through the house.",
            evidence: [
              {
                snippet: "move through a house searching for someone",
                spanStart: 2,
                spanEnd: 43,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "dreamer", displayLabel: "Álmodó", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          locations: [{ identityKey: "house", displayLabel: "ház", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          objects: [{ identityKey: "phone", displayLabel: "telefon", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          interactions: [{ identityKey: "searching", displayLabel: "keresés", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          affect: [{ identityKey: "uncertainty", displayLabel: "bizonytalanság", sourceLanguage: "hu", observationIds: ["obs-a1"] }],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
    ],
  };
}

function createConfirmedTerms(): GlossaryTerm[] {
  return [
    {
      id: "term-1",
      userId: "user-1",
      normalizedKey: "house_search",
      displayLabel: "Ház keresés",
      canonicalLabel: "Ház keresés",
      type: "concept",
      aliases: [],
      generalNote: null,
      appearanceCount: 2,
      notes: "Owner-confirmed continuity.",
      state: "active",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      createdAt: "2026-06-12T08:00:00.000Z",
      updatedAt: "2026-06-12T08:00:00.000Z",
    },
  ];
}

function createCandidates(): GlossaryCandidate[] {
  return [
    {
      id: "candidate-1",
      userId: "user-1",
      reflectiveObjectId: "object-1",
      normalizedKey: "unknown_person",
      displayLabel: "Ismeretlen személy",
      sourceCategory: "actor",
      sourceObservationId: "obs-a1",
      sourceObservationFragmentId: null,
      recurrenceCount: 1,
      candidateClass: "new_candidate",
      proposedEntityIds: [],
      state: "candidate",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      lastSeenAt: "2026-06-17T08:20:00.000Z",
      createdAt: "2026-06-17T08:20:00.000Z",
      updatedAt: "2026-06-17T08:20:00.000Z",
    },
  ];
}

function createManifestation(): LatentOpportunityManifestation {
  return {
    id: "manifestation-current",
    identityId: "identity-current",
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    summary: "Searching turns into uncertainty around a missing phone.",
    structure: {
      kind: "A_TO_B",
      label: "search -> uncertainty",
      elements: ["search", "uncertainty"],
      metadata: {},
    },
    primaryCategory: "transition",
    secondaryCategories: ["gap"],
    credibilityScore: 0.81,
    reflectivePotentialScore: 0.76,
    salienceBand: "high",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: "2026-06-17T08:30:00.000Z",
    updatedAt: "2026-06-17T08:30:00.000Z",
    identity: {
      id: "identity-current",
      userId: "user-1",
      title: "search -> uncertainty",
      primaryCategory: "transition",
      secondaryCategories: ["gap"],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-06-17T08:30:00.000Z",
      updatedAt: "2026-06-17T08:30:00.000Z",
    },
    evidenceBlocks: [
      {
        id: "manifestation-current:block:0",
        manifestationId: "manifestation-current",
        userId: "user-1",
        reflectiveObjectId: "object-1",
        role: "priority",
        summary: "Priority evidence",
        position: 0,
        createdAt: "2026-06-17T08:30:00.000Z",
        observations: [
          {
            id: "manifestation-current:obs:0",
            evidenceBlockId: "manifestation-current:block:0",
            userId: "user-1",
            observationV2SceneObservationId: "bundle-1:scene-a:obs-a1",
            sceneId: "scene-a",
            role: "primary_support",
            supportsNodeKeys: ["issue", "action"],
            supportsEdgeIndexes: [0],
            createdAt: "2026-06-17T08:30:00.000Z",
          },
        ],
      },
    ],
    glossaryLinks: [],
  };
}

function createRepositories(input?: {
  observationBundle?: ObservationV2Bundle;
  priorityManifestations?: LatentOpportunityManifestation[];
  confirmedTerms?: GlossaryTerm[];
}) {
  const observationBundle = input?.observationBundle ?? createObservationBundle();
  const priorityManifestations = input?.priorityManifestations ?? [createManifestation()];
  const confirmedTerms = input?.confirmedTerms ?? createConfirmedTerms();

  const reflectiveObjectRepository: ReflectiveObjectRepository = {
    create: vi.fn(),
    getById: vi.fn().mockResolvedValue(createReflectiveObject()),
    listByUser: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };

  const observationV2Repository: ObservationV2Repository = {
    create: vi.fn(),
    getByBundleId: vi.fn(),
    getByReflectiveObjectId: vi.fn().mockResolvedValue(observationBundle),
  };

  const glossaryRepository: GlossaryRepository = {
    listTerms: vi.fn(),
    listTermsByReflectiveObject: vi.fn().mockResolvedValue(confirmedTerms),
    getTermById: vi.fn(),
    listAppearanceRecordsByTerm: vi.fn().mockResolvedValue([]),
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
    listManifestationsByPriorityReflectiveObject: vi.fn().mockResolvedValue(priorityManifestations),
    listManifestationsByIdentity: vi.fn(),
    listRecentManifestationsByUser: vi.fn(),
  };

  return {
    reflectiveObjectRepository,
    observationV2Repository,
    glossaryRepository,
    latentOpportunityRepository,
  };
}

describe("composeAnchorConstructorInputPacket", () => {
  it("builds a packet with reflective object, observations, opportunities, and glossary context", async () => {
    const repositories = createRepositories();
    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      glossaryCandidates: createCandidates(),
      ...repositories,
    });

    expect(packet.reflectiveObject).toEqual({
      id: "object-1",
      userId: "user-1",
      title: "House search dream",
      content: "I move through a house searching for someone, then the scene shifts to a stairwell.",
    });
    expect(packet.observationSet.scenes.map((scene) => scene.sceneStableId)).toEqual(["scene-a", "scene-b"]);
    expect(packet.observationSet.observations.map((observation) => observation.observationStableId)).toEqual([
      "obs-a1",
      "obs-b1",
    ]);
    expect(packet.opportunitySet.opportunities).toHaveLength(1);
    expect(packet.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId)).toEqual(["term-1"]);
    expect(packet.glossaryContext.candidates).toEqual([
      {
        glossaryCandidateId: "candidate-1",
        displayLabel: "Ismeretlen személy",
        normalizedKey: "unknown_person",
        sourceCategory: "actor",
        candidateClass: "new_candidate",
        state: "candidate",
        sourceObservationStableId: "obs-a1",
      },
    ]);
  });

  it("preserves node and edge trace support with opportunity and evidence-block linkage", async () => {
    const repositories = createRepositories();
    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.opportunityEvidenceTrace.entries).toEqual([
      {
        opportunityManifestationId: "manifestation-current",
        opportunityIdentityId: "identity-current",
        evidenceBlockId: "manifestation-current:block:0",
        evidenceBlockRole: "priority",
        observationV2SceneObservationId: "bundle-1:scene-a:obs-a1",
        sceneId: "scene-a",
        observationRole: "primary_support",
        supportsNodeKeys: ["issue", "action"],
        supportsEdgeIndexes: [0],
      },
    ]);
  });

  it("creates a valid sparse packet and remains read-only", async () => {
    const repositories = createRepositories({
      observationBundle: createObservationBundle({ scenes: [] }),
      priorityManifestations: [],
      confirmedTerms: [],
    });

    const packet = await composeAnchorConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      glossaryCandidates: [],
      ...repositories,
    });

    expect(packet.observationSet.scenes).toEqual([]);
    expect(packet.observationSet.observations).toEqual([]);
    expect(packet.opportunitySet.opportunities).toEqual([]);
    expect(packet.opportunityEvidenceTrace.entries).toEqual([]);
    expect(packet.glossaryContext.confirmedTerms).toEqual([]);
    expect(packet.glossaryContext.candidates).toEqual([]);

    expect(repositories.reflectiveObjectRepository.create).not.toHaveBeenCalled();
    expect(repositories.observationV2Repository.create).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.createTerm).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.upsertCandidates).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createIdentity).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.createManifestation).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listCandidates).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listCandidatesByReflectiveObject).not.toHaveBeenCalled();
  });
});
