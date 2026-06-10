import type { CreateObservationInput, Observation } from "@/src/domain/observation/types";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

export interface ObservationEngine {
  describe(object: ReflectiveObject): Promise<CreateObservationInput>;
}

export interface ObservationSurfaceModel {
  observation: Observation;
}

export class DescriptiveObservationEngine implements ObservationEngine {
  async describe(object: ReflectiveObject): Promise<CreateObservationInput> {
    const bundle = buildSceneObservationScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });

    return projectObservationV2BundleToCreateObservationInput(bundle, {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_scaffold_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
    });
  }
}
