import { describe, expect, it } from "vitest";

import { DescriptiveObservationEngine } from "@/src/cognition/observation/observation-engine";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

describe("DescriptiveObservationEngine", () => {
  it("routes descriptive observation creation through the scene-first scaffold and projection bridge", async () => {
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
    const projected = projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_scaffold_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });

    const engine = new DescriptiveObservationEngine();

    await expect(engine.describe(object as never)).resolves.toEqual(projected);
  });
});
