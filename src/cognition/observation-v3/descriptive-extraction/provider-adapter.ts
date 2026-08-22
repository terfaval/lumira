import OpenAI from "openai";

import { readResponseUsageMetrics } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import type {
  DescriptiveExtractionContractVariant,
  DescriptiveExtractionProviderRequest,
  StructuredDescriptiveExtractionProviderResult,
} from "@/src/cognition/observation-v3/descriptive-extraction/extraction-contract";

export const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
export const OBSERVATION_SCENE_EXTRACTION_MODEL = "gpt-4.1-mini";
export const DESCRIPTIVE_EXTRACTION_SCHEMA_NAME = "lumira_scene_observation_extraction";
export const DESCRIPTIVE_EXTRACTION_WITHOUT_DERIVED_SCHEMA_NAME =
  "lumira_scene_observation_extraction_without_derived";
const DERIVED_ITEM_JSON_SCHEMA = {
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
} as const;

export function buildSceneExtractionJsonSchema(
  contractVariant: DescriptiveExtractionContractVariant = "control",
) {
  const includeDerived = contractVariant === "control";
  return {
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
        required: [
          "sceneId",
          "position",
          "summary",
          "boundaryReasoning",
          "evidenceContext",
          "observations",
          ...(includeDerived ? ["derived"] : []),
        ],
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
            description: "Use multiple observations only when each one preserves genuinely distinct descriptive evidence within the scene. Do not restate the same underlying scene chain at both broader and narrower granularities.",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["observationId", "position", "text", "evidence", "uncertaintyNote"],
              properties: {
                observationId: { type: "string" },
                position: { type: "integer", minimum: 0 },
                text: {
                  type: "string",
                  description: "One evidence-linked descriptive unit. Do not summarize a broader scene chain here if the same material is already represented by overlapping finer observations, and do not split unless the resulting observations contain materially distinct descriptive facts.",
                },
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
                uncertaintyNote: {
                  type: ["string", "null"],
                  description: "Preserve real uncertainty when needed, but do not multiply one unresolved ambiguity into competing overlapping observations merely to increase granularity.",
                },
              },
            },
          },
          ...(includeDerived
            ? {
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
              }
            : {}),
        },
      },
    },
  },
  ...(includeDerived
    ? {
        $defs: {
          derivedItem: DERIVED_ITEM_JSON_SCHEMA,
        },
      }
    : {}),
} as const;
}

export const SCENE_EXTRACTION_JSON_SCHEMA = buildSceneExtractionJsonSchema("control");

export async function requestOpenAiStructuredDescriptiveExtraction(
  input: DescriptiveExtractionProviderRequest,
): Promise<StructuredDescriptiveExtractionProviderResult | null> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const response = await client.responses.create({
    model: input.model,
    input: input.prompt,
    text: {
      format: {
        type: "json_schema",
        name: input.schemaName,
        schema: input.schema,
        strict: true,
      },
    },
  }, {
    signal: AbortSignal.timeout(input.timeoutMs),
    timeout: input.timeoutMs,
  });

  return {
    outputText: response.output_text ?? null,
    providerDiagnostics: {
      elapsedMs: Date.now() - input.startedAtMs,
      providerStatus: response.status ?? null,
      providerIncompleteReason: response.incomplete_details?.reason ?? null,
      providerReturnedStructuredOutput: Boolean(response.output_text),
      ...readResponseUsageMetrics(response),
    },
  };
}
