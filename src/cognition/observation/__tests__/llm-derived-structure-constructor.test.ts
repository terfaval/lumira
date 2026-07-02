import { afterEach, describe, expect, it, vi } from "vitest";

const responsesCreateMock = vi.fn();

vi.mock("openai", () => ({
  default: class MockOpenAI {
    responses = {
      create: responsesCreateMock,
    };
  },
}));

vi.mock("@/src/infrastructure/environment/env", () => ({
  readRuntimeEnvironment: () => ({
    nodeEnv: "test",
    supabaseUrl: null,
    supabaseAnonKey: null,
    supabaseServiceRoleKey: null,
    openAiApiKey: "sk-test",
  }),
}));

import {
  applyStructuredDerivedStructuresToBundle,
  constructDerivedStructuresFromObservationBundle,
} from "@/src/cognition/observation/llm-derived-structure-constructor";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

function buildFixtureBundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    reflectiveObjectId: "object-1",
    userId: "user-1",
    source: "system_llm_extract",
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: "en",
    },
    scenes: [
      {
        sceneId: "scene-camp",
        position: 0,
        summary: "At camp, others tease the dreamer and hide the phone while attention gathers around the conflict.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "They started hiding my phone and everyone kept watching.",
          spanStart: 0,
          spanEnd: 58,
          contextLabel: "scene_context",
        },
        observations: [
          {
            observationId: "obs-1",
            position: 0,
            text: "Two camp friends tease the dreamer and hide the phone.",
            evidence: [
              {
                snippet: "they teased me and hid my phone",
                spanStart: 0,
                spanEnd: 31,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-2",
            position: 1,
            text: "The dreamer worries that the phone may break and feels increasingly irritated.",
            evidence: [
              {
                snippet: "I worried it would break and got more irritated",
                spanStart: 32,
                spanEnd: 80,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-3",
            position: 2,
            text: "The dreamer helps search for the phone while sensing other people's attention on the scene.",
            evidence: [
              {
                snippet: "I helped search while everyone was looking at us",
                spanStart: 81,
                spanEnd: 129,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
          {
            observationId: "obs-4",
            position: 3,
            text: "Someone apologizes, the dreamer is reassured, and the dreamer realizes he does not know where the phone is.",
            evidence: [
              {
                snippet: "they apologized, I felt reassured, and I realized I did not know where it was",
                spanStart: 130,
                spanEnd: 208,
                contextLabel: "quoted_support",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ identityKey: "camp_friends", displayLabel: "camp friends", sourceLanguage: "en", label: "camp friends", observationIds: ["obs-1"] }],
          locations: [{ identityKey: "camp", displayLabel: "camp", sourceLanguage: "en", label: "camp", observationIds: ["obs-1"] }],
          objects: [{ identityKey: "phone", displayLabel: "phone", sourceLanguage: "en", label: "phone", observationIds: ["obs-1", "obs-2", "obs-3", "obs-4"] }],
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

describe("constructDerivedStructuresFromObservationBundle", () => {
  afterEach(() => {
    responsesCreateMock.mockReset();
  });

  it("applies second-stage derived structures to an existing observation bundle while preserving entity-like categories", async () => {
    const enriched = await applyStructuredDerivedStructuresToBundle({
      bundle: buildFixtureBundle(),
      structured: {
        scenes: [
          {
            sceneId: "scene-camp",
            derived: {
              actors: [{ identityKey: "camp_friends", displayLabel: "camp friends", sourceLanguage: "en", label: "camp friends", observationIds: ["obs-1"] }],
              locations: [{ identityKey: "camp", displayLabel: "camp", sourceLanguage: "en", label: "camp", observationIds: ["obs-1"] }],
              objects: [{ identityKey: "phone", displayLabel: "phone", sourceLanguage: "en", label: "phone", observationIds: ["obs-1", "obs-2", "obs-3", "obs-4"] }],
              interactions: [
                { identityKey: "teasing", displayLabel: "teasing", sourceLanguage: "en", label: "teasing", observationIds: ["obs-1"] },
                { identityKey: "helping_search", displayLabel: "helping search", sourceLanguage: "en", label: "helping search", observationIds: ["obs-3"] },
                { identityKey: "apologizing", displayLabel: "apologizing", sourceLanguage: "en", label: "apologizing", observationIds: ["obs-4"] },
              ],
              affect: [
                { identityKey: "worry", displayLabel: "worry", sourceLanguage: "en", label: "worry", observationIds: ["obs-2"] },
                { identityKey: "irritation", displayLabel: "irritation", sourceLanguage: "en", label: "irritation", observationIds: ["obs-2"] },
                { identityKey: "reassurance", displayLabel: "reassurance", sourceLanguage: "en", label: "reassurance", observationIds: ["obs-4"] },
              ],
              agency: [
                { identityKey: "helping", displayLabel: "helping", sourceLanguage: "en", label: "helping", observationIds: ["obs-3"] },
              ],
              phenomenology: [
                { identityKey: "sensed_attention", displayLabel: "sensed attention", sourceLanguage: "en", label: "sensed attention", observationIds: ["obs-3"] },
              ],
              metacognition: [
                { identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty", sourceLanguage: "en", label: "awareness of uncertainty", observationIds: ["obs-4"] },
              ],
            },
          },
        ],
      },
    });

    expect(enriched.scenes[0].derived.actors).toEqual([
      expect.objectContaining({ identityKey: "camp_friends", displayLabel: "camp friends" }),
    ]);
    expect(enriched.scenes[0].derived.locations).toEqual([
      expect.objectContaining({ identityKey: "camp", displayLabel: "camp" }),
    ]);
    expect(enriched.scenes[0].derived.objects).toEqual([
      expect.objectContaining({ identityKey: "phone", displayLabel: "phone" }),
    ]);
    expect(enriched.scenes[0].derived.interactions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ identityKey: "teasing", observationIds: ["obs-1"] }),
        expect.objectContaining({ identityKey: "helping_search", observationIds: ["obs-3"] }),
        expect.objectContaining({ identityKey: "apologizing", observationIds: ["obs-4"] }),
      ]),
    );
    expect(enriched.scenes[0].derived.affect).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ identityKey: "worry", observationIds: ["obs-2"] }),
        expect.objectContaining({ identityKey: "irritation", observationIds: ["obs-2"] }),
        expect.objectContaining({ identityKey: "reassurance", observationIds: ["obs-4"] }),
      ]),
    );
    expect(enriched.scenes[0].derived.agency).toEqual([
      expect.objectContaining({ identityKey: "helping", observationIds: ["obs-3"] }),
    ]);
    expect(enriched.scenes[0].derived.phenomenology).toEqual([
      expect.objectContaining({ identityKey: "sensed_attention", observationIds: ["obs-3"] }),
    ]);
    expect(enriched.scenes[0].derived.metacognition).toEqual([
      expect.objectContaining({ identityKey: "awareness_of_uncertainty", observationIds: ["obs-4"] }),
    ]);
  });

  it("calls the provider with ordered observations, evidence excerpts, and existing derived structures", async () => {
    responsesCreateMock.mockResolvedValue({
      output_text: JSON.stringify({
        scenes: [
          {
            sceneId: "scene-camp",
            derived: {
              actors: [{ identityKey: "camp_friends", displayLabel: "camp friends", sourceLanguage: "en", label: "camp friends", observationIds: ["obs-1"] }],
              locations: [{ identityKey: "camp", displayLabel: "camp", sourceLanguage: "en", label: "camp", observationIds: ["obs-1"] }],
              objects: [{ identityKey: "phone", displayLabel: "phone", sourceLanguage: "en", label: "phone", observationIds: ["obs-1", "obs-2", "obs-3", "obs-4"] }],
              interactions: [{ identityKey: "teasing", displayLabel: "teasing", sourceLanguage: "en", label: "teasing", observationIds: ["obs-1"] }],
              affect: [{ identityKey: "worry", displayLabel: "worry", sourceLanguage: "en", label: "worry", observationIds: ["obs-2"] }],
              agency: [{ identityKey: "helping", displayLabel: "helping", sourceLanguage: "en", label: "helping", observationIds: ["obs-3"] }],
              phenomenology: [{ identityKey: "sensed_attention", displayLabel: "sensed attention", sourceLanguage: "en", label: "sensed attention", observationIds: ["obs-3"] }],
              metacognition: [{ identityKey: "awareness_of_uncertainty", displayLabel: "awareness of uncertainty", sourceLanguage: "en", label: "awareness of uncertainty", observationIds: ["obs-4"] }],
            },
          },
        ],
      }),
    });

    const result = await constructDerivedStructuresFromObservationBundle(buildFixtureBundle());

    expect(result.scenes[0].derived.interactions).toEqual([
      expect.objectContaining({ identityKey: "teasing", displayLabel: "teasing" }),
    ]);

    const requestBody = responsesCreateMock.mock.calls[0]?.[0];
    expect(requestBody.input).toContain("Construct scene-local derived structures from the existing Observation V2 bundle.");
    expect(requestBody.input).toContain("Do not create new observations, scenes, evidence, latent reasoning, or interpretation.");
    expect(requestBody.input).toContain("Scene summary:");
    expect(requestBody.input).toContain("Observation ID: obs-1");
    expect(requestBody.input).toContain("Evidence: they teased me and hid my phone");
    expect(requestBody.input).toContain("Existing derived structures");
    expect(requestBody.input).toContain("awareness of uncertainty");
  });
});
