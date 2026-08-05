import { runStructuredObservationExperiment } from "@/src/cognition/observation/experiment/openai-structured-experiment";
import {
  SUPPLEMENTAL_REALIZATION_MODEL,
  SUPPLEMENTAL_REALIZATION_SCHEMA_NAME,
  SUPPLEMENTAL_REALIZATION_TIMEOUT_MS,
  type PlannedSupplementalGap,
  type SupplementalRealizationExecutionResponse,
} from "@/src/cognition/observation-v3/supplemental-realization/supplemental-realization-contract";

export const SUPPLEMENTAL_REALIZATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["regions"],
  properties: {
    regions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "regionId",
          "heading",
          "spanStart",
          "spanEnd",
          "boundaryUncertainty",
          "transitionCues",
          "observations",
        ],
        properties: {
          regionId: { type: "string" },
          heading: { type: ["string", "null"] },
          spanStart: { type: "integer" },
          spanEnd: { type: "integer" },
          boundaryUncertainty: { type: ["string", "null"] },
          transitionCues: {
            type: "array",
            items: { type: "string" },
          },
          observations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["observationId", "statement", "evidence", "uncertainty"],
              properties: {
                observationId: { type: "string" },
                statement: { type: "string" },
                uncertainty: { type: ["string", "null"] },
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
              },
            },
          },
        },
      },
    },
  },
} as const;

export function buildSupplementalRealizationPrompt(input: {
  target: PlannedSupplementalGap;
  sourceText: string;
  existingObservationText: string;
}): string {
  const boundedGapText = input.sourceText.slice(input.target.sourceStart, input.target.sourceEnd);
  const boundedContextText = input.sourceText.slice(input.target.contextStart, input.target.contextEnd);

  return [
    "Perform bounded supplemental realization for dream observations.",
    "Extract only descriptive, source-grounded content that belongs to the authorized target.",
    "Do not regenerate the whole dream.",
    "Do not rewrite already represented earlier material.",
    "Use surrounding context only for entity continuity, pronoun resolution, and transition placement.",
    "Return multiple locality regions only if the bounded source supports strong spatial, temporal, activity, entity-group, or dream-awareness boundaries.",
    "Do not create regions merely because the context window starts or ends.",
    `Gap span: ${input.target.sourceStart}-${input.target.sourceEnd}.`,
    `Context span: ${input.target.contextStart}-${input.target.contextEnd}.`,
    `Includes ending: ${input.target.includesEnding ? "yes" : "no"}.`,
    `Diagnostic gap reasons: ${input.target.reasons.join(", ") || "none"}.`,
    "Already represented neighboring material:",
    input.existingObservationText || "(none)",
    "Bounded gap text:",
    boundedGapText,
    "Bounded context text:",
    boundedContextText,
  ].join("\n\n");
}

export async function executeOpenAiSupplementalRealization(input: {
  prompt: string;
  target: PlannedSupplementalGap;
}): Promise<SupplementalRealizationExecutionResponse> {
  return runStructuredObservationExperiment({
    model: SUPPLEMENTAL_REALIZATION_MODEL,
    prompt: input.prompt,
    schemaName: SUPPLEMENTAL_REALIZATION_SCHEMA_NAME,
    schema: SUPPLEMENTAL_REALIZATION_SCHEMA,
    timeoutMs: SUPPLEMENTAL_REALIZATION_TIMEOUT_MS,
  });
}
