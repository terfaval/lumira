import { describe, expect, it } from "vitest";

import { deriveOpeningCandidatesFromLatent } from "@/src/cognition/openings/derive-opening-candidates-from-latent";
import type { LatentSnapshot } from "@/src/domain/latent/types";

const baseSnapshot: LatentSnapshot = {
  id: "latent-1",
  userId: "user-1",
  summary: "summary",
  confidenceBand: "tentative",
  visibility: "internal_only",
  provenance: {
    sourceReflectiveObjects: ["obj-1"],
    sourceObservations: ["obs-1"],
    sourceGlossaryTerms: [],
    sourceThreads: [],
    sourceResponses: [],
    generationContext: "ctx",
  },
  signals: [],
  suggestions: [
    {
      id: "s-1",
      snapshotId: "latent-1",
      userId: "user-1",
      suggestionType: "possible_recurrence",
      phrasing: "This may connect with nearby recurring reflective material.",
      confidenceBand: "tentative",
      visibility: "reflective_space_optional",
      provenance: {
        sourceReflectiveObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        generationContext: "ctx",
      },
      createdAt: "2026-05-24T00:00:00.000Z",
      updatedAt: "2026-05-24T00:00:00.000Z",
    },
  ],
  archivedAt: null,
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

describe("deriveOpeningCandidatesFromLatent", () => {
  it("builds invitation-surface candidates with latent provenance reference", () => {
    const candidates = deriveOpeningCandidatesFromLatent(baseSnapshot);

    expect(candidates).toHaveLength(1);
    expect(candidates[0].visibility).toBe("invitation_surface");
    expect(candidates[0].provenance.latentSnapshotReference).toBe("latent-1");
    expect(candidates[0].openingType).toBe("continuity_noticing");
  });

  it("sanitizes authoritative phrasing", () => {
    const candidates = deriveOpeningCandidatesFromLatent({
      ...baseSnapshot,
      suggestions: [
        {
          ...baseSnapshot.suggestions[0],
          phrasing: "This reveals your unresolved issue.",
        },
      ],
    });

    expect(candidates[0].utterance.toLowerCase()).not.toContain("reveals");
    expect(candidates[0].utterance.toLowerCase()).not.toContain("unresolved issue");
  });
});
