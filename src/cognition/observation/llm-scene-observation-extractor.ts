import OpenAI from "openai";

import { inferDreamLanguage } from "@/src/cognition/language/infer-dream-language";
import { createSceneDiscoveryBundle } from "@/src/cognition/observation/scene-discovery";
import { projectObservationV2BundleToCreateObservationInput } from "@/src/cognition/observation/scene-discovery-projection";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type {
  ObservationLanguage,
  ObservationV2BoundaryReason,
  ObservationV2Bundle,
  ObservationV2DerivedStructures,
  ObservationV2DerivedItem,
  ObservationV2EvidenceRef,
  ObservationV2Observation,
  ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const OBSERVATION_SCENE_EXTRACTION_MODEL = "gpt-4.1-mini";
const LONG_DREAM_TEXT_THRESHOLD = 3_000;
const MAX_SINGLE_SCENE_COVERAGE_RATIO = 0.45;
const MIN_UNCOVERED_TAIL_CHARS = 1_200;
const LATE_SECTION_START_RATIO = 0.75;
const LATE_SECTION_MIN_SENTENCE_UNITS = 2;
const LATE_SECTION_MAX_THIN_TRACE_OBSERVATIONS = 1;
const OVERMERGE_GUARD_MIN_OBSERVATIONS = 5;
const OVERMERGE_GUARD_MIN_MATCHED_CUE_GROUPS = 3;
const OVERMERGE_GUARD_MIN_TOTAL_CUE_MATCHES = 6;

const OVERMERGE_CUE_GROUPS = [
  /\b(then|later|after that|afterwards|at the end|suddenly|eventually|meanwhile|aztan|aztán|utana|utána|kesobb|később|vegul|végül|ekkor)\b/giu,
  /\b(mock(?:ed|ing)?|pressure|threat(?:en(?:ed|ing)?)?|argu(?:e|ing|ed)|guid(?:e|ing|ed)|help(?:er|ing)?|unwanted|conflict|ignored|included)\b/giu,
  /\b(trying to|search(?:ing)?|find(?:ing)?|leave|left|escape|escaping|hide|hiding|follow(?:ing)?|resist(?:ing)?|wander(?:ing|ed)?|moved? toward)\b/giu,
  /\b(lucid|reali[sz](?:e|es|ed|ing)|dream(?:ing)?|unstable|impossible|transformed|changed|world rules|mirror|abyss|distorted|maze)\b/giu,
] as const;

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

function readLargestCoveredSpanEnd(bundle: ObservationV2Bundle): number | null {
  const spanEnds = bundle.scenes.flatMap((scene) => [
    scene.evidenceContext.spanEnd,
    ...scene.observations.flatMap((observation) => observation.evidence.map((evidence) => evidence.spanEnd)),
  ]);

  const numericSpanEnds = spanEnds.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numericSpanEnds.length === 0) {
    return null;
  }

  return Math.max(...numericSpanEnds);
}

function isSeverelyUndercoveredLongDreamBundle(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
}): boolean {
  if (input.dreamText.length < LONG_DREAM_TEXT_THRESHOLD) {
    return false;
  }

  if (input.bundle.scenes.length !== 1) {
    return false;
  }

  const largestCoveredSpanEnd = readLargestCoveredSpanEnd(input.bundle);
  if (largestCoveredSpanEnd === null) {
    return false;
  }

  const uncoveredTail = input.dreamText.length - largestCoveredSpanEnd;
  if (uncoveredTail < MIN_UNCOVERED_TAIL_CHARS) {
    return false;
  }

  return largestCoveredSpanEnd / input.dreamText.length <= MAX_SINGLE_SCENE_COVERAGE_RATIO;
}

function readLateSectionStartIndex(dreamText: string): number {
  return Math.floor(dreamText.length * LATE_SECTION_START_RATIO);
}

function readSentenceUnitCount(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function readObservationMaxSpanEnd(observation: ObservationV2Observation): number | null {
  const spanEnds = observation.evidence
    .map((evidence) => evidence.spanEnd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (spanEnds.length === 0) {
    return null;
  }

  return Math.max(...spanEnds);
}

function readLateSectionObservationCount(input: {
  bundle: ObservationV2Bundle;
  lateSectionStart: number;
}): number {
  return input.bundle.scenes.reduce((count, scene) => {
    return count + scene.observations.filter((observation) => {
      const observationMaxSpanEnd = readObservationMaxSpanEnd(observation);
      if (observationMaxSpanEnd !== null) {
        return observationMaxSpanEnd >= input.lateSectionStart;
      }

      return scene.evidenceContext.spanEnd !== null && scene.evidenceContext.spanEnd >= input.lateSectionStart;
    }).length;
  }, 0);
}

function isObviouslyMissingMeaningfulLateSection(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
}): boolean {
  if (input.dreamText.length < LONG_DREAM_TEXT_THRESHOLD) {
    return false;
  }

  const lateSectionStart = readLateSectionStartIndex(input.dreamText);
  const lateSectionText = input.dreamText.slice(lateSectionStart).trim();
  const lateSectionSentenceUnits = readSentenceUnitCount(lateSectionText);

  if (lateSectionSentenceUnits < LATE_SECTION_MIN_SENTENCE_UNITS) {
    return false;
  }

  const lateSectionObservationCount = readLateSectionObservationCount({
    bundle: input.bundle,
    lateSectionStart,
  });

  return lateSectionObservationCount <= LATE_SECTION_MAX_THIN_TRACE_OBSERVATIONS;
}

function countCueMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

function readOvermergeCueMetrics(scene: ObservationV2Scene): {
  matchedCueGroups: number;
  totalCueMatches: number;
} {
  const normalizedText = [scene.summary, ...scene.observations.map((observation) => observation.text)]
    .join(" ")
    .toLocaleLowerCase();

  let matchedCueGroups = 0;
  let totalCueMatches = 0;

  for (const pattern of OVERMERGE_CUE_GROUPS) {
    const matchCount = countCueMatches(normalizedText, pattern);
    if (matchCount > 0) {
      matchedCueGroups += 1;
      totalCueMatches += matchCount;
    }
  }

  return {
    matchedCueGroups,
    totalCueMatches,
  };
}

function isObviouslyOvermergedTransitionHeavyBundle(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
}): boolean {
  if (input.dreamText.length < LONG_DREAM_TEXT_THRESHOLD) {
    return false;
  }

  if (input.bundle.scenes.length !== 1) {
    return false;
  }

  const [scene] = input.bundle.scenes;
  if (!scene || scene.observations.length < OVERMERGE_GUARD_MIN_OBSERVATIONS) {
    return false;
  }

  const { matchedCueGroups, totalCueMatches } = readOvermergeCueMetrics(scene);
  return (
    matchedCueGroups >= OVERMERGE_GUARD_MIN_MATCHED_CUE_GROUPS &&
    totalCueMatches >= OVERMERGE_GUARD_MIN_TOTAL_CUE_MATCHES
  );
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

function normalizeEvidenceRef(value: Partial<ObservationV2EvidenceRef> | undefined): ObservationV2EvidenceRef {
  return {
    snippet: value?.snippet?.trim() ?? "",
    spanStart: value?.spanStart ?? null,
    spanEnd: value?.spanEnd ?? null,
    contextLabel: value?.contextLabel ?? null,
  };
}

function normalizeObservation(value: Partial<ObservationV2Observation> | undefined, index: number): ObservationV2Observation {
  return {
    observationId: value?.observationId ?? `observation-${index}`,
    position: value?.position ?? index,
    text: value?.text?.trim() ?? "",
    evidence: Array.isArray(value?.evidence) && value.evidence.length > 0
      ? value.evidence.map((entry) => normalizeEvidenceRef(entry))
      : [normalizeEvidenceRef(undefined)],
    uncertaintyNote: value?.uncertaintyNote ?? null,
  };
}

function normalizeBoundaryReason(value: Partial<ObservationV2BoundaryReason> | undefined): ObservationV2BoundaryReason {
  return {
    kind: value?.kind ?? "narrative_change",
    note: value?.note?.trim() ?? "",
  };
}

function normalizeDerived(value: Partial<ObservationV2DerivedStructures> | undefined): ObservationV2DerivedStructures {
  const normalizeDerivedItem = (item: Partial<ObservationV2DerivedItem> | undefined): ObservationV2DerivedItem => ({
    identityKey: item?.identityKey?.trim() ?? undefined,
    displayLabel: item?.displayLabel?.trim() ?? item?.label?.trim() ?? undefined,
    sourceLanguage: item?.sourceLanguage ?? undefined,
    label: item?.label?.trim() ?? item?.displayLabel?.trim() ?? undefined,
    observationIds: Array.isArray(item?.observationIds)
      ? item!.observationIds.filter((value): value is string => typeof value === "string")
      : [],
  });

  return {
    actors: value?.actors?.map((item) => normalizeDerivedItem(item)) ?? [],
    locations: value?.locations?.map((item) => normalizeDerivedItem(item)) ?? [],
    objects: value?.objects?.map((item) => normalizeDerivedItem(item)) ?? [],
    interactions: value?.interactions?.map((item) => normalizeDerivedItem(item)) ?? [],
    affect: value?.affect?.map((item) => normalizeDerivedItem(item)) ?? [],
    agency: value?.agency?.map((item) => normalizeDerivedItem(item)) ?? [],
    phenomenology: value?.phenomenology?.map((item) => normalizeDerivedItem(item)) ?? [],
    metacognition: value?.metacognition?.map((item) => normalizeDerivedItem(item)) ?? [],
  };
}

function normalizeScene(value: Partial<ObservationV2Scene> | undefined, index: number): ObservationV2Scene {
  return {
    sceneId: value?.sceneId ?? `scene-${index}`,
    position: value?.position ?? index,
    summary: value?.summary?.trim() ?? "",
    boundaryReasoning: Array.isArray(value?.boundaryReasoning)
      ? value.boundaryReasoning.map((entry) => normalizeBoundaryReason(entry))
      : [],
    evidenceContext: normalizeEvidenceRef(value?.evidenceContext),
    observations: Array.isArray(value?.observations)
      ? value.observations.map((entry, observationIndex) => normalizeObservation(entry, observationIndex))
      : [],
    derived: normalizeDerived(value?.derived),
  };
}

export async function buildSceneObservationExtractionFromStructuredResult(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  structured: unknown;
}): Promise<LlmSceneObservationExtractionResult> {
  const structured = input.structured as {
    dreamLanguage?: ObservationLanguage;
    scenes?: Array<Partial<ObservationV2Scene>>;
  };

  if (!Array.isArray(structured.scenes) || structured.scenes.length === 0) {
    return {
      mode: "fallback",
      reason: "missing_scenes",
    };
  }

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
    scenes: structured.scenes.map((scene, index) => normalizeScene(scene, index)),
  });

  const payload = projectObservationV2BundleToCreateObservationInput(bundle, {
    provenanceTier: "system_extract",
    semanticPolicyResult: "accept_with_uncertainty",
    semanticPolicyReasons: ["scene_first_projection"],
    latentBackflowGuard: "observation_only",
    boundaryVersion: "observation_v2_phase1",
  });

  if (isObviouslyOvermergedTransitionHeavyBundle({
    dreamText: input.dreamText,
    bundle,
  })) {
    return buildFallback("overmerge_guard_failed");
  }

  if (isSeverelyUndercoveredLongDreamBundle({
    dreamText: input.dreamText,
    bundle,
  })) {
    return buildFallback("coverage_guard_failed");
  }

  if (isObviouslyMissingMeaningfulLateSection({
    dreamText: input.dreamText,
    bundle,
  })) {
    return buildFallback("late_section_guard_failed");
  }

  return {
    mode: "validated_llm",
    bundle,
    payload,
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

  const requestStructuredExtraction = async (): Promise<LlmSceneObservationExtractionResult> => {
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

    if (!response.output_text) {
      return buildFallback("empty_response");
    }

    return buildSceneObservationExtractionFromStructuredResult({
      ...input,
      structured: JSON.parse(response.output_text) as unknown,
    });
  };

  try {
    const firstAttempt = await requestStructuredExtraction();
    if (
      firstAttempt.mode === "fallback" &&
      (
        firstAttempt.reason === "coverage_guard_failed" ||
        firstAttempt.reason === "overmerge_guard_failed" ||
        firstAttempt.reason === "late_section_guard_failed"
      )
    ) {
      const retryAttempt = await requestStructuredExtraction();
      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "coverage_guard_failed") {
        return buildFallback("coverage_guard_failed_after_retry");
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "overmerge_guard_failed") {
        return buildFallback("overmerge_guard_failed_after_retry");
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "late_section_guard_failed") {
        return buildFallback("late_section_guard_failed_after_retry");
      }

      return retryAttempt;
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
