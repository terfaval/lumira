import { describe, expect, it } from "vitest";

import { DescriptiveObservationEngine } from "@/src/cognition/observation/observation-engine";
import { buildDescriptiveObservationDiscoveryScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";
import { projectObservationDiscoveryResultToCreateObservationInput } from "@/src/cognition/observation/observation-discovery-projection";

describe("DescriptiveObservationEngine", () => {
  it("keeps cognition-driven V1 payload creation behind discovery projection", async () => {
    const object = {
      id: "obj-1",
      userId: "user-1",
      primaryContent: "I was in a room. Then I walked outside.",
    } as const;

    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });
    const projected = projectObservationDiscoveryResultToCreateObservationInput(discovery, {
      semanticPolicyMode: "preserve_defaults",
      defaultPersistence: {
        provenanceTier: "system_extract",
        semanticPolicyResult: "accept_with_uncertainty",
        semanticPolicyReasons: ["scaffold_mode_descriptive_only"],
        uncertaintyNotes: [],
        latentBackflowGuard: "observation_only",
        boundaryVersion: "observation_semantic_guardrails_v1",
      },
    });

    const engine = new DescriptiveObservationEngine();

    await expect(engine.describe(object as never)).resolves.toEqual(projected);
  });
});
