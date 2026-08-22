import {
  buildAttemptDiagnostics,
  buildNormalizedBundleMetrics,
  buildRawStructuredMetrics,
  createNormalizationStats,
  normalizeSceneWithStats,
  type SceneObservationAttemptDiagnostics,
} from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import type { ObservationLanguage } from "@/src/domain/observation/v2-runtime";
import {
  buildObservationV3NativeC0Candidate,
  projectNativeC0CandidateToCreateObservationInput,
  projectNativeC0CandidateToObservationV2Bundle,
} from "@/src/cognition/observation-v3/descriptive-extraction/native-candidate";
import {
  groundPrimaryEvidenceRefToSource,
  groundPrimarySceneToSource,
} from "@/src/cognition/observation-v3/descriptive-extraction/primary-evidence-grounding";
import type {
  ObservationV2EvidenceRef,
  ObservationV2Observation,
  ObservationV2Scene,
  ObservationV2SceneGroundingDegradation,
} from "@/src/domain/observation/v2-runtime";
import {
  OBSERVATION_SCENE_EXTRACTION_MODEL,
} from "@/src/cognition/observation-v3/descriptive-extraction/provider-adapter";
import type {
  DescriptiveExtractionCandidateAttemptResult,
  DescriptiveExtractionProviderDiagnostics,
} from "@/src/cognition/observation-v3/descriptive-extraction/extraction-contract";

function buildMissingScenesDiagnostics(input: {
  attempt: 1 | 2;
  dreamText: string;
  model?: string;
  providerDiagnostics?: Pick<
    SceneObservationAttemptDiagnostics,
    | "elapsedMs"
    | "providerStatus"
    | "providerIncompleteReason"
    | "inputTokenUsage"
    | "outputTokenUsage"
    | "totalTokenUsage"
    | "providerReturnedStructuredOutput"
  >;
}): SceneObservationAttemptDiagnostics {
  return buildAttemptDiagnostics({
    attempt: input.attempt,
    model: input.model ?? OBSERVATION_SCENE_EXTRACTION_MODEL,
    elapsedMs: input.providerDiagnostics?.elapsedMs ?? 0,
    providerStatus: input.providerDiagnostics?.providerStatus ?? null,
    providerIncompleteReason: input.providerDiagnostics?.providerIncompleteReason ?? null,
    inputTokenUsage: input.providerDiagnostics?.inputTokenUsage ?? null,
    outputTokenUsage: input.providerDiagnostics?.outputTokenUsage ?? null,
    totalTokenUsage: input.providerDiagnostics?.totalTokenUsage ?? null,
    providerReturnedStructuredOutput: input.providerDiagnostics?.providerReturnedStructuredOutput ?? true,
    rawMetrics: {
      rawSceneCount: 0,
      rawObservationCount: 0,
      rawEvidenceSpanCount: 0,
      rawLargestCoveredSpanEnd: null,
      rawLateSectionObservationCount: 0,
    },
    normalizedMetrics: {
      dreamTextLength: input.dreamText.length,
      normalizedSceneCount: 0,
      normalizedObservationCount: 0,
      normalizedEvidenceSpanCount: 0,
      defaultedFieldCount: 0,
      largestCoveredSpanEnd: null,
      coverageRatio: null,
      uncoveredTailChars: null,
      lateSectionStart: 0,
      lateSectionSentenceUnits: 0,
      lateSectionObservationCount: 0,
      overmergeMatchedCueGroups: 0,
      overmergeTotalCueMatches: 0,
      projectedFragmentCount: 0,
      projectedSummaryTraceCount: 0,
      guardVerdict: "pass",
      fallbackReason: "missing_scenes",
    },
  });
}

function deriveSceneEvidenceFromObservations(observations: ObservationV2Observation[], sourceText: string): ObservationV2EvidenceRef | null {
  const starts = observations
    .flatMap((observation) => observation.evidence)
    .map((entry) => entry.spanStart)
    .filter((value): value is number => typeof value === "number");
  const ends = observations
    .flatMap((observation) => observation.evidence)
    .map((entry) => entry.spanEnd)
    .filter((value): value is number => typeof value === "number");

  if (starts.length === 0 || ends.length === 0) {
    return null;
  }

  const spanStart = Math.min(...starts);
  const spanEnd = Math.max(...ends);
  if (spanEnd <= spanStart) {
    return null;
  }

  return {
    snippet: sourceText.slice(spanStart, spanEnd),
    spanStart,
    spanEnd,
    contextLabel: "derived_locality",
  };
}

function groundObservationWithoutScene(input: {
  sourceText: string;
  observation: ObservationV2Observation;
  afterAnchor?: number | null;
}): ObservationV2Observation | null {
  if (input.observation.evidence.length === 0) {
    return null;
  }

  const groundedEvidence = input.observation.evidence.map((evidence) =>
    groundPrimaryEvidenceRefToSource({
      sourceText: input.sourceText,
      evidence,
      afterAnchor: input.afterAnchor,
      fallbackToSourceScope: true,
      requireAbsoluteCoordinatesWithinScope: false,
    }));

  if (groundedEvidence.some((entry) => entry === null)) {
    return null;
  }

  return {
    ...input.observation,
    evidence: groundedEvidence.filter((entry): entry is ObservationV2EvidenceRef => entry !== null),
  };
}

function salvageSceneFromGroundedObservations(input: {
  sourceText: string;
  scene: ObservationV2Scene;
}): ObservationV2Scene | null {
  const groundedObservations: ObservationV2Observation[] = [];
  let previousGroundedEnd: number | null = null;

  for (const observation of input.scene.observations) {
    const groundedObservation = groundObservationWithoutScene({
      sourceText: input.sourceText,
      observation,
      afterAnchor: previousGroundedEnd,
    });
    if (!groundedObservation) {
      continue;
    }

    groundedObservations.push(groundedObservation);
    const nextAnchor = groundedObservation.evidence
      .map((entry) => entry.spanEnd)
      .filter((value): value is number => typeof value === "number")
      .reduce<number | null>((largest, value) => largest === null ? value : Math.max(largest, value), null);
    previousGroundedEnd = nextAnchor ?? previousGroundedEnd;
  }

  if (groundedObservations.length === 0) {
    return null;
  }

  const derivedSceneEvidence = deriveSceneEvidenceFromObservations(groundedObservations, input.sourceText);
  if (!derivedSceneEvidence) {
    return null;
  }

  const removedObservationCount = Math.max(0, input.scene.observations.length - groundedObservations.length);
  const groundingDegradation: ObservationV2SceneGroundingDegradation | undefined = removedObservationCount > 0
    || (
      input.scene.evidenceContext.spanStart !== derivedSceneEvidence.spanStart
      || input.scene.evidenceContext.spanEnd !== derivedSceneEvidence.spanEnd
      || input.scene.evidenceContext.snippet !== derivedSceneEvidence.snippet
    )
    ? {
        status: "partial_scene_salvage",
        sceneGroundingFailed: true,
        salvageMethod: "observation_level_grounding",
        originalObservationCount: input.scene.observations.length,
        retainedObservationCount: groundedObservations.length,
        removedObservationCount,
      }
    : undefined;

  return {
    ...input.scene,
    groundingDegradation,
    evidenceContext: derivedSceneEvidence,
    observations: groundedObservations,
  };
}

function groundOrSalvageScenes(input: {
  sourceText: string;
  scenes: ObservationV2Scene[];
}): ObservationV2Scene[] {
  return input.scenes
    .map((scene) =>
      groundPrimarySceneToSource({
        sourceText: input.sourceText,
        scene,
      }) ?? salvageSceneFromGroundedObservations({
        sourceText: input.sourceText,
        scene,
      }))
    .filter((scene): scene is ObservationV2Scene => scene !== null);
}

export async function buildDescriptiveExtractionCandidateFromStructuredResult(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  structured: unknown;
  attempt?: 1 | 2;
  model?: string;
  providerDiagnostics?: DescriptiveExtractionProviderDiagnostics;
}): Promise<DescriptiveExtractionCandidateAttemptResult> {
  const attempt = input.attempt ?? 1;
  const structured = input.structured as {
    dreamLanguage?: ObservationLanguage;
    scenes?: Array<Partial<ObservationV2Scene>>;
  };
  const rawMetrics = buildRawStructuredMetrics({
    dreamText: input.dreamText,
    structured: input.structured,
  });

  if (!Array.isArray(structured.scenes) || structured.scenes.length === 0) {
    return {
      status: "missing_scenes",
      candidate: null,
      diagnostics: buildMissingScenesDiagnostics({
        attempt,
        dreamText: input.dreamText,
        model: input.model,
        providerDiagnostics: input.providerDiagnostics,
      }),
    };
  }

  const normalizationStats = createNormalizationStats();
  const normalizedScenes = structured.scenes.map((scene, index) => normalizeSceneWithStats(scene, index, normalizationStats));
  const groundedScenes = groundOrSalvageScenes({
    sourceText: input.dreamText,
    scenes: normalizedScenes,
  });
  if (groundedScenes.length === 0) {
    return {
      status: "missing_scenes",
      candidate: null,
      diagnostics: buildMissingScenesDiagnostics({
        attempt,
        dreamText: input.dreamText,
        model: input.model,
        providerDiagnostics: input.providerDiagnostics,
      }),
    };
  }
  const candidate = buildObservationV3NativeC0Candidate({
    reflectiveObjectId: input.reflectiveObjectId,
    userId: input.userId,
    source: "system_llm_extract",
    provenance: {
      provenanceTier: "system_extract",
      semanticPolicyResult: "accept_with_uncertainty",
      semanticPolicyReasons: ["scene_first_projection"],
      latentBackflowGuard: "observation_only",
      boundaryVersion: "observation_v2_phase1",
      dreamLanguage: structured.dreamLanguage ?? "unknown",
    },
    scenes: groundedScenes,
  });
  const bundleProjection = projectNativeC0CandidateToObservationV2Bundle(candidate);
  const payloadProjection = projectNativeC0CandidateToCreateObservationInput(candidate);

  const diagnostics = buildAttemptDiagnostics({
    attempt,
    model: input.model ?? OBSERVATION_SCENE_EXTRACTION_MODEL,
    elapsedMs: input.providerDiagnostics?.elapsedMs ?? 0,
    providerStatus: input.providerDiagnostics?.providerStatus ?? null,
    providerIncompleteReason: input.providerDiagnostics?.providerIncompleteReason ?? null,
    inputTokenUsage: input.providerDiagnostics?.inputTokenUsage ?? null,
    outputTokenUsage: input.providerDiagnostics?.outputTokenUsage ?? null,
    totalTokenUsage: input.providerDiagnostics?.totalTokenUsage ?? null,
    providerReturnedStructuredOutput: input.providerDiagnostics?.providerReturnedStructuredOutput ?? true,
    rawMetrics,
    normalizedMetrics: buildNormalizedBundleMetrics({
      dreamText: input.dreamText,
      bundle: bundleProjection,
      normalizationStats,
      payload: payloadProjection,
    }),
  });

  return {
    status: "candidate_available",
    candidate,
    diagnostics,
  };
}
