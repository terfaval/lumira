import { describe, expect, it, vi } from "vitest";

import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

const createObservationMock = vi.fn();

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-repository", () => ({
  createObservationRepository: () => ({
    create: createObservationMock,
  }),
}));

import { createObservationV2WriteStore } from "@/src/infrastructure/persistence/observation-v2-write-store";

describe("ObservationV2WriteStore", () => {
  it("keeps V1 projection behind the temporary storage adapter", async () => {
    createObservationMock.mockReset();
    createObservationMock.mockResolvedValue({ id: "obs-1" });

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

    await store.createFromBundle(bundle);

    expect(createObservationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reflectiveObjectId: "obj-1",
        userId: "user-1",
        source: "system_llm_extract",
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["observation_v2_temporary_storage_adapter"],
      }),
    );
  });
});
