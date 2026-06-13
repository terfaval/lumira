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

const OPENAI_REQUEST_TIMEOUT_MS = 40_000;
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
      required: ["identityKey", "displayLabel", "sourceLanguage", "observationIds"],
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
    "Scene = coherent situation.",
    "Observation = the smallest evidence-linked descriptive unit that preserves one coherent appearance, relation, change, or lived experience.",
    "Observation boundaries are based on distinct observable units, not sentence boundaries.",
    "Multiple Observations may exist inside one Scene.",
    "Derived structures remain secondary and are generated from Observations.",
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

  try {
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
  } catch (error) {
    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    return buildFallback("provider_error");
  }
}
