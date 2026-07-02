import OpenAI from "openai";

import type {
  OpeningV2ConstructorInputPacket,
  ValidatedOpeningV2ConstructorOutput,
} from "@/src/cognition/openings/opening-v2-constructor/types";
import { readRuntimeEnvironment } from "@/src/infrastructure/environment/env";

const OPENAI_REQUEST_TIMEOUT_MS = 180_000;
const OPENING_V2_CONSTRUCTOR_MODEL = "gpt-4.1-mini";

const OPENING_V2_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "question",
    "context",
    "sourceOpportunityManifestationId",
    "reflectiveObjectId",
    "openingKind",
    "sourceRuntime",
  ],
  properties: {
    question: { type: "string" },
    context: { type: "string" },
    sourceOpportunityManifestationId: { type: "string" },
    reflectiveObjectId: { type: "string" },
    openingKind: { type: "string", enum: ["question"] },
    sourceRuntime: { type: "string", enum: ["opening_v2_constructor_mvp"] },
  },
} as const;

export interface OpeningV2ConstructorRepairTask {
  mode: "repair";
  failureReason: string;
  previousRawOutput: string;
  repairInstruction: string;
}

function buildBaseOpeningV2Instructions(): string[] {
  return [
    "Write in the dream/object language.",
    "Use natural Hungarian when the input is Hungarian.",
    "Do not summarize the entire opportunity.",
    "Identify the single most interesting structural turning point.",
    "Do not include multiple major shifts in the same question.",
    "Generate the question around that turning point.",
    "If an opportunity contains several transitions, select the most salient one.",
    "Ignore the others.",
    "The question should feel like a doorway into the opportunity rather than a summary of it.",
    "Preserve at least one concrete dream anchor in the question.",
    "Keep the question compact but specific.",
    "Keep the question answerable as an opening move.",
    "A narrower question is usually better than a broader one.",
    "Prefer simple turning-point question forms like 'Mi valtozik meg...?' or 'Mi fordul at...?' when natural.",
    "Prefer one clean action clause over a compound sentence.",
    "The question must be concrete, self-standing, gently personal, and tied to actual dream material.",
    "The question must name scene material from the packet, not only abstract states or interpretations.",
    "Avoid blunt feeling questions such as 'Mit ereztel akkor?'",
    "Do not start the question with forms like 'Milyen erzes...' or 'Milyen erzesek...'.",
    "Avoid reflective jargon and therapy-like language.",
    "Do not ask about inner movement, the whole relationship, the whole story, the body, or movement in abstract terms.",
    "Do not ask what changes in the relationship in abstract terms.",
    "Avoid explanatory or accusatory question forms such as 'Miert ...?' or 'Why ...?'",
    "Do not try to cover the whole opportunity arc in one question.",
    "Do not interpret, diagnose, advise, moralize, or explain what the dream means.",
    "Do not ask 'Mit jelent ...?' or 'What does this mean?' style questions.",
    "Write context as 2-4 short user-facing orientation sentences.",
    "Write context as plain orientation, not explanation.",
    "Context must only orient to dream material already present in the packet.",
    "Keep context concrete and scene-bound; do not generalize into relationship summaries or meaning summaries.",
    "Do not end context with a takeaway sentence about what the scene is or means.",
    "Do not write coaching or guided-reflection lines in context.",
    "Do not use phrases like 'Vizsgaljuk meg', 'Figyeld meg', 'arra hiv', 'hoz felszinre', 'az alom alaphelyzete', or 'kapcsolat is fontos'.",
    "Avoid mentioning system internals.",
    "Question and context must stay in the language implied by the object language.",
  ];
}

export function buildOpeningV2ConstructorPrompt(
  packet: OpeningV2ConstructorInputPacket,
  repairTask?: OpeningV2ConstructorRepairTask,
): string {
  if (repairTask) {
    return [
      "Repair the invalid Opening V2 draft below.",
      "Return JSON only.",
      "Do not retry broadly. Repair the specific defect.",
      "Keep whatever is already valid and rewrite only what is needed to produce a usable Opening.",
      "Choose exactly one turning point.",
      "Choose exactly one dream anchor.",
      "Ignore all competing shifts.",
      "Write the smallest question that still preserves the dream anchor.",
      "Do not join two separate scene changes with 'es', 'majd', or similar connectors unless they are part of the same concrete action.",
      "Rewrite the question as natural Hungarian when the packet language is Hungarian.",
      "Prioritize readability over sophistication. Shorter is better.",
      ...buildBaseOpeningV2Instructions(),
      `Validation failure: ${repairTask.failureReason}`,
      `Repair requirement: ${repairTask.repairInstruction}`,
      "Invalid draft JSON:",
      repairTask.previousRawOutput,
      "Packet JSON:",
      JSON.stringify(packet, null, 2),
    ].join("\n\n");
  }

  return [
    "Write one best first Opening V2 for the supplied latent opportunity manifestation.",
    "Return JSON only.",
    ...buildBaseOpeningV2Instructions(),
    "Packet JSON:",
    JSON.stringify(packet, null, 2),
  ].join("\n\n");
}

export function buildOpeningV2HungarianPolishPrompt(
  validated: ValidatedOpeningV2ConstructorOutput,
): string {
  return [
    "Polish the Hungarian wording only.",
    "Return JSON only.",
    "Rewrite only question and context.",
    "Keep the selected turning point, dream anchor, and opportunity focus unchanged.",
    "Preserve meaning exactly.",
    "Do not change the selected focus, depth, scope, or reflection direction.",
    "Preserve the original question frame whenever possible.",
    "If the question starts with a form like 'Mi valtozik meg...?', 'Mi tortenik...?', or 'Mi fordul at...?', keep that same question type.",
    "Do not replace the original question type with 'Hogyan...?', 'Miert...?', or a deeper or broader reflective question.",
    "Do not introduce a new turning point, a broader framing, interpretation, psychological language, therapeutic language, or reflective jargon.",
    "Preserve all non-text fields unchanged: sourceOpportunityManifestationId, reflectiveObjectId, openingKind, sourceRuntime.",
    "Prefer simple Hungarian, spoken readability, concrete wording, and shorter phrasing.",
    "Avoid literal, awkward, overly formal, or needlessly subordinate phrasing.",
    "If the wording is already natural, simple, and concise Hungarian, return it unchanged.",
    "Opening JSON:",
    JSON.stringify(validated, null, 2),
  ].join("\n\n");
}

export type OpeningV2ConstructorLlmGenerationResult =
  | {
      mode: "generated";
      rawOutput: string;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
    };

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
      errorMessage: "Non-Error value thrown during opening v2 generation.",
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

export async function generateOpeningV2ConstructorOutput(input: {
  packet: OpeningV2ConstructorInputPacket;
  repairTask?: OpeningV2ConstructorRepairTask;
}): Promise<OpeningV2ConstructorLlmGenerationResult> {
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
      model: OPENING_V2_CONSTRUCTOR_MODEL,
      input: buildOpeningV2ConstructorPrompt(input.packet, input.repairTask),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_opening_v2_constructor_mvp",
          schema: OPENING_V2_JSON_SCHEMA,
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
    console.error("opening_v2_constructor_provider_error", {
      sourceOpportunityManifestationId: input.packet.generationContext.sourceOpportunityManifestationId,
      reflectiveObjectId: input.packet.generationContext.reflectiveObjectId,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
}

export async function generateOpeningV2PolishOutput(input: {
  packet: OpeningV2ConstructorInputPacket;
  validated: ValidatedOpeningV2ConstructorOutput;
}): Promise<OpeningV2ConstructorLlmGenerationResult> {
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
      model: OPENING_V2_CONSTRUCTOR_MODEL,
      input: buildOpeningV2HungarianPolishPrompt(input.validated),
      text: {
        format: {
          type: "json_schema",
          name: "lumira_opening_v2_hungarian_polish",
          schema: OPENING_V2_JSON_SCHEMA,
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
    console.error("opening_v2_polish_provider_error", {
      sourceOpportunityManifestationId: input.packet.generationContext.sourceOpportunityManifestationId,
      reflectiveObjectId: input.packet.generationContext.reflectiveObjectId,
      ...readProviderErrorDiagnostics(error),
    });

    return {
      mode: "failed",
      reason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
      details: readProviderErrorDiagnostics(error),
    };
  }
}
