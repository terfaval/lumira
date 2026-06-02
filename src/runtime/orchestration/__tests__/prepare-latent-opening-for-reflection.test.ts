import { describe, expect, it, vi } from "vitest";

import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type { LatentRepository } from "@/src/domain/latent/contracts";
import type { LatentSnapshot } from "@/src/domain/latent/types";
import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import type { ThreadRepository } from "@/src/domain/threads/contracts";
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

describe("prepareLatentOpeningForReflection", () => {
  function baseRepositories() {
    return {
      reflectiveObjectRepository: {
        getById: vi.fn(async () => null),
      } as unknown as ReflectiveObjectRepository,
      observationRepository: {
        listByReflectiveObject: vi.fn(async () => []),
      } as unknown as ObservationRepository,
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
    };
  }

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
