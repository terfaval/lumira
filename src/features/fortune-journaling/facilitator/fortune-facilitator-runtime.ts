import OpenAI from "openai";

import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";
import {
  buildFortuneFacilitatorPrompt,
  FORTUNE_FACILITATOR_JSON_SCHEMA,
} from "@/src/features/fortune-journaling/facilitator/fortune-facilitator-prompt";
import type {
  FortuneFacilitatorPacket,
  FortuneFacilitatorResponse,
} from "@/src/features/fortune-journaling/facilitator/facilitator-types";

const FORTUNE_FACILITATOR_MODEL = "gpt-4.1-mini";
const FORTUNE_FACILITATOR_TIMEOUT_MS = 20_000;

function normalizeFortuneFacilitatorResponse(raw: unknown): FortuneFacilitatorResponse | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const mode = candidate.mode;
  const reflection = typeof candidate.reflection === "string" ? candidate.reflection.trim() : "";
  const question = typeof candidate.question === "string" ? candidate.question.trim() : candidate.question;

  if (!reflection) {
    return null;
  }

  if (mode === "question") {
    if (typeof question !== "string" || !question || !question.includes("?")) {
      return null;
    }

    return {
      mode,
      reflection,
      question,
    };
  }

  if (mode === "resting_point") {
    if (question !== null) {
      return null;
    }

    return {
      mode,
      reflection,
      question: null,
    };
  }

  return null;
}

export async function generateFortuneFacilitatorTurn(input: {
  packet: FortuneFacilitatorPacket;
}): Promise<
  | { mode: "generated"; output: FortuneFacilitatorResponse }
  | { mode: "failed"; reason: string }
> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    return {
      mode: "failed",
      reason: "missing_openai_api_key",
    };
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });

  try {
    const response = await client.responses.create(
      {
        model: FORTUNE_FACILITATOR_MODEL,
        input: buildFortuneFacilitatorPrompt(input.packet),
        text: {
          format: {
            type: "json_schema",
            name: "lumira_fortune_facilitator_v1",
            schema: FORTUNE_FACILITATOR_JSON_SCHEMA,
            strict: true,
          },
        },
      },
      {
        signal: AbortSignal.timeout(FORTUNE_FACILITATOR_TIMEOUT_MS),
        timeout: FORTUNE_FACILITATOR_TIMEOUT_MS,
      },
    );

    if (!response.output_text) {
      return {
        mode: "failed",
        reason: "empty_response",
      };
    }

    const parsed = normalizeFortuneFacilitatorResponse(JSON.parse(response.output_text));
    if (!parsed) {
      return {
        mode: "failed",
        reason: "invalid_structured_output",
      };
    }

    return {
      mode: "generated",
      output: parsed,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        mode: "failed",
        reason: "invalid_structured_output",
      };
    }

    return {
      mode: "failed",
      reason: "provider_error",
    };
  }
}
