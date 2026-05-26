import type { CreateObservationInput, Observation } from "@/src/domain/observation/types";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { buildDescriptiveObservationScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";

export interface ObservationEngine {
  describe(object: ReflectiveObject): Promise<CreateObservationInput>;
}

export interface ObservationSurfaceModel {
  observation: Observation;
}

export class DescriptiveObservationEngine implements ObservationEngine {
  async describe(object: ReflectiveObject): Promise<CreateObservationInput> {
    return buildDescriptiveObservationScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });
  }
}
