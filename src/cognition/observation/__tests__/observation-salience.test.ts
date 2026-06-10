import { describe, expect, it } from "vitest";

import { normalizeObservationSalienceProfile } from "@/src/cognition/observation/observation-salience";

describe("normalizeObservationSalienceProfile", () => {
  it("returns undefined for an empty salience object", () => {
    const result = normalizeObservationSalienceProfile({
      category: "scene",
      text: "I walked through a hallway.",
      salience: {},
    });

    expect(result).toBeUndefined();
  });
});
