import { describe, expect, it, vi } from "vitest";

import { SupabaseLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/latent-opportunity-supabase-repository";
import type { CreateLatentOpportunityManifestationInput } from "@/src/domain/latent-v2/types";

function createManifestationInput(): CreateLatentOpportunityManifestationInput {
  return {
    identityId: "identity-1",
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

describe("SupabaseLatentOpportunityRepository", () => {
  it("creates an identity and manifestation graph, then rehydrates it", async () => {
    const identityInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
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
        }),
      }),
    });
    const manifestationInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
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
        }),
      }),
    });
    const evidenceBlockInsert = vi.fn().mockResolvedValue({ error: null });
    const evidenceObservationInsert = vi.fn().mockResolvedValue({ error: null });
    const glossaryLinkInsert = vi.fn().mockResolvedValue({ error: null });

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
          insert: identityInsert,
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
          insert: manifestationInsert,
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
          insert: evidenceBlockInsert,
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
          insert: evidenceObservationInsert,
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
          insert: glossaryLinkInsert,
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

    const identity = await repository.createIdentity({
      id: "identity-1",
      userId: "user-1",
      title: "Exploration -> danger",
      primaryCategory: "transition",
      secondaryCategories: ["tension", "curiosity"],
      lifecycleState: "emerging",
      status: "active",
    });
    const manifestation = await repository.createManifestation({
      id: "manifestation-1",
      ...createManifestationInput(),
    });
    const listed = await repository.listManifestationsByPriorityReflectiveObject("object-1", "user-1");

    expect(identityInsert).toHaveBeenCalled();
    expect(manifestationInsert).toHaveBeenCalled();
    expect(evidenceBlockInsert).toHaveBeenCalled();
    expect(evidenceObservationInsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          observation_v2_scene_observation_id: "bundle-1:scene-1:obs-1",
          supports_node_keys: ["issue", "action"],
          supports_edge_indexes: [0],
        }),
      ]),
    );
    expect(glossaryLinkInsert).toHaveBeenCalled();
    expect(identity.id).toBe("identity-1");
    expect(manifestation.priorityReflectiveObjectId).toBe("object-1");
    expect(manifestation.evidenceBlocks[0].observations[0].observationV2SceneObservationId).toBe("bundle-1:scene-1:obs-1");
    expect((manifestation.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["issue", "action"]);
    expect((manifestation.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
    expect((listed[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["issue", "action"]);
    expect((listed[0].evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
    expect(listed).toHaveLength(1);
  });
});
