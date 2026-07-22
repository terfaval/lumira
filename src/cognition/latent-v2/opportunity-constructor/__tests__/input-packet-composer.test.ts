import { describe, expect, it, vi } from "vitest";

import { composeOpportunityConstructorInputPacket } from "@/src/cognition/latent-v2/opportunity-constructor/input-packet-composer";
import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type {
  GlossaryAppearanceRecord,
  GlossaryCandidate,
  GlossaryTerm,
} from "@/src/domain/glossary/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectionRepository } from "@/src/domain/reflections/contracts";
import type { Reflection } from "@/src/domain/reflections/types";
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
    },
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-15T10:00:00.000Z",
  };
}

function createObservationBundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "object-1",
    userId: "user-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    uncertaintyNotes: ["Scene edges remain slightly fuzzy."],
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
            observationId: "obs-b2",
            position: 2,
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
          {
            observationId: "obs-b1",
            position: 1,
            text: "Movement continues through the transition.",
            evidence: [
              {
                snippet: "scene shifts",
                spanStart: 58,
                spanEnd: 70,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: "The precise transition tone is unclear.",
          },
        ],
        derived: {
          actors: [
            {
              identityKey: "dreamer",
              displayLabel: "Álmodó",
              sourceLanguage: "hu",
              observationIds: ["obs-b1"],
            },
          ],
          locations: [
            {
              identityKey: "stairwell",
              displayLabel: "lépcsőház",
              sourceLanguage: "hu",
              observationIds: ["obs-b2"],
            },
          ],
          objects: [],
          interactions: [
            {
              identityKey: "moving",
              displayLabel: "haladás",
              sourceLanguage: "hu",
              observationIds: ["obs-b1"],
            },
          ],
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
            observationId: "obs-a2",
            position: 2,
            text: "Uncertainty builds during the search.",
            evidence: [
              {
                snippet: "searching for someone",
                spanStart: 22,
                spanEnd: 43,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: "The source of uncertainty is not explicit.",
          },
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
          actors: [
            {
              identityKey: "dreamer",
              displayLabel: "Álmodó",
              sourceLanguage: "hu",
              observationIds: ["obs-a1"],
            },
          ],
          locations: [
            {
              identityKey: "house",
              displayLabel: "ház",
              sourceLanguage: "hu",
              observationIds: ["obs-a1"],
            },
          ],
          objects: [],
          interactions: [
            {
              identityKey: "searching",
              displayLabel: "keresés",
              sourceLanguage: "hu",
              observationIds: ["obs-a1", "obs-a2"],
            },
          ],
          affect: [
            {
              identityKey: "uncertainty",
              displayLabel: "bizonytalanság",
              sourceLanguage: "hu",
              observationIds: ["obs-a2"],
            },
          ],
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
      id: "term-2",
      userId: "user-1",
      normalizedKey: "stairwell",
      displayLabel: "Lépcsőház",
      canonicalLabel: "Lépcsőház",
      type: "setting_or_space",
      aliases: [],
      generalNote: null,
      appearanceCount: 1,
      notes: null,
      state: "active",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      createdAt: "2026-06-13T10:00:00.000Z",
      updatedAt: "2026-06-13T10:00:00.000Z",
    },
    {
      id: "term-1",
      userId: "user-1",
      normalizedKey: "house_search",
      displayLabel: "Ház keresés",
      canonicalLabel: "Ház keresés",
      type: "concept",
      aliases: [],
      generalNote: "Recurring search motif.",
      appearanceCount: 2,
      notes: "Stale compatibility note.",
      state: "active",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      createdAt: "2026-06-12T10:00:00.000Z",
      updatedAt: "2026-06-12T10:00:00.000Z",
    },
  ];
}

function createAppearanceRecords(): Record<string, GlossaryAppearanceRecord[]> {
  return {
    "term-1": [
      {
        id: "appearance-2",
        userId: "user-1",
        entityId: "term-1",
        dreamId: "object-1",
        appearanceNote: "Confirmed again here.",
        confirmedAt: "2026-06-15T09:30:00.000Z",
        createdAt: "2026-06-15T09:30:00.000Z",
        updatedAt: "2026-06-15T09:30:00.000Z",
      },
      {
        id: "appearance-1",
        userId: "user-1",
        entityId: "term-1",
        dreamId: "object-0",
        appearanceNote: null,
        confirmedAt: "2026-06-14T09:30:00.000Z",
        createdAt: "2026-06-14T09:30:00.000Z",
        updatedAt: "2026-06-14T09:30:00.000Z",
      },
    ],
    "term-2": [],
  };
}

function createCandidates(): GlossaryCandidate[] {
  return [
    {
      id: "candidate-2",
      userId: "user-1",
      reflectiveObjectId: "object-1",
      normalizedKey: "stairwell",
      displayLabel: "Lépcsőház",
      sourceCategory: "location",
      sourceObservationId: "obs-b2",
      sourceObservationFragmentId: null,
      recurrenceCount: 1,
      candidateClass: "ambiguous_match_candidate",
      proposedEntityIds: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
      state: "candidate",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      lastSeenAt: "2026-06-15T09:31:00.000Z",
      createdAt: "2026-06-15T09:31:00.000Z",
      updatedAt: "2026-06-15T09:31:00.000Z",
    },
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
      lastSeenAt: "2026-06-15T09:29:00.000Z",
      createdAt: "2026-06-15T09:29:00.000Z",
      updatedAt: "2026-06-15T09:29:00.000Z",
    },
    {
      id: "candidate-ignored",
      userId: "user-1",
      reflectiveObjectId: "object-1",
      normalizedKey: "ignored",
      displayLabel: "Ignored",
      sourceCategory: "emotion",
      sourceObservationId: "obs-a2",
      sourceObservationFragmentId: null,
      recurrenceCount: 1,
      candidateClass: "new_candidate",
      proposedEntityIds: [],
      state: "ignored",
      suppression: {
        state: "none",
        suppressedAt: null,
        reason: null,
      },
      lastSeenAt: "2026-06-15T09:28:00.000Z",
      createdAt: "2026-06-15T09:28:00.000Z",
      updatedAt: "2026-06-15T09:28:00.000Z",
    },
  ];
}

function createManifestation(
  input: {
    manifestationId: string;
    identityId: string;
    priorityReflectiveObjectId: string;
    createdAt: string;
    primaryCategory: "transition" | "tension" | "gap";
    nodeElements: string[];
    summary: string;
  },
): LatentOpportunityManifestation {
  return {
    id: input.manifestationId,
    identityId: input.identityId,
    userId: "user-1",
    priorityReflectiveObjectId: input.priorityReflectiveObjectId,
    generationRunId: "run-1",
    summary: input.summary,
    structure: {
      kind: "A_TO_B",
      label: input.nodeElements.join(" -> "),
      elements: input.nodeElements,
      metadata: {},
    },
    primaryCategory: input.primaryCategory,
    secondaryCategories: input.primaryCategory === "transition" ? ["tension"] : [],
    credibilityScore: 0.7,
    reflectivePotentialScore: 0.75,
    salienceBand: "moderate",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    identity: {
      id: input.identityId,
      userId: "user-1",
      title: input.nodeElements.join(" -> "),
      primaryCategory: input.primaryCategory,
      secondaryCategories: input.primaryCategory === "transition" ? ["tension"] : [],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    },
    evidenceBlocks: [
      {
        id: `${input.manifestationId}:block:0`,
        manifestationId: input.manifestationId,
        userId: "user-1",
        reflectiveObjectId: input.priorityReflectiveObjectId,
        role: "priority",
        summary: "Priority evidence",
        position: 0,
        createdAt: input.createdAt,
        observations: [
          {
            id: `${input.manifestationId}:obs:0`,
            evidenceBlockId: `${input.manifestationId}:block:0`,
            userId: "user-1",
            observationV2SceneObservationId:
              input.priorityReflectiveObjectId === "object-1" ? "bundle-1:scene-a:obs-a1" : "bundle-0:scene-a:obs-prior",
            sceneId: input.priorityReflectiveObjectId === "object-1" ? "bundle-1:scene-a" : "bundle-0:scene-a",
            role: "primary_support",
            supportsNodeKeys: [],
            supportsEdgeIndexes: [],
            createdAt: input.createdAt,
          },
        ],
      },
    ],
    glossaryLinks: [],
  };
}

function createReflection(input: {
  id: string;
  threadId: string;
  sourceResponseId: string;
  sourceOpeningId: string | null;
  sourceReflectiveObjectIds: string[];
  statement: string;
  pattern: string[];
  admittedAt: string;
}): Reflection {
  return {
    id: input.id,
    userId: "user-1",
    candidateId: `${input.id}:candidate`,
    threadId: input.threadId,
    sourceResponseId: input.sourceResponseId,
    sourceOpeningId: input.sourceOpeningId,
    sourceReflectiveObjectIds: input.sourceReflectiveObjectIds,
    statement: input.statement,
    pattern: input.pattern,
    admittedAt: input.admittedAt,
    archivedAt: null,
    createdAt: input.admittedAt,
    updatedAt: input.admittedAt,
  };
}

function createRepositories(options?: {
  confirmedTerms?: GlossaryTerm[];
  appearanceRecords?: Record<string, GlossaryAppearanceRecord[]>;
  candidates?: GlossaryCandidate[];
  priorityManifestations?: LatentOpportunityManifestation[];
  recentManifestations?: LatentOpportunityManifestation[];
  reflections?: Reflection[];
}): {
  reflectiveObjectRepository: ReflectiveObjectRepository;
  observationV2Repository: ObservationV2Repository;
  glossaryRepository: GlossaryRepository;
  latentOpportunityRepository: LatentOpportunityRepository;
  reflectionRepository: ReflectionRepository;
} {
  const confirmedTerms = options?.confirmedTerms ?? createConfirmedTerms();
  const appearanceRecords = options?.appearanceRecords ?? createAppearanceRecords();
  const candidates = options?.candidates ?? createCandidates();
  const priorityManifestations =
    options?.priorityManifestations ??
    [
      createManifestation({
        manifestationId: "manifestation-current",
        identityId: "identity-current",
        priorityReflectiveObjectId: "object-1",
        createdAt: "2026-06-15T09:40:00.000Z",
        primaryCategory: "transition",
        nodeElements: ["search", "uncertainty"],
        summary: "Search turns into uncertainty.",
      }),
    ];
  const recentManifestations =
    options?.recentManifestations ??
    [
      priorityManifestations[0],
      createManifestation({
        manifestationId: "manifestation-recent-2",
        identityId: "identity-other",
        priorityReflectiveObjectId: "object-0",
        createdAt: "2026-06-14T09:40:00.000Z",
        primaryCategory: "gap",
        nodeElements: ["absence", "search"],
        summary: "An absence remains unresolved.",
      }),
      createManifestation({
        manifestationId: "manifestation-recent-1",
        identityId: "identity-other",
        priorityReflectiveObjectId: "object-0",
        createdAt: "2026-06-13T09:40:00.000Z",
        primaryCategory: "gap",
        nodeElements: ["absence", "distance"],
        summary: "Distance remains unresolved.",
      }),
    ];
  const reflections =
    options?.reflections ??
    [
      createReflection({
        id: "reflection-2",
        threadId: "thread-older",
        sourceResponseId: "response-older",
        sourceOpeningId: null,
        sourceReflectiveObjectIds: ["object-0"],
        statement: "When searching repeats, uncertainty tends to stay active.",
        pattern: ["Search", "Uncertainty", "Return"],
        admittedAt: "2026-06-16T09:40:00.000Z",
      }),
      createReflection({
        id: "reflection-1",
        threadId: "thread-current",
        sourceResponseId: "response-current",
        sourceOpeningId: "opening-current",
        sourceReflectiveObjectIds: ["object-1"],
        statement: "Searching in a house keeps carrying uncertainty.",
        pattern: ["House", "Search", "Uncertainty"],
        admittedAt: "2026-06-15T11:00:00.000Z",
      }),
    ];

  return {
    reflectiveObjectRepository: {
      create: vi.fn(),
      getById: vi.fn().mockResolvedValue(createReflectiveObject()),
      listByUser: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
    },
    observationV2Repository: {
      create: vi.fn(),
      getByBundleId: vi.fn(),
      getByReflectiveObjectId: vi.fn().mockResolvedValue(createObservationBundle()),
      archive: vi.fn(),
    },
    glossaryRepository: {
      listTerms: vi.fn(),
      listTermsByReflectiveObject: vi.fn().mockResolvedValue(confirmedTerms),
      getTermById: vi.fn(),
      listAppearanceRecordsByTerm: vi.fn().mockImplementation(async (termId: string) => appearanceRecords[termId] ?? []),
      createTerm: vi.fn(),
      updateTerm: vi.fn(),
      listCandidates: vi.fn(),
      listCandidatesByReflectiveObject: vi.fn().mockResolvedValue(candidates),
      getCandidateById: vi.fn(),
      upsertCandidates: vi.fn(),
      setCandidateLifecycle: vi.fn(),
      resolveCandidate: vi.fn(),
      createAssociation: vi.fn(),
      createAppearanceRecord: vi.fn(),
    },
    latentOpportunityRepository: {
      evaluateAuthoritySameness: vi.fn(),
      determineAcceptedOpportunityStaleness: vi.fn().mockResolvedValue({
        outcome: "current",
        grounds: [],
      }),
      resolveReusableAcceptedGenerationRun: vi.fn().mockResolvedValue({
        reusable: false,
        generationRun: null,
        invalidation: null,
      }),
      createGenerationRun: vi.fn(),
      createIdentity: vi.fn(),
      createManifestation: vi.fn(),
      deleteGenerationRun: vi.fn(),
      deleteIdentity: vi.fn(),
      deleteManifestation: vi.fn(),
      getGenerationRunById: vi.fn(),
      getCurrentGenerationRunForReflectiveObject: vi.fn(),
      getManifestationById: vi.fn(),
      listGenerationRunsForReflectiveObject: vi.fn(),
      listManifestationsByGenerationRun: vi.fn(),
      listManifestationsByPriorityReflectiveObject: vi.fn().mockResolvedValue(priorityManifestations),
      listManifestationsByIdentity: vi.fn(),
      listRecentManifestationsByUser: vi.fn().mockResolvedValue(recentManifestations),
      createGenerationRunInvalidationIfAbsent: vi.fn().mockResolvedValue(null),
      listGenerationRunInvalidations: vi.fn().mockResolvedValue([]),
      markGenerationRunCurrent: vi.fn(),
      markGenerationRunFailed: vi.fn(),
      markGenerationRunRejected: vi.fn(),
      markGenerationRunEmpty: vi.fn(),
      markGenerationRunNoChange: vi.fn(),
      markGenerationRunSuperseded: vi.fn(),
    },
    reflectionRepository: {
      admitReflection: vi.fn(),
      getReflectionById: vi.fn(),
      listReflectionsByUser: vi.fn().mockResolvedValue(reflections),
    },
  };
}

describe("composeOpportunityConstructorInputPacket", () => {
  it("builds a packet with Observation V2 scenes and observations", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.generationContext.priorityReflectiveObjectId).toBe("object-1");
    expect(packet.generationContext.observationBundleId).toBe("bundle-1");
    expect(packet.scenes.map((scene) => scene.sceneStableId)).toEqual(["scene-a", "scene-b"]);
    expect(packet.observations.map((observation) => observation.observationStableId)).toEqual([
      "obs-a1",
      "obs-a2",
      "obs-b1",
      "obs-b2",
    ]);
    expect(packet.observations.map((observation) => observation.category)).toEqual([
      "interaction",
      "affect",
      "interaction",
      "location",
    ]);
    expect(packet.priorityObject.content).toContain("searching for someone");
    expect(packet.priorityObject.summary).toBe("Searching through a house before the scene shifts to a stairwell.");
  });

  it("includes glossary candidates as context only", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

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
      {
        glossaryCandidateId: "candidate-2",
        displayLabel: "Lépcsőház",
        normalizedKey: "stairwell",
        sourceCategory: "location",
        candidateClass: "ambiguous",
        state: "candidate",
        sourceObservationStableId: "obs-b2",
      },
    ]);
  });

  it("includes confirmed glossary terms separately from candidates", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.glossaryContext.confirmedTerms.map((term) => term.glossaryTermId)).toEqual(["term-2", "term-1"]);
    expect(packet.glossaryContext.confirmedTerms[1]?.userNotes).toBe("Recurring search motif.");
    expect(packet.glossaryContext.appearanceRecords).toEqual([
      {
        appearanceRecordId: "appearance-1",
        glossaryTermId: "term-1",
        reflectiveObjectId: "object-0",
        displayLabelAtAppearance: "Ház keresés",
        sourceObservationId: null,
      },
      {
        appearanceRecordId: "appearance-2",
        glossaryTermId: "term-1",
        reflectiveObjectId: "object-1",
        displayLabelAtAppearance: "Ház keresés",
        sourceObservationId: null,
      },
    ]);
  });

  it("includes existing opportunity identities from other reflective objects", async () => {
    const repositories = createRepositories({
      priorityManifestations: [],
      recentManifestations: [
        createManifestation({
          manifestationId: "manifestation-recent-2",
          identityId: "identity-other",
          priorityReflectiveObjectId: "object-0",
          createdAt: "2026-06-14T09:40:00.000Z",
          primaryCategory: "gap",
          nodeElements: ["absence", "search"],
          summary: "An absence remains unresolved.",
        }),
      ],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.existingOpportunityContext.identities).toEqual([
      {
        identityId: "identity-other",
        primaryCategory: "gap",
        secondaryCategories: [],
        lifecycleState: "emerging",
        latestStructure: {
          structureType: "A_TO_B",
          nodes: ["absence", "search"],
        },
        recentManifestationSummaries: [
          {
            manifestationId: "manifestation-recent-2",
            priorityReflectiveObjectId: "object-0",
            structure: {
              kind: "A_TO_B",
              label: "absence -> search",
              elements: ["absence", "search"],
              metadata: {},
            },
            primaryEvidenceObservationTexts: [],
          },
        ],
      },
    ]);
  });

  it("includes admitted reflections as bounded continuity context ordered by admission recency", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.reflectionContext.reflections).toEqual([
      {
        reflectionId: "reflection-2",
        threadId: "thread-older",
        sourceResponseId: "response-older",
        sourceOpeningId: null,
        sourceReflectiveObjectIds: ["object-0"],
        statement: "When searching repeats, uncertainty tends to stay active.",
        pattern: ["Search", "Uncertainty", "Return"],
        admittedAt: "2026-06-16T09:40:00.000Z",
      },
      {
        reflectionId: "reflection-1",
        threadId: "thread-current",
        sourceResponseId: "response-current",
        sourceOpeningId: "opening-current",
        sourceReflectiveObjectIds: ["object-1"],
        statement: "Searching in a house keeps carrying uncertainty.",
        pattern: ["House", "Search", "Uncertainty"],
        admittedAt: "2026-06-15T11:00:00.000Z",
      },
    ]);
    expect(repositories.reflectionRepository.listReflectionsByUser).toHaveBeenCalledWith("user-1", 8);
  });

  it("excludes existing opportunity identities from the current reflective object", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.existingOpportunityContext.identities.map((identity) => identity.identityId)).toEqual([
      "identity-other",
    ]);
    expect(packet.existingOpportunityContext.identities).not.toContainEqual(
      expect.objectContaining({
        identityId: "identity-current",
      }),
    );
  });

  it("removes same-object identities while preserving other-object identities in mixed context", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.existingOpportunityContext.identities).toHaveLength(1);
    expect(packet.existingOpportunityContext.identities[0]).toEqual({
      identityId: "identity-other",
      primaryCategory: "gap",
      secondaryCategories: [],
      lifecycleState: "emerging",
      latestStructure: {
        structureType: "A_TO_B",
        nodes: ["absence", "search"],
      },
      recentManifestationSummaries: [
        {
          manifestationId: "manifestation-recent-2",
          priorityReflectiveObjectId: "object-0",
          structure: {
            kind: "A_TO_B",
            label: "absence -> search",
            elements: ["absence", "search"],
            metadata: {},
          },
          primaryEvidenceObservationTexts: [],
        },
        {
          manifestationId: "manifestation-recent-1",
          priorityReflectiveObjectId: "object-0",
          structure: {
            kind: "A_TO_B",
            label: "absence -> distance",
            elements: ["absence", "distance"],
            metadata: {},
          },
          primaryEvidenceObservationTexts: [],
        },
      ],
    });
  });

  it("returns empty existing opportunity context when none exist", async () => {
    const repositories = createRepositories({
      priorityManifestations: [],
      recentManifestations: [],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.existingOpportunityContext.identities).toEqual([]);
  });

  it("does not read or include legacy latent structures", async () => {
    const repositories = createRepositories();

    await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(repositories.reflectiveObjectRepository.listByUser).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listTerms).not.toHaveBeenCalled();
    expect(repositories.glossaryRepository.listCandidates).not.toHaveBeenCalled();
    expect(repositories.reflectionRepository.getReflectionById).not.toHaveBeenCalled();
  });

  it("preserves priorityReflectiveObjectId", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.generationContext.priorityReflectiveObjectId).toBe("object-1");
    expect(packet.priorityObject.content).toContain("house");
  });

  it("produces deterministic ordering", async () => {
    const repositories = createRepositories();

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.scenes.map((scene) => scene.position)).toEqual([1, 2]);
    expect(packet.observations.map((observation) => observation.position)).toEqual([1, 2, 1, 2]);
    expect(packet.existingOpportunityContext.identities.map((identity) => identity.identityId)).toEqual(["identity-other"]);
  });

  it("handles missing glossary context gracefully", async () => {
    const repositories = createRepositories({
      confirmedTerms: [],
      appearanceRecords: {},
      candidates: [],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.glossaryContext).toEqual({
      confirmedTerms: [],
      appearanceRecords: [],
      candidates: [],
    });
  });

  it("handles missing existing opportunity context gracefully", async () => {
    const repositories = createRepositories({
      recentManifestations: [],
      priorityManifestations: [],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.existingOpportunityContext).toEqual({
      identities: [],
    });
  });

  it("handles missing reflection context gracefully", async () => {
    const repositories = createRepositories({
      reflections: [],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet.reflectionContext).toEqual({
      reflections: [],
    });
  });

  it("builds a realistic minimal example packet fixture", async () => {
    const repositories = createRepositories({
      confirmedTerms: [],
      appearanceRecords: {},
      candidates: [
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
          lastSeenAt: "2026-06-15T09:29:00.000Z",
          createdAt: "2026-06-15T09:29:00.000Z",
          updatedAt: "2026-06-15T09:29:00.000Z",
        },
      ],
      priorityManifestations: [],
      recentManifestations: [],
    });

    const packet = await composeOpportunityConstructorInputPacket({
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      ...repositories,
    });

    expect(packet).toEqual({
      generationContext: {
        runtimeVersion: "latent_opportunity_constructor_v1",
        userId: "user-1",
        priorityReflectiveObjectId: "object-1",
        priorityReflectiveObjectType: "dream",
        priorityReflectiveObjectTitle: "House search dream",
        objectLanguage: "hu",
        observationBundleId: "bundle-1",
        observationRuntimeVersion: "observation_v2_phase1",
        semanticPolicyResult: "accept_with_uncertainty",
        bundleUncertaintyNotes: ["Scene edges remain slightly fuzzy."],
      },
      priorityObject: {
        content: "I move through a house searching for someone, then the scene shifts to a stairwell.",
        summary: "Searching through a house before the scene shifts to a stairwell.",
      },
      scenes: [
        {
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          position: 1,
          summary: "The dreamer searches through a house.",
          evidenceSnippet: "move through a house searching for someone",
          boundarySignals: [
            {
              kind: "goal_change",
              note: "Wandering sharpens into active searching.",
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
        {
          sceneRowId: "bundle-1:scene-b",
          sceneStableId: "scene-b",
          position: 2,
          summary: "The dreamer moves into a stairwell.",
          evidenceSnippet: "the scene shifts to a stairwell",
          boundarySignals: [
            {
              kind: "spatial_change",
              note: "The house interior gives way to a stairwell.",
            },
          ],
          derivedStructures: {
            actors: ["Álmodó"],
            locations: ["lépcsőház"],
            objects: [],
            interactions: ["haladás"],
            affect: [],
            agency: [],
            metacognition: [],
            phenomenology: [],
          },
        },
      ],
      observations: [
        {
          observationV2SceneObservationId: "bundle-1:scene-a:obs-a1",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-a1",
          position: 1,
          text: "The dreamer searches through the house.",
          category: "interaction",
          evidence: [
            {
              snippet: "move through a house searching for someone",
              spanStart: 2,
              spanEnd: 43,
            },
          ],
          uncertaintyNote: null,
        },
        {
          observationV2SceneObservationId: "bundle-1:scene-a:obs-a2",
          sceneRowId: "bundle-1:scene-a",
          sceneStableId: "scene-a",
          observationStableId: "obs-a2",
          position: 2,
          text: "Uncertainty builds during the search.",
          category: "affect",
          evidence: [
            {
              snippet: "searching for someone",
              spanStart: 22,
              spanEnd: 43,
            },
          ],
          uncertaintyNote: "The source of uncertainty is not explicit.",
        },
        {
          observationV2SceneObservationId: "bundle-1:scene-b:obs-b1",
          sceneRowId: "bundle-1:scene-b",
          sceneStableId: "scene-b",
          observationStableId: "obs-b1",
          position: 1,
          text: "Movement continues through the transition.",
          category: "interaction",
          evidence: [
            {
              snippet: "scene shifts",
              spanStart: 58,
              spanEnd: 70,
            },
          ],
          uncertaintyNote: "The precise transition tone is unclear.",
        },
        {
          observationV2SceneObservationId: "bundle-1:scene-b:obs-b2",
          sceneRowId: "bundle-1:scene-b",
          sceneStableId: "scene-b",
          observationStableId: "obs-b2",
          position: 2,
          text: "The scene now centers on a stairwell.",
          category: "location",
          evidence: [
            {
              snippet: "shifts to a stairwell",
              spanStart: 67,
              spanEnd: 87,
            },
          ],
          uncertaintyNote: null,
        },
      ],
      glossaryContext: {
        confirmedTerms: [],
        appearanceRecords: [],
        candidates: [
          {
            glossaryCandidateId: "candidate-1",
            displayLabel: "Ismeretlen személy",
            normalizedKey: "unknown_person",
            sourceCategory: "actor",
            candidateClass: "new_candidate",
            state: "candidate",
            sourceObservationStableId: "obs-a1",
          },
        ],
      },
      existingOpportunityContext: {
        identities: [],
      },
      reflectionContext: {
        reflections: [
          {
            reflectionId: "reflection-2",
            threadId: "thread-older",
            sourceResponseId: "response-older",
            sourceOpeningId: null,
            sourceReflectiveObjectIds: ["object-0"],
            statement: "When searching repeats, uncertainty tends to stay active.",
            pattern: ["Search", "Uncertainty", "Return"],
            admittedAt: "2026-06-16T09:40:00.000Z",
          },
          {
            reflectionId: "reflection-1",
            threadId: "thread-current",
            sourceResponseId: "response-current",
            sourceOpeningId: "opening-current",
            sourceReflectiveObjectIds: ["object-1"],
            statement: "Searching in a house keeps carrying uncertainty.",
            pattern: ["House", "Search", "Uncertainty"],
            admittedAt: "2026-06-15T11:00:00.000Z",
          },
        ],
      },
    });
  });
});
