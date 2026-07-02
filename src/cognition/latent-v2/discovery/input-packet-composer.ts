import type { ObservationV2Repository } from "@/src/domain/observation/contracts";
import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import {
  extractDerivedLabels,
  getObservationLanguage,
  getObservationRowId,
  getPriorityObjectSummary,
  getSceneRowId,
  inferObservationCategory,
  mapBoundarySignalKind,
  mapSemanticPolicyResult,
} from "@/src/cognition/latent-v2/packet-shared";
import type { DiscoveryInputPacket } from "@/src/cognition/latent-v2/discovery/types";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const DISCOVERY_RUNTIME_VERSION = "latent_discovery_v1";

export interface ComposeDiscoveryInputPacketInput {
  userId: UserId;
  priorityReflectiveObjectId: ReflectiveObjectId;
  reflectiveObjectRepository?: ReflectiveObjectRepository;
  observationV2Repository?: ObservationV2Repository;
}

export async function composeDiscoveryInputPacket(
  input: ComposeDiscoveryInputPacketInput,
): Promise<DiscoveryInputPacket> {
  const reflectiveObjectRepository = input.reflectiveObjectRepository ?? createReflectiveObjectRepository();
  const observationV2Repository = input.observationV2Repository ?? createObservationV2Repository();

  const priorityReflectiveObject = await reflectiveObjectRepository.getById(input.priorityReflectiveObjectId, input.userId);
  if (!priorityReflectiveObject) {
    throw new Error(`Priority reflective object not found: ${input.priorityReflectiveObjectId}`);
  }

  if (priorityReflectiveObject.objectType !== "dream") {
    throw new Error(`Unsupported priority reflective object type: ${priorityReflectiveObject.objectType}`);
  }

  const bundle = await observationV2Repository.getByReflectiveObjectId(input.priorityReflectiveObjectId, input.userId);
  if (!bundle?.bundleId) {
    throw new Error(`Observation V2 bundle not found for reflective object: ${input.priorityReflectiveObjectId}`);
  }

  const bundleId = bundle.bundleId;
  const sortedScenes = [...bundle.scenes].sort((left, right) => left.position - right.position || left.sceneId.localeCompare(right.sceneId));

  return {
    generationContext: {
      runtimeVersion: DISCOVERY_RUNTIME_VERSION,
      userId: input.userId,
      priorityReflectiveObjectId: input.priorityReflectiveObjectId,
      priorityReflectiveObjectType: "dream",
      priorityReflectiveObjectTitle: priorityReflectiveObject.title,
      objectLanguage: getObservationLanguage(bundle, priorityReflectiveObject),
      observationBundleId: bundle.bundleId,
      observationRuntimeVersion: bundle.runtimeVersion ?? "unknown",
      semanticPolicyResult: mapSemanticPolicyResult(bundle),
      bundleUncertaintyNotes: [...(bundle.uncertaintyNotes ?? [])],
    },
    discoveryPolicy: {
      persistence: "ephemeral",
      recreatableFromUpstream: true,
      countsAsSystemMemory: false,
    },
    priorityObject: {
      content: priorityReflectiveObject.primaryContent,
      summary: getPriorityObjectSummary(priorityReflectiveObject),
    },
    scenes: sortedScenes.map((scene) => ({
      sceneRowId: getSceneRowId(bundleId, scene.sceneId),
      sceneStableId: scene.sceneId,
      position: scene.position,
      summary: scene.summary,
      evidenceSnippet: scene.evidenceContext.snippet,
      boundarySignals: scene.boundaryReasoning.map((reason) => ({
        kind: mapBoundarySignalKind(reason.kind),
        note: reason.note,
      })),
      derivedStructures: {
        actors: extractDerivedLabels(scene.derived.actors),
        locations: extractDerivedLabels(scene.derived.locations),
        objects: extractDerivedLabels(scene.derived.objects),
        interactions: extractDerivedLabels(scene.derived.interactions),
        affect: extractDerivedLabels(scene.derived.affect),
        agency: extractDerivedLabels(scene.derived.agency),
        metacognition: extractDerivedLabels(scene.derived.metacognition),
        phenomenology: extractDerivedLabels(scene.derived.phenomenology),
      },
      observations: [...scene.observations]
        .sort((left, right) => left.position - right.position || left.observationId.localeCompare(right.observationId))
        .map((observation) => ({
          observationV2SceneObservationId: getObservationRowId(bundleId, scene.sceneId, observation.observationId),
          observationStableId: observation.observationId,
          position: observation.position,
          text: observation.text,
          category: inferObservationCategory(scene, observation.observationId),
          evidence: observation.evidence.map((evidence) => ({
            snippet: evidence.snippet,
            spanStart: evidence.spanStart,
            spanEnd: evidence.spanEnd,
          })),
          uncertaintyNote: observation.uncertaintyNote,
        })),
    })),
  };
}
