import type {
  DiscoveryCuePacket,
  DiscoveryCueSignalKind,
  DiscoveryInputPacket,
} from "@/src/cognition/latent-v2/discovery/types";

function collectRepeatedEntityLabels(packet: DiscoveryInputPacket): Set<string> {
  const counts = new Map<string, number>();

  packet.scenes.forEach((scene) => {
    const uniqueLabels = new Set(
      [
        ...scene.derivedStructures.actors,
        ...scene.derivedStructures.locations,
        ...scene.derivedStructures.objects,
      ]
        .map((label) => label.trim())
        .filter((label) => label.length > 0),
    );

    uniqueLabels.forEach((label) => {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
  });

  return new Set(
    [...counts.entries()]
      .filter(([, count]) => count > 1)
      .map(([label]) => label),
  );
}

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
    ...scene.observations.flatMap((observation) =>
      observation.uncertaintyNote ? [observation.uncertaintyNote] : [],
    ),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function buildCueSignal(
  kind: DiscoveryCueSignalKind,
  note: string,
  scene: DiscoveryInputPacket["scenes"][number],
): DiscoveryCuePacket["sceneCues"][number]["cueSignals"][number] {
  return {
    kind,
    note,
    observationRefs: scene.observations.map((observation) => observation.observationV2SceneObservationId),
  };
}

export function buildDiscoveryCuePacket(input: {
  packet: DiscoveryInputPacket;
}): DiscoveryCuePacket {
  const repeatedEntityLabels = collectRepeatedEntityLabels(input.packet);
  const lastScenePosition = Math.max(...input.packet.scenes.map((scene) => scene.position), 0);

  return {
    generationContext: {
      runtimeVersion: input.packet.generationContext.runtimeVersion,
      priorityReflectiveObjectId: input.packet.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.packet.generationContext.observationBundleId,
    },
    sceneCues: input.packet.scenes.map((scene) => {
      const sceneText = collectSceneText(scene);
      const cueSignals: DiscoveryCuePacket["sceneCues"][number]["cueSignals"] = [];

      if (scene.boundarySignals.length > 0) {
        cueSignals.push(
          buildCueSignal(
            "transition",
            scene.boundarySignals.map((signal) => signal.note).join(" "),
            scene,
          ),
        );
      }

      if (
        hasPattern(sceneText, [
          /\bsearch/i,
          /\bseeking/i,
          /\bfind\b/i,
          /\bfinding\b/i,
          /\blooking for\b/i,
        ])
      ) {
        cueSignals.push(buildCueSignal("search", "Scene contains explicit search or finding movement cues.", scene));
      }

      if (
        hasPattern(sceneText, [
          /\bmissing\b/i,
          /\babsence\b/i,
          /\babsent\b/i,
          /\bunknown\b/i,
          /\buncertain\b/i,
          /\bunclear\b/i,
          /\bseparat/i,
          /\bunresolved\b/i,
        ])
      ) {
        cueSignals.push(buildCueSignal("absence", "Scene contains missing, separation, absence, or unresolved cues.", scene));
      }

      if (
        hasPattern(sceneText, [
          /\bheal/i,
          /\bclean/i,
          /\brepair/i,
          /\breassur/i,
          /\bsupport/i,
          /\bhelper/i,
          /\bapolog/i,
        ])
      ) {
        cueSignals.push(buildCueSignal("repair", "Scene contains healing, repair, reassurance, or support-adjacent cues.", scene));
      }

      const hasLateSceneSalience =
        scene.position === lastScenePosition &&
        (scene.derivedStructures.phenomenology.length > 0 ||
          scene.observations.some((observation) => observation.uncertaintyNote?.trim()) ||
          hasPattern(sceneText, [/\bhelper/i, /\bpossible\b/i, /\blucid/i]));

      if (hasLateSceneSalience) {
        cueSignals.push(buildCueSignal("late_scene_salience", "Late-scene material appears structurally salient and should continue to be scanned separately.", scene));
      }

      return {
        sceneRef: scene.sceneStableId,
        position: scene.position,
        repeatedEntities: [
          ...new Set(
            [
              ...scene.derivedStructures.actors,
              ...scene.derivedStructures.locations,
              ...scene.derivedStructures.objects,
            ].filter((label) => repeatedEntityLabels.has(label)),
          ),
        ],
        categoryNeighborhoods: Object.entries(
          scene.observations.reduce<Record<string, string[]>>((groups, observation) => {
            const key = observation.category;
            groups[key] ??= [];
            groups[key].push(observation.observationV2SceneObservationId);
            return groups;
          }, {}),
        ).map(([category, observationRefs]) => ({
          category: category as DiscoveryCuePacket["sceneCues"][number]["categoryNeighborhoods"][number]["category"],
          observationRefs,
        })),
        cueSignals,
      };
    }),
  };
}
