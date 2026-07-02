/**
 * Native Observation V2 persistence seam for the live generated path.
 */
import { evaluateObservationSemanticPolicy } from "@/src/domain/observation/semantic-policy";
import { buildObservationV2Bundle, type ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";

function buildPersistenceSemanticSummary(bundle: ObservationV2Bundle): string {
  const sceneSummaries = bundle.scenes
    .map((scene) => scene.summary.trim().replace(/[.]+$/g, ""))
    .filter(Boolean);

  if (sceneSummaries.length > 0) {
    return `${sceneSummaries.join(". ")}.`;
  }

  const observationTexts = bundle.scenes
    .flatMap((scene) => scene.observations)
    .map((observation) => observation.text.trim().replace(/[.]+$/g, ""))
    .filter(Boolean);

  return observationTexts.length > 0 ? `${observationTexts.join(". ")}.` : "";
}

function enforceObservationV2PersistenceSemanticPolicy(bundle: ObservationV2Bundle): void {
  const semanticDecision = evaluateObservationSemanticPolicy({
    source: bundle.source,
    summary: buildPersistenceSemanticSummary(bundle),
    fragments: bundle.scenes.flatMap((scene, sceneIndex) =>
      scene.observations.map((observation, observationIndex) => ({
        category: "scene" as const,
        fragmentText: observation.text,
        position: sceneIndex * 1000 + observationIndex,
        uncertaintyNote: observation.uncertaintyNote,
        evidence: observation.evidence[0] ?? scene.evidenceContext,
      })),
    ),
  });

  if (
    semanticDecision.result === "reject_interpretive" ||
    semanticDecision.result === "defer_insufficient_evidence"
  ) {
    throw new Error("Observation V2 persistence rejected semantically invalid content.");
  }
}

function isNonDecreasingByPosition(items: Array<{ position: number }>): boolean {
  for (let index = 1; index < items.length; index += 1) {
    if (items[index - 1]!.position > items[index]!.position) {
      return false;
    }
  }

  return true;
}

function enforceObservationV2PostPersistenceStructure(input: {
  expected: ObservationV2Bundle;
  persisted: ObservationV2Bundle;
}): void {
  const { expected, persisted } = input;

  if (
    !persisted.bundleId ||
    persisted.bundleId !== expected.bundleId ||
    persisted.reflectiveObjectId !== expected.reflectiveObjectId ||
    persisted.userId !== expected.userId ||
    !persisted.provenance
  ) {
    throw new Error("Observation V2 persistence produced a structurally invalid bundle.");
  }

  if (expected.scenes.length > 0) {
    if (persisted.scenes.length !== expected.scenes.length || !isNonDecreasingByPosition(persisted.scenes)) {
      throw new Error("Observation V2 persistence produced a structurally invalid bundle.");
    }

    const persistedScenesById = new Map(persisted.scenes.map((scene) => [scene.sceneId, scene] as const));

    for (const expectedScene of expected.scenes) {
      const persistedScene = persistedScenesById.get(expectedScene.sceneId);
      if (
        !persistedScene ||
        persistedScene.position !== expectedScene.position ||
        (expectedScene.evidenceContext.snippet && !persistedScene.evidenceContext.snippet)
      ) {
        throw new Error("Observation V2 persistence produced a structurally invalid bundle.");
      }

      if (expectedScene.observations.length > 0) {
        if (
          persistedScene.observations.length !== expectedScene.observations.length ||
          !isNonDecreasingByPosition(persistedScene.observations)
        ) {
          throw new Error("Observation V2 persistence produced a structurally invalid bundle.");
        }

        const persistedObservationsById = new Map(
          persistedScene.observations.map((observation) => [observation.observationId, observation] as const),
        );

        for (const expectedObservation of expectedScene.observations) {
          const persistedObservation = persistedObservationsById.get(expectedObservation.observationId);
          if (
            !persistedObservation ||
            persistedObservation.position !== expectedObservation.position ||
            (expectedObservation.evidence.length > 0 && persistedObservation.evidence.length === 0)
          ) {
            throw new Error("Observation V2 persistence produced a structurally invalid bundle.");
          }
        }
      }
    }
  }
}

export interface ObservationV2WriteStore {
  createFromBundle(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle>;
}

class NativeObservationV2WriteStore implements ObservationV2WriteStore {
  async createFromBundle(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle> {
    const repository = createObservationV2Repository();
    const hardenedBundle = buildObservationV2Bundle(bundle);
    enforceObservationV2PersistenceSemanticPolicy(hardenedBundle);
    const persistedBundle = await repository.create(hardenedBundle);
    enforceObservationV2PostPersistenceStructure({
      expected: hardenedBundle,
      persisted: persistedBundle,
    });

    return persistedBundle;
  }
}

export function createObservationV2WriteStore(): ObservationV2WriteStore {
  return new NativeObservationV2WriteStore();
}
