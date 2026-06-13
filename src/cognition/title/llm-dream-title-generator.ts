import OpenAI from "openai";

import { inferDreamLanguage } from "@/src/cognition/language/infer-dream-language";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const DREAM_TITLE_MODEL = "gpt-4.1-mini";
const DREAM_TITLE_TIMEOUT_MS = 12_000;
const MAX_TITLE_WORDS = 8;
const MAX_TITLE_LENGTH = 80;

const DREAM_TITLE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: {
    title: { type: "string" },
  },
} as const;

export interface DreamTitleSuggestionInput {
  dreamText: string;
}

export type DreamTitleSuggestionResult =
  | {
      mode: "generated";
      title: string;
    }
  | {
      mode: "fallback";
      reason: string;
    };

function buildFallback(reason: string): DreamTitleSuggestionResult {
  return {
    mode: "fallback",
    reason,
  };
}

function buildClientOrFallback(): { client: OpenAI } | { fallback: DreamTitleSuggestionResult } {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return { fallback: buildFallback("missing_openai_api_key") };
  }

  return {
    client: new OpenAI({ apiKey: env.openAiApiKey }),
  };
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

function buildPrompt(dreamText: string): string {
  const inferredDreamLanguage = inferDreamLanguage(dreamText);

  return [
    "Generate one short dream title.",
    "Use only concrete imagery, setting, action, atmosphere, or scene language from the dream.",
    "Do not interpret, diagnose, symbolize, explain, or use psychological language.",
    "Do not mention subconscious meaning, conflict, trauma, fear of, desire for, or other explanatory framing.",
    "Keep it editable, plain, and human-readable.",
    "Prefer 3 to 8 words.",
    "Keep the title in the same language as the dream when that language is clear.",
    `Use this inferred dream-language hint unless the dream text clearly contradicts it: ${inferredDreamLanguage}.`,
    "Return JSON only.",
    "Dream text:",
    dreamText,
  ].join("\n");
}

function normalizeTitle(raw: string): string {
  const trimmed = raw.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  if (!trimmed) {
    return "";
  }

  const words = trimmed.split(/\s+/).slice(0, MAX_TITLE_WORDS);
  return words.join(" ").slice(0, MAX_TITLE_LENGTH).trim();
}

export async function generateDreamTitleSuggestion(
  input: DreamTitleSuggestionInput,
): Promise<DreamTitleSuggestionResult> {
  const clientResult = buildClientOrFallback();
  if ("fallback" in clientResult) {
    return clientResult.fallback;
  }

  try {
    const response = await clientResult.client.responses.create(
      {
        model: DREAM_TITLE_MODEL,
        input: buildPrompt(input.dreamText),
        text: {
          format: {
            type: "json_schema",
            name: "lumira_dream_title",
            schema: DREAM_TITLE_JSON_SCHEMA,
            strict: true,
          },
        },
      },
      {
        signal: AbortSignal.timeout(DREAM_TITLE_TIMEOUT_MS),
        timeout: DREAM_TITLE_TIMEOUT_MS,
      },
    );

    if (!response.output_text) {
      return buildFallback("empty_response");
    }

    const parsed = JSON.parse(response.output_text) as { title?: unknown };
    const title = typeof parsed.title === "string" ? normalizeTitle(parsed.title) : "";
    if (!title) {
      return buildFallback("invalid_title");
    }

    return {
      mode: "generated",
      title,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    return buildFallback(isProviderTimeoutError(error) ? "provider_timeout" : "provider_error");
  }
}
