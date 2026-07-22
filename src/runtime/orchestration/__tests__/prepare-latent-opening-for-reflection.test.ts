import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentRepository } from "@/src/domain/latent/contracts";
import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import type { ObservationRepository, ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
const { generateLatentOpportunitiesForReflectiveObject } = vi.hoisted(() => ({
  generateLatentOpportunitiesForReflectiveObject: vi.fn(),
}));
const { generateOpeningV2CreateInputFromManifestation } = vi.hoisted(() => ({
  generateOpeningV2CreateInputFromManifestation: vi.fn(),
}));

vi.mock("@/src/runtime/orchestration/generate-latent-opportunities-for-reflective-object", () => ({
  generateLatentOpportunitiesForReflectiveObject,
}));
vi.mock("@/src/cognition/openings/opening-v2-constructor", () => ({
  generateOpeningV2CreateInputFromManifestation,
}));

import { prepareLatentOpeningForReflection } from "@/src/runtime/orchestration/prepare-latent-opening-for-reflection";

function makeLatentSnapshot(id: string, reflectiveObjectId: string): LatentSnapshot {
  return {
    id,
    userId: "user-1",
    summary: "summary",
    confidenceBand: "tentative",
    visibility: "reflective_space_optional",
    archivedAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    provenance: {
      sourceReflectiveObjects: [reflectiveObjectId],
      sourceObservations: ["obs-1"],
      sourceGlossaryTerms: [],
      sourceThreads: [],
      sourceResponses: [],
      generationContext: "test",
    },
    lifecycle: undefined,
    signals: [],
    suggestions: [
      {
        id: "sug-1",
        snapshotId: id,
        userId: "user-1",
        suggestionType: "possible_opening",
        phrasing: "A gentle opening may be available here.",
        confidenceBand: "moderate",
        visibility: "reflective_space_optional",
        provenance: {
          sourceReflectiveObjects: [reflectiveObjectId],
          sourceObservations: ["obs-1"],
          sourceGlossaryTerms: [],
          sourceThreads: [],
          sourceResponses: [],
          generationContext: "test",
        },
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  };
}

function makeManifestation(id: string, reflectiveObjectId: string): LatentOpportunityManifestation {
  return {
    id,
    identityId: `identity-${id}`,
    userId: "user-1",
    priorityReflectiveObjectId: reflectiveObjectId,
    generationRunId: "run-1",
    summary: "Search movement shifts into uncertainty without fixed meaning.",
    structure: {
      kind: "A_TO_B",
      label: "search to uncertainty",
      elements: ["search", "uncertainty"],
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
      id: `identity-${id}`,
      userId: "user-1",
      title: "search to uncertainty",
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
        id: `${id}:block:1`,
        manifestationId: id,
        userId: "user-1",
        reflectiveObjectId,
        role: "priority",
        summary: "priority evidence",
        position: 0,
        createdAt: "2026-06-15T12:00:00.000Z",
        observations: [
          {
            id: `${id}:obs:1`,
            evidenceBlockId: `${id}:block:1`,
            userId: "user-1",
            observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
            sceneId: "bundle-1:scene-1",
            role: "primary_support",
            supportsNodeKeys: ["A"],
            supportsEdgeIndexes: [0],
            createdAt: "2026-06-15T12:00:00.000Z",
          },
        ],
      },
    ],
    glossaryLinks: [
      {
        id: `${id}:glossary:1`,
        manifestationId: id,
        userId: "user-1",
        glossaryTermId: "term-1",
        role: "continuity",
        createdAt: "2026-06-15T12:00:00.000Z",
      },
    ],
  };
}

function makeGenerationRun(id: string, reflectiveObjectId: string) {
  return {
    id,
    userId: "user-1",
    priorityReflectiveObjectId: reflectiveObjectId,
    status: "current",
    inputFingerprint: "fingerprint:test",
    triggerReason: null,
    predecessorRunId: null,
    acceptedAt: "2026-07-18T12:01:00.000Z",
    supersededAt: null,
    createdAt: "2026-07-18T12:00:00.000Z",
    updatedAt: "2026-07-18T12:01:00.000Z",
  };
}

function makeLegacyObservation(reflectiveObjectId: string) {
  return {
    id: "obs-1",
    userId: "user-1",
    reflectiveObjectId,
    source: "system_descriptive_extract",
    summary: "summary",
    uncertaintyNotes: [],
    semanticPolicyResult: "accept",
    semanticPolicyReasons: [],
    provenanceTier: "system_extract",
    summaryTrace: [],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_semantic_guardrails_v1",
    status: "active",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    fragments: [
      {
        id: "frag-1",
        observationId: "obs-1",
        reflectiveObjectId,
        userId: "user-1",
        category: "scene",
        fragmentText: "A quiet room appeared.",
        evidenceAdequacy: "snippet_only",
        evidence: {
          snippet: "A quiet room appeared.",
          spanStart: null,
          spanEnd: null,
          contextLabel: null,
        },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ],
  };
}

describe("prepareLatentOpeningForReflection", () => {
  function baseRepositories() {
    return {
      reflectiveObjectRepository: {
        getById: vi.fn(async () => null),
      } as unknown as ReflectiveObjectRepository,
      observationRepository: {
        listByReflectiveObject: vi.fn(async () => []),
      } as unknown as ObservationRepository,
      observationV2Repository: {
        getByReflectiveObjectId: vi.fn(async () => null),
      } as unknown as ObservationV2Repository,
      glossaryRepository: {
        listTerms: vi.fn(async () => []),
      } as unknown as GlossaryRepository,
      threadRepository: {
        listThreadsByUser: vi.fn(async () => []),
      } as unknown as ThreadRepository,
      responseRepository: {
        listResponsesByReflectiveObject: vi.fn(async () => []),
        listResponsesByUser: vi.fn(async () => []),
      } as unknown as ReflectiveResponseRepository,
      openingRepository: {
        listRecentOpeningsByUser: vi.fn(async () => []),
        listOpeningsByLatentSnapshot: vi.fn(async () => []),
        createOpening: vi.fn(async () => ({ id: "opening-new" })),
      } as unknown as OpeningRepository,
      latentRepository: {
        listSnapshotsByUser: vi.fn(async () => []),
        createSnapshot: vi.fn(async () => makeLatentSnapshot("latent-generated", "obj-1")),
      } as unknown as LatentRepository,
      latentOpportunityRepository: {
        determineAcceptedOpportunityStaleness: vi.fn(async () => ({
          outcome: "current",
          grounds: [],
        })),
        resolveReusableAcceptedGenerationRun: vi.fn(async () => ({
          reusable: false,
          generationRun: null,
          invalidation: null,
        })),
        getCurrentGenerationRunForReflectiveObject: vi.fn(async () => null),
        listGenerationRunsForReflectiveObject: vi.fn(async () => []),
        listManifestationsByGenerationRun: vi.fn(async () => []),
        listManifestationsByPriorityReflectiveObject: vi.fn(async () => []),
      } as unknown as LatentOpportunityRepository,
    };
  }

  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    generateLatentOpportunitiesForReflectiveObject.mockReset();
    generateOpeningV2CreateInputFromManifestation.mockReset();
    warnSpy.mockClear();
  });

  it("skips preparation when reflective object is missing", async () => {
    const repositories = baseRepositories();

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.reflectiveObjectRepository.getById).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.listSnapshotsByUser).not.toHaveBeenCalled();
  });

  it("prefers latent v2 manifestations before legacy snapshot generation", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.latentOpportunityRepository = {
      determineAcceptedOpportunityStaleness: vi.fn(async () => ({
        outcome: "current",
        grounds: [],
      })),
      resolveReusableAcceptedGenerationRun: vi.fn(async () => ({
        reusable: true,
        generationRun: makeGenerationRun("run-1", "obj-1"),
        invalidation: null,
      })),
      getCurrentGenerationRunForReflectiveObject: vi.fn(async () => makeGenerationRun("run-1", "obj-1")),
      listGenerationRunsForReflectiveObject: vi.fn(async () => [makeGenerationRun("run-1", "obj-1")]),
      listManifestationsByGenerationRun: vi.fn(async () => [makeManifestation("man-1", "obj-1")]),
      listManifestationsByPriorityReflectiveObject: vi.fn(async () => [makeManifestation("man-1", "obj-1")]),
    } as unknown as LatentOpportunityRepository;
    repositories.openingRepository = {
      listRecentOpeningsByUser: vi.fn(async () => []),
      createOpening: vi.fn(async () => ({ id: "opening-v2" })),
    } as unknown as OpeningRepository;
    generateOpeningV2CreateInputFromManifestation.mockResolvedValue({
      mode: "generated",
      packet: {},
      rawOutput: "{}",
      opening: {
        userId: "user-1",
        openingType: "reflective_question",
        tone: "gentle",
        utterance: "Mi maradt meg benned abból, amikor már együtt kerestétek a telefont Bórával?",
        visibility: "invitation_surface",
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: ["bundle-1:scene-1:obs-1"],
          sourceGlossaryTerms: ["term-1"],
          sourceThreads: [],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "opening_v2_constructor_mvp",
          openingContext: {
            context:
              "A jelenet elején a telefon körüli játék és bizonytalanság áll előtérben. Később már az együtt keresés válik hangsúlyossá.",
            sourceOpportunityManifestationId: "man-1",
            openingKind: "question",
            sourceRuntime: "opening_v2_constructor_mvp",
          },
          sourceOpportunityManifestationId: "man-1",
        },
      },
    });

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentRepository.createSnapshot).not.toHaveBeenCalled();
    expect(generateLatentOpportunitiesForReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.resolveReusableAcceptedGenerationRun).toHaveBeenCalledWith(
      "obj-1",
      "user-1",
    );
    expect(repositories.latentOpportunityRepository.getCurrentGenerationRunForReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentOpportunityRepository.listManifestationsByGenerationRun).toHaveBeenCalledWith(
      "run-1",
      "user-1",
    );
    expect(generateOpeningV2CreateInputFromManifestation).toHaveBeenCalledWith(
      expect.objectContaining({
        objectLanguage: "unknown",
        manifestation: expect.objectContaining({ id: "man-1" }),
      }),
    );
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledWith(
      expect.objectContaining({
        openingType: "reflective_question",
        utterance: "Mi maradt meg benned abból, amikor már együtt kerestétek a telefont Bórával?",
        provenance: expect.objectContaining({
          latentSnapshotReference: null,
          openingGenerationContext: "opening_v2_constructor_mvp",
          sourceObjects: ["obj-1"],
          sourceObservations: ["bundle-1:scene-1:obs-1"],
          sourceGlossaryTerms: ["term-1"],
          openingContext: expect.objectContaining({
            sourceOpportunityManifestationId: "man-1",
          }),
        }),
      }),
    );
  });

  it("skips latent generation when no observations exist", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.observationRepository.listByReflectiveObject).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.listSnapshotsByUser).not.toHaveBeenCalled();
    expect(repositories.latentRepository.createSnapshot).not.toHaveBeenCalled();
  });

  it("falls back to legacy latent snapshot generation when latent v2 generation fails", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [
        {
          id: "obs-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          source: "system_descriptive_extract",
          summary: "summary",
          uncertaintyNotes: [],
          semanticPolicyResult: "accept",
          semanticPolicyReasons: [],
          provenanceTier: "system_extract",
          summaryTrace: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_semantic_guardrails_v1",
          status: "active",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          fragments: [
            {
              id: "frag-1",
              observationId: "obs-1",
              reflectiveObjectId: "obj-1",
              userId: "user-1",
              category: "scene",
              fragmentText: "A quiet room appeared.",
              evidenceAdequacy: "snippet_only",
              evidence: {
                snippet: "A quiet room appeared.",
                spanStart: null,
                spanEnd: null,
                contextLabel: null,
              },
              uncertaintyNote: null,
              position: 0,
              createdAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
      ]),
    } as unknown as ObservationRepository;

    generateLatentOpportunitiesForReflectiveObject.mockResolvedValue({
      mode: "failed",
      stage: "llm",
      reason: "model_unavailable",
    });

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(generateLatentOpportunitiesForReflectiveObject).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.createSnapshot).toHaveBeenCalledTimes(1);
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "latent_v2_opening_prep_fallback",
      expect.objectContaining({
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        reason: "generation_failed:llm",
      }),
    );
  });

  it("falls back to the no-latent path when latent v2 returns an assessed-empty result", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [makeLegacyObservation("obj-1")]),
    } as unknown as ObservationRepository;

    generateLatentOpportunitiesForReflectiveObject.mockResolvedValue({
      mode: "empty",
      packet: {} as never,
      generationRunId: "run-empty-1",
      source: "new_assessment",
      rawOutput: "{}",
      parsedOutput: {} as never,
      validatedOutput: {} as never,
    });

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(generateLatentOpportunitiesForReflectiveObject).toHaveBeenCalledTimes(1);
    expect(repositories.observationRepository.listByReflectiveObject).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.listSnapshotsByUser).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.createSnapshot).toHaveBeenCalledTimes(1);
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does not regenerate when an assessed-empty latent run already exists", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [makeLegacyObservation("obj-1")]),
    } as unknown as ObservationRepository;
    repositories.latentOpportunityRepository = {
      determineAcceptedOpportunityStaleness: vi.fn(async () => ({
        outcome: "current",
        grounds: [],
      })),
      resolveReusableAcceptedGenerationRun: vi.fn(async () => ({
        reusable: true,
        generationRun: {
          ...makeGenerationRun("run-empty-1", "obj-1"),
          status: "empty",
          acceptedAt: null,
          updatedAt: "2026-07-18T12:02:00.000Z",
        },
        invalidation: null,
      })),
      getCurrentGenerationRunForReflectiveObject: vi.fn(async () => null),
      listGenerationRunsForReflectiveObject: vi.fn(async () => [
        {
          ...makeGenerationRun("run-empty-1", "obj-1"),
          status: "empty",
          acceptedAt: null,
          updatedAt: "2026-07-18T12:02:00.000Z",
        },
      ]),
      listManifestationsByGenerationRun: vi.fn(async () => []),
      listManifestationsByPriorityReflectiveObject: vi.fn(async () => []),
    } as unknown as LatentOpportunityRepository;

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(generateLatentOpportunitiesForReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentRepository.listSnapshotsByUser).toHaveBeenCalledTimes(1);
    expect(repositories.latentRepository.createSnapshot).toHaveBeenCalledTimes(1);
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
  });

  it("continues generation without manifestation reuse when the accepted current run is invalidated", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.latentOpportunityRepository = {
      determineAcceptedOpportunityStaleness: vi.fn(async () => ({
        outcome: "current",
        grounds: [],
      })),
      resolveReusableAcceptedGenerationRun: vi.fn(async () => ({
        reusable: false,
        generationRun: makeGenerationRun("run-invalidated-1", "obj-1"),
        invalidation: {
          id: "invalidate-1",
          userId: "user-1",
          priorityReflectiveObjectId: "obj-1",
          targetGenerationRunId: "run-invalidated-1",
          sourceLayer: "observation",
          sourceEntityType: "observation_v2_bundle",
          sourceEntityId: "bundle-1",
          sourceRevision: "archive:bundle-1",
          reason: "observation_bundle_archived",
          createdAt: "2026-07-19T10:00:00.000Z",
        },
      })),
      getCurrentGenerationRunForReflectiveObject: vi.fn(async () => null),
      listGenerationRunsForReflectiveObject: vi.fn(async () => [makeGenerationRun("run-invalidated-1", "obj-1")]),
      listManifestationsByGenerationRun: vi.fn(async () => [makeManifestation("man-stale-1", "obj-1")]),
      listManifestationsByPriorityReflectiveObject: vi.fn(async () => []),
    } as unknown as LatentOpportunityRepository;
    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [makeLegacyObservation("obj-1")]),
    } as unknown as ObservationRepository;

    generateLatentOpportunitiesForReflectiveObject.mockResolvedValue({
      mode: "persisted",
      packet: {} as never,
      rawOutput: "{}",
      parsedOutput: {} as never,
      validatedOutput: {} as never,
      mappedPayload: { creates: [] } as never,
      persistedIdentities: [],
      persistedManifestations: [makeManifestation("man-fresh-1", "obj-1")],
    });
    generateOpeningV2CreateInputFromManifestation.mockResolvedValue({
      mode: "generated",
      packet: {},
      rawOutput: "{}",
      opening: {
        userId: "user-1",
        openingType: "reflective_question",
        tone: "gentle",
        utterance: "A fresh opening remains available here.",
        visibility: "invitation_surface",
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: ["bundle-1:scene-1:obs-1"],
          sourceGlossaryTerms: ["term-1"],
          sourceThreads: [],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "opening_v2_constructor_mvp",
          sourceOpportunityManifestationId: "man-fresh-1",
        },
      },
    });

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(generateLatentOpportunitiesForReflectiveObject).toHaveBeenCalledTimes(1);
    expect(generateLatentOpportunitiesForReflectiveObject).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        priorityReflectiveObjectId: "obj-1",
        acceptedRunReuseGuard: "skip",
      }),
    );
    expect(repositories.latentOpportunityRepository.listManifestationsByGenerationRun).not.toHaveBeenCalled();
    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentRepository.createSnapshot).not.toHaveBeenCalled();
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
  });

  it("continues generation without reusing an invalidated accepted empty run", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;
    repositories.observationV2Repository = {
      getByReflectiveObjectId: vi.fn(async () => ({ id: "bundle-1" })),
    } as unknown as ObservationV2Repository;
    repositories.latentOpportunityRepository = {
      determineAcceptedOpportunityStaleness: vi.fn(async () => ({
        outcome: "current",
        grounds: [],
      })),
      resolveReusableAcceptedGenerationRun: vi.fn(async () => ({
        reusable: false,
        generationRun: {
          ...makeGenerationRun("run-empty-invalidated-1", "obj-1"),
          status: "empty",
          acceptedAt: null,
        },
        invalidation: {
          id: "invalidate-1",
          userId: "user-1",
          priorityReflectiveObjectId: "obj-1",
          targetGenerationRunId: "run-empty-invalidated-1",
          sourceLayer: "observation",
          sourceEntityType: "observation_v2_bundle",
          sourceEntityId: "bundle-1",
          sourceRevision: "archive:bundle-1",
          reason: "observation_bundle_archived",
          createdAt: "2026-07-19T10:00:00.000Z",
        },
      })),
      getCurrentGenerationRunForReflectiveObject: vi.fn(async () => null),
      listGenerationRunsForReflectiveObject: vi.fn(async () => []),
      listManifestationsByGenerationRun: vi.fn(async () => [makeManifestation("man-stale-1", "obj-1")]),
      listManifestationsByPriorityReflectiveObject: vi.fn(async () => []),
    } as unknown as LatentOpportunityRepository;

    generateLatentOpportunitiesForReflectiveObject.mockResolvedValue({
      mode: "persisted",
      packet: {} as never,
      rawOutput: "{}",
      parsedOutput: {} as never,
      validatedOutput: {} as never,
      mappedPayload: { creates: [] } as never,
      persistedIdentities: [],
      persistedManifestations: [makeManifestation("man-fresh-2", "obj-1")],
    });
    generateOpeningV2CreateInputFromManifestation.mockResolvedValue({
      mode: "generated",
      packet: {},
      rawOutput: "{}",
      opening: {
        userId: "user-1",
        openingType: "reflective_question",
        tone: "gentle",
        utterance: "A fresh opening remains available here.",
        visibility: "invitation_surface",
        provenance: {
          sourceObjects: ["obj-1"],
          sourceObservations: ["bundle-1:scene-1:obs-1"],
          sourceGlossaryTerms: ["term-1"],
          sourceThreads: [],
          sourceResponses: [],
          latentSnapshotReference: null,
          confidenceBand: "moderate",
          openingGenerationContext: "opening_v2_constructor_mvp",
          sourceOpportunityManifestationId: "man-fresh-2",
        },
      },
    });

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.latentOpportunityRepository.listManifestationsByGenerationRun).not.toHaveBeenCalled();
    expect(generateLatentOpportunitiesForReflectiveObject).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        priorityReflectiveObjectId: "obj-1",
        acceptedRunReuseGuard: "skip",
      }),
    );
    expect(repositories.observationRepository.listByReflectiveObject).not.toHaveBeenCalled();
    expect(repositories.latentRepository.createSnapshot).not.toHaveBeenCalled();
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
  });

  it("reuses existing latent and opening artifacts without duplicate creation", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;

    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [
        {
          id: "obs-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          fragments: [],
        },
      ]),
    } as unknown as ObservationRepository;

    repositories.latentRepository = {
      listSnapshotsByUser: vi.fn(async () => [makeLatentSnapshot("latent-1", "obj-1")]),
      createSnapshot: vi.fn(),
    } as unknown as LatentRepository;

    repositories.openingRepository = {
      listOpeningsByLatentSnapshot: vi.fn(async () => [
        {
          id: "opening-1",
        },
      ]),
      createOpening: vi.fn(),
    } as unknown as OpeningRepository;

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.latentRepository.createSnapshot).not.toHaveBeenCalled();
    expect(repositories.openingRepository.createOpening).not.toHaveBeenCalled();
  });

  it("creates latent snapshot and evaluates openings when artifacts do not yet exist", async () => {
    const repositories = baseRepositories();
    repositories.reflectiveObjectRepository = {
      getById: vi.fn(async () => ({
        id: "obj-1",
        userId: "user-1",
        objectType: "dream",
        title: "title",
        primaryContent: "content",
        sourceContext: "manual",
        state: "active",
        metadata: {},
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      })),
    } as unknown as ReflectiveObjectRepository;

    repositories.observationRepository = {
      listByReflectiveObject: vi.fn(async () => [
        {
          id: "obs-1",
          userId: "user-1",
          reflectiveObjectId: "obj-1",
          source: "system_descriptive_extract",
          summary: "summary",
          uncertaintyNotes: [],
          semanticPolicyResult: "accept",
          semanticPolicyReasons: [],
          provenanceTier: "system_extract",
          summaryTrace: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_semantic_guardrails_v1",
          status: "active",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
          fragments: [
            {
              id: "frag-1",
              observationId: "obs-1",
              reflectiveObjectId: "obj-1",
              userId: "user-1",
              category: "scene",
              fragmentText: "A quiet room appeared.",
              evidenceAdequacy: "snippet_only",
              evidence: {
                snippet: "A quiet room appeared.",
                spanStart: null,
                spanEnd: null,
                contextLabel: null,
              },
              uncertaintyNote: null,
              position: 0,
              createdAt: "2026-06-01T00:00:00.000Z",
              updatedAt: "2026-06-01T00:00:00.000Z",
            },
          ],
        },
      ]),
    } as unknown as ObservationRepository;

    const createdSnapshot = makeLatentSnapshot("latent-new", "obj-1");
    repositories.latentRepository = {
      listSnapshotsByUser: vi.fn(async () => []),
      createSnapshot: vi.fn(async () => createdSnapshot),
    } as unknown as LatentRepository;

    repositories.openingRepository = {
      listRecentOpeningsByUser: vi.fn(async () => []),
      listOpeningsByLatentSnapshot: vi.fn(async () => []),
      createOpening: vi.fn(async () => ({ id: "opening-new" })),
    } as unknown as OpeningRepository;

    await prepareLatentOpeningForReflection({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      repositories,
    });

    expect(repositories.latentRepository.createSnapshot).toHaveBeenCalledTimes(1);
    expect(repositories.openingRepository.createOpening).toHaveBeenCalledTimes(1);
  });
});
