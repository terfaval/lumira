import { rebuildSummaryTraceFromFragments } from "@/src/cognition/observation/observation-discovery-projection";
import type { CreateObservationFragmentInput, CreateObservationInput } from "@/src/domain/observation/types";
import type { ObservationV2Bundle, ObservationV2Observation, ObservationV2Scene } from "@/src/domain/observation/v2-runtime";

function compareObservations(left: ObservationV2Observation, right: ObservationV2Observation): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.observationId.localeCompare(right.observationId);
}

function compareScenes(left: ObservationV2Scene, right: ObservationV2Scene): number {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  return left.sceneId.localeCompare(right.sceneId);
}

function toCreateObservationFragmentInput(
  scene: ObservationV2Scene,
  observation: ObservationV2Observation,
  position: number,
): CreateObservationFragmentInput {
  const primaryEvidence = observation.evidence[0] ?? scene.evidenceContext;

  return {
    category: "scene",
    fragmentText: observation.text,
    position,
    uncertaintyNote: observation.uncertaintyNote,
    evidenceAdequacy: primaryEvidence.spanStart !== null && primaryEvidence.spanEnd !== null ? "strong_span" : "snippet_only",
    evidence: {
      snippet: primaryEvidence.snippet,
      spanStart: primaryEvidence.spanStart,
      spanEnd: primaryEvidence.spanEnd,
      contextLabel: primaryEvidence.contextLabel,
    },
  };
}

function buildSummary(bundle: ObservationV2Bundle): string {
  const parts = [...bundle.scenes]
    .sort(compareScenes)
    .flatMap((scene) => [...scene.observations].sort(compareObservations))
    .map((observation) => observation.text.trim().replace(/[.]+$/g, ""))
    .filter(Boolean);

  if (parts.length === 0) {
    return "Descriptive observations extracted from scene-first observation runtime.";
  }

  return `${parts.join(". ")}.`;
}

export function projectObservationV2BundleToCreateObservationInput(
  bundle: ObservationV2Bundle,
  defaults: Pick<
    CreateObservationInput,
    "provenanceTier" | "semanticPolicyResult" | "semanticPolicyReasons" | "latentBackflowGuard" | "boundaryVersion"
  >,
): CreateObservationInput {
  const fragments = [...bundle.scenes]
    .sort(compareScenes)
    .flatMap((scene, sceneIndex) =>
      [...scene.observations]
        .sort(compareObservations)
        .map((observation, observationIndex) =>
          toCreateObservationFragmentInput(scene, observation, sceneIndex * 100 + observationIndex),
        ),
    );
  const summary = buildSummary(bundle);

  return {
    reflectiveObjectId: bundle.reflectiveObjectId,
    userId: bundle.userId,
    source: bundle.source,
    summary,
    uncertaintyNotes: [],
    provenanceTier: defaults.provenanceTier,
    semanticPolicyResult: defaults.semanticPolicyResult,
    semanticPolicyReasons: [...defaults.semanticPolicyReasons],
    summaryTrace: rebuildSummaryTraceFromFragments({ summary, fragments }),
    latentBackflowGuard: defaults.latentBackflowGuard,
    boundaryVersion: defaults.boundaryVersion,
    fragments,
  };
}
