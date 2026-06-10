import { describe, expect, it } from "vitest";

import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";

describe("createSceneDiscoveryBundle", () => {
  it("preserves ordered scenes inside the discovery bundle", () => {
    const bundle = createSceneDiscoveryBundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-2",
          position: 1,
          summary: "Scene two.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "second", spanStart: 5, spanEnd: 11, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "Second observation.",
              evidence: [{ snippet: "second", spanStart: 5, spanEnd: 11, contextLabel: "scene" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
        {
          sceneId: "scene-1",
          position: 0,
          summary: "Scene one.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "first", spanStart: 0, spanEnd: 4, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "First observation.",
              evidence: [{ snippet: "first", spanStart: 0, spanEnd: 4, contextLabel: "scene" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
      ],
    });

    expect(bundle.scenes).toHaveLength(2);
    expect(bundle.scenes[0].sceneId).toBe("scene-1");
    expect(bundle.scenes[1].sceneId).toBe("scene-2");
  });
});
