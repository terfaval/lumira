import { describe, expect, it } from "vitest";

import { deriveGlossaryCuesFromObservations } from "@/src/reflective-space/composition/derive-glossary-cues";
import type { Observation } from "@/src/domain/observation/types";

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
