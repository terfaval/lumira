import { describe, expect, it } from "vitest";

import { getMajorArcanaCardById } from "@/src/content/fortune-journaling";
import {
  DEFAULT_FORTUNE_TENSION_TRANSFORM_HEX,
  getFortuneCardInspectInfo,
} from "@/src/features/fortune-journaling/card-info";

describe("fortune card inspect info", () => {
  it("reads protagonist palette color from the authoritative visual DNA source", () => {
    const card = getMajorArcanaCardById("the_high_priestess");
    const info = getFortuneCardInspectInfo(card);

    expect(info.archetypePills).toEqual(["csend", "belső tudás", "érzékelés"]);
    expect(info.summary).toBe(card.summary);
    expect(info.possibleReadings).toEqual(card.possible_readings);
    expect(info.tensionTransformHex).toBe("#4B506F");
  });

  it("falls back to the default tension transform color when visual DNA color is unavailable", () => {
    const card = {
      ...getMajorArcanaCardById("the_high_priestess"),
      name_en: "Missing Visual DNA Entry",
    };

    const info = getFortuneCardInspectInfo(card);

    expect(info.tensionTransformHex).toBe(DEFAULT_FORTUNE_TENSION_TRANSFORM_HEX);
  });
});
