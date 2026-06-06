import type { CreateObservationInput, Observation } from "@/src/domain/observation/types";
import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import { buildDescriptiveObservationDiscoveryScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";
import { projectObservationDiscoveryResultToCreateObservationInput } from "@/src/cognition/observation/observation-discovery-projection";

export interface ObservationEngine {
  describe(object: ReflectiveObject): Promise<CreateObservationInput>;
}

export interface ObservationSurfaceModel {
  observation: Observation;
}

export class DescriptiveObservationEngine implements ObservationEngine {
  async describe(object: ReflectiveObject): Promise<CreateObservationInput> {
    const discovery = buildDescriptiveObservationDiscoveryScaffold({
      userId: object.userId,
      reflectiveObjectId: object.id,
      sourceText: object.primaryContent,
      source: "system_descriptive_extract",
    });

    return projectObservationDiscoveryResultToCreateObservationInput(discovery, {
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
  }
}
