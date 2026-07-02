import type {
  DiscoveryCandidateStructure,
  DiscoveryGenerationResult,
  DiscoveryInputPacket,
  DiscoveryOutputPacket,
  DiscoveryProvisionalStructureType,
} from "@/src/cognition/latent-v2/discovery/types";

function collectSceneText(scene: DiscoveryInputPacket["scenes"][number]): string {
  return [
    scene.summary,
    scene.evidenceSnippet,
    ...scene.derivedStructures.actors,
    ...scene.derivedStructures.locations,
    ...scene.derivedStructures.objects,
    ...scene.derivedStructures.interactions,
    ...scene.derivedStructures.affect,
    ...scene.derivedStructures.agency,
    ...scene.derivedStructures.metacognition,
    ...scene.derivedStructures.phenomenology,
    ...scene.observations.map((observation) => observation.text),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function gatherUncertainty(scene: DiscoveryInputPacket["scenes"][number]): string[] {
  return scene.observations
    .map((observation) => observation.uncertaintyNote)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function buildSceneEvidenceGroup(
  scene: DiscoveryInputPacket["scenes"][number],
  groupId: string,
): DiscoveryCandidateStructure["evidenceGroups"][number] {
  return {
    groupId,
    sceneRef: scene.sceneStableId,
    observationRefs: scene.observations.map((observation) => observation.observationV2SceneObservationId),
    boundaryNotes: scene.boundarySignals.map((signal) => signal.note),
  };
}

function buildSceneLocalCandidate(
  scene: DiscoveryInputPacket["scenes"][number],
  index: number,
): DiscoveryCandidateStructure | null {
  const sceneText = collectSceneText(scene);
  const uncertainty = gatherUncertainty(scene);

  let provisionalStructureType: DiscoveryProvisionalStructureType = "relationship";
  if (
    sceneText.includes("uncertain") ||
    sceneText.includes("unclear") ||
    sceneText.includes("missing") ||
    sceneText.includes("absence") ||
    sceneText.includes("separat")
  ) {
    provisionalStructureType = "gap";
  } else if (sceneText.includes("search")) {
    provisionalStructureType = "search_structure";
  } else if (scene.derivedStructures.phenomenology.length > 0) {
    provisionalStructureType = "salience_signal";
  } else if (scene.derivedStructures.affect.length > 0 && scene.derivedStructures.interactions.length > 0) {
    provisionalStructureType = "tension";
  }

  const structuralLabels = [
    ...scene.derivedStructures.interactions,
    ...scene.derivedStructures.agency,
    ...scene.derivedStructures.affect,
    ...scene.derivedStructures.phenomenology,
    ...scene.derivedStructures.objects,
    ...scene.derivedStructures.locations,
  ].filter(Boolean);

  if (structuralLabels.length === 0 && uncertainty.length === 0) {
    return null;
  }

  return {
    candidateId: `candidate-scene-${index + 1}`,
    origin: "dream_originated",
    sceneRefs: [scene.sceneStableId],
    evidenceGroups: [buildSceneEvidenceGroup(scene, `group-scene-${index + 1}`)],
    provisionalStructureType,
    structureSketch: {
      nodes: structuralLabels.slice(0, 4),
      relations: scene.derivedStructures.interactions.length > 0 ? [scene.summary] : [],
      tensions: provisionalStructureType === "tension" ? scene.derivedStructures.affect.slice(0, 2) : [],
      gaps: provisionalStructureType === "gap" ? uncertainty.slice(0, 2) : [],
    },
    distinctnessRationale: `Anchored to scene ${scene.sceneStableId} as its own local structural cluster.`,
    uncertainty,
  };
}

function buildTransitionCandidate(
  previousScene: DiscoveryInputPacket["scenes"][number],
  currentScene: DiscoveryInputPacket["scenes"][number],
  index: number,
): DiscoveryCandidateStructure | null {
  if (currentScene.boundarySignals.length === 0) {
    return null;
  }

  return {
    candidateId: `candidate-transition-${index + 1}`,
    origin: "dream_originated",
    sceneRefs: [previousScene.sceneStableId, currentScene.sceneStableId],
    evidenceGroups: [
      buildSceneEvidenceGroup(previousScene, `group-transition-${index + 1}-a`),
      buildSceneEvidenceGroup(currentScene, `group-transition-${index + 1}-b`),
    ],
    provisionalStructureType: "transition",
    structureSketch: {
      nodes: [previousScene.summary, currentScene.summary],
      relations: currentScene.boundarySignals.map((signal) => signal.note),
      tensions: [],
      gaps: [],
    },
    distinctnessRationale: `Preserves the shift between ${previousScene.sceneStableId} and ${currentScene.sceneStableId} instead of folding it into either scene alone.`,
    uncertainty: gatherUncertainty(previousScene).concat(gatherUncertainty(currentScene)),
  };
}

export function discoverCandidateStructures(input: {
  packet: DiscoveryInputPacket;
}): DiscoveryGenerationResult {
  const candidates: DiscoveryCandidateStructure[] = [];

  input.packet.scenes.forEach((scene, index) => {
    const sceneCandidate = buildSceneLocalCandidate(scene, index);
    if (sceneCandidate) {
      candidates.push(sceneCandidate);
    }

    if (index > 0) {
      const transitionCandidate = buildTransitionCandidate(input.packet.scenes[index - 1], scene, index - 1);
      if (transitionCandidate) {
        candidates.push(transitionCandidate);
      }
    }
  });

  const output: DiscoveryOutputPacket = {
    generationContext: {
      runtimeVersion: input.packet.generationContext.runtimeVersion,
      priorityReflectiveObjectId: input.packet.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.packet.generationContext.observationBundleId,
    },
    candidateStructures: candidates,
  };

  return {
    mode: "generated",
    output,
  };
}
