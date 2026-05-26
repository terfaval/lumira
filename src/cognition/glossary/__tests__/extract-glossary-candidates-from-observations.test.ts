import { describe, expect, it } from "vitest";

import { extractGlossaryCandidatesFromObservations } from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
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
});
