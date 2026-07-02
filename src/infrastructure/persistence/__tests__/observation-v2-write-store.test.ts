import { describe, expect, it, vi } from "vitest";

import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

const createObservationV2Mock = vi.fn();

vi.mock("@/src/infrastructure/supabase/repositories/create-observation-v2-repository", () => ({
  createObservationV2Repository: () => ({
    create: createObservationV2Mock,
  }),
}));

import { createObservationV2WriteStore } from "@/src/infrastructure/persistence/observation-v2-write-store";

function makeValidBundle(): ObservationV2Bundle {
  return {
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
      {
        sceneId: "scene-2",
        position: 1,
        summary: "A doorway scene.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "I reached a doorway and paused.",
          spanStart: 36,
          spanEnd: 66,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obs-2",
            position: 0,
            text: "I reached a doorway and paused.",
            evidence: [
              {
                snippet: "I reached a doorway and paused.",
                spanStart: 36,
                spanEnd: 66,
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
}

describe("ObservationV2WriteStore", () => {
  it("writes the live generated path through native observation v2 persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const store = createObservationV2WriteStore();
    const bundle = makeValidBundle();

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
    expect(stored.scenes.map((scene) => scene.sceneId)).toEqual(["scene-1", "scene-2"]);
    expect(stored.scenes[0]?.observations.map((observation) => observation.observationId)).toEqual(["obs-1"]);
    expect(stored.scenes[1]?.observations.map((observation) => observation.observationId)).toEqual(["obs-2"]);
    expect(stored.scenes[0]?.evidenceContext.snippet).toBe("I followed someone up a stairwell.");
    expect(stored.scenes[1]?.observations[0]?.evidence[0]?.snippet).toBe("I reached a doorway and paused.");
  });

  it("rejects interpretive observation content before native v2 persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const store = createObservationV2WriteStore();

    await expect(
      store.createFromBundle({
        reflectiveObjectId: "obj-1",
        userId: "user-1",
        source: "system_llm_extract",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "The scarecrow represents paternal fear.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "A scarecrow stood near the field.",
              spanStart: 0,
              spanEnd: 31,
              contextLabel: "scene",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "A scarecrow stood near the field.",
                evidence: [
                  {
                    snippet: "A scarecrow stood near the field.",
                    spanStart: 0,
                    spanEnd: 31,
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
      }),
    ).rejects.toThrow("Observation V2 persistence rejected semantically invalid content.");

    expect(createObservationV2Mock).not.toHaveBeenCalled();
  });

  it("rejects latent backflow phrases before native v2 persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async (bundle: ObservationV2Bundle) => bundle);

    const store = createObservationV2WriteStore();

    await expect(
      store.createFromBundle({
        reflectiveObjectId: "obj-1",
        userId: "user-1",
        source: "system_llm_extract",
        scenes: [
          {
            sceneId: "scene-1",
            position: 0,
            summary: "A nearby scene may indicate possible recurrence.",
            boundaryReasoning: [],
            evidenceContext: {
              snippet: "The same hallway appeared again.",
              spanStart: 0,
              spanEnd: 31,
              contextLabel: "scene",
            },
            observations: [
              {
                observationId: "obs-1",
                position: 0,
                text: "possible_recurrence appeared in the notes.",
                evidence: [
                  {
                    snippet: "The same hallway appeared again.",
                    spanStart: 0,
                    spanEnd: 31,
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
      }),
    ).rejects.toThrow("Observation V2 persistence rejected semantically invalid content.");

    expect(createObservationV2Mock).not.toHaveBeenCalled();
  });

  it("fails hard when the rehydrated bundle loses structural scene data after persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async () => ({
      bundleId: "observation-bundle-obj-1-observation_v2_phase1",
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      source: "system_llm_extract",
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "unknown",
      },
      uncertaintyNotes: [],
      runtimeVersion: "observation_v2_phase1",
      scenes: [],
    }));

    const store = createObservationV2WriteStore();

    await expect(store.createFromBundle(makeValidBundle())).rejects.toThrow(
      "Observation V2 persistence produced a structurally invalid bundle.",
    );
  });

  it("fails hard when the rehydrated bundle loses observation evidence after persistence", async () => {
    createObservationV2Mock.mockReset();
    createObservationV2Mock.mockImplementation(async () => ({
      bundleId: "observation-bundle-obj-1-observation_v2_phase1",
      reflectiveObjectId: "obj-1",
      userId: "user-1",
      source: "system_llm_extract",
      provenance: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_v2_phase1",
        dreamLanguage: "unknown",
      },
      uncertaintyNotes: [],
      runtimeVersion: "observation_v2_phase1",
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
              evidence: [],
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
        {
          sceneId: "scene-2",
          position: 1,
          summary: "A doorway scene.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "I reached a doorway and paused.",
            spanStart: 36,
            spanEnd: 66,
            contextLabel: "scene",
          },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "I reached a doorway and paused.",
              evidence: [
                {
                  snippet: "I reached a doorway and paused.",
                  spanStart: 36,
                  spanEnd: 66,
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
    }));

    const store = createObservationV2WriteStore();

    await expect(store.createFromBundle(makeValidBundle())).rejects.toThrow(
      "Observation V2 persistence produced a structurally invalid bundle.",
    );
  });
});
