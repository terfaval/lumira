import { describe, expect, it } from "vitest";

import {
  fromLatentGenerationRunRow,
  fromLatentGenerationRunInvalidationEventRow,
  fromLatentOpportunityRows,
  toLatentGenerationRunInvalidationEventInsertRow,
  toLatentGenerationRunInsertRow,
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
      generation_run_id: "run-1",
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

  it("rehydrates an assessed-empty generation run status without coercion", () => {
    const run = fromLatentGenerationRunRow({
      id: "run-empty-1",
      user_id: "user-1",
      priority_reflective_object_id: "object-1",
      status: "empty",
      input_fingerprint: "fingerprint:test",
      trigger_reason: null,
      predecessor_run_id: null,
      accepted_at: null,
      superseded_at: null,
      created_at: "2026-07-18T08:00:00.000Z",
      updated_at: "2026-07-18T08:00:00.000Z",
    });

    expect(run.status).toBe("empty");
    expect(run.inputFingerprint).toBe("fingerprint:test");
  });

  it("maps latent provenance fields through generation-run row adapters", () => {
    const insertRow = toLatentGenerationRunInsertRow({
      id: "run-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "pending",
      inputFingerprint: "fingerprint:mixed",
      authorityFingerprint: "a".repeat(64),
      authorityProvenance: {
        dream: {
          priorityReflectiveObjectId: "object-1",
          title: "House search dream",
          objectLanguage: "hu",
          content: "I move through a house searching for someone.",
          summary: "A house search remains active.",
        },
        observation: {
          family: "observation_v2",
          observationBundleId: "bundle-1",
          observationRuntimeVersion: "observation_v2_phase1",
          semanticPolicyResult: "accept_with_uncertainty",
          bundleUncertaintyNotes: [],
          scenes: [],
          observations: [],
        },
        glossary: {
          confirmedTerms: [],
          appearanceRecords: [],
        },
        reflections: [],
      },
      contextProvenance: {
        existingOpportunityContext: {
          identities: [],
        },
        truncationNote: null,
      },
      executionProvenance: {
        constructorRuntimeVersion: "latent_opportunity_constructor_v1",
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
      },
      triggerReason: null,
      predecessorRunId: null,
    });

    expect(insertRow.authority_fingerprint).toBe("a".repeat(64));
    expect(insertRow.authority_provenance).toEqual(
      expect.objectContaining({
        dream: expect.objectContaining({
          priorityReflectiveObjectId: "object-1",
        }),
      }),
    );
    expect(insertRow.context_provenance).toEqual(
      expect.objectContaining({
        truncationNote: null,
      }),
    );
    expect(insertRow.execution_provenance).toEqual(
      expect.objectContaining({
        constructorRuntimeVersion: "latent_opportunity_constructor_v1",
      }),
    );

    const run = fromLatentGenerationRunRow({
      id: "run-1",
      user_id: "user-1",
      priority_reflective_object_id: "object-1",
      status: "pending",
      input_fingerprint: "fingerprint:mixed",
      authority_fingerprint: "a".repeat(64),
      authority_provenance: insertRow.authority_provenance,
      context_provenance: insertRow.context_provenance,
      execution_provenance: insertRow.execution_provenance,
      trigger_reason: null,
      predecessor_run_id: null,
      accepted_at: null,
      superseded_at: null,
      created_at: "2026-07-18T08:00:00.000Z",
      updated_at: "2026-07-18T08:00:00.000Z",
    });

    expect(run.authorityFingerprint).toBe("a".repeat(64));
    expect(run.authorityProvenance).toEqual(insertRow.authority_provenance);
    expect(run.contextProvenance).toEqual(insertRow.context_provenance);
    expect(run.executionProvenance).toEqual(insertRow.execution_provenance);
  });

  it("round-trips explicit v3 authority lineage through generation-run row adapters", () => {
    const insertRow = toLatentGenerationRunInsertRow({
      id: "run-v3-1",
      userId: "user-1",
      priorityReflectiveObjectId: "object-1",
      status: "pending",
      inputFingerprint: "fingerprint:v3",
      authorityFingerprint: "b".repeat(64),
      authorityProvenance: {
        dream: {
          priorityReflectiveObjectId: "object-1",
          title: "House search dream",
          objectLanguage: "hu",
          content: "I move through a house searching for someone.",
          summary: "A house search remains active.",
        },
        observation: {
          family: "observation_v3",
          authorityId: "authority-1",
          canonicalObservationId: "canonical-observation-1",
          canonicalHash: "c".repeat(64),
          generationVersion: "observation_v3_shadow_1",
        },
        glossary: {
          confirmedTerms: [],
          appearanceRecords: [],
        },
        reflections: [],
      },
      contextProvenance: {
        existingOpportunityContext: {
          identities: [],
        },
        truncationNote: null,
      },
      executionProvenance: {
        constructorRuntimeVersion: "latent_opportunity_constructor_v1",
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
      },
      triggerReason: null,
      predecessorRunId: null,
    });

    const run = fromLatentGenerationRunRow({
      id: "run-v3-1",
      user_id: "user-1",
      priority_reflective_object_id: "object-1",
      status: "pending",
      input_fingerprint: "fingerprint:v3",
      authority_fingerprint: "b".repeat(64),
      authority_provenance: insertRow.authority_provenance,
      context_provenance: insertRow.context_provenance,
      execution_provenance: insertRow.execution_provenance,
      trigger_reason: null,
      predecessor_run_id: null,
      accepted_at: null,
      superseded_at: null,
      created_at: "2026-07-18T08:00:00.000Z",
      updated_at: "2026-07-18T08:00:00.000Z",
    });

    expect(run.authorityProvenance?.observation).toEqual({
      family: "observation_v3",
      authorityId: "authority-1",
      canonicalObservationId: "canonical-observation-1",
      canonicalHash: "c".repeat(64),
      generationVersion: "observation_v3_shadow_1",
    });
  });

  it("keeps historical generation runs with null provenance readable", () => {
    const run = fromLatentGenerationRunRow({
      id: "run-legacy-1",
      user_id: "user-1",
      priority_reflective_object_id: "object-1",
      status: "current",
      input_fingerprint: "legacy:mixed",
      authority_fingerprint: null,
      authority_provenance: null,
      context_provenance: null,
      execution_provenance: null,
      trigger_reason: null,
      predecessor_run_id: null,
      accepted_at: "2026-07-18T08:00:00.000Z",
      superseded_at: null,
      created_at: "2026-07-18T08:00:00.000Z",
      updated_at: "2026-07-18T08:00:00.000Z",
    });

    expect(run.inputFingerprint).toBe("legacy:mixed");
    expect(run.authorityFingerprint).toBeNull();
    expect(run.authorityProvenance).toBeNull();
    expect(run.contextProvenance).toBeNull();
    expect(run.executionProvenance).toBeNull();
  });

  it("maps invalidation event rows and insert payloads with exact literals", () => {
    const insertRow = toLatentGenerationRunInvalidationEventInsertRow({
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

    expect(insertRow).toEqual({
      id: "invalidate-1",
      user_id: "user-1",
      priority_reflective_object_id: "object-1",
      target_generation_run_id: "run-1",
      source_layer: "observation",
      source_entity_type: "observation_v2_bundle",
      source_entity_id: "bundle-1",
      source_revision: "archive:bundle-1",
      reason: "observation_bundle_archived",
    });

    const event = fromLatentGenerationRunInvalidationEventRow({
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
    });

    expect(event).toEqual({
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
    });
  });

  it("rejects unsupported invalidation literals instead of silently coercing them", () => {
    expect(() =>
      fromLatentGenerationRunInvalidationEventRow({
        id: "invalidate-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        target_generation_run_id: "run-1",
        source_layer: "glossary",
        source_entity_type: "observation_v2_bundle",
        source_entity_id: "bundle-1",
        source_revision: "archive:bundle-1",
        reason: "observation_bundle_archived",
        created_at: "2026-07-19T10:00:00.000Z",
      }),
    ).toThrow("Unsupported latent generation run invalidation source layer: glossary");

    expect(() =>
      fromLatentGenerationRunInvalidationEventRow({
        id: "invalidate-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        target_generation_run_id: "run-1",
        source_layer: "observation",
        source_entity_type: "thread",
        source_entity_id: "bundle-1",
        source_revision: "archive:bundle-1",
        reason: "observation_bundle_archived",
        created_at: "2026-07-19T10:00:00.000Z",
      }),
    ).toThrow("Unsupported latent generation run invalidation source entity type: thread");

    expect(() =>
      fromLatentGenerationRunInvalidationEventRow({
        id: "invalidate-1",
        user_id: "user-1",
        priority_reflective_object_id: "object-1",
        target_generation_run_id: "run-1",
        source_layer: "observation",
        source_entity_type: "observation_v2_bundle",
        source_entity_id: "bundle-1",
        source_revision: "archive:bundle-1",
        reason: "bundle_restored",
        created_at: "2026-07-19T10:00:00.000Z",
      }),
    ).toThrow("Unsupported latent generation run invalidation reason: bundle_restored");
  });

  it("fails closed on unsupported stored lifecycle posture values", () => {
    const identityRow: LatentOpportunityIdentityRow = {
      id: "identity-1",
      user_id: "user-1",
      title: "Exploration -> danger",
      primary_category: "transition",
      secondary_categories: ["tension", "curiosity"],
      lifecycle_state: "corrupted_state",
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
      generation_run_id: "run-1",
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
      salience_rationale: {},
      construction_metadata: {},
      archived_at: null,
      created_at: "2026-06-15T08:00:00.000Z",
      updated_at: "2026-06-15T08:00:00.000Z",
    };

    expect(() =>
      fromLatentOpportunityRows(identityRow, manifestationRow, [], [], []),
    ).toThrow("Unsupported latent opportunity lifecycle state: corrupted_state");
  });
});
