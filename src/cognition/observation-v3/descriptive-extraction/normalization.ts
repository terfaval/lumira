import {
  buildAttemptDiagnostics,
  buildNormalizedBundleMetrics,
  buildRawStructuredMetrics,
  createNormalizationStats,
  normalizeSceneWithStats,
  type SceneObservationAttemptDiagnostics,
} from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import type { ObservationLanguage, ObservationV2Scene } from "@/src/domain/observation/v2-runtime";
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
      bundle: null,
      payload: null,
      diagnostics: buildMissingScenesDiagnostics({
        attempt,
        dreamText: input.dreamText,
        model: input.model,
        providerDiagnostics: input.providerDiagnostics,
      }),
    };
  }

  const normalizationStats = createNormalizationStats();
  const bundle = createSceneDiscoveryBundle({
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
    scenes: structured.scenes.map((scene, index) => normalizeSceneWithStats(scene, index, normalizationStats)),
  });

  const payload = projectObservationV2BundleToCreateObservationInput(bundle, {
    provenanceTier: "system_extract",
    semanticPolicyResult: "accept_with_uncertainty",
    semanticPolicyReasons: ["scene_first_projection"],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_v2_phase1",
  });

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
      bundle,
      normalizationStats,
      payload,
    }),
  });

  return {
    status: "candidate_available",
    bundle,
    payload,
    diagnostics,
  };
}
