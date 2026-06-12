import { describe, expect, it } from "vitest";

import {
  deriveGlossaryCuesFromObservationV2Bundle,
  deriveGlossaryCuesFromObservations,
} from "@/src/reflective-space/composition/derive-glossary-cues";
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
        evidenceAdequacy: "snippet_only",
        evidence: { snippet: "My friend", spanStart: null, spanEnd: null, contextLabel: "raw_sentence" },
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
        evidenceAdequacy: "snippet_only",
        evidence: { snippet: "My friend", spanStart: null, spanEnd: null, contextLabel: "raw_sentence" },
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
        fragmentText: "This symbolizes change",
        evidenceAdequacy: "snippet_only",
        evidence: { snippet: "This symbolizes change", spanStart: null, spanEnd: null, contextLabel: "raw_sentence" },
        uncertaintyNote: null,
        position: 2,
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
      semanticPolicyReasons: [],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    },
    scenes: [
      {
        sceneId: "scene-1",
        position: 0,
        summary: "A friend returns in the hallway.",
        boundaryReasoning: [],
        evidenceContext: {
          snippet: "friend returns in the hallway",
          spanStart: 0,
          spanEnd: 30,
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
          actors: [
            { label: "My friend", observationIds: ["obsv2-1"] },
            { label: "My friend", observationIds: ["obsv2-1"] },
          ],
          locations: [{ label: "Hallway", observationIds: ["obsv2-1"] }],
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

describe("deriveGlossaryCuesFromObservations", () => {
  it("surfaces continuity cues from allowed descriptive categories", () => {
    const cues = deriveGlossaryCuesFromObservations([makeObservation()]);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({
      category: "actor",
      label: "My friend",
      recurrenceCount: 2,
      phrasing: "appears repeatedly",
    });
  });

  it("uses non-interpretive wording", () => {
    const cues = deriveGlossaryCuesFromObservations([makeObservation()]);
    const phrasing = cues.map((cue) => cue.phrasing.toLowerCase()).join(" ");

    expect(phrasing).not.toContain("represents");
    expect(phrasing).not.toContain("symbolizes");
    expect(phrasing).not.toContain("means");
    expect(phrasing).toContain("appears repeatedly");
  });
});

describe("deriveGlossaryCuesFromObservationV2Bundle", () => {
  it("surfaces continuity cues from observation v2 derived structures", () => {
    const cues = deriveGlossaryCuesFromObservationV2Bundle(makeObservationV2Bundle());

    expect(cues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: "actor",
          label: "My friend",
          recurrenceCount: 2,
          phrasing: "appears repeatedly",
        }),
        expect.objectContaining({
          category: "recurrence_candidate",
          label: "The same hallway appears again.",
        }),
      ]),
    );
  });
});
