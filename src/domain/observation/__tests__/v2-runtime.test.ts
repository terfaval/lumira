import { describe, expect, it } from "vitest";

import {
  buildObservationV2Bundle,
  getSceneBoundarySignalKinds,
  type ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";

describe("buildObservationV2Bundle", () => {
  it("preserves ordered scenes with scene-contained observations and derived structures", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [
        {
          sceneId: "scene-2",
          position: 1,
          summary: "The interaction becomes unwanted.",
          boundaryReasoning: [{ kind: "narrative_change", note: "The situation turns." }],
          evidenceContext: {
            snippet: "the interaction became unwanted",
            spanStart: 32,
            spanEnd: 63,
            contextLabel: "scene_shift",
          },
          observations: [
            {
              observationId: "obs-2",
              position: 0,
              text: "The interaction shifts from guidance to unwanted intimacy.",
              evidence: [
                {
                  snippet: "the interaction became unwanted",
                  spanStart: 32,
                  spanEnd: 63,
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
            interactions: [{ label: "guidance becomes pressure", observationIds: ["obs-2"] }],
            affect: [],
            agency: [],
            phenomenology: [],
            metacognition: [],
          },
        },
        {
          sceneId: "scene-1",
          position: 0,
          summary: "The dreamer follows a guide up a staircase.",
          boundaryReasoning: [],
          evidenceContext: {
            snippet: "a guide led the dreamer up the staircase",
            spanStart: 0,
            spanEnd: 40,
            contextLabel: "scene_opening",
          },
          observations: [
            {
              observationId: "obs-1",
              position: 0,
              text: "The dreamer follows a young male up a spiral staircase.",
              evidence: [
                {
                  snippet: "a guide led the dreamer up the staircase",
                  spanStart: 0,
                  spanEnd: 40,
                  contextLabel: "quoted_support",
                },
              ],
              uncertaintyNote: null,
            },
          ],
          derived: {
            actors: [{ label: "young male", observationIds: ["obs-1"] }],
            locations: [{ label: "spiral staircase", observationIds: ["obs-1"] }],
            objects: [],
            interactions: [{ label: "guidance", observationIds: ["obs-1"] }],
            affect: [],
            agency: [{ label: "following", observationIds: ["obs-1"] }],
            phenomenology: [],
            metacognition: [],
          },
        },
      ],
    });

    expect(bundle.scenes).toHaveLength(2);
    expect(bundle.scenes[0].sceneId).toBe("scene-1");
    expect(bundle.scenes[0].observations[0].text).toContain("follows");
    expect(bundle.scenes[0].derived.agency[0].label).toBe("following");
  });

  it("keeps scene boundary reasoning as explicit situational signals", () => {
    const scene: ObservationV2Scene = {
      sceneId: "scene-2",
      position: 1,
      summary: "The dream shifts from guidance to unwanted intimacy.",
      boundaryReasoning: [
        { kind: "actor_change", note: "The primary interaction posture changes." },
        { kind: "narrative_change", note: "The situation breaks from guidance into pressure." },
      ],
      evidenceContext: {
        snippet: "the dynamic shifts sharply",
        spanStart: 32,
        spanEnd: 58,
        contextLabel: "scene_shift",
      },
      observations: [],
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
    };

    expect(getSceneBoundarySignalKinds(scene)).toEqual(["actor_change", "narrative_change"]);
  });

  it("adds durable bundle identity and provenance defaults when missing", () => {
    const bundle = buildObservationV2Bundle({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_llm_extract",
      scenes: [],
    });

    expect(bundle.bundleId).toMatch(/^observation-bundle-object-1-/);
    expect(bundle.runtimeVersion).toBe("observation_v2_phase1");
    expect(bundle.uncertaintyNotes).toEqual([]);
    expect(bundle.provenance).toEqual({
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });
  });
});
