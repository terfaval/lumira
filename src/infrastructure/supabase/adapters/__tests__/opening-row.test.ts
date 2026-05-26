import { describe, expect, it } from "vitest";

import {
  toOpeningActivationUpdate,
  toOpeningInsertRow,
  toOpeningSuppressionUpdate,
} from "@/src/infrastructure/supabase/adapters/opening-row";

describe("opening row adapter", () => {
  it("maps create input to insert row with invitation defaults", () => {
    const row = toOpeningInsertRow({
      userId: "user-1",
      openingType: "continuity_noticing",
      tone: "gentle",
      utterance: "This may connect with nearby continuity.",
      visibility: "invitation_surface",
      provenance: {
        sourceObjects: ["obj-1"],
        sourceObservations: ["obs-1"],
        sourceGlossaryTerms: [],
        sourceThreads: [],
        sourceResponses: [],
        latentSnapshotReference: "latent-1",
        confidenceBand: "tentative",
        openingGenerationContext: "phase7_opening_scaffold",
      },
    });

    expect(row.state).toBe("available");
    expect(row.suppression_state).toBe("none");
    expect(row.latent_snapshot_id).toBe("latent-1");
  });

  it("maps suppression state update", () => {
    const patch = toOpeningSuppressionUpdate({
      openingId: "opening-1",
      userId: "user-1",
      nextState: "suppressed",
      suppressionReason: "too dense right now",
    });

    expect(patch.suppression_state).toBe("suppressed");
    expect(patch.suppression_reason).toBe("too dense right now");
  });

  it("maps temporary suppression expiry", () => {
    const patch = toOpeningSuppressionUpdate({
      openingId: "opening-1",
      userId: "user-1",
      nextState: "suppressed",
      duration: "temporary",
      suppressionExpiryMinutes: 30,
    });

    expect(patch.suppression_duration).toBe("temporary");
    expect(typeof patch.suppression_expires_at).toBe("string");
  });

  it("sets activated state and opened visibility", () => {
    const patch = toOpeningActivationUpdate("2026-05-24T00:00:00.000Z");
    expect(patch.state).toBe("activated");
    expect(patch.visibility).toBe("opened");
  });
});
