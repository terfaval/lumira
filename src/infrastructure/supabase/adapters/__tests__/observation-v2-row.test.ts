import { describe, expect, it } from "vitest";

import {
  fromObservationV2Rows,
  toObservationV2BundleInsertRow,
  toObservationV2SceneInsertRows,
  toObservationV2SceneObservationInsertRows,
  type ObservationV2BundleRow,
  type ObservationV2SceneObservationRow,
  type ObservationV2SceneRow,
} from "@/src/infrastructure/supabase/adapters/observation-v2-row";
import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

describe("observation v2 row adapters", () => {
  it("maps a bundle into native v2 insert rows", () => {
    const bundle = buildObservationV2Bundle({
      bundleId: "bundle-1",
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      source: "system_llm_extract",
      uncertaintyNotes: ["scene split may be fuzzy"],
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["llm_scene_extract"],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
      },
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "A stairwell scene.",
          boundaryReasoning: [],
          uncertaintyNotes: ["The stairwell may connect to a second landing."],
          evidenceContext: {
            snippet: "I followed someone up a stairwell.",
            spanStart: 0,
            spanEnd: 35,
            contextLabel: "scene",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "I followed someone up a stairwell.",
              evidence: [
                {
                  snippet: "I followed someone up a stairwell.",
                  spanStart: 0,
                  spanEnd: 35,
                  contextLabel: "quoted_support",
                },
              ],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [],
            locations: [],
            objects: [],
            interactions: [],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    const bundleRow = toObservationV2BundleInsertRow(bundle);
    const sceneRows = toObservationV2SceneInsertRows(bundle);
    const observationRows = toObservationV2SceneObservationInsertRows(bundle);

    expect(bundleRow.id).toBe("bundle-1");
    expect(bundleRow.provenance_metadata).toEqual(bundle.provenance);
    expect(sceneRows[0].bundle_id).toBe("bundle-1");
    expect(sceneRows[0].summary).toBe("A stairwell scene.");
    expect(sceneRows[0].uncertainty_notes).toEqual(["The stairwell may connect to a second landing."]);
    expect(observationRows[0].bundle_id).toBe("bundle-1");
    expect(observationRows[0].evidence).toEqual(bundle.scenes[0].observations[0].evidence);
  });

  it("rehydrates an observation v2 bundle from native rows", () => {
    const bundleRow: ObservationV2BundleRow = {
      id: "bundle-1",
      user_id: "user-1",
      reflective_object_id: "obj-1",
      source: "system_llm_extract",
      provenance_metadata: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["llm_scene_extract"],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
      },
      bundle_uncertainty_notes: ["scene split may be fuzzy"],
      runtime_version: "observation_v2_phase1",
      status: "active",
      archived_at: null,
      created_at: "2026-06-11T10:00:00.000Z",
      updated_at: "2026-06-11T10:00:00.000Z",
    };

    const sceneRows: ObservationV2SceneRow[] = [
      {
        id: "scene-row-1",
        bundle_id: "bundle-1",
        user_id: "user-1",
        reflective_object_id: "obj-1",
        scene_id: "scene-1",
        position: 0,
        summary: "A stairwell scene.",
        boundary_signals: [],
        uncertainty_notes: ["The stairwell may connect to a second landing."],
        evidence_context: {
          snippet: "I followed someone up a stairwell.",
          spanStart: 0,
          spanEnd: 35,
          contextLabel: "scene",
        },
        derived_structures: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
        created_at: "2026-06-11T10:00:00.000Z",
        updated_at: "2026-06-11T10:00:00.000Z",
      },
    ];

    const observationRows: ObservationV2SceneObservationRow[] = [
      {
        id: "scene-observation-row-1",
        bundle_id: "bundle-1",
        scene_row_id: "scene-row-1",
        user_id: "user-1",
        reflective_object_id: "obj-1",
        observation_id: "obs-1",
        position: 0,
        text: "I followed someone up a stairwell.",
        evidence: [
          {
            snippet: "I followed someone up a stairwell.",
            spanStart: 0,
            spanEnd: 35,
            contextLabel: "quoted_support",
          },
        ],
        uncertainty_note: null,
        created_at: "2026-06-11T10:00:00.000Z",
        updated_at: "2026-06-11T10:00:00.000Z",
      },
    ];

    const bundle = fromObservationV2Rows(bundleRow, sceneRows, observationRows);

    expect(bundle.bundleId).toBe("bundle-1");
    expect(bundle.status).toBe("active");
    expect(bundle.archivedAt).toBeNull();
    expect(bundle.scenes).toHaveLength(1);
    expect(bundle.scenes[0].sceneId).toBe("scene-1");
    expect(bundle.scenes[0].uncertaintyNotes).toEqual(["The stairwell may connect to a second landing."]);
    expect(bundle.scenes[0].observations[0].observationId).toBe("obs-1");
    expect(bundle.provenance?.semanticPolicyReasons).toEqual(["llm_scene_extract"]);
  });
});
