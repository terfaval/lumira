import { describe, expect, it } from "vitest";

import type { OpeningSurface } from "@/src/domain/openings/types";
import type { OpeningDialogue } from "@/src/reflective-space/composition/derive-opening-dialogues";
import {
  containsForbiddenInteractionLanguage,
  filterOpeningSurfacesForCalmAvailability,
  isOpeningUtteranceVisible,
  toBoundedDialogueLimit,
  toDialogueTracePhrasing,
  toDialogueWindowState,
} from "@/src/ui/reflective-space/view-model";

const baseSurface: OpeningSurface = {
  openingId: "opening-1",
  userId: "user-1",
  openingType: "continuity_noticing",
  tone: "gentle",
  visibility: "invitation_surface",
  suppressionState: "none",
  suppressionDuration: null,
  suppressionRevisitEligibility: "revisitable_dormant",
  state: "available",
  preview: "continuity noticing is available",
  activated: false,
  createdAt: "2026-05-25T00:00:00.000Z",
};

const baseDialogue: OpeningDialogue = {
  dialogueId: "event-1",
  userId: "user-1",
  lineage: {
    openingId: "opening-1",
    activationEventId: "event-1",
    activationAt: "2026-05-25T00:00:00.000Z",
    openingActivationContext: "reflective_space_surface",
    openingResponseContext: "activation_without_response",
    responseId: null,
  },
  context: {
    reflectiveObjectIds: ["obj-1"],
    threadIds: ["thread-1"],
    glossaryTermIds: [],
  },
  provenance: {
    sourceObjects: ["obj-1"],
    sourceObservations: [],
    sourceGlossaryTerms: [],
    sourceThreads: ["thread-1"],
    sourceResponses: [],
    latentSnapshotReference: null,
    confidenceBand: "tentative",
    openingGenerationContext: "test",
  },
  entry: {
    opening: {
      id: "opening-1",
      openingType: "continuity_noticing",
      tone: "gentle",
      utterance: "This may connect nearby.",
      state: "activated",
      visibility: "opened",
    },
    activation: {
      eventId: "event-1",
      source: "reflective_space_surface",
      context: "reflective_space_surface",
      openingResponseContext: "activation_without_response",
      activatedAt: "2026-05-25T00:00:00.000Z",
    },
    response: null,
  },
};

describe("reflective space view model", () => {
  it("keeps opening surfacing suppression-aware and bounded", () => {
    const surfaces = filterOpeningSurfacesForCalmAvailability([
      baseSurface,
      { ...baseSurface, openingId: "opening-2", suppressionState: "suppressed" },
      { ...baseSurface, openingId: "opening-3" },
      { ...baseSurface, openingId: "opening-4" },
      { ...baseSurface, openingId: "opening-5" },
    ]);

    expect(surfaces.map((surface) => surface.openingId)).toEqual(["opening-1", "opening-3", "opening-4"]);
  });

  it("preserves activation_without_response as legitimate phrasing", () => {
    expect(toDialogueTracePhrasing(baseDialogue)).toBe("Opened without response; held quietly.");
  });

  it("uses bounded window semantics and avoids feed-style language", () => {
    const windowState = toDialogueWindowState({ limit: 999, returned: 4, hasMore: true });

    expect(windowState.mode).toBe("bounded_archive_window");
    expect(windowState.limit).toBe(20);
    expect(toBoundedDialogueLimit(-1)).toBe(8);

    const forbidden = containsForbiddenInteractionLanguage([
      "bounded archive window",
      "load earlier traces",
      "quiet revisitation",
    ]);

    expect(forbidden).toBe(false);
  });

  it("shows opening utterance only after explicit activation", () => {
    expect(isOpeningUtteranceVisible("opening-1", {})).toBe(false);
    expect(isOpeningUtteranceVisible("opening-1", { "opening-1": "This may connect nearby." })).toBe(true);
  });
});
