import type { Observation } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { buildSceneObservationScaffold } from "@/src/cognition/observation/scene-observation-scaffold";

export interface ObservationEngine {
  describe(object: ReflectiveObject): Promise<ObservationV2Bundle>;
}

export interface ObservationSurfaceModel {
  observation: Observation;
}

export class DescriptiveObservationEngine implements ObservationEngine {
  async describe(object: ReflectiveObject): Promise<ObservationV2Bundle> {
    return buildSceneObservationScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });
  }
}
