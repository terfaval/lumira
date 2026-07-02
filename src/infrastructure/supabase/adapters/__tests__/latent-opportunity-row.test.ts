import { describe, expect, it } from "vitest";

import {
  fromLatentOpportunityRows,
  toLatentOpportunityEvidenceBlockInsertRows,
  toLatentOpportunityEvidenceObservationInsertRows,
  toLatentOpportunityGlossaryLinkInsertRows,
  toLatentOpportunityIdentityInsertRow,
  toLatentOpportunityManifestationInsertRow,
  type LatentOpportunityEvidenceBlockRow,
  type LatentOpportunityEvidenceObservationRow,
  type LatentOpportunityGlossaryLinkRow,
  type LatentOpportunityIdentityRow,
  type LatentOpportunityManifestationRow,
} from "@/src/infrastructure/supabase/adapters/latent-opportunity-row";
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
      {
        role: "context",
        reflectiveObjectId: "object-2",
        summary: "Older dream resonance.",
        position: 1,
        observations: [
          ({
            observationV2SceneObservationId: "bundle-2:scene-1:obs-2",
            sceneId: "scene-1",
            role: "context_support",
            supportsNodeKeys: [],
            supportsEdgeIndexes: [],
          } as unknown as CreateLatentOpportunityManifestationInput["evidenceBlocks"][number]["observations"][number]),
        ],
      },
    ],
  };
}

describe("latent opportunity row adapters", () => {
  it("maps identity and manifestation inputs into insert rows", () => {
    const manifestation = createManifestationInput();

    const identityRow = toLatentOpportunityIdentityInsertRow({
      id: "identity-1",
      userId: "user-1",
      title: "Exploration -> danger",
      primaryCategory: "transition",
      secondaryCategories: ["tension", "curiosity"],
      lifecycleState: "emerging",
      status: "active",
    });
    const manifestationRow = toLatentOpportunityManifestationInsertRow({
      id: "manifestation-1",
      ...manifestation,
    });
    const evidenceBlockRows = toLatentOpportunityEvidenceBlockInsertRows("manifestation-1", manifestation);
    const evidenceObservationRows = toLatentOpportunityEvidenceObservationInsertRows(evidenceBlockRows, manifestation);
    const glossaryLinkRows = toLatentOpportunityGlossaryLinkInsertRows("manifestation-1", manifestation);

    expect(identityRow.primary_category).toBe("transition");
    expect(identityRow.secondary_categories).toEqual(["tension", "curiosity"]);
    expect(manifestationRow.priority_reflective_object_id).toBe("object-1");
    expect(manifestationRow.salience_band).toBe("high");
    expect(evidenceBlockRows.map((row) => row.role)).toEqual(["priority", "context"]);
    expect(evidenceObservationRows.map((row) => row.observation_v2_scene_observation_id)).toEqual([
      "bundle-1:scene-1:obs-1",
      "bundle-2:scene-1:obs-2",
    ]);
    expect((evidenceObservationRows[0] as unknown as Record<string, unknown>).supports_node_keys).toEqual(["issue", "action"]);
    expect((evidenceObservationRows[0] as unknown as Record<string, unknown>).supports_edge_indexes).toEqual([0]);
    expect((evidenceObservationRows[1] as unknown as Record<string, unknown>).supports_node_keys).toEqual([]);
    expect((evidenceObservationRows[1] as unknown as Record<string, unknown>).supports_edge_indexes).toEqual([]);
    expect(glossaryLinkRows[0].glossary_term_id).toBe("term-1");
  });

  it("rehydrates a manifestation graph from rows", () => {
    const identityRow: LatentOpportunityIdentityRow = {
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
    };
    const manifestationRow: LatentOpportunityManifestationRow = {
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
    };
    const evidenceBlockRows: LatentOpportunityEvidenceBlockRow[] = [
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
    ];
    const evidenceObservationRows: LatentOpportunityEvidenceObservationRow[] = [
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
      } as unknown as LatentOpportunityEvidenceObservationRow,
    ];
    const glossaryLinkRows: LatentOpportunityGlossaryLinkRow[] = [
      {
        id: "manifestation-1:glossary:0",
        manifestation_id: "manifestation-1",
        user_id: "user-1",
        glossary_term_id: "term-1",
        role: "continuity",
        created_at: "2026-06-15T08:00:00.000Z",
      },
    ];

    const manifestation = fromLatentOpportunityRows(
      identityRow,
      manifestationRow,
      evidenceBlockRows,
      evidenceObservationRows,
      glossaryLinkRows,
    );

    expect(manifestation.identity.id).toBe("identity-1");
    expect(manifestation.priorityReflectiveObjectId).toBe("object-1");
    expect(manifestation.evidenceBlocks).toHaveLength(1);
    expect(manifestation.evidenceBlocks[0].observations[0].observationV2SceneObservationId).toBe("bundle-1:scene-1:obs-1");
    expect((manifestation.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsNodeKeys).toEqual(["issue", "action"]);
    expect((manifestation.evidenceBlocks[0].observations[0] as unknown as Record<string, unknown>).supportsEdgeIndexes).toEqual([0]);
    expect(manifestation.glossaryLinks[0].glossaryTermId).toBe("term-1");
  });
});
