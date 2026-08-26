import { describe, expect, it } from "vitest";

import {
  FEATURE_CAROUSEL_AUTOPLAY_MS,
  getNextFeatureIndex,
  getPreviousFeatureIndex,
} from "@/src/ui/homepage/homepage-feature-carousel";

describe("homepage feature carousel helpers", () => {
  it("wraps forward from the last slide to the first", () => {
    expect(getNextFeatureIndex(1, 2)).toBe(0);
  });

  it("wraps backward from the first slide to the last", () => {
    expect(getPreviousFeatureIndex(0, 2)).toBe(1);
  });

  it("uses the approved autoplay interval", () => {
    expect(FEATURE_CAROUSEL_AUTOPLAY_MS).toBe(7_500);
  });
});
