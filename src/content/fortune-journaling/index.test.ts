import { describe, expect, it } from "vitest";

import {
  getMajorArcanaDeck,
  getSituationUnfoldingMode,
  getTarotModes,
} from "@/src/content/fortune-journaling";

describe("fortune journaling content", () => {
  it("loads exactly the 22 Major Arcana cards as the runtime deck", () => {
    const deck = getMajorArcanaDeck();

    expect(deck).toHaveLength(22);
    expect(new Set(deck.map((card) => card.id)).size).toBe(22);
    expect(deck.every((card) => card.arcana === "major")).toBe(true);
    expect(deck.map((card) => card.number)).toEqual([...deck].map((card) => card.number).sort((left, right) => left - right));
  });

  it("exposes the authored Helyzet kibontása mode for MVP", () => {
    const mode = getSituationUnfoldingMode();

    expect(mode.id).toBe("situation_unfolding");
    expect(mode.name).toBe("Helyzet kibontása");
    expect(mode.card_count).toBe(2);
    expect(mode.positions).toEqual([
      { key: "visible", label: "Ami látszik" },
      { key: "hidden", label: "Ami a háttérben van" },
    ]);
    expect(mode.question_profile).toBe("surface_vs_depth");
  });

  it("preserves the full authored mode library even though only one mode is in the MVP UI", () => {
    const modes = getTarotModes();

    expect(modes.some((mode) => mode.id === "situation_unfolding")).toBe(true);
    expect(modes.some((mode) => mode.id === "timeline")).toBe(true);
    expect(modes.some((mode) => mode.id === "inner_roles")).toBe(true);
    expect(modes.some((mode) => mode.id === "system_view")).toBe(true);
  });
});
