import { describe, expect, it } from "vitest";

import { DescriptiveObservationEngine } from "@/src/cognition/observation/observation-engine";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

describe("DescriptiveObservationEngine", () => {
  it("returns a scene-first V2 bundle instead of a caller-owned V1 write payload", async () => {
    const object = {
      id: "obj-1",
      userId: "user-1",
      primaryContent: "I was in a room. Then I walked outside.",
    } as const;

    const bundle = buildSceneObservationScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });

    const engine = new DescriptiveObservationEngine();

    await expect(engine.describe(object as never)).resolves.toEqual(bundle);
  });
});
