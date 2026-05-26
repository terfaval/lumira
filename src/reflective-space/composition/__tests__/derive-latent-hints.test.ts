import { describe, expect, it } from "vitest";

import { deriveLatentHints } from "@/src/reflective-space/composition/derive-latent-hints";
import type { LatentSuggestion } from "@/src/domain/latent/types";

const baseSuggestion: LatentSuggestion = {
  id: "suggestion-1",
  snapshotId: "snapshot-1",
  userId: "user-1",
  suggestionType: "possible_connection",
  phrasing: "This may connect with nearby continuity.",
  confidenceBand: "tentative",
  visibility: "reflective_space_optional",
  provenance: {
    generationContext: "phase6_test",
    sourceReflectiveObjects: ["obj-1"],
    sourceObservations: ["obs-1"],
    sourceGlossaryTerms: [],
    sourceThreads: [],
    sourceResponses: [],
  },
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

describe("deriveLatentHints", () => {
  it("only surfaces optional latent suggestions", () => {
    const hints = deriveLatentHints([
      baseSuggestion,
      { ...baseSuggestion, id: "suggestion-2", visibility: "internal_only" },
    ]);

    expect(hints).toHaveLength(1);
    expect(hints[0].suggestionId).toBe("suggestion-1");
  });

  it("sanitizes authoritative language", () => {
    const hints = deriveLatentHints([
      { ...baseSuggestion, phrasing: "This reveals your subconscious pattern." },
    ]);

    expect(hints[0].phrasing.toLowerCase()).not.toContain("reveals");
  });
});
