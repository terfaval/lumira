import { describe, expect, it, vi } from "vitest";

import {
  projectAcceptedAuthorityEvidence,
  SupabaseLatentOpportunityRepository,
} from "@/src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository";
import type {
  CreateLatentOpportunityManifestationInput,
  LatentAuthorityProvenance,
} from "@/src/domain/latent-v2/types";

function createManifestationInput(): CreateLatentOpportunityManifestationInput {
  return {
    identityId: "identity-1",
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    generationRunId: "run-1",
    summary: "A transition from open movement into threat remains notable.",
    structure: {
      kind: "transition",
      label: "Exploration -> danger",
      elements: ["exploration", "danger"],
    },
    primaryCategory: "transition",
    secondaryCategories: ["tension", "curiosity"],
    credibilityScore: 0.82,
    reflectivePotentialScore: 0.77,
    salienceBand: "high",
    salienceRationale: {
      evidenceStrength: "strong",
      continuitySupport: "light",
    },
    constructionMetadata: {
      source: "llm_constructor",
      model: "gpt-test",
      version: "latent_v2_test",
    },
    glossaryLinks: [
      {
        glossaryTermId: "term-1",
        role: "continuity",
      },
    ],
    evidenceBlocks: [
      {
        role: "priority",
        reflectiveObjectId: "object-1",
        summary: "Current dream transition evidence.",
        position: 0,
        observations: [
          ({
            observationV2SceneObservationId: "bundle-1:scene-1:obs-1",
            sceneId: "scene-1",
            role: "primary_support",
            supportsNodeKeys: ["issue", "action"],
            supportsEdgeIndexes: [0],
          } as unknown as CreateLatentOpportunityManifestationInput["evidenceBlocks"][number]["observations"][number]),
        ],
      },
    ],
  };
}

function createGenerationRunRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "run-1",
    user_id: "user-1",
    priority_reflective_object_id: "object-1",
    status: "pending",
    input_fingerprint: "fingerprint:test",
    authority_fingerprint: "a".repeat(64),
    authority_provenance: {
      dream: {
        priorityReflectiveObjectId: "object-1",
      },
    },
    context_provenance: {
      existingOpportunityContext: {
        identities: [],
      },
      truncationNote: null,
    },
    execution_provenance: {
      constructorRuntimeVersion: "latent_opportunity_constructor_v1",
    },
    trigger_reason: null,
    predecessor_run_id: null,
    accepted_at: null,
    superseded_at: null,
    created_at: "2026-07-18T10:00:00.000Z",
    updated_at: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

function createGenerationRun(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "run-1",
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    status: "pending",
    inputFingerprint: "fingerprint:test",
    authorityFingerprint: "a".repeat(64),
    authorityProvenance: {
      dream: {
        priorityReflectiveObjectId: "object-1",
      },
    },
    contextProvenance: {
      existingOpportunityContext: {
        identities: [],
      },
      truncationNote: null,
    },
    executionProvenance: {
      constructorRuntimeVersion: "latent_opportunity_constructor_v1",
    },
    triggerReason: null,
    predecessorRunId: null,
    acceptedAt: null,
    supersededAt: null,
    createdAt: "2026-07-18T10:00:00.000Z",
    updatedAt: "2026-07-18T10:00:00.000Z",
    ...overrides,
  };
}

function createInvalidationEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "invalidate-1",
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    targetGenerationRunId: "run-1",
    sourceLayer: "observation",
    sourceEntityType: "observation_v2_bundle",
    sourceEntityId: "bundle-1",
    sourceRevision: "archive:bundle-1",
    reason: "observation_bundle_archived",
    createdAt: "2026-07-19T10:00:00.000Z",
    ...overrides,
  };
}

function createManifestation(
  id: string,
  generationRunId: string,
  identityId: string,
  overrides: Partial<Record<string, unknown>> = {},
) {
  return {
    id,
    generationRunId,
    identityId,
    userId: "user-1",
    priorityReflectiveObjectId: "object-1",
    summary: "A transition from open movement into threat remains notable.",
    structure: {
      kind: "transition",
      label: "Exploration -> danger",
      elements: ["exploration", "danger"],
    },
    primaryCategory: "transition",
    secondaryCategories: ["tension", "curiosity"],
    credibilityScore: 0.82,
    reflectivePotentialScore: 0.77,
    salienceBand: "high",
    salienceRationale: {},
    constructionMetadata: {},
    archivedAt: null,
    createdAt: "2026-07-20T10:05:00.000Z",
    updatedAt: "2026-07-20T10:05:00.000Z",
    identity: {
      id: identityId,
      userId: "user-1",
      title: "Identity",
      primaryCategory: "transition",
      secondaryCategories: [],
      lifecycleState: "emerging",
      status: "active",
      archivedAt: null,
      createdAt: "2026-07-20T10:05:00.000Z",
      updatedAt: "2026-07-20T10:05:00.000Z",
    },
    evidenceBlocks: [],
    glossaryLinks: [],
    ...overrides,
  };
}

function createAuthorityProvenance(
  overrides: Partial<LatentAuthorityProvenance> = {},
): LatentAuthorityProvenance {
  return {
    dream: {
      priorityReflectiveObjectId: "object-1",
      title: "Dream",
      objectLanguage: "en",
      content: "I am in a stairwell.",
      summary: "Stairwell dream",
    },
    observation: {
      family: "observation_v2",
      observationBundleId: "bundle-1",
      observationRuntimeVersion: "obs-v2",
      semanticPolicyResult: "accept",
      bundleUncertaintyNotes: [],
      scenes: [
        {
          sceneRowId: "scene-row-1",
          sceneStableId: "scene-stable-1",
          position: 0,
          summary: "A stairwell",
          evidenceSnippet: "I am in a stairwell",
          boundarySignals: [{ kind: "transition", note: "arrives" }],
          derivedStructures: { setting: ["stairs"] },
        },
      ],
      observations: [
        {
          observationV2SceneObservationId: "obs-1",
          sceneRowId: "scene-row-1",
          sceneStableId: "scene-stable-1",
          observationStableId: "obs-stable-1",
          position: 0,
          text: "A stairwell appears.",
          category: "setting",
          evidence: [{ snippet: "stairwell", spanStart: 9, spanEnd: 18 }],
          uncertaintyNote: null,
        },
      ],
    },
    glossary: {
      confirmedTerms: [],
      appearanceRecords: [],
    },
    reflections: [],
    ...overrides,
  };
}

describe("SupabaseLatentOpportunityRepository", () => {
  it("exposes a repository-owned authority evaluation seam", () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never) as unknown as Record<
      string,
      unknown
    >;

    expect(typeof repository.evaluateAuthoritySameness).toBe("function");
  });

  it("exposes a repository-owned staleness determination seam", () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never) as unknown as Record<
      string,
      unknown
    >;

    expect(typeof repository.determineAcceptedOpportunityStaleness).toBe("function");
  });

  it("exposes atomic successor acceptance and history-derived posture seams", () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never) as unknown as Record<
      string,
      unknown
    >;

    expect(typeof repository.acceptGenerationRunSuccessorAtomically).toBe("function");
    expect(typeof repository.listLifecycleEventsByIdentity).toBe("function");
    expect(typeof repository.listIdentityRelationshipsByIdentity).toBe("function");
    expect("deleteIdentity" in repository).toBe(false);
    expect("deleteManifestation" in repository).toBe(false);
    expect("createIdentity" in repository).toBe(false);
    expect("createManifestation" in repository).toBe(false);
    expect("deleteManifestationAfterFailure" in repository).toBe(false);
  });

  it("reconstructs posture from immutable lifecycle history in deterministic order", () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never) as unknown as {
      projectHistoryDerivedLifecycleState: (input: {
        identityId: string;
        events: Array<{
          id: string;
          eventType: string;
          priorLifecycleState: string | null;
          createdAt: string;
          resultingLifecycleState: string;
        }>;
      }) => { identityId: string; lifecycleState: string; orderedEventIds: string[] };
    };

    const projection = repository.projectHistoryDerivedLifecycleState({
      identityId: "identity-1",
      events: [
        {
          id: "event-2",
          eventType: "reinforcement",
          priorLifecycleState: "emerging",
          createdAt: "2026-07-22T10:00:00.000Z",
          resultingLifecycleState: "reinforced",
        },
        {
          id: "event-1",
          eventType: "emergence",
          priorLifecycleState: null,
          createdAt: "2026-07-22T10:00:00.000Z",
          resultingLifecycleState: "emerging",
        },
      ],
    });

    expect(projection).toEqual({
      identityId: "identity-1",
      lifecycleState: "reinforced",
      orderedEventIds: ["event-1", "event-2"],
    });
  });

  it("passes materialized identity, manifestation, and lifecycle rows into atomic successor acceptance", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: createGenerationRunRow({
        id: "run-2",
        status: "current",
        predecessor_run_id: "run-1",
        accepted_at: "2026-07-22T10:01:00.000Z",
      }),
      error: null,
    });
    const repository = new SupabaseLatentOpportunityRepository({ rpc } as never);

    await repository.acceptGenerationRunSuccessorAtomically({
      userId: "user-1",
      predecessorRunId: "run-1",
      successorRunId: "run-2",
      identities: [
        {
          id: "identity-2",
          userId: "user-1",
          title: "Renewed transition",
          primaryCategory: "transition",
          lifecycleState: "emerging",
        },
      ],
      manifestations: [
        {
          ...createManifestationInput(),
          id: "manifestation-2",
          identityId: "identity-2",
          generationRunId: "run-2",
        },
      ],
      lifecycleEvents: [
        {
          id: "event-2",
          userId: "user-1",
          identityId: "identity-2",
          eventType: "emergence",
          priorLifecycleState: null,
          resultingLifecycleState: "emerging",
          resultingGenerationRunId: "run-2",
          resultingManifestationIds: ["manifestation-2"],
          triggeringReflectiveObjectId: "object-1",
        },
      ],
      identityRelationships: [],
    });

    expect(rpc).toHaveBeenCalledWith(
      "accept_latent_generation_run_successor",
      expect.objectContaining({
        p_user_id: "user-1",
        p_predecessor_run_id: "run-1",
        p_successor_run_id: "run-2",
        p_identities: [
          expect.objectContaining({
            id: "identity-2",
            user_id: "user-1",
            lifecycle_state: "emerging",
          }),
        ],
        p_manifestations: [
          expect.objectContaining({
            id: "manifestation-2",
            generation_run_id: "run-2",
            identity_id: "identity-2",
          }),
        ],
        p_lifecycle_events: [
          expect.objectContaining({
            id: "event-2",
            identity_id: "identity-2",
            event_type: "emergence",
          }),
        ],
      }),
    );
  });

  it("returns stale when supplied authority evaluation proves material divergence", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness(
        {
          priorityReflectiveObjectId: "object-1",
          userId: "user-1",
        },
        {
          authorityEvaluation: {
            outcome: "materially_changed",
            acceptedFingerprint: "a".repeat(64),
            candidateFingerprint: "b".repeat(64),
          },
        },
      ),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: ["authority_divergence"],
    });
  });

  it("returns stale when invalidation targets the still-current accepted basis without requiring authority evaluation", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent({
        id: "invalidate-1",
        targetGenerationRunId: "run-current-1",
      }) as never,
    ]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: ["invalidation_currentness_failure"],
    });
  });

  it("returns current when no admitted stale ground is established", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "current",
      grounds: [],
    });
  });

  it("keeps a multi-manifestation accepted surface current when linkage remains coherent", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
      createManifestation("man-2", "run-current-1", "identity-2"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "current",
      grounds: [],
    });
  });

  it("records additive stale grounds in deterministic audit order", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-foreign", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent({
        id: "invalidate-1",
        targetGenerationRunId: "run-current-1",
      }) as never,
    ]);

    await expect(
      repository.determineAcceptedOpportunityStaleness(
        {
          priorityReflectiveObjectId: "object-1",
          userId: "user-1",
        },
        {
          authorityEvaluation: {
            outcome: "materially_changed",
            acceptedFingerprint: "a".repeat(64),
            candidateFingerprint: "b".repeat(64),
          },
        },
      ),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: [
        "authority_divergence",
        "invalidation_currentness_failure",
        "accepted_surface_divergence",
      ],
    });
  });

  it("does not treat constitutionally identical authority as suppressing another stale ground", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent({
        id: "invalidate-1",
        targetGenerationRunId: "run-current-1",
      }) as never,
    ]);

    await expect(
      repository.determineAcceptedOpportunityStaleness(
        {
          priorityReflectiveObjectId: "object-1",
          userId: "user-1",
        },
        {
          authorityEvaluation: {
            outcome: "constitutionally_identical",
            acceptedFingerprint: "a".repeat(64),
            candidateFingerprint: "a".repeat(64),
          },
        },
      ),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: ["invalidation_currentness_failure"],
    });
  });

  it("performs no repository writes during staleness determination", async () => {
    const from = vi.fn();
    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await repository.determineAcceptedOpportunityStaleness({
      priorityReflectiveObjectId: "object-1",
      userId: "user-1",
    });

    expect(from).not.toHaveBeenCalled();
  });

  it("fails explicitly when the accepted opportunity basis cannot be resolved", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("Accepted Opportunity basis could not be resolved.");
  });

  it("fails explicitly when repository history resolves only an accepted empty assessment", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([
      createGenerationRun({
        id: "run-empty-1",
        status: "empty",
        authorityProvenance: createAuthorityProvenance(),
        acceptedAt: "2026-07-20T09:00:00.000Z",
      }) as never,
    ]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("No Accepted Opportunity exists for the target.");
  });

  it("fails explicitly when the required accepted surface cannot be resolved", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("Accepted Opportunity surface could not be resolved.");
  });

  it("does not convert accepted-surface read failures into stale", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockRejectedValue(
      new Error("surface_query_failed"),
    );

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).rejects.toThrow("surface_query_failed");
  });

  it("adds accepted_surface_divergence only when the resolved surface no longer links to the accepted opportunity", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
      createManifestation("man-2", "run-current-1", "identity-2", {
        priorityReflectiveObjectId: "object-foreign",
      }),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: ["accepted_surface_divergence"],
    });
  });

  it("ignores historical invalidation once a later accepted basis is current", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    const listInvalidations = vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-2",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-2", "identity-1"),
    ] as never);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "current",
      grounds: [],
    });
    expect(listInvalidations).toHaveBeenCalledWith("run-current-2", "user-1");
  });

  it("treats several invalidations on the current basis as one stale ground", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent({
        id: "invalidate-1",
        targetGenerationRunId: "run-current-1",
      }) as never,
      createInvalidationEvent({
        id: "invalidate-2",
        targetGenerationRunId: "run-current-1",
        createdAt: "2026-07-19T10:05:00.000Z",
      }) as never,
    ]);

    await expect(
      repository.determineAcceptedOpportunityStaleness({
        priorityReflectiveObjectId: "object-1",
        userId: "user-1",
      }),
    ).resolves.toEqual({
      outcome: "stale",
      grounds: ["invalidation_currentness_failure"],
    });
  });

  it("returns the same result for repeated equivalent staleness evaluations", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-20T10:00:00.000Z",
        authorityProvenance: createAuthorityProvenance(),
      }) as never,
    );
    vi.spyOn(repository, "listManifestationsByGenerationRun").mockResolvedValue([
      createManifestation("man-1", "run-current-1", "identity-1"),
      createManifestation("man-2", "run-current-1", "identity-2"),
    ] as never);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const first = await repository.determineAcceptedOpportunityStaleness({
      priorityReflectiveObjectId: "object-1",
      userId: "user-1",
    });
    const second = await repository.determineAcceptedOpportunityStaleness({
      priorityReflectiveObjectId: "object-1",
      userId: "user-1",
    });

    expect(second).toEqual(first);
  });

  it("projects accepted authority evidence from an already selected generation run", () => {
    const selectedRun = createGenerationRun({
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
    });

    expect(projectAcceptedAuthorityEvidence(selectedRun as never)).toEqual({
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: createAuthorityProvenance(),
    });
  });

  it("returns constitutionally_identical for matching authority", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);

    await expect(
      repository.evaluateAuthoritySameness(
        {
          authorityProvenance: createAuthorityProvenance(),
        },
        {
          authorityProvenance: createAuthorityProvenance(),
        },
      ),
    ).resolves.toMatchObject({
      outcome: "constitutionally_identical",
    });
  });

  it("returns materially_changed for a meaningful authority difference", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);

    await expect(
      repository.evaluateAuthoritySameness(
        {
          authorityProvenance: createAuthorityProvenance(),
        },
        {
          authorityProvenance: {
            ...createAuthorityProvenance(),
            dream: {
              ...createAuthorityProvenance().dream,
              summary: "changed",
            },
          },
        },
      ),
    ).resolves.toMatchObject({
      outcome: "materially_changed",
    });
  });

  it("is symmetric", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    const accepted = { authorityProvenance: createAuthorityProvenance() };
    const candidate = {
      authorityProvenance: {
        ...createAuthorityProvenance(),
        dream: {
          ...createAuthorityProvenance().dream,
          title: "Different",
        },
      },
    };

    const left = await repository.evaluateAuthoritySameness(
      accepted as never,
      candidate as never,
    );
    const right = await repository.evaluateAuthoritySameness(
      candidate as never,
      accepted as never,
    );

    expect(left.outcome).toBe(right.outcome);
  });

  it("rejects mismatched caller-supplied fingerprint evidence", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);

    await expect(
      repository.evaluateAuthoritySameness(
        {
          authorityProvenance: createAuthorityProvenance(),
          authorityFingerprint: "a".repeat(64),
        },
        {
          authorityProvenance: createAuthorityProvenance(),
        },
      ),
    ).rejects.toThrow("Authority fingerprint evidence mismatch");
  });

  it("performs no repository writes during authority evaluation", async () => {
    const from = vi.fn();
    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    await repository.evaluateAuthoritySameness(
      {
        authorityProvenance: createAuthorityProvenance(),
      },
      {
        authorityProvenance: createAuthorityProvenance(),
      },
    );

    expect(from).not.toHaveBeenCalled();
  });

  it("creates a generation run and loads the current run for a reflective object", async () => {
    const generationRunInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "run-1",
            user_id: "user-1",
            priority_reflective_object_id: "object-1",
            status: "pending",
            input_fingerprint: "fingerprint:test",
            authority_fingerprint: "a".repeat(64),
            authority_provenance: {
              dream: {
                priorityReflectiveObjectId: "object-1",
              },
            },
            context_provenance: {
              existingOpportunityContext: {
                identities: [],
              },
              truncationNote: null,
            },
            execution_provenance: {
              constructorRuntimeVersion: "latent_opportunity_constructor_v1",
            },
            trigger_reason: null,
            predecessor_run_id: null,
            accepted_at: null,
            superseded_at: null,
            created_at: "2026-07-18T10:00:00.000Z",
            updated_at: "2026-07-18T10:00:00.000Z",
          },
          error: null,
        }),
      }),
    });
    const currentRunMaybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "run-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        status: "current",
        input_fingerprint: "fingerprint:test",
        authority_fingerprint: "a".repeat(64),
        authority_provenance: {
          dream: {
            priorityReflectiveObjectId: "object-1",
          },
        },
        context_provenance: {
          existingOpportunityContext: {
            identities: [],
          },
          truncationNote: null,
        },
        execution_provenance: {
          constructorRuntimeVersion: "latent_opportunity_constructor_v1",
        },
        trigger_reason: null,
        predecessor_run_id: null,
        accepted_at: "2026-07-18T10:01:00.000Z",
        superseded_at: null,
        created_at: "2026-07-18T10:00:00.000Z",
        updated_at: "2026-07-18T10:01:00.000Z",
      },
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          insert: generationRunInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: currentRunMaybeSingle,
                  }),
                }),
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    const created = await (repository as unknown as {
      createGenerationRun: (input: {
        id: string;
        userId: string;
        priorityReflectiveObjectId: string;
        status: string;
        inputFingerprint: string;
        authorityFingerprint?: string | null;
        authorityProvenance?: Record<string, unknown> | null;
        contextProvenance?: Record<string, unknown> | null;
        executionProvenance?: Record<string, unknown> | null;
        triggerReason: string | null;
        predecessorRunId: string | null;
      }) => Promise<{ id: string; status: string; inputFingerprint: string; authorityFingerprint?: string | null }>;
    }).createGenerationRun({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "pending",
      inputFingerprint: "fingerprint:test",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: {
        dream: {
          priorityReflectiveObjectId: "object-1",
        },
      },
      contextProvenance: {
        existingOpportunityContext: {
          identities: [],
        },
        truncationNote: null,
      },
      executionProvenance: {
        constructorRuntimeVersion: "latent_opportunity_constructor_v1",
      },
      triggerReason: null,
      predecessorRunId: null,
    });

    const current = await (repository as unknown as {
      getCurrentGenerationRunForReflectiveObject: (
        priorityReflectiveObjectId: string,
        userId: string,
      ) => Promise<{ id: string; status: string; acceptedAt: string | null } | null>;
    }).getCurrentGenerationRunForReflectiveObject("object-1", "user-1");

    expect(created).toEqual(
      expect.objectContaining({
        id: "run-1",
        status: "pending",
        inputFingerprint: "fingerprint:test",
        authorityFingerprint: "a".repeat(64),
      }),
    );
    expect(current).toEqual(
      expect.objectContaining({
        id: "run-1",
        status: "current",
        acceptedAt: "2026-07-18T10:01:00.000Z",
        authorityFingerprint: "a".repeat(64),
      }),
    );
  });

  it("resolves a reusable accepted current run when no invalidation exists", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        status: "current",
        acceptedAt: "2026-07-18T10:01:00.000Z",
      }) as never,
    );
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([]);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution).toEqual({
      reusable: true,
      generationRun: expect.objectContaining({
        id: "run-1",
        status: "current",
      }),
      invalidation: null,
    });
  });

  it("returns not reusable when no accepted run exists", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution).toEqual({
      reusable: false,
      generationRun: null,
      invalidation: null,
    });
  });

  it("selects current before empty when both accepted runs exist", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-current-1",
        status: "current",
        acceptedAt: "2026-07-19T09:00:00.000Z",
      }) as never,
    );
    const listRuns = vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([
      createGenerationRun({
        id: "run-empty-1",
        status: "empty",
        acceptedAt: null,
      }) as never,
    ]);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(listRuns).not.toHaveBeenCalled();
    expect(resolution.generationRun?.id).toBe("run-current-1");
    expect(resolution.reusable).toBe(true);
  });

  it("falls back to the latest eligible empty run when current is absent", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([
      createGenerationRun({
        id: "run-empty-2",
        status: "empty",
        supersededAt: null,
        createdAt: "2026-07-19T10:00:00.000Z",
      }) as never,
      createGenerationRun({
        id: "run-failed-1",
        status: "failed",
        createdAt: "2026-07-19T09:00:00.000Z",
      }) as never,
    ]);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution.generationRun?.id).toBe("run-empty-2");
    expect(resolution.generationRun?.status).toBe("empty");
    expect(resolution.reusable).toBe(true);
  });

  it("selects the same accepted empty run as the R02B authority contract when timestamps tie", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([
      createGenerationRun({
        id: "run-empty-a",
        status: "empty",
        supersededAt: null,
        createdAt: "2026-07-19T10:00:00.000Z",
      }) as never,
      createGenerationRun({
        id: "run-empty-b",
        status: "empty",
        supersededAt: null,
        createdAt: "2026-07-19T10:00:00.000Z",
      }) as never,
    ]);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution.generationRun?.id).toBe("run-empty-b");
    expect(resolution.reusable).toBe(true);
  });

  it("ignores superseded empty runs when resolving fallback accepted authority", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(null);
    vi.spyOn(repository, "listGenerationRunsForReflectiveObject").mockResolvedValue([
      createGenerationRun({
        id: "run-empty-superseded",
        status: "empty",
        supersededAt: "2026-07-19T10:05:00.000Z",
        createdAt: "2026-07-19T10:00:00.000Z",
      }) as never,
      createGenerationRun({
        id: "run-empty-eligible",
        status: "empty",
        supersededAt: null,
        createdAt: "2026-07-19T09:00:00.000Z",
      }) as never,
    ]);
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution.generationRun?.id).toBe("run-empty-eligible");
    expect(resolution.reusable).toBe(true);
  });

  it("returns not reusable when the accepted run has one invalidation event", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-1",
        status: "current",
      }) as never,
    );
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent() as never,
    ]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution).toEqual({
      reusable: false,
      generationRun: expect.objectContaining({
        id: "run-1",
        status: "current",
      }),
      invalidation: expect.objectContaining({
        id: "invalidate-1",
        targetGenerationRunId: "run-1",
      }),
    });
  });

  it("returns not reusable when the accepted run has multiple invalidation events", async () => {
    const repository = new SupabaseLatentOpportunityRepository({} as never);
    vi.spyOn(repository, "getCurrentGenerationRunForReflectiveObject").mockResolvedValue(
      createGenerationRun({
        id: "run-1",
        status: "current",
      }) as never,
    );
    vi.spyOn(repository, "listGenerationRunInvalidations").mockResolvedValue([
      createInvalidationEvent({
        id: "invalidate-2",
        createdAt: "2026-07-19T11:00:00.000Z",
      }) as never,
      createInvalidationEvent({
        id: "invalidate-1",
        createdAt: "2026-07-19T10:00:00.000Z",
      }) as never,
    ]);

    const resolution = await repository.resolveReusableAcceptedGenerationRun("object-1", "user-1");

    expect(resolution.reusable).toBe(false);
    expect(resolution.invalidation?.id).toBe("invalidate-2");
  });

  it("rehydrates manifestation evidence and observations from repository reads", async () => {

    const maybeSingleIdentity = vi.fn().mockResolvedValue({
      data: {
        id: "identity-1",
        user_id: "user-1",
        title: "Exploration -> danger",
        primary_category: "transition",
        secondary_categories: ["tension", "curiosity"],
        lifecycle_state: "emerging",
        status: "active",
        archived_at: null,
        created_at: "2026-06-15T08:00:00.000Z",
        updated_at: "2026-06-15T08:00:00.000Z",
      },
      error: null,
    });
    const maybeSingleManifestation = vi.fn().mockResolvedValue({
      data: {
        id: "manifestation-1",
        identity_id: "identity-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        summary: "A transition from open movement into threat remains notable.",
        structure_payload: {
          kind: "transition",
          label: "Exploration -> danger",
          elements: ["exploration", "danger"],
        },
        primary_category: "transition",
        secondary_categories: ["tension", "curiosity"],
        credibility_score: 0.82,
        reflective_potential_score: 0.77,
        salience_band: "high",
        salience_rationale: {
          evidenceStrength: "strong",
        },
        construction_metadata: {
          source: "llm_constructor",
          model: "gpt-test",
          version: "latent_v2_test",
        },
        archived_at: null,
        created_at: "2026-06-15T08:00:00.000Z",
        updated_at: "2026-06-15T08:00:00.000Z",
      },
      error: null,
    });
    const evidenceBlockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "manifestation-1:block:0",
          manifestation_id: "manifestation-1",
          user_id: "user-1",
          reflective_object_id: "object-1",
          role: "priority",
          summary: "Current dream transition evidence.",
          position: 0,
          created_at: "2026-06-15T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const evidenceObservationOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "manifestation-1:block:0:observation:0",
          evidence_block_id: "manifestation-1:block:0",
          user_id: "user-1",
          observation_v2_scene_observation_id: "bundle-1:scene-1:obs-1",
          scene_id: "scene-1",
          role: "primary_support",
          supports_node_keys: ["issue", "action"],
          supports_edge_indexes: [0],
          created_at: "2026-06-15T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const glossaryLinkOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "manifestation-1:glossary:0",
          manifestation_id: "manifestation-1",
          user_id: "user-1",
          glossary_term_id: "term-1",
          role: "continuity",
          created_at: "2026-06-15T08:00:00.000Z",
        },
      ],
      error: null,
    });
    const manifestationListOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "manifestation-1",
          identity_id: "identity-1",
          user_id: "user-1",
          priority_reflective_object_id: "object-1",
          summary: "A transition from open movement into threat remains notable.",
          structure_payload: {
            kind: "transition",
            label: "Exploration -> danger",
            elements: ["exploration", "danger"],
          },
          primary_category: "transition",
          secondary_categories: ["tension", "curiosity"],
          credibility_score: 0.82,
          reflective_potential_score: 0.77,
          salience_band: "high",
          salience_rationale: {
            evidenceStrength: "strong",
          },
          construction_metadata: {
            source: "llm_constructor",
            model: "gpt-test",
            version: "latent_v2_test",
          },
          archived_at: null,
          created_at: "2026-06-15T08:00:00.000Z",
          updated_at: "2026-06-15T08:00:00.000Z",
        },
      ],
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_identities") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleIdentity,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "latent_opportunity_manifestations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((column: string) => {
              if (column === "id") {
                return {
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: maybeSingleManifestation,
                    }),
                  }),
                };
              }

              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: manifestationListOrder,
                  }),
                }),
              };
            }),
          }),
        };
      }

      if (table === "latent_opportunity_evidence_blocks") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: evidenceBlockOrder,
              }),
            }),
          }),
        };
      }

      if (table === "latent_opportunity_evidence_observations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: evidenceObservationOrder,
              }),
            }),
          }),
        };
      }

      if (table === "latent_opportunity_glossary_links") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: glossaryLinkOrder,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    vi.spyOn(repository, "listLifecycleEventsByIdentity").mockResolvedValue([
      {
        id: "identity-1:event-1",
        userId: "user-1",
        identityId: "identity-1",
        eventType: "emergence",
        priorLifecycleState: null,
        resultingLifecycleState: "emerging",
        sourceGenerationRunId: null,
        resultingGenerationRunId: "run-1",
        sourceManifestationIds: [],
        resultingManifestationIds: ["manifestation-1"],
        relatedIdentityIds: [],
        triggeringReflectiveObjectId: "object-1",
        triggeringReflectionId: null,
        createdAt: "2026-06-15T12:00:00.000Z",
      },
    ] as never);

    const manifestation = await repository.getManifestationById("manifestation-1", "user-1");
    const listed = await repository.listManifestationsByPriorityReflectiveObject("object-1", "user-1");

    expect(manifestation).not.toBeNull();
    expect(manifestation?.priorityReflectiveObjectId).toBe("object-1");
    expect(manifestation?.evidenceBlocks[0].observations[0].observationV2SceneObservationId).toBe("bundle-1:scene-1:obs-1");
    expect((manifestation?.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["issue", "action"]);
    expect((manifestation?.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
    expect((listed[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["issue", "action"]);
    expect((listed[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
    expect(listed).toHaveLength(1);
  });

  it("applies the expected source status at the generation-run transition write boundary", async () => {
    const getMaybeSingle = vi.fn().mockResolvedValue({
      data: createGenerationRunRow(),
      error: null,
    });
    const eqStatus = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: createGenerationRunRow({
            status: "current",
            accepted_at: "2026-07-18T10:01:00.000Z",
            updated_at: "2026-07-18T10:01:00.000Z",
          }),
          error: null,
        }),
      }),
    });
    const eqUser = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqId = vi.fn().mockReturnValue({
      eq: eqUser,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: eqId,
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    const transitioned = await repository.markGenerationRunCurrent("run-1", "user-1");

    expect(eqId).toHaveBeenCalledWith("id", "run-1");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user-1");
    expect(eqStatus).toHaveBeenCalledWith("status", "pending");
    expect(transitioned.status).toBe("current");
    expect(transitioned.acceptedAt).toBe("2026-07-18T10:01:00.000Z");
  });

  it("rejects stale generation-run transitions when the expected source status no longer matches", async () => {
    const getMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: createGenerationRunRow(),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createGenerationRunRow({
          status: "current",
          accepted_at: "2026-07-18T10:01:00.000Z",
          updated_at: "2026-07-18T10:01:00.000Z",
        }),
        error: null,
      });
    const eqStatus = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    });
    const eqUserForUpdate = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqIdForUpdate = vi.fn().mockReturnValue({
      eq: eqUserForUpdate,
    });
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          update: vi.fn().mockReturnValue({
            eq: eqIdForUpdate,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    await expect(repository.markGenerationRunCurrent("run-1", "user-1")).rejects.toThrow(
      "expected pending before current",
    );
  });

  it("restricts generation-run deletion to pending rollback-safe runs", async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null, count: 1 }),
        }),
      }),
    });
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          delete: deleteMock,
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    await repository.deleteGenerationRun("run-1", "user-1");

    expect(deleteMock).toHaveBeenCalledWith({ count: "exact" });
  });

  it("treats zero-row rollback deletion as a conflict", async () => {
    const getMaybeSingle = vi.fn().mockResolvedValue({
      data: createGenerationRunRow({
        status: "current",
        accepted_at: "2026-07-18T10:01:00.000Z",
        updated_at: "2026-07-18T10:01:00.000Z",
      }),
      error: null,
    });
    const eqStatus = vi.fn().mockResolvedValue({ error: null, count: 0 });
    const eqUser = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqId = vi.fn().mockReturnValue({
      eq: eqUser,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: eqId,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    await expect(repository.deleteGenerationRun("run-1", "user-1")).rejects.toThrow(
      "rollback_delete_requires_pending",
    );
  });

  it("does not treat a nullable delete count as successful rollback deletion", async () => {
    const getMaybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const eqStatus = vi.fn().mockResolvedValue({ error: null, count: null });
    const eqUser = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqId = vi.fn().mockReturnValue({
      eq: eqUser,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: eqId,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    await expect(repository.deleteGenerationRun("run-1", "user-1")).rejects.toThrow(
      "rollback_delete_requires_pending",
    );
  });

  it("rejects deletion for non-pending generation runs", async () => {
    const getMaybeSingle = vi.fn().mockResolvedValue({
      data: createGenerationRunRow({
        status: "current",
        accepted_at: "2026-07-18T10:01:00.000Z",
        updated_at: "2026-07-18T10:01:00.000Z",
      }),
      error: null,
    });
    const eqStatus = vi.fn().mockResolvedValue({ error: null, count: 0 });
    const eqUserForDelete = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqIdForDelete = vi.fn().mockReturnValue({
      eq: eqUserForDelete,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: eqIdForDelete,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    await expect(repository.deleteGenerationRun("run-1", "user-1")).rejects.toThrow(
      "rollback_delete_requires_pending",
    );
  });

  it.each(["superseded", "empty", "no_change", "failed", "rejected"] as const)(
    "rejects deletion for %s generation runs",
    async (status) => {
      const getMaybeSingle = vi.fn().mockResolvedValue({
        data: createGenerationRunRow({
          status,
        }),
        error: null,
      });
      const eqStatus = vi.fn().mockResolvedValue({ error: null, count: 0 });
      const eqUserForDelete = vi.fn().mockReturnValue({
        eq: eqStatus,
      });
      const eqIdForDelete = vi.fn().mockReturnValue({
        eq: eqUserForDelete,
      });

      const from = vi.fn().mockImplementation((table: string) => {
        if (table === "latent_opportunity_generation_runs") {
          return {
            delete: vi.fn().mockReturnValue({
              eq: eqIdForDelete,
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: getMaybeSingle,
                }),
              }),
            }),
          };
        }

        return {};
      });

      const repository = new SupabaseLatentOpportunityRepository({ from } as never);

      await expect(repository.deleteGenerationRun("run-1", "user-1")).rejects.toThrow(
        `rollback_delete_requires_pending: run-1 is ${status}`,
      );
    },
  );

  it("surfaces Supabase rollback deletion errors directly", async () => {
    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  error: {
                    message: "delete_failed",
                  },
                  count: null,
                }),
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    await expect(repository.deleteGenerationRun("run-1", "user-1")).rejects.toThrow(
      "Failed to delete latent generation run: delete_failed",
    );
  });

  it.each([
    ["current", "markGenerationRunFailed", "failed"],
    ["current", "markGenerationRunRejected", "rejected"],
    ["current", "markGenerationRunEmpty", "empty"],
    ["current", "markGenerationRunNoChange", "no_change"],
    ["failed", "markGenerationRunCurrent", "current"],
    ["rejected", "markGenerationRunCurrent", "current"],
    ["empty", "markGenerationRunCurrent", "current"],
    ["no_change", "markGenerationRunCurrent", "current"],
    ["superseded", "markGenerationRunCurrent", "current"],
  ] as const)(
    "rejects invalid generation-run transition %s -> %s",
    async (currentStatus, methodName, nextStatus) => {
      const getMaybeSingle = vi.fn().mockResolvedValue({
        data: createGenerationRunRow({
          status: currentStatus,
        }),
        error: null,
      });
      const update = vi.fn();
      const from = vi.fn().mockImplementation((table: string) => {
        if (table === "latent_opportunity_generation_runs") {
          return {
            update,
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: getMaybeSingle,
                }),
              }),
            }),
          };
        }

        return {};
      });

      const repository = new SupabaseLatentOpportunityRepository({ from } as never);
      const transition = (repository as unknown as Record<string, (runId: string, userId: string) => Promise<unknown>>)[
        methodName
      ].bind(repository);

      await expect(transition("run-1", "user-1")).rejects.toThrow(
        `Invalid latent generation run transition: ${currentStatus} -> ${nextStatus}`,
      );
      expect(update).not.toHaveBeenCalled();
    },
  );

  it("allows current -> superseded once and rejects a repeated supersede transition", async () => {
    const getMaybeSingle = vi
      .fn()
      .mockResolvedValueOnce({
        data: createGenerationRunRow({
          status: "current",
          accepted_at: "2026-07-18T10:01:00.000Z",
          updated_at: "2026-07-18T10:01:00.000Z",
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createGenerationRunRow({
          status: "superseded",
          accepted_at: "2026-07-18T10:01:00.000Z",
          superseded_at: "2026-07-18T10:02:00.000Z",
          updated_at: "2026-07-18T10:02:00.000Z",
        }),
        error: null,
      })
      .mockResolvedValueOnce({
        data: createGenerationRunRow({
          status: "superseded",
          accepted_at: "2026-07-18T10:01:00.000Z",
          superseded_at: "2026-07-18T10:02:00.000Z",
          updated_at: "2026-07-18T10:02:00.000Z",
        }),
        error: null,
      });
    const eqStatus = vi
      .fn()
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: createGenerationRunRow({
              status: "superseded",
              accepted_at: "2026-07-18T10:01:00.000Z",
              superseded_at: "2026-07-18T10:02:00.000Z",
              updated_at: "2026-07-18T10:02:00.000Z",
            }),
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
    const eqUser = vi.fn().mockReturnValue({
      eq: eqStatus,
    });
    const eqId = vi.fn().mockReturnValue({
      eq: eqUser,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_opportunity_generation_runs") {
        return {
          update: vi.fn().mockReturnValue({
            eq: eqId,
          }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: getMaybeSingle,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);

    const first = await repository.markGenerationRunSuperseded("run-1", "user-1");
    expect(first.status).toBe("superseded");

    await expect(repository.markGenerationRunSuperseded("run-1", "user-1")).rejects.toThrow(
      "Invalid latent generation run transition: superseded -> superseded",
    );
  });

  it("creates a generation-run invalidation event when the dedupe key is new", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "invalidate-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        target_generation_run_id: "run-1",
        source_layer: "observation",
        source_entity_type: "observation_v2_bundle",
        source_entity_id: "bundle-1",
        source_revision: "archive:bundle-1",
        reason: "observation_bundle_archived",
        created_at: "2026-07-19T10:00:00.000Z",
      },
      error: null,
    });
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle,
      }),
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_generation_run_invalidation_events") {
        return {
          upsert,
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    const event = await repository.createGenerationRunInvalidationIfAbsent({
      id: "invalidate-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      targetGenerationRunId: "run-1",
      sourceLayer: "observation",
      sourceEntityType: "observation_v2_bundle",
      sourceEntityId: "bundle-1",
      sourceRevision: "archive:bundle-1",
      reason: "observation_bundle_archived",
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          target_generation_run_id: "run-1",
          source_revision: "archive:bundle-1",
        }),
      ]),
      expect.objectContaining({
        onConflict: "target_generation_run_id,source_layer,source_entity_type,source_revision",
        ignoreDuplicates: true,
      }),
    );
    expect(event?.targetGenerationRunId).toBe("run-1");
  });

  it("returns null when invalidation event creation hits the dedupe constraint", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });
    const upsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        maybeSingle,
      }),
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_generation_run_invalidation_events") {
        return {
          upsert,
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    const event = await repository.createGenerationRunInvalidationIfAbsent({
      id: "invalidate-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      targetGenerationRunId: "run-1",
      sourceLayer: "observation",
      sourceEntityType: "observation_v2_bundle",
      sourceEntityId: "bundle-1",
      sourceRevision: "archive:bundle-1",
      reason: "observation_bundle_archived",
    });

    expect(event).toBeNull();
  });

  it("lists invalidation events for a target generation run in deterministic order and ownership scope", async () => {
    const secondOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "invalidate-2",
          user_id: "user-1",
          priority_reflective_object_id: "object-1",
          target_generation_run_id: "run-1",
          source_layer: "observation",
          source_entity_type: "observation_v2_bundle",
          source_entity_id: "bundle-2",
          source_revision: "archive:bundle-2",
          reason: "observation_bundle_archived",
          created_at: "2026-07-19T11:00:00.000Z",
        },
        {
          id: "invalidate-1",
          user_id: "user-1",
          priority_reflective_object_id: "object-1",
          target_generation_run_id: "run-1",
          source_layer: "observation",
          source_entity_type: "observation_v2_bundle",
          source_entity_id: "bundle-1",
          source_revision: "archive:bundle-1",
          reason: "observation_bundle_archived",
          created_at: "2026-07-19T10:00:00.000Z",
        },
      ],
      error: null,
    });
    const firstOrder = vi.fn().mockReturnValue({
      order: secondOrder,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "latent_generation_run_invalidation_events") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: firstOrder,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseLatentOpportunityRepository({ from } as never);
    const events = await repository.listGenerationRunInvalidations("run-1", "user-1");

    expect(events.map((event) => event.id)).toEqual(["invalidate-2", "invalidate-1"]);
    expect(events.every((event) => event.userId === "user-1")).toBe(true);
    expect(firstOrder).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(secondOrder).toHaveBeenCalledWith("id", { ascending: false });
  });
});
