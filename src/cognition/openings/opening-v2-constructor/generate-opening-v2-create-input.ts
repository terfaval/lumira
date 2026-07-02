import type { CreateOpeningInput } from "@/src/domain/openings/types";
import type { LatentOpportunityManifestation } from "@/src/domain/latent-v2/types";
import {
  composeOpeningV2InputPacket,
  generateOpeningV2ConstructorOutput,
  generateOpeningV2PolishOutput,
  mapValidatedOpeningV2OutputToCreateOpeningInput,
  parseAndValidateOpeningV2ConstructorOutput,
  type OpeningV2ConstructorInputPacket,
  type OpeningV2ConstructorRepairTask,
  type ValidatedOpeningV2ConstructorOutput,
} from "@/src/cognition/openings/opening-v2-constructor";

const MAX_OPENING_V2_GENERATION_ATTEMPTS = 3;

type OpeningV2PolishStatus =
  | "not_applicable"
  | "applied"
  | "fallback_provider_failure"
  | "fallback_validation_failure"
  | "fallback_guardrail_rejection";

export type GenerateOpeningV2CreateInputResult =
  | {
      mode: "generated";
      packet: OpeningV2ConstructorInputPacket;
      rawOutput: string;
      opening: CreateOpeningInput;
      attempts: number;
      polishStatus: OpeningV2PolishStatus;
    }
  | {
      mode: "failed";
      reason: string;
      details?: Record<string, unknown>;
      packet?: OpeningV2ConstructorInputPacket;
      rawOutput?: string;
      attempts: number;
    };

function buildRepairInstruction(input: {
  reason: string;
  details?: Record<string, unknown>;
  objectLanguage?: string;
}): string {
  const naturalLanguageTail =
    input.objectLanguage === "hu"
      ? " Rewrite the question as natural Hungarian. Prioritize readability over sophistication. Shorter is better."
      : "";

  switch (input.reason) {
    case "question_not_specific_enough":
      return `Rewrite the question so it explicitly names concrete dream material from the packet, such as a person, object, or action.${naturalLanguageTail}`;
    case "question_contains_prohibited_authority_language":
    case "question_contains_prohibited_explanatory_language":
      return `Rewrite the question so it stays open and personal without explaining, judging, or asking why something happened.${naturalLanguageTail}`;
    case "question_contains_prohibited_blunt_feeling_language":
      return `Rewrite the question so it turns personally toward the user without directly asking about feelings or emotions.${naturalLanguageTail}`;
    case "question_contains_prohibited_reflective_jargon":
      return `Replace abstract wording with concrete dream material. Prefer objects, people, actions, disappearances, searches, repairs, or transitions. Avoid psychological terminology.${naturalLanguageTail}`;
    case "question_covers_too_much_of_opportunity":
      return `Choose exactly one turning point. Choose exactly one dream anchor. Ignore all competing shifts. Write the smallest question that still preserves the dream anchor.${naturalLanguageTail}`;
    case "question_contains_multiple_major_shifts":
      return `Choose exactly one turning point. Choose exactly one dream anchor. Ignore all competing shifts. Write the smallest question that still preserves the dream anchor.${naturalLanguageTail}`;
    case "context_contains_prohibited_internal_language":
      return "Rewrite the context using only dream-scene language and remove every reference to analysis, latent logic, confidence, or system internals.";
    case "context_contains_prohibited_authority_language":
    case "context_contains_prohibited_coaching_language":
      return "Rewrite the context as plain scene orientation only. Do not instruct, coach, interpret, or summarize meaning.";
    case "context_contains_prohibited_summary_language":
      return "Rewrite the context as simple scene orientation without abstract summary lines, importance claims, or explanatory framing.";
    case "context_sentence_count_out_of_range":
      return "Rewrite the context to exactly 2 to 4 short sentences.";
    default:
      return `Rewrite the output to satisfy the validator. Previous failure: ${input.reason}${input.details ? ` ${JSON.stringify(input.details)}` : ""}${naturalLanguageTail}`;
  }
}

function normalizeForComparison(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function tokenizeForComparison(input: string): string[] {
  return normalizeForComparison(input)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function readQuestionStem(question: string): string | null {
  const normalizedQuestion = normalizeForComparison(question).trim();

  const stems = [
    "mi valtozik meg",
    "mi valtozik",
    "mi tortenik",
    "mi fordul at",
    "mi marad meg",
    "mi marad",
  ];

  return stems.find((stem) => normalizedQuestion.startsWith(stem)) ?? null;
}

function countBroadeningMarkers(question: string): number {
  const normalizedQuestion = normalizeForComparison(question);
  const afterMatches = normalizedQuestion.match(/\butan\b/gu) ?? [];

  return [
    normalizedQuestion.includes(", es "),
    normalizedQuestion.includes(" majd "),
    normalizedQuestion.includes(" mikozben "),
    normalizedQuestion.includes(" kozben "),
    afterMatches.length >= 2,
  ].filter(Boolean).length;
}

function retainsConcreteDreamAnchor(input: {
  original: ValidatedOpeningV2ConstructorOutput;
  polished: ValidatedOpeningV2ConstructorOutput;
  packet: OpeningV2ConstructorInputPacket;
}): boolean {
  const originalQuestionTokens = new Set(tokenizeForComparison(input.original.question));
  const polishedQuestionTokens = new Set(tokenizeForComparison(input.polished.question));

  const anchorTokens = input.packet.opportunity.structure.elements
    .flatMap((element) => tokenizeForComparison(element))
    .filter((token) => originalQuestionTokens.has(token));

  return anchorTokens.some((token) => polishedQuestionTokens.has(token));
}

function preservesPolishBoundaries(input: {
  original: ValidatedOpeningV2ConstructorOutput;
  polished: ValidatedOpeningV2ConstructorOutput;
  packet: OpeningV2ConstructorInputPacket;
}): boolean {
  if (input.original.sourceOpportunityManifestationId !== input.polished.sourceOpportunityManifestationId) {
    return false;
  }

  if (input.original.reflectiveObjectId !== input.polished.reflectiveObjectId) {
    return false;
  }

  if (input.original.openingKind !== input.polished.openingKind) {
    return false;
  }

  if (input.original.sourceRuntime !== input.polished.sourceRuntime) {
    return false;
  }

  if (!retainsConcreteDreamAnchor(input)) {
    return false;
  }

  const originalStem = readQuestionStem(input.original.question);
  if (originalStem) {
    const polishedStem = readQuestionStem(input.polished.question);
    if (polishedStem !== originalStem) {
      return false;
    }
  }

  const originalBroadeningMarkers = countBroadeningMarkers(input.original.question);
  const polishedBroadeningMarkers = countBroadeningMarkers(input.polished.question);

  return polishedBroadeningMarkers <= originalBroadeningMarkers;
}

async function maybePolishHungarianOpening(input: {
  packet: OpeningV2ConstructorInputPacket;
  validated: ValidatedOpeningV2ConstructorOutput;
  originalRawOutput: string;
}): Promise<{
  rawOutput: string;
  validated: ValidatedOpeningV2ConstructorOutput;
  polishStatus: OpeningV2PolishStatus;
}> {
  if (input.packet.generationContext.objectLanguage !== "hu") {
    return {
      rawOutput: input.originalRawOutput,
      validated: input.validated,
      polishStatus: "not_applicable",
    };
  }

  const polish = await generateOpeningV2PolishOutput({
    packet: input.packet,
    validated: input.validated,
  });

  if (polish.mode === "failed") {
    return {
      rawOutput: input.originalRawOutput,
      validated: input.validated,
      polishStatus: "fallback_provider_failure",
    };
  }

  const polishedValidation = parseAndValidateOpeningV2ConstructorOutput({
    input: input.packet,
    raw: polish.rawOutput,
  });

  if (!polishedValidation.ok) {
    return {
      rawOutput: input.originalRawOutput,
      validated: input.validated,
      polishStatus: "fallback_validation_failure",
    };
  }

  if (!preservesPolishBoundaries({
    original: input.validated,
    polished: polishedValidation.value,
    packet: input.packet,
  })) {
    return {
      rawOutput: input.originalRawOutput,
      validated: input.validated,
      polishStatus: "fallback_guardrail_rejection",
    };
  }

  return {
    rawOutput: polish.rawOutput,
    validated: polishedValidation.value,
    polishStatus: "applied",
  };
}

export async function generateOpeningV2CreateInputFromManifestation(input: {
  manifestation: LatentOpportunityManifestation;
  objectLanguage?: string;
}): Promise<GenerateOpeningV2CreateInputResult> {
  const packet = composeOpeningV2InputPacket({
    manifestation: input.manifestation,
    objectLanguage: input.objectLanguage,
  });

  let repairTask: OpeningV2ConstructorRepairTask | undefined;

  for (let attempt = 1; attempt <= MAX_OPENING_V2_GENERATION_ATTEMPTS; attempt += 1) {
    const generation = await generateOpeningV2ConstructorOutput({
      packet,
      repairTask,
    });
    if (generation.mode === "failed") {
      return {
        mode: "failed",
        reason: generation.reason,
        details: generation.details,
        packet,
        attempts: attempt,
      };
    }

    const validation = parseAndValidateOpeningV2ConstructorOutput({
      input: packet,
      raw: generation.rawOutput,
    });
    if (validation.ok) {
      const finalOutput = await maybePolishHungarianOpening({
        packet,
        validated: validation.value,
        originalRawOutput: generation.rawOutput,
      });

      return {
        mode: "generated",
        packet,
        rawOutput: finalOutput.rawOutput,
        opening: mapValidatedOpeningV2OutputToCreateOpeningInput(finalOutput.validated),
        attempts: attempt,
        polishStatus: finalOutput.polishStatus,
      };
    }

    if (attempt === MAX_OPENING_V2_GENERATION_ATTEMPTS) {
      return {
        mode: "failed",
        reason: validation.reason,
        details: validation.details,
        packet,
        rawOutput: generation.rawOutput,
        attempts: attempt,
      };
    }

    repairTask = {
      mode: "repair",
      failureReason: validation.reason,
      previousRawOutput: generation.rawOutput,
      repairInstruction: buildRepairInstruction({
        reason: validation.reason,
        details: validation.details,
        objectLanguage: packet.generationContext.objectLanguage,
      }),
    };
  }

  return {
    mode: "failed",
    reason: "exhausted_generation_attempts",
    packet,
    attempts: MAX_OPENING_V2_GENERATION_ATTEMPTS,
  };
}
