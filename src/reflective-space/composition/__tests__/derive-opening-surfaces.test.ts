import { describe, expect, it } from "vitest";

import { deriveOpeningSurfaces } from "@/src/reflective-space/composition/derive-opening-surfaces";
import type { Opening } from "@/src/domain/openings/types";

const baseOpening: Opening = {
  id: "opening-1",
  userId: "user-1",
  openingType: "reflective_question",
  tone: "gentle",
  utterance: "This may connect with nearby reflective continuity.",
  state: "available",
  visibility: "invitation_surface",
  suppressionState: "none",
  suppressionDuration: null,
  suppressionReason: null,
  suppressionExpiry: { at: null },
  suppressionRevisitEligibility: "revisitable_dormant",
  suppressionReactivatedAt: null,
  provenance: {
    sourceObjects: ["obj-1"],
    sourceObservations: [],
    sourceGlossaryTerms: [],
    sourceThreads: [],
    sourceResponses: [],
    latentSnapshotReference: "latent-1",
    confidenceBand: "tentative",
    openingGenerationContext: "phase7_opening_scaffold",
  },
  activatedAt: null,
  dismissedAt: null,
  archivedAt: null,
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z",
};

describe("deriveOpeningSurfaces", () => {
  it("returns invitation surfaces without utterance leakage", () => {
    const surfaces = deriveOpeningSurfaces([baseOpening]);
    expect(surfaces).toHaveLength(1);
    expect(JSON.stringify(surfaces[0]).toLowerCase()).not.toContain("connect with nearby reflective continuity");
  });

  it("hides suppressed openings", () => {
    const surfaces = deriveOpeningSurfaces([{ ...baseOpening, suppressionState: "suppressed" }]);
    expect(surfaces).toHaveLength(0);
  });

  it("caps surfaced openings for pacing", () => {
    const surfaces = deriveOpeningSurfaces([
      { ...baseOpening, id: "opening-1" },
      { ...baseOpening, id: "opening-2" },
      { ...baseOpening, id: "opening-3" },
    ]);

    expect(surfaces).toHaveLength(2);
  });
});
