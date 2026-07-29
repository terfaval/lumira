import OpenAI from "openai";

import { inferDreamLanguage } from "@/src/cognition/language/infer-dream-language";
import {
  buildAttemptDiagnostics,
  buildNormalizedBundleMetrics,
  buildRawStructuredMetrics,
  createNormalizationStats,
  emitSceneObservationAttemptDiagnostics,
  normalizeSceneWithStats,
  readResponseUsageMetrics,
  type SceneObservationAttemptDiagnostics,
  type SceneObservationExtractionDiagnostics,
} from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type {
  ObservationLanguage,
  ObservationV2Bundle,
  ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const OBSERVATION_SCENE_EXTRACTION_MODEL = "gpt-4.1-mini";

const SCENE_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["dreamLanguage", "scenes"],
  properties: {
    dreamLanguage: { type: "string", enum: ["hu", "en", "unknown"] },
    scenes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sceneId", "position", "summary", "boundaryReasoning", "evidenceContext", "observations", "derived"],
        properties: {
          sceneId: { type: "string" },
          position: { type: "integer", minimum: 0 },
          summary: { type: "string" },
          boundaryReasoning: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kind", "note"],
              properties: {
                kind: {
                  type: "string",
                  enum: [
                    "spatial_change",
                    "temporal_change",
                    "actor_change",
                    "goal_change",
                    "narrative_change",
                    "perspective_change",
                    "world_rule_change",
                  ],
                },
                note: { type: "string" },
              },
            },
          },
          evidenceContext: {
            type: "object",
            additionalProperties: false,
            required: ["snippet", "spanStart", "spanEnd", "contextLabel"],
            properties: {
              snippet: { type: "string" },
              spanStart: { type: ["integer", "null"] },
              spanEnd: { type: ["integer", "null"] },
              contextLabel: { type: ["string", "null"] },
            },
          },
          observations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["observationId", "position", "text", "evidence", "uncertaintyNote"],
              properties: {
                observationId: { type: "string" },
                position: { type: "integer", minimum: 0 },
                text: { type: "string" },
                evidence: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["snippet", "spanStart", "spanEnd", "contextLabel"],
                    properties: {
                      snippet: { type: "string" },
                      spanStart: { type: ["integer", "null"] },
                      spanEnd: { type: ["integer", "null"] },
                      contextLabel: { type: ["string", "null"] },
                    },
                  },
                },
                uncertaintyNote: { type: ["string", "null"] },
              },
            },
          },
          derived: {
            type: "object",
            additionalProperties: false,
            required: ["actors", "locations", "objects", "interactions", "affect", "agency", "phenomenology", "metacognition"],
            properties: {
              actors: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              locations: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              objects: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              interactions: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              affect: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              agency: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              phenomenology: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
              metacognition: { type: "array", items: { $ref: "#/$defs/derivedItem" } },
            },
          },
        },
      },
    },
  },
  $defs: {
    derivedItem: {
      type: "object",
      additionalProperties: false,
      required: ["identityKey", "displayLabel", "sourceLanguage", "label", "observationIds"],
      properties: {
        identityKey: { type: "string" },
        displayLabel: { type: "string" },
        sourceLanguage: { type: "string", enum: ["hu", "en", "unknown"] },
        label: { type: "string" },
        observationIds: {
          type: "array",
          items: { type: "string" },
        },
      },
    },
  },
} as const;

export interface LlmSceneObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  bundle?: ObservationV2Bundle;
  payload?: CreateObservationInput;
  reason?: string;
  diagnostics?: SceneObservationExtractionDiagnostics;
}

function buildPrompt(dreamText: string): string {
  const inferredDreamLanguage = inferDreamLanguage(dreamText);

  return [
    "Extract scene-first dream observations only.",
    "Do not interpret, diagnose, explain, symbolize, or infer hidden meaning.",
    "Return JSON matching the provided schema.",
    "Set dreamLanguage to hu, en, or unknown.",
    `Use this inferred dream-language hint unless the dream text clearly contradicts it: ${inferredDreamLanguage}.`,
    "Organize the dream into Scenes first, then Observations inside each Scene, then Derived Structures.",
    "Preserve meaningful material from the beginning, middle, and end of the dream when it is present.",
    "Do not let the ending collapse into a thin or summary-only trace when the later dream contains meaningful transitions, encounters, emotional shifts, dream-state changes, or unresolved ending states.",
    "Do not force equal detail across beginning, middle, and end. Preserve what is meaningfully present without padding sparse sections.",
    "Scene = coherent situation.",
    "Do not rely only on location change when deciding scene boundaries.",
    "Situational shifts, relational shifts, goal-state shifts, and dream-logic shifts may require a new scene even when the location remains similar.",
    "Examples of meaningful scene-boundary signals include: a new activity, a new social situation, a new objective, a new problem, a relational reversal, or a change in world rules.",
    "Treat ordinary reality to impossible event, known place to transformed place, searching to escaping, exclusion to inclusion, and guidance to threat as strong possible scene-boundary signals when clearly present.",
    "Do not create a new scene for every small action. Preserve meaningful scenes, not micro-scenes.",
    "Observation = the smallest evidence-linked descriptive unit that preserves one coherent appearance, relation, change, or lived experience.",
    "Observation boundaries are based on distinct observable units, not sentence boundaries.",
    "Multiple Observations may exist inside one Scene.",
    "Derived structures remain secondary and are generated from Observations.",
    "Derived categories: actors, locations, objects, interactions, affect, agency, phenomenology, metacognition.",
    "Actors = who appears. Locations = where the scene takes place. Objects = notable things present in the scene.",
    "Interactions = observable exchanges or relational behaviors between actors such as helping, guiding, following, avoiding, arguing, comforting, pursuing, or cooperating.",
    "Affect = emotional states directly present in the dream material or strongly implied by directly described dream action, such as anxiety, embarrassment, relief, frustration, excitement, sadness, or curiosity.",
    "Agency = observable control, action, inability, resistance, compliance, influence, being guided, being prevented, or being unable.",
    "Phenomenology = experiential dream qualities and reality-behavior anomalies such as impossible space, transformed environments, altered scale, altered identity, discontinuity, impossible causality, strange reflections, unusual realism, sensory emphasis, or distorted time.",
    "Metacognition = explicit dreamer awareness states such as noticing something strange, realizing something changed, recognizing the dream state, awareness of uncertainty, awareness of remembering, awareness of not knowing, self-observation, or lucid awareness.",
    "Extract these categories only when supported by explicit dream evidence or strongly implied by directly described dream action.",
    "Capture anomalies and awareness only as described in the dream. Do not interpret them as symbolism, psychology, hidden meaning, or diagnosis.",
    "Do not infer metacognition from unusual events alone, and do not force phenomenology or metacognition when the evidence is weak or absent.",
    "Leave a derived category empty when that category is genuinely absent or unsupported.",
    "Do not generate meanings, hypotheses, reflective questions, opportunities, tensions, or latent reasoning.",
    "Every derived item must include a stable identityKey, a language-appropriate displayLabel, and sourceLanguage.",
    "identityKey must stay stable across languages as a short normalized concept key.",
    "displayLabel should be in the dream's language when that language is clear.",
    "Each observation must stay close to the dream material and include evidence quotes.",
    "Each scene should preserve boundary reasoning only when a situational shift is evident.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

function buildFallback(reason: string): LlmSceneObservationExtractionResult {
  return {
    mode: "fallback",
    reason,
  };
}

function isProviderTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithMetadata = error as Error & {
    code?: string;
  };

  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    errorWithMetadata.code === "ABORT_ERR" ||
    /timeout|timed out|aborted/i.test(error.message)
  );
}

function readProviderErrorDiagnostics(error: unknown): {
  errorName: string;
  errorMessage: string;
  errorStatus?: number;
  errorCode?: string;
  timeoutMs?: number;
} {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: "Non-Error value thrown during scene observation extraction.",
    };
  }

  const errorWithMetadata = error as Error & {
    status?: number;
    code?: string;
  };

  return {
    errorName: error.name,
    errorMessage: error.message,
    errorStatus: typeof errorWithMetadata.status === "number" ? errorWithMetadata.status : undefined,
    errorCode: typeof errorWithMetadata.code === "string" ? errorWithMetadata.code : undefined,
    timeoutMs: isProviderTimeoutError(error) ? OPENAI_REQUEST_TIMEOUT_MS : undefined,
  };
}

function buildExtractionDiagnostics(input: {
  dreamText: string;
  startedAtMs: number;
}): {
  dreamTextLength: number;
  elapsedMs: number;
} {
  return {
    dreamTextLength: input.dreamText.length,
    elapsedMs: Date.now() - input.startedAtMs,
  };
}

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
}): SceneObservationExtractionDiagnostics {
  return {
    attempts: [
      buildAttemptDiagnostics({
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
      }),
    ],
    fallbackReason: "missing_scenes",
  };
}

export async function buildSceneObservationExtractionFromStructuredResult(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  structured: unknown;
  attempt?: 1 | 2;
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
}): Promise<LlmSceneObservationExtractionResult> {
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
      mode: "fallback",
      reason: "missing_scenes",
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
      dreamLanguage: structured.dreamLanguage ?? inferDreamLanguage(input.dreamText),
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

  const attemptDiagnostics = buildAttemptDiagnostics({
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

  if (attemptDiagnostics.guardVerdict !== "pass") {
    return {
      mode: "fallback",
      reason: attemptDiagnostics.guardVerdict,
      diagnostics: {
        attempts: [attemptDiagnostics],
        fallbackReason: attemptDiagnostics.guardVerdict,
      },
    };
  }

  return {
    mode: "validated_llm",
    bundle,
    payload,
    diagnostics: {
      attempts: [attemptDiagnostics],
      acceptedAttempt: attempt,
    },
  };
}

export async function buildLlmSceneObservationExtraction(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
}): Promise<LlmSceneObservationExtractionResult> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return buildFallback("missing_openai_api_key");
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const startedAtMs = Date.now();

  const requestStructuredExtraction = async (attempt: 1 | 2): Promise<LlmSceneObservationExtractionResult> => {
    const response = await client.responses.create({
      model: OBSERVATION_SCENE_EXTRACTION_MODEL,
      input: buildPrompt(input.dreamText),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_scene_observation_extraction",
          schema: SCENE_EXTRACTION_JSON_SCHEMA,
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    const providerDiagnostics = {
      elapsedMs: Date.now() - startedAtMs,
      providerStatus: response.status ?? null,
      providerIncompleteReason: response.incomplete_details?.reason ?? null,
      providerReturnedStructuredOutput: Boolean(response.output_text),
      ...readResponseUsageMetrics(response),
    };

    if (!response.output_text) {
      return {
        ...buildFallback("empty_response"),
        diagnostics: {
          attempts: [
            buildAttemptDiagnostics({
              attempt,
              model: OBSERVATION_SCENE_EXTRACTION_MODEL,
              ...providerDiagnostics,
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
                fallbackReason: "empty_response",
              },
            }),
          ],
          fallbackReason: "empty_response",
        },
      };
    }

    return buildSceneObservationExtractionFromStructuredResult({
      ...input,
      attempt,
      model: OBSERVATION_SCENE_EXTRACTION_MODEL,
      providerDiagnostics,
      structured: JSON.parse(response.output_text) as unknown,
    });
  };

  try {
    const firstAttempt = await requestStructuredExtraction(1);
    if (firstAttempt.diagnostics?.attempts[0]) {
      emitSceneObservationAttemptDiagnostics({
        reflectiveObjectId: input.reflectiveObjectId,
        attemptDiagnostics: firstAttempt.diagnostics.attempts[0],
      });
    }

    if (
      firstAttempt.mode === "fallback" &&
      (
        firstAttempt.reason === "coverage_guard_failed" ||
        firstAttempt.reason === "overmerge_guard_failed" ||
        firstAttempt.reason === "late_section_guard_failed"
      )
    ) {
      const retryAttempt = await requestStructuredExtraction(2);
      if (retryAttempt.diagnostics?.attempts[0]) {
        emitSceneObservationAttemptDiagnostics({
          reflectiveObjectId: input.reflectiveObjectId,
          attemptDiagnostics: retryAttempt.diagnostics.attempts[0],
        });
      }

      const mergedAttempts = [
        ...(firstAttempt.diagnostics?.attempts ?? []),
        ...(retryAttempt.diagnostics?.attempts ?? []),
      ];

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "coverage_guard_failed") {
        return {
          ...buildFallback("coverage_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "coverage_guard_failed_after_retry",
          },
        };
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "overmerge_guard_failed") {
        return {
          ...buildFallback("overmerge_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "overmerge_guard_failed_after_retry",
          },
        };
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "late_section_guard_failed") {
        return {
          ...buildFallback("late_section_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "late_section_guard_failed_after_retry",
          },
        };
      }

      return {
        ...retryAttempt,
        diagnostics: {
          attempts: mergedAttempts,
          acceptedAttempt: retryAttempt.diagnostics?.acceptedAttempt ?? 2,
        },
      };
    }

    return firstAttempt;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    console.error("llm_scene_observation_extraction_provider_error", {
      reflectiveObjectId: input.reflectiveObjectId,
      ...buildExtractionDiagnostics({
        dreamText: input.dreamText,
        startedAtMs,
      }),
      ...readProviderErrorDiagnostics(error),
    });

    return buildFallback(isProviderTimeoutError(error) ? "provider_timeout" : "provider_error");
  }
}
