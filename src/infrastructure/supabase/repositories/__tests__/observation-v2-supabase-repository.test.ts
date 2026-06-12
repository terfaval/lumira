import { describe, expect, it, vi } from "vitest";

import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { SupabaseObservationV2Repository } from "@/src/infrastructure/supabase/repositories/observation-v2-supabase-repository";

describe("SupabaseObservationV2Repository", () => {
  it("writes a native observation v2 bundle and rehydrates it", async () => {
    const bundleInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: "bundle-1",
            user_id: "user-1",
            reflective_object_id: "obj-1",
            source: "system_llm_extract",
            provenance_metadata: {
              provenanceTier: "system_extract",
              semanticPolicyResult: "accept_with_uncertainty",
              semanticPolicyReasons: [],
              latentBackflowGuard: "observation_only",
              boundaryVersion: "observation_v2_phase1",
            },
            bundle_uncertainty_notes: [],
            runtime_version: "observation_v2_phase1",
            status: "active",
            archived_at: null,
            created_at: "2026-06-11T10:00:00.000Z",
            updated_at: "2026-06-11T10:00:00.000Z",
          },
          error: null,
        }),
      }),
    });

    const sceneInsert = vi.fn().mockResolvedValue({ error: null });
    const observationInsert = vi.fn().mockResolvedValue({ error: null });

    const maybeSingleBundle = vi.fn().mockResolvedValue({
      data: {
        id: "bundle-1",
        user_id: "user-1",
        reflective_object_id: "obj-1",
        source: "system_llm_extract",
        provenance_metadata: {
          provenanceTier: "system_extract",
          semanticPolicyResult: "accept_with_uncertainty",
          semanticPolicyReasons: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_v2_phase1",
        },
        bundle_uncertainty_notes: [],
        runtime_version: "observation_v2_phase1",
        status: "active",
        archived_at: null,
        created_at: "2026-06-11T10:00:00.000Z",
        updated_at: "2026-06-11T10:00:00.000Z",
      },
      error: null,
    });
    const sceneOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: "scene-row-1",
          bundle_id: "bundle-1",
          user_id: "user-1",
          reflective_object_id: "obj-1",
          scene_id: "scene-1",
          position: 0,
          summary: "A stairwell scene.",
          boundary_signals: [],
          uncertainty_notes: [],
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
      ],
      error: null,
    });
    const observationOrder = vi.fn().mockResolvedValue({
      data: [
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
      ],
      error: null,
    });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "observation_v2_bundles") {
        return {
          insert: bundleInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockReturnValue({
                  maybeSingle: maybeSingleBundle,
                }),
              }),
            }),
          }),
        };
      }

      if (table === "observation_v2_scenes") {
        return {
          insert: sceneInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: sceneOrder,
              }),
            }),
          }),
        };
      }

      if (table === "observation_v2_scene_observations") {
        return {
          insert: observationInsert,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: observationOrder,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseObservationV2Repository({ from } as never);
    const bundle = buildObservationV2Bundle({
      bundleId: "bundle-1",
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "A stairwell scene.",
          boundaryReasoning: [],
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

    const stored = await repository.create(bundle);

    expect(bundleInsert).toHaveBeenCalled();
    expect(sceneInsert).toHaveBeenCalled();
    expect(observationInsert).toHaveBeenCalled();
    expect(stored.bundleId).toBe("bundle-1");
    expect(stored.scenes[0].observations[0].observationId).toBe("obs-1");
  });

  it("loads a bundle by reflective object id", async () => {
    const maybeSingleBundle = vi.fn().mockResolvedValue({
      data: {
        id: "bundle-1",
        user_id: "user-1",
        reflective_object_id: "obj-1",
        source: "system_llm_extract",
        provenance_metadata: {
          provenanceTier: "system_extract",
          semanticPolicyResult: "accept_with_uncertainty",
          semanticPolicyReasons: [],
          latentBackflowGuard: "observation_only",
          boundaryVersion: "observation_v2_phase1",
        },
        bundle_uncertainty_notes: [],
        runtime_version: "observation_v2_phase1",
        status: "active",
        archived_at: null,
        created_at: "2026-06-11T10:00:00.000Z",
        updated_at: "2026-06-11T10:00:00.000Z",
      },
      error: null,
    });
    const sceneOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const observationOrder = vi.fn().mockResolvedValue({ data: [], error: null });

    const from = vi.fn().mockImplementation((table: string) => {
      if (table === "observation_v2_bundles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((column: string) => {
              if (column === "reflective_object_id") {
                return {
                  eq: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      maybeSingle: maybeSingleBundle,
                    }),
                  }),
                };
              }

              return {
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    maybeSingle: maybeSingleBundle,
                  }),
                }),
              };
            }),
          }),
        };
      }

      if (table === "observation_v2_scenes") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: sceneOrder,
              }),
            }),
          }),
        };
      }

      if (table === "observation_v2_scene_observations") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: observationOrder,
              }),
            }),
          }),
        };
      }

      return {};
    });

    const repository = new SupabaseObservationV2Repository({ from } as never);
    const loaded = await repository.getByReflectiveObjectId("obj-1", "user-1");

    expect(loaded?.bundleId).toBe("bundle-1");
    expect(loaded?.reflectiveObjectId).toBe("obj-1");
  });
});
