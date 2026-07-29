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

  it("retains later-scene observations, evidence spans, and ordering in the compatibility projection", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-2",
      userId: "user-2",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-1",
          position: 0,
          summary: "An early stairwell scene.",
          boundaryReasoning: [],
          evidenceContext: { snippet: "A guide leads upward", spanStart: 0, spanEnd: 20, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "The dreamer follows a guide upward.",
              evidence: [{ snippet: "A guide leads upward", spanStart: 0, spanEnd: 20, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
          ],
          derived: { actors: [], locations: [], objects: [], interactions: [], affect: [], agency: [], phenomenology: [], metacognition: [] },
        },
        {
          sceneId: "scene-2",
          position: 1,
          summary: "A late shoreline ending.",
          boundaryReasoning: [{ kind: "goal_change", note: "The ending reaches a shoreline." }],
          evidenceContext: { snippet: "At the end they reach the shoreline", spanStart: 4200, spanEnd: 4260, contextLabel: "scene" },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "At the end they reach the shoreline.",
              evidence: [{ snippet: "At the end they reach the shoreline", spanStart: 4200, spanEnd: 4260, contextLabel: "quoted_support" }],
              uncertaintyNote: null,
            },
            {
              observationId: "obs-3",
              position: 1,
              text: "A helper appears beside the water at the ending.",
              evidence: [{ snippet: "A helper appears beside the water", spanStart: 4261, spanEnd: 4310, contextLabel: "quoted_support" }],
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

    expect(projected.fragments.map((fragment) => fragment.fragmentText)).toEqual([
      "The dreamer follows a guide upward.",
      "At the end they reach the shoreline.",
      "A helper appears beside the water at the ending.",
    ]);
    expect(projected.fragments.map((fragment) => fragment.position)).toEqual([0, 100, 101]);
    expect(projected.fragments[1].evidence).toEqual({
      snippet: "At the end they reach the shoreline",
      spanStart: 4200,
      spanEnd: 4260,
      contextLabel: "quoted_support",
    });
    expect(projected.fragments[2].evidence).toEqual({
      snippet: "A helper appears beside the water",
      spanStart: 4261,
      spanEnd: 4310,
      contextLabel: "quoted_support",
    });
    expect(projected.summaryTrace.some((trace) => trace.fragmentPosition === 100)).toBe(true);
    expect(projected.summaryTrace.some((trace) => trace.fragmentPosition === 101)).toBe(true);
  });
});
