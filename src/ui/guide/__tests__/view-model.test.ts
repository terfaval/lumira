import { describe, expect, it } from "vitest";

import { GUIDE_ALL_FILTER, getGuideRelatedCards, getGuideVisibleCards } from "@/src/ui/guide/view-model";

describe("guide view model", () => {
  it("returns all cards when no query or filters are active", () => {
    const cards = getGuideVisibleCards({
      query: "",
      selectedPrimary: GUIDE_ALL_FILTER,
    });

    expect(cards).toHaveLength(41);
  });

  it("applies search results before the primary filter", () => {
    const cards = getGuideVisibleCards({
      query: "koffein",
      selectedPrimary: "Alvás",
    });

    expect(cards.map((card) => card.slug)).toEqual(["etkezes-koffein-alkohol-es-alvas"]);
  });

  it("returns an empty result when the selected primary filter excludes the search result", () => {
    const cards = getGuideVisibleCards({
      query: "koffein",
      selectedPrimary: "Tudatos álmodás",
    });

    expect(cards).toEqual([]);
  });

  it("resolves related cards in data order and omits the current card", () => {
    const related = getGuideRelatedCards("nem-tudok-elaludni");

    expect(related.map((card) => card.slug)).toEqual([
      "tul-sokat-gondolkodom-lefekveskor",
      "stressz-es-alvas",
      "telefon-es-kepernyohasznalat",
      "etkezes-koffein-alkohol-es-alvas",
    ]);
  });
});
