import OpenAI from "openai";

import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

export interface StructuredExperimentResponse {
  outputText: string | null;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  latencyMs?: number | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  };
}

export async function runStructuredObservationExperiment(input: {
  model: string;
  prompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
}): Promise<StructuredExperimentResponse> {
  const env = readRuntimeEnvironment();
  if (!env.openAiApiKey) {
    throw new Error("missing_openai_api_key");
  }

  const client = new OpenAI({ apiKey: env.openAiApiKey });
  const startedAt = Date.now();
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
    providerStatus: response.status ?? null,
    providerIncompleteReason: response.incomplete_details?.reason ?? null,
    latencyMs: Date.now() - startedAt,
    tokenUsage: {
      input: typeof response.usage?.input_tokens === "number" ? response.usage.input_tokens : null,
      output: typeof response.usage?.output_tokens === "number" ? response.usage.output_tokens : null,
      total: typeof response.usage?.total_tokens === "number" ? response.usage.total_tokens : null,
    },
  };
}
