import { describe, expect, it } from "vitest";

import { classifyGlossaryCandidates } from "@/src/cognition/glossary/classify-glossary-candidates";
import type { CreateGlossaryCandidateInput, GlossaryTerm } from "@/src/domain/glossary/types";

function makeCandidate(overrides: Partial<CreateGlossaryCandidateInput> = {}): CreateGlossaryCandidateInput {
  return {
    userId: "user-1",
    reflectiveObjectId: "obj-1",
    normalizedKey: "kozmo",
    displayLabel: "Kozmo",
    sourceCategory: "actor",
    sourceObservationId: "obs-1",
    sourceObservationFragmentId: "frag-1",
    recurrenceCount: 1,
    ...overrides,
  };
}

function makeTerm(overrides: Partial<GlossaryTerm> = {}): GlossaryTerm {
  return {
    id: "term-1",
    userId: "user-1",
    normalizedKey: "kozmo",
    displayLabel: "Kozmo",
    canonicalLabel: "Kozmo",
    type: "person",
    aliases: [],
    generalNote: null,
    appearanceCount: 3,
    notes: null,
    state: "active",
    suppression: {
      state: "none",
      suppressedAt: null,
      reason: null,
    },
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("classifyGlossaryCandidates", () => {
  it("marks a candidate as match_candidate on a unique normalized exact match", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate()],
      terms: [makeTerm()],
    });

    expect(candidate.candidateClass).toBe("match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1"]);
  });

  it("marks a candidate as match_candidate on a unique alias match", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "apu", displayLabel: "apu" })],
      terms: [
        makeTerm({
          aliases: ["apam", "apu"],
          normalizedKey: "apa",
          displayLabel: "Apa",
          canonicalLabel: "Apa",
        }),
      ],
    });

    expect(candidate.candidateClass).toBe("match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1"]);
  });

  it("marks a candidate as ambiguous_match_candidate when multiple exact matches exist", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "dori", displayLabel: "Dori" })],
      terms: [
        makeTerm({ id: "term-2", normalizedKey: "dori", displayLabel: "Dori", canonicalLabel: "Dori" }),
        makeTerm({ id: "term-1", normalizedKey: "dori", displayLabel: "Dori Prime", canonicalLabel: "Dori Prime" }),
      ],
    });

    expect(candidate.candidateClass).toBe("ambiguous_match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1", "term-2"]);
  });

  it("marks a candidate as ambiguous_match_candidate when multiple alias matches exist", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "exem", displayLabel: "exem" })],
      terms: [
        makeTerm({ id: "term-2", normalizedKey: "reka", aliases: ["exem"] }),
        makeTerm({ id: "term-1", normalizedKey: "dori", aliases: ["exem"] }),
      ],
    });

    expect(candidate.candidateClass).toBe("ambiguous_match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1", "term-2"]);
  });

  it("dedupes ambiguous alias matches and orders proposed ids deterministically", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "apu", displayLabel: "apu" })],
      terms: [
        makeTerm({ id: "term-2", normalizedKey: "apa-2", aliases: ["apu"] }),
        makeTerm({ id: "term-1", normalizedKey: "apa-1", aliases: ["apu", "apu", "apam"] }),
      ],
    });

    expect(candidate.candidateClass).toBe("ambiguous_match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1", "term-2"]);
  });

  it("keeps exact-match results ahead of alias matches without mixing the result sets", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "apa", displayLabel: "Apa" })],
      terms: [
        makeTerm({ id: "term-2", normalizedKey: "apa", aliases: ["apu"] }),
        makeTerm({ id: "term-1", normalizedKey: "apa", aliases: ["apa"] }),
        makeTerm({ id: "term-3", normalizedKey: "other", aliases: ["apa"] }),
      ],
    });

    expect(candidate.candidateClass).toBe("ambiguous_match_candidate");
    expect(candidate.proposedEntityIds).toEqual(["term-1", "term-2"]);
  });

  it("falls back to new_candidate when no deterministic match exists", () => {
    const [candidate] = classifyGlossaryCandidates({
      candidates: [makeCandidate({ normalizedKey: "mammut", displayLabel: "Mammut" })],
      terms: [makeTerm()],
    });

    expect(candidate.candidateClass).toBe("new_candidate");
    expect(candidate.proposedEntityIds).toEqual([]);
  });
});
