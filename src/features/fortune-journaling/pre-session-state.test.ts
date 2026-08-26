import { describe, expect, it } from "vitest";

import { getTarotModeById } from "@/src/content/fortune-journaling";
import {
  beginFortunePreSession,
  continueFortunePreSessionToDraw,
  normalizeFortuneFocusDraft,
  returnFortuneDrawToFocus,
  skipFortuneFocusStep,
} from "@/src/features/fortune-journaling/pre-session-state";

describe("fortune pre-session state", () => {
  it("starts at the Focus step immediately after mode selection", () => {
    const state = beginFortunePreSession(getTarotModeById("timeline"));

    expect(state.mode.id).toBe("timeline");
    expect(state.stage).toBe("focus");
    expect(state.focusDraft).toBe("");
    expect(state.selectedCardIds).toEqual([]);
  });

  it("continues from Focus to Draw while preserving the local draft", () => {
    const started = beginFortunePreSession(getTarotModeById("timeline"));
    const continued = continueFortunePreSessionToDraw({
      ...started,
      focusDraft: "Munkahelyváltás körül vagyok bizonytalan.",
    });

    expect(continued.stage).toBe("draw");
    expect(continued.focusDraft).toBe("Munkahelyváltás körül vagyok bizonytalan.");
  });

  it("treats skip as an explicit no-focus choice", () => {
    const started = beginFortunePreSession(getTarotModeById("timeline"));
    const skipped = skipFortuneFocusStep({
      ...started,
      focusDraft: "Ezt most mégsem szeretném megadni.",
    });

    expect(skipped.stage).toBe("draw");
    expect(skipped.focusDraft).toBe("");
  });

  it("returns from Draw to Focus without keeping the in-progress card selection", () => {
    const drawState = continueFortunePreSessionToDraw({
      ...beginFortunePreSession(getTarotModeById("timeline")),
      focusDraft: "Még alakul bennem.",
      selectedCardIds: ["the_fool"],
    });
    const returned = returnFortuneDrawToFocus(drawState);

    expect(returned.stage).toBe("focus");
    expect(returned.focusDraft).toBe("Még alakul bennem.");
    expect(returned.selectedCardIds).toEqual([]);
  });

  it("normalizes whitespace-only focus to null before persistence", () => {
    expect(normalizeFortuneFocusDraft("   ")).toBeNull();
    expect(normalizeFortuneFocusDraft("  Munkahelyi váltás  ")).toBe("Munkahelyi váltás");
  });
});
