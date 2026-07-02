import OpenAI from "openai";

import {
  DISCOVERY_CUE_SIGNAL_KINDS,
  DISCOVERY_PROVISIONAL_STRUCTURE_TYPES,
  type DiscoveryCuePacket,
  type DiscoveryInputPacket,
  type DiscoveryLlmGenerationResult,
} from "@/src/cognition/latent-v2/discovery/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const LATENT_DISCOVERY_MODEL = "gpt-4.1-mini";

const DISCOVERY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["generationContext", "candidateStructures"],
  properties: {
    generationContext: {
      type: "object",
      additionalProperties: false,
      required: ["runtimeVersion", "priorityReflectiveObjectId", "observationBundleId"],
      properties: {
        runtimeVersion: { type: "string", enum: ["latent_discovery_v1"] },
        priorityReflectiveObjectId: { type: "string" },
        observationBundleId: { type: "string" },
      },
    },
    candidateStructures: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "candidateId",
          "origin",
          "sceneRefs",
          "evidenceGroups",
          "provisionalStructureType",
          "structureSketch",
          "distinctnessRationale",
          "uncertainty",
        ],
        properties: {
          candidateId: { type: "string" },
          origin: { type: "string", enum: ["dream_originated", "context_revealed"] },
          sceneRefs: {
            type: "array",
            items: { type: "string" },
          },
          evidenceGroups: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["groupId", "sceneRef", "observationRefs", "boundaryNotes"],
              properties: {
                groupId: { type: "string" },
                sceneRef: { type: "string" },
                observationRefs: {
                  type: "array",
                  items: { type: "string" },
                },
                boundaryNotes: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
          },
          provisionalStructureType: {
            type: "string",
            enum: [...DISCOVERY_PROVISIONAL_STRUCTURE_TYPES],
          },
          structureSketch: {
            type: "object",
            additionalProperties: false,
            required: ["nodes", "relations", "tensions", "gaps"],
            properties: {
              nodes: { type: "array", items: { type: "string" } },
              relations: { type: "array", items: { type: "string" } },
              tensions: { type: "array", items: { type: "string" } },
              gaps: { type: "array", items: { type: "string" } },
            },
          },
          distinctnessRationale: { type: "string" },
          uncertainty: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

export function buildDiscoveryPrompt(input: {
  packet: DiscoveryInputPacket;
  cues: DiscoveryCuePacket;
}): string {
  return [
    "What potentially distinct reflective structures exist?",
    "Return JSON only and match the schema exactly.",
    "Preserve multiplicity.",
    "Preserve ambiguity.",
    "Continue scanning across all scenes, especially later scenes and weaker late-emerging material.",
    "Do not choose the most important structure.",
    "Do not construct Opportunities.",
    "Do not rank, score, merge away, or finally select candidates for promotion.",
    "Heuristic cues are guidance only, not final candidate decisions.",
    "Use the heuristic cues to keep scene boundaries, category neighborhoods, transition cues, search cues, absence cues, repair cues, and late-scene salience visible while you scan.",
    "Discover candidate reflective structures only when they are structurally distinct and grounded in the supplied dream evidence.",
    "A candidate may be a transition, tension, contradiction, search structure, unresolved pattern, gap, absence, repair movement, or salience signal.",
    "It is valid to return multiple candidates when they have different structural cores, different evidence groups, or different scene neighborhoods.",
    "It is also valid to return zero candidates if nothing can be grounded without drift.",
    "Do not interpret, diagnose, advise, symbolize, or explain what the dream means.",
    "Do not use user-facing language.",
    "Keep candidate language internal, structural, and evidence-bound.",
    `Use only cue signal kinds already provided: ${DISCOVERY_CUE_SIGNAL_KINDS.join(", ")}.`,
    `Use only provisionalStructureType values: ${DISCOVERY_PROVISIONAL_STRUCTURE_TYPES.join(", ")}.`,
    "Each candidate must preserve sceneRefs, evidenceGroups, distinctnessRationale, and uncertainty.",
    "Packet JSON:",
    JSON.stringify(input.packet, null, 2),
    "Heuristic cue JSON:",
    JSON.stringify(input.cues, null, 2),
  ].join("\n\n");
}

function isProviderTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithMetadata = error as Error & { code?: string };
  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    errorWithMetadata.code === "ABORT_ERR" ||
    /timeout|timed out|aborted/i.test(error.message)
  );
}

function readProviderErrorDiagnostics(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: "Non-Error value thrown during latent discovery generation.",
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

export async function generateDiscoveryLlmOutput(input: {
  packet: DiscoveryInputPacket;
  cues: DiscoveryCuePacket;
}): Promise<DiscoveryLlmGenerationResult> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return {
      mode: "failed",
      reason: "missing_openai_api_key",
    };
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await client.responses.create({
      model: LATENT_DISCOVERY_MODEL,
      input: buildDiscoveryPrompt(input),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_latent_discovery_v1",
          schema: DISCOVERY_JSON_SCHEMA,
          strict: true,
        },
      },
    }, {
      signal: AbortSignal.timeout(OPENAI_REQUEST_TIMEOUT_MS),
      timeout: OPENAI_REQUEST_TIMEOUT_MS,
    });

    if (!response.output_text) {
      return {
        mode: "failed",
        reason: "empty_response",
      };
    }

    return {
      mode: "generated",
      rawOutput: response.output_text,
    };
  } catch (error) {
    console.error("latent_discovery_provider_error", {
      priorityReflectiveObjectId: input.packet.generationContext.priorityReflectiveObjectId,
      observationBundleId: input.packet.generationContext.observationBundleId,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
}
