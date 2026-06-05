import OpenAI from "openai";

import { evaluateObservationSemanticPolicy } from "@/src/domain/observation/semantic-policy";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";
import { normalizeStructuredObservationExtraction } from "@/src/cognition/observation/observation-extraction-validation";

export interface LlmObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  payload?: CreateObservationInput;
  reason?: string;
}

interface BuildExtractionInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  dreamText: string;
}

const OBSERVATION_EXTRACTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "fragments"],
  properties: {
    summary: { type: "string" },
    uncertaintyNotes: {
      type: "array",
      items: { type: "string" },
    },
    fragments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "fragmentText", "position", "evidence"],
        properties: {
          category: { type: "string" },
          fragmentText: { type: "string" },
          position: { type: "integer", minimum: 0 },
          uncertaintyNote: { type: "string" },
          evidence: {
            type: "object",
            additionalProperties: false,
            required: ["snippet"],
            properties: {
              snippet: { type: "string" },
              contextLabel: { type: "string" },
            },
          },
        },
      },
    },
  },
} as const;

function buildFallback(reason: string): LlmObservationExtractionResult {
  return {
    mode: "fallback",
    reason,
  };
}

function buildValidatedPayload(input: BuildExtractionInput, normalized: {
  summary: string;
  uncertaintyNotes: string[];
  fragments: CreateObservationInput["fragments"];
}): LlmObservationExtractionResult {
  const semanticDecision = evaluateObservationSemanticPolicy({
    source: "system_llm_extract",
    summary: normalized.summary,
    fragments: normalized.fragments,
  });

  if (semanticDecision.result === "reject_interpretive") {
    return buildFallback(`interpretive_output:${semanticDecision.reasons.join(",")}`);
  }

  if (semanticDecision.result === "defer_insufficient_evidence") {
    return buildFallback(`insufficient_evidence:${semanticDecision.reasons.join(",")}`);
  }

  return {
    mode: "validated_llm",
    payload: {
      reflectiveObjectId: input.reflectiveObjectId,
      userId: input.userId,
      source: "system_llm_extract",
      summary: normalized.summary,
      uncertaintyNotes: [...normalized.uncertaintyNotes, ...semanticDecision.uncertaintyNotes],
      provenanceTier: semanticDecision.provenanceTier,
      semanticPolicyResult: semanticDecision.result,
      semanticPolicyReasons: semanticDecision.reasons,
      summaryTrace: semanticDecision.summaryTrace,
      latentBackflowGuard: semanticDecision.latentBackflowGuard,
      boundaryVersion: semanticDecision.boundaryVersion,
      fragments: semanticDecision.fragments,
    },
  };
}

export async function buildLlmObservationExtractionFromStructuredResult(input: BuildExtractionInput & {
  structured: unknown;
}): Promise<LlmObservationExtractionResult> {
  const normalized = normalizeStructuredObservationExtraction({
    dreamText: input.dreamText,
    structured: input.structured,
  });

  if (!normalized.ok) {
    return buildFallback(normalized.reason);
  }

  return buildValidatedPayload(input, normalized.value);
}

function buildPrompt(dreamText: string): string {
  return [
    "Extract descriptive dream observations only.",
    "Do not interpret, diagnose, explain, symbolize, or infer hidden causes.",
    "Return JSON matching the provided schema.",
    "Every fragment must include a local evidence snippet quoted from the dream text.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

export async function buildLlmObservationExtraction(input: BuildExtractionInput): Promise<LlmObservationExtractionResult> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return buildFallback("missing_openai_api_key");
  }

  try {
    const client = new OpenAI({ apiKey: env.openAiApiKey });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: buildPrompt(input.dreamText),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_observation_extraction",
          schema: OBSERVATION_EXTRACTION_JSON_SCHEMA,
          strict: true,
        },
      },
    });

    const outputText = response.output_text;
    if (!outputText) {
      return buildFallback("empty_response");
    }

    const structured = JSON.parse(outputText) as unknown;
    return buildLlmObservationExtractionFromStructuredResult({
      ...input,
      structured,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    return buildFallback("provider_error");
  }
}
