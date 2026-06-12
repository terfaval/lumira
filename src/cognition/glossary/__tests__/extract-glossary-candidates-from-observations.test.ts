import { describe, expect, it } from "vitest";

import {
  extractGlossaryCandidatesFromObservationV2Bundle,
  extractGlossaryCandidatesFromObservations,
} from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
import type { Observation } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

function makeObservation(): Observation {
  return {
    id: "obs-1",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    source: "system_descriptive_extract",
    summary: "summary",
    uncertaintyNotes: [],
    semanticPolicyResult: "accept",
    semanticPolicyReasons: [],
    provenanceTier: "system_extract",
    summaryTrace: [{ fragmentPosition: 0, reason: "explicit_anchor", strength: "strong" }],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_semantic_guardrails_v1",
    status: "active",
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z",
    fragments: [
      {
        id: "frag-1",
        observationId: "obs-1",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "actor",
        fragmentText: "My friend",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "My friend", spanStart: 0, spanEnd: 9, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 0,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-2",
        observationId: "obs-1",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "actor",
        fragmentText: "My friend",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "My friend", spanStart: 0, spanEnd: 9, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 1,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-3",
        observationId: "obs-1",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "scene",
        fragmentText: "I stood in a room",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "I stood in a room", spanStart: 0, spanEnd: 16, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 2,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
      {
        id: "frag-4",
        observationId: "obs-1",
        userId: "user-1",
        reflectiveObjectId: "obj-1",
        category: "object",
        fragmentText: "The door symbolizes change",
        evidenceAdequacy: "strong_span",
        evidence: { snippet: "The door symbolizes change", spanStart: 0, spanEnd: 25, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 3,
        createdAt: "2026-05-24T00:00:00.000Z",
        updatedAt: "2026-05-24T00:00:00.000Z",
      },
    ],
  };
}

function makeObservationV2Bundle(): ObservationV2Bundle {
  return {
    bundleId: "bundle-1",
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    source: "system_llm_extract",
    runtimeVersion: "observation_v2_phase1",
    uncertaintyNotes: [],
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    },
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "A friend waits by the doorway.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "friend by the doorway",
          spanStart: 0,
          spanEnd: 21,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obsv2-1",
            position: 0,
            text: "The same hallway appears again.",
            evidence: [
              {
                snippet: "same hallway appears again",
                spanStart: 0,
                spanEnd: 26,
                contextLabel: "scene",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ label: "My friend", observationIds: ["obsv2-1"] }],
          locations: [{ label: "Hallway", observationIds: ["obsv2-1"] }],
          objects: [{ label: "Doorway", observationIds: ["obsv2-1"] }],
          interactions: [],
          affect: [{ label: "Fear", observationIds: ["obsv2-1"] }],
          agency: [],
          phenomenology: [],
          metacognition: [],
        },
      },
      {
        sceneId: "scene-2",
        position: 1,
        summary: "The same friend stands nearby.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "same friend",
          spanStart: 30,
          spanEnd: 41,
          contextLabel: "scene",
        },
        observations: [
          {
            observationId: "obsv2-2",
            position: 0,
            text: "My friend is still there.",
            evidence: [
              {
                snippet: "My friend is still there",
                spanStart: 30,
                spanEnd: 54,
                contextLabel: "scene",
              },
            ],
            uncertaintyNote: null,
          },
        ],
        derived: {
          actors: [{ label: "My friend", observationIds: ["obsv2-2"] }],
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

describe("extractGlossaryCandidatesFromObservations", () => {
  it("extracts candidate categories and merges recurrence count", () => {
    const candidates = extractGlossaryCandidatesFromObservations({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [makeObservation()],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      displayLabel: "My friend",
      sourceCategory: "actor",
      recurrenceCount: 2,
    });
  });

  it("filters interpretive fragments from candidate extraction", () => {
    const candidates = extractGlossaryCandidatesFromObservations({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [makeObservation()],
    });

    const labels = candidates.map((candidate) => candidate.displayLabel.toLowerCase()).join(" ");
    expect(labels).not.toContain("symbolizes");
  });

  it("uses accent-safe and punctuation-safe normalization keys", () => {
    const observation = makeObservation();
    observation.fragments = [
      {
        ...observation.fragments[0],
        fragmentText: "Kozmó",
      },
      {
        ...observation.fragments[1],
        id: "frag-2b",
        fragmentText: "(kozmo)",
      },
    ];

    const candidates = extractGlossaryCandidatesFromObservations({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      observations: [observation],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      displayLabel: "Kozmó",
      normalizedKey: "kozmo",
      recurrenceCount: 2,
    });
  });
});

describe("extractGlossaryCandidatesFromObservationV2Bundle", () => {
  it("extracts candidate categories from observation v2 derived structures and recurrence cues", () => {
    const candidates = extractGlossaryCandidatesFromObservationV2Bundle({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      bundle: makeObservationV2Bundle(),
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "My friend",
          sourceCategory: "actor",
          recurrenceCount: 2,
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obsv2-1",
        }),
        expect.objectContaining({
          displayLabel: "Hallway",
          sourceCategory: "location",
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obsv2-1",
        }),
        expect.objectContaining({
          displayLabel: "Fear",
          sourceCategory: "emotion",
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obsv2-1",
        }),
        expect.objectContaining({
          displayLabel: "The same hallway appears again.",
          sourceCategory: "recurrence_candidate",
          sourceObservationId: "scene-1",
          sourceObservationFragmentId: "obsv2-1",
        }),
      ]),
    );
  });

  it("filters interpretive V2 labels and recurrence text from candidate extraction", () => {
    const bundle = makeObservationV2Bundle();
    bundle.scenes[0].derived.objects.push({
      label: "Doorway symbolizes change",
      observationIds: ["obsv2-1"],
    });
    bundle.scenes[0].observations.push({
      observationId: "obsv2-3",
      position: 1,
      text: "The doorway symbolizes change again.",
      evidence: [
        {
          snippet: "doorway symbolizes change again",
          spanStart: 55,
          spanEnd: 86,
          contextLabel: "scene",
        },
      ],
      uncertaintyNote: null,
    });

    const candidates = extractGlossaryCandidatesFromObservationV2Bundle({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      bundle,
    });

    const labels = candidates.map((candidate) => candidate.displayLabel.toLowerCase()).join(" ");
    expect(labels).not.toContain("symbolizes");
  });

  it("normalizes derived labels with accent-safe recognition keys", () => {
    const bundle = makeObservationV2Bundle();
    bundle.scenes[0].derived.actors = [{ label: "Dóri", observationIds: ["obsv2-1"] }];
    bundle.scenes[1].derived.actors = [{ label: "dori.", observationIds: ["obsv2-2"] }];

    const candidates = extractGlossaryCandidatesFromObservationV2Bundle({
      userId: "user-1",
      reflectiveObjectId: "obj-1",
      bundle,
    });

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          displayLabel: "Dóri",
          normalizedKey: "dori",
          sourceCategory: "actor",
          recurrenceCount: 2,
        }),
      ]),
    );
  });
});
