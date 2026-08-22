import { describe, expect, it } from "vitest";

import {
  getDrawInstruction,
  getHeaderLeftControl,
  toggleDrawCardSelection,
} from "@/src/features/fortune-journaling/draw-state";

describe("fortune draw state helpers", () => {
  it("uses the shared Step II instruction copy for the initial and remaining draw count", () => {
    expect(getDrawInstruction(3, 0)).toBe("Válassz 3 kártyát");
    expect(getDrawInstruction(3, 1)).toBe("Válassz még 2 kártyát");
    expect(getDrawInstruction(3, 2)).toBe("Válassz még 1 kártyát");
    expect(getDrawInstruction(2, 0)).toBe("Válassz 2 kártyát");
    expect(getDrawInstruction(2, 1)).toBe("Válassz még 1 kártyát");
  });

  it("selects and deselects cards before completion", () => {
    const first = toggleDrawCardSelection({
      selectedCardIds: [],
      cardId: "the_fool",
      cardCount: 2,
    });

    expect(first.selectedCardIds).toEqual(["the_fool"]);
    expect(first.didChange).toBe(true);
    expect(first.shouldPersist).toBe(false);

    const second = toggleDrawCardSelection({
      selectedCardIds: first.selectedCardIds,
      cardId: "the_fool",
      cardCount: 2,
    });

    expect(second.selectedCardIds).toEqual([]);
    expect(second.didChange).toBe(true);
    expect(second.shouldPersist).toBe(false);
  });

  it("never duplicates cards or exceeds the authored card count", () => {
    const full = toggleDrawCardSelection({
      selectedCardIds: ["the_fool", "the_magician"],
      cardId: "the_high_priestess",
      cardCount: 2,
    });

    expect(full.selectedCardIds).toEqual(["the_fool", "the_magician"]);
    expect(full.didChange).toBe(false);
    expect(full.shouldPersist).toBe(false);
  });

  it("flags the final required unique selection for persistence", () => {
    const result = toggleDrawCardSelection({
      selectedCardIds: ["the_fool"],
      cardId: "the_magician",
      cardCount: 2,
    });

    expect(result.selectedCardIds).toEqual(["the_fool", "the_magician"]);
    expect(result.didChange).toBe(true);
    expect(result.shouldPersist).toBe(true);
  });

  it("uses backward navigation for Step II and exit semantics from Step III onward", () => {
    expect(getHeaderLeftControl("library")).toEqual({
      ariaLabel: "Vissza a kezdőlapra",
      target: "home",
    });
    expect(getHeaderLeftControl("draw")).toEqual({
      ariaLabel: "Vissza",
      target: "library",
    });
    expect(getHeaderLeftControl("spread")).toEqual({
      ariaLabel: "Kilépés a Fortune könyvtárba",
      target: "library",
    });
    expect(getHeaderLeftControl("awaiting-reply")).toEqual({
      ariaLabel: "Kilépés a Fortune könyvtárba",
      target: "library",
    });
  });
});
