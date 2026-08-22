import type {
  ObservationSource,
  ObservationProvenanceTier,
  ObservationSemanticPolicyResult,
} from "@/src/domain/observation/types";
import {
  buildObservationV2Bundle,
  type ObservationLanguage,
  type ObservationV2Bundle,
  type ObservationV2BoundaryReason,
  type ObservationV2DerivedStructures,
  type ObservationV2EvidenceRef,
  type ObservationV2Scene,
  type ObservationV2SceneGroundingDegradation,
} from "@/src/domain/observation/v2-runtime";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import { sha256Hex } from "@/src/cognition/observation-v3/identity-comparison";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import type { CreateObservationInput } from "@/src/domain/observation/types";

export interface ObservationV3NativeC0Provenance {
  provenanceTier: ObservationProvenanceTier;
  semanticPolicyResult: ObservationSemanticPolicyResult;
  semanticPolicyReasons: string[];
  latentBackflowGuard: "observation_only";
  boundaryVersion: string;
  dreamLanguage: ObservationLanguage;
}

export interface ObservationV3NativeC0Locality {
  localityId: string;
  order: number;
  label: string;
  boundaryReasoning: ObservationV2BoundaryReason[];
  boundaryUncertainty: string | null;
  groundingDegradation?: ObservationV2SceneGroundingDegradation;
  evidenceContext: ObservationV2EvidenceRef;
}

export interface ObservationV3NativeC0DescriptiveUnit {
  unitId: string;
  localityId: string;
  order: number;
  statement: string;
  evidenceRefs: ObservationV2EvidenceRef[];
  uncertainty: string | null;
}

export interface ObservationV3NativeC0Candidate {
  candidateId: string;
  candidateHash: string;
  candidateVersion: "observation_v3_native_c0";
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  provenance: ObservationV3NativeC0Provenance;
  uncertaintyNotes: string[];
  localities: ObservationV3NativeC0Locality[];
  descriptiveUnits: ObservationV3NativeC0DescriptiveUnit[];
}

function collectCandidateUncertaintyNotes(scenes: ObservationV2Scene[]): string[] {
  const notes = new Set<string>();
  for (const scene of scenes) {
    for (const note of scene.uncertaintyNotes ?? []) {
      if (note.trim()) {
        notes.add(note.trim());
      }
    }
    for (const observation of scene.observations) {
      if (observation.uncertaintyNote?.trim()) {
        notes.add(observation.uncertaintyNote.trim());
      }
    }
  }
  return [...notes];
}

export function buildObservationV3NativeC0Candidate(input: {
  reflectiveObjectId: ReflectiveObjectId;
  userId: UserId;
  source: ObservationSource;
  provenance: ObservationV3NativeC0Provenance;
  scenes: ObservationV2Scene[];
}): ObservationV3NativeC0Candidate {
  const localities = input.scenes.map((scene, index) => ({
    localityId: scene.sceneId,
    order: scene.position ?? index,
    label: scene.summary,
    boundaryReasoning: scene.boundaryReasoning,
    boundaryUncertainty: scene.uncertaintyNotes?.[0] ?? null,
    groundingDegradation: scene.groundingDegradation,
    evidenceContext: scene.evidenceContext,
  }));
  const descriptiveUnits = input.scenes.flatMap((scene) =>
    scene.observations.map((observation, index) => ({
      unitId: observation.observationId,
      localityId: scene.sceneId,
      order: observation.position ?? index,
      statement: observation.text,
      evidenceRefs: observation.evidence,
      uncertainty: observation.uncertaintyNote,
    })),
  );
  const candidateBase = {
    candidateVersion: "observation_v3_native_c0" as const,
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: input.source,
    provenance: input.provenance,
    uncertaintyNotes: collectCandidateUncertaintyNotes(input.scenes),
    localities,
    descriptiveUnits,
  };
  const candidateHash = sha256Hex(candidateBase);

  return {
    candidateId: `native-c0-${candidateHash.slice(0, 16)}`,
    candidateHash,
    ...candidateBase,
  };
}

export function projectNativeC0CandidateToObservationV2Bundle(
  candidate: ObservationV3NativeC0Candidate,
): ObservationV2Bundle {
  const unitMap = new Map<string, ObservationV3NativeC0DescriptiveUnit[]>();
  for (const unit of candidate.descriptiveUnits) {
    const existing = unitMap.get(unit.localityId) ?? [];
    existing.push(unit);
    unitMap.set(unit.localityId, existing);
  }

  return buildObservationV2Bundle({
    bundleId: `observation-bundle-${candidate.reflectiveObjectId}-${candidate.provenance.boundaryVersion}`,
    reflectiveObjectId: candidate.reflectiveObjectId,
    userId: candidate.userId,
    source: candidate.source,
    provenance: {
      ...candidate.provenance,
    },
    uncertaintyNotes: candidate.uncertaintyNotes,
    runtimeVersion: candidate.provenance.boundaryVersion,
    scenes: candidate.localities
      .slice()
      .sort((left, right) => left.order - right.order || left.localityId.localeCompare(right.localityId))
      .map((locality) => ({
        sceneId: locality.localityId,
        position: locality.order,
        summary: locality.label,
        boundaryReasoning: locality.boundaryReasoning,
        uncertaintyNotes: locality.boundaryUncertainty ? [locality.boundaryUncertainty] : [],
        groundingDegradation: locality.groundingDegradation,
        evidenceContext: locality.evidenceContext,
        observations: (unitMap.get(locality.localityId) ?? [])
          .slice()
          .sort((left, right) => left.order - right.order || left.unitId.localeCompare(right.unitId))
          .map((unit) => ({
            observationId: unit.unitId,
            position: unit.order,
            text: unit.statement,
            evidence: unit.evidenceRefs,
            uncertaintyNote: unit.uncertainty,
          })),
        derived: {
          actors: [],
          locations: [],
          objects: [],
          interactions: [],
          affect: [],
          agency: [],
          phenomenology: [],
          metacognition: [],
        } satisfies ObservationV2DerivedStructures,
      })),
  });
}

export function projectNativeC0CandidateToCreateObservationInput(
  candidate: ObservationV3NativeC0Candidate,
): CreateObservationInput {
  return projectObservationV2BundleToCreateObservationInput(
    projectNativeC0CandidateToObservationV2Bundle(candidate),
    {
      provenanceTier: candidate.provenance.provenanceTier,
      semanticPolicyResult: candidate.provenance.semanticPolicyResult,
      semanticPolicyReasons: [...candidate.provenance.semanticPolicyReasons],
      latentBackflowGuard: candidate.provenance.latentBackflowGuard,
      boundaryVersion: candidate.provenance.boundaryVersion,
    },
  );
}

export function projectNativeC0CandidateToExperimentalRegions(
  candidate: ObservationV3NativeC0Candidate,
): ExperimentalRegion[] {
  return candidate.localities.map((locality) => ({
    regionId: locality.localityId,
    order: locality.order,
    heading: locality.label,
    spanStart: locality.evidenceContext.spanStart,
    spanEnd: locality.evidenceContext.spanEnd,
    evidence: [locality.evidenceContext],
    boundaryConfidence: "medium",
    uncertainty: locality.boundaryUncertainty,
    transitionCues: locality.boundaryReasoning.map((reason) => reason.note || reason.kind),
  }));
}

export function projectNativeC0CandidateToExperimentalUnits(
  candidate: ObservationV3NativeC0Candidate,
): ExperimentalObservationUnit[] {
  return candidate.descriptiveUnits.map((unit) => ({
    observationId: unit.unitId,
    regionId: unit.localityId,
    order: unit.order,
    statement: unit.statement,
    evidence: unit.evidenceRefs,
    uncertainty: unit.uncertainty,
    source: "baseline",
    recoveryProvenance: null,
  }));
}
