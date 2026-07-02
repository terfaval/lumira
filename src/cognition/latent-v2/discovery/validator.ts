import { parseDiscoveryOutput } from "@/src/cognition/latent-v2/discovery/parser";
import type {
  DiscoveryInputPacket,
  DiscoveryOutputPacket,
  DiscoveryValidationResult,
} from "@/src/cognition/latent-v2/discovery/types";

function buildFailure(
  reason: string,
  details?: Record<string, unknown>,
): Extract<DiscoveryValidationResult, { ok: false }> {
  return {
    ok: false,
    reason,
    details,
  };
}

function hasStructure(candidate: DiscoveryOutputPacket["candidateStructures"][number]): boolean {
  return (
    candidate.structureSketch.nodes.length > 0 ||
    candidate.structureSketch.relations.length > 0 ||
    candidate.structureSketch.tensions.length > 0 ||
    candidate.structureSketch.gaps.length > 0
  );
}

export function validateDiscoveryOutput(input: {
  inputPacket: DiscoveryInputPacket;
  outputPacket: DiscoveryOutputPacket;
}): DiscoveryValidationResult {
  const { inputPacket, outputPacket } = input;

  if (outputPacket.generationContext.runtimeVersion !== inputPacket.generationContext.runtimeVersion) {
    return buildFailure("generation_context_runtime_mismatch");
  }

  if (outputPacket.generationContext.priorityReflectiveObjectId !== inputPacket.generationContext.priorityReflectiveObjectId) {
    return buildFailure("generation_context_priority_object_mismatch");
  }

  if (outputPacket.generationContext.observationBundleId !== inputPacket.generationContext.observationBundleId) {
    return buildFailure("generation_context_bundle_mismatch");
  }

  const knownSceneRefs = new Set(inputPacket.scenes.map((scene) => scene.sceneStableId));
  const observationsById = new Map(
    inputPacket.scenes.flatMap((scene) =>
      scene.observations.map((observation) => [observation.observationV2SceneObservationId, scene.sceneStableId] as const),
    ),
  );
  const seenCandidateIds = new Set<string>();

  for (const candidate of outputPacket.candidateStructures) {
    if (seenCandidateIds.has(candidate.candidateId)) {
      return buildFailure("duplicate_candidate_id", {
        candidateId: candidate.candidateId,
      });
    }
    seenCandidateIds.add(candidate.candidateId);

    if (candidate.sceneRefs.length === 0) {
      return buildFailure("missing_scene_refs", {
        candidateId: candidate.candidateId,
      });
    }

    for (const sceneRef of candidate.sceneRefs) {
      if (!knownSceneRefs.has(sceneRef)) {
        return buildFailure("scene_ref_out_of_scope", {
          candidateId: candidate.candidateId,
          sceneRef,
        });
      }
    }

    if (!hasStructure(candidate)) {
      return buildFailure("missing_structure_sketch", {
        candidateId: candidate.candidateId,
      });
    }

    if (candidate.evidenceGroups.length === 0) {
      return buildFailure("missing_evidence_groups", {
        candidateId: candidate.candidateId,
      });
    }

    for (const group of candidate.evidenceGroups) {
      if (!knownSceneRefs.has(group.sceneRef)) {
        return buildFailure("scene_ref_out_of_scope", {
          candidateId: candidate.candidateId,
          sceneRef: group.sceneRef,
        });
      }

      if (!candidate.sceneRefs.includes(group.sceneRef)) {
        return buildFailure("evidence_group_scene_not_listed_in_candidate_scene_refs", {
          candidateId: candidate.candidateId,
          groupId: group.groupId,
          sceneRef: group.sceneRef,
        });
      }

      if (group.observationRefs.length === 0) {
        return buildFailure("missing_group_observation_refs", {
          candidateId: candidate.candidateId,
          groupId: group.groupId,
        });
      }

      for (const observationRef of group.observationRefs) {
        const mappedSceneRef = observationsById.get(observationRef);
        if (!mappedSceneRef) {
          return buildFailure("observation_ref_out_of_scope", {
            candidateId: candidate.candidateId,
            observationRef,
          });
        }

        if (mappedSceneRef !== group.sceneRef) {
          return buildFailure("evidence_group_scene_mismatch", {
            candidateId: candidate.candidateId,
            groupId: group.groupId,
            sceneRef: group.sceneRef,
            observationRef,
          });
        }
      }
    }
  }

  return {
    ok: true,
    value: {
      ...outputPacket,
      inputPacket,
    },
  };
}

export function parseAndValidateDiscoveryOutput(input: {
  input: DiscoveryInputPacket;
  raw: string | unknown;
}): DiscoveryValidationResult {
  const parsed = parseDiscoveryOutput(input.raw);
  if (!parsed) {
    return buildFailure("invalid_output_packet");
  }

  return validateDiscoveryOutput({
    inputPacket: input.input,
    outputPacket: parsed,
  });
}
