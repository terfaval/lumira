import { describe, expect, it } from "vitest";

import { applyOpeningCadencePolicy } from "@/src/cognition/openings/opening-cadence-policy";
import type { Opening, OpeningCandidate } from "@/src/domain/openings/types";

const now = "2026-05-25T10:00:00.000Z";

const baseCandidate: OpeningCandidate = {
  userId: "user-1",
  openingType: "continuity_noticing",
  tone: "gentle",
  utterance: "This may connect with nearby continuity.",
  visibility: "invitation_surface",
  provenance: {
    sourceObjects: ["obj-1"],
    sourceObservations: ["obs-1"],
    sourceGlossaryTerms: ["term-1"],
    sourceThreads: [],
    sourceResponses: [],
    latentSnapshotReference: "latent-1",
    confidenceBand: "tentative",
    openingGenerationContext: "phase7_opening_scaffold",
  },
};

const baseOpening: Opening = {
  id: "opening-1",
  userId: "user-1",
  openingType: "continuity_noticing",
  tone: "gentle",
  utterance: "This may connect with nearby continuity.",
  state: "available",
  visibility: "invitation_surface",
  suppressionState: "none",
  suppressionDuration: null,
  suppressionReason: null,
  suppressionExpiry: { at: null },
  suppressionRevisitEligibility: "revisitable_dormant",
  suppressionReactivatedAt: null,
  provenance: baseCandidate.provenance,
  activatedAt: null,
  dismissedAt: null,
  archivedAt: null,
  createdAt: "2026-05-25T09:55:00.000Z",
  updatedAt: "2026-05-25T09:55:00.000Z",
};

describe("applyOpeningCadencePolicy", () => {
  it("returns no-opening on recent resurfacing cooldown", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [baseCandidate],
      recentOpenings: [baseOpening],
      nowIso: now,
    });

    expect(decision.openings).toHaveLength(0);
    expect(decision.noOpeningReason).toBe("recent_resurfacing");
  });

  it("prioritizes suppression overlap and returns silence", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [baseCandidate],
      recentOpenings: [
        {
          ...baseOpening,
          suppressionState: "suppressed",
          suppressionDuration: "indefinite",
          suppressionReason: "too dense",
        },
      ],
      nowIso: "2026-05-29T12:00:00.000Z",
    });

    expect(decision.openings).toHaveLength(0);
    expect(decision.noOpeningReason).toBe("suppression_overlap");
  });

  it("dedupes near-identical candidates and caps surfaced openings", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [
        baseCandidate,
        { ...baseCandidate, utterance: "This may connect with nearby continuity." },
        { ...baseCandidate, openingType: "reflective_question", utterance: "Perhaps this might relate nearby." },
      ],
      recentOpenings: [],
      nowIso: "2026-05-29T12:00:00.000Z",
    });

    expect(decision.openings).toHaveLength(2);
    expect(decision.noOpeningReason).toBeNull();
  });

  it("allows resurfacing after temporary suppression expiry", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [baseCandidate],
      recentOpenings: [
        {
          ...baseOpening,
          createdAt: "2026-05-20T09:00:00.000Z",
          updatedAt: "2026-05-20T09:00:00.000Z",
          suppressionState: "suppressed",
          suppressionDuration: "temporary",
          suppressionExpiry: { at: "2026-05-21T09:00:00.000Z" },
        },
      ],
      nowIso: "2026-05-29T12:00:00.000Z",
    });

    expect(decision.openings).toHaveLength(1);
    expect(decision.noOpeningReason).toBeNull();
  });

  it("does not treat user-reactivated suppression as active suppression", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [baseCandidate],
      recentOpenings: [
        {
          ...baseOpening,
          suppressionState: "suppressed",
          suppressionDuration: "user_reactivated",
          suppressionRevisitEligibility: "user_reactivated",
          suppressionReactivatedAt: "2026-05-25T09:00:00.000Z",
        },
      ],
      nowIso: "2026-05-29T12:00:00.000Z",
    });

    expect(decision.openings).toHaveLength(1);
    expect(decision.noOpeningReason).toBeNull();
  });

  it("uses refractory similarity window after cooldown to block repeated resurfacing", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [baseCandidate],
      recentOpenings: [
        {
          ...baseOpening,
          createdAt: "2026-05-25T08:30:00.000Z",
          updatedAt: "2026-05-25T08:30:00.000Z",
        },
      ],
      nowIso: now,
    });

    expect(decision.openings).toHaveLength(0);
    expect(decision.noOpeningReason).toBe("repetition_risk");
  });

  it("suppresses low-confidence candidates to preserve silence", () => {
    const decision = applyOpeningCadencePolicy({
      candidates: [
        {
          ...baseCandidate,
          provenance: {
            ...baseCandidate.provenance,
            confidenceBand: "low",
          },
        },
      ],
      recentOpenings: [],
      nowIso: "2026-05-29T12:00:00.000Z",
    });

    expect(decision.openings).toHaveLength(0);
    expect(decision.noOpeningReason).toBe("low_confidence");
  });
});
