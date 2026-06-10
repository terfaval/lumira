import { describe, expect, it } from "vitest";

import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import { buildObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

describe("projectObservationV2BundleToCreateObservationInput", () => {
  it("projects multi-scene observations into ordered V1 fragments without changing V2 organization", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "The dreamer follows a guide.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "a guide leads upward", spanStart: 0, spanEnd: 20, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "The dreamer follows a young male.",
              evidence: [{ snippet: "a guide leads upward", spanStart: 0, spanEnd: 20, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
        {
          sceneId: "scene-2",
          position: 1,
          summary: "The interaction becomes unwanted.",
          boundaryReasoning: [{ kind: "narrative_change", note: "The situation turns." }],
          evidenceContext: { snippet: "the interaction turns unwanted", spanStart: 21, spanEnd: 51, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "The interaction shifts from guidance to unwanted intimacy.",
              evidence: [{ snippet: "the interaction turns unwanted", spanStart: 21, spanEnd: 51, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
      ],
    });

    const projected = projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });

    expect(projected.fragments).toHaveLength(2);
    expect(projected.fragments[0].fragmentText).toContain("follows");
    expect(projected.fragments[1].fragmentText).toContain("shifts");
    expect(projected.summary).toContain("The dreamer follows a young male");
    expect(projected.summaryTrace.length).toBeGreaterThan(0);
  });
});
