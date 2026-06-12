import { describe, expect, it, vi } from "vitest";

import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

const createObservationV2Mock = vi.fn();

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-v2-repository", () => ({
  createObservationV2Repository: () => ({
    create: createObservationV2Mock,
  }),
}));

import { createObservationV2WriteStore } from "@/src/infrastructure/persistence/observation-v2-write-store";

describe("ObservationV2WriteStore", () => {
  it("writes the live generated path through native observation v2 persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const store = createObservationV2WriteStore();
    const bundle: ObservationV2Bundle = {
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
    };

    const stored = await store.createFromBundle(bundle);

    expect(createObservationV2Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        bundleId: expect.stringMatching(/^observation-bundle-obj-1-/),
        reflectiveObjectId: "obj-1",
        userId: "user-1",
        source: "system_llm_extract",
        provenance: expect.objectContaining({
          provenanceTier: "system_extract",
          semanticPolicyResult: "accept_with_uncertainty",
          semanticPolicyReasons: [],
        }),
      }),
    );
    expect(stored.bundleId).toMatch(/^observation-bundle-obj-1-/);
  });
});
