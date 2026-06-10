import { describe, expect, it } from "vitest";

import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

describe("buildSceneObservationScaffold", () => {
  it("creates a minimal single-scene fallback when scene extraction is unavailable", () => {
    const scaffold = buildSceneObservationScaffold({
      reflectiveObjectId: "object-1",
      userId: "user-1",
      source: "system_descriptive_extract",
      sourceText: "A guide leads the dreamer up a staircase.",
    });

    expect(scaffold.scenes.length).toBeGreaterThan(0);
    expect(scaffold.scenes[0].observations.length).toBeGreaterThan(0);
    expect(scaffold.scenes[0].observations[0].text).toContain("A guide leads");
    expect(scaffold.scenes[0].observations[0].uncertaintyNote).toContain("Fallback scaffold");
  });
});
