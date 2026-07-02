import {
  parseOpeningV2ConstructorOutput,
} from "@/src/cognition/openings/opening-v2-constructor/parser";
import type {
  OpeningV2ConstructorInputPacket,
  OpeningV2ConstructorValidationResult,
  ValidatedOpeningV2ConstructorOutput,
} from "@/src/cognition/openings/opening-v2-constructor/types";

const PROHIBITED_INTERNAL_MARKERS = [
  "latent",
  "opportunity",
  "system",
  "evidence",
  "confidence",
  "reflective potential",
  "backend",
  "model behavior",
  "rendszer",
] as const;

const PROHIBITED_AUTHORITY_MARKERS = [
  "this means",
  "means that",
  "reveals",
  "proves",
  "you should",
  "you need to",
  "what does",
  "ez azt jelenti",
  "azt jelenti",
  "mit jelent",
] as const;

const PROHIBITED_COACHING_MARKERS = [
  "vizsgaljuk meg",
  "figyeld meg",
  "figyeld",
  "arra hiv",
  "hoz felszinre",
  "mesel",
  "meselnek",
  "elmelyulj",
] as const;

const PROHIBITED_BLUNT_FEELING_QUESTION_MARKERS = [
  "mit ereztel",
  "milyen erzest",
  "milyen erzes",
  "milyen erzesek",
  "milyen gondolatok es erzesek",
] as const;

const PROHIBITED_REFLECTIVE_JARGON_QUESTION_MARKERS = [
  "belso mozgas",
  "milyen gondolatok jarnak at",
  "mi jar a fejedben",
  "jelentos valtozas",
  "szemelyes fejlodes",
  "erzelmi folyamat",
  "kapcsolat",
  "kapcsolatod",
  "kozos tortenet",
  "megvaltozott ter",
  "a tested vagy a mozdulataid",
] as const;

const PROHIBITED_SUMMARY_CONTEXT_MARKERS = [
  "az alom alaphelyzete",
  "kapcsolat is fontos",
  "te vagy az, aki ezt ateli",
  "ez a pillanat az",
  "mutatja meg",
  "kapcsolodas",
  "feszultseg enyhites",
] as const;

function splitSentences(input: string): string[] {
  return input
    .split(/[.!?]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeForMarkerMatch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeTokens(input: string): string[] {
  return normalizeForMarkerMatch(input)
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4);
}

function tokensLooselyMatch(left: string, right: string): boolean {
  return left === right || left.startsWith(right.slice(0, 5)) || right.startsWith(left.slice(0, 5));
}

function hasEnumeratingShiftConnector(question: string): boolean {
  const normalizedQuestion = normalizeForMarkerMatch(question);
  const afterMatches = normalizedQuestion.match(/\butan\b/gu) ?? [];
  return (
    normalizedQuestion.includes(", es ") ||
    normalizedQuestion.includes(" es ") ||
    normalizedQuestion.includes(" majd ") ||
    normalizedQuestion.includes(" mikozben ") ||
    normalizedQuestion.includes(" kozben ") ||
    afterMatches.length >= 2
  );
}

function extractMajorShiftFragments(packet: OpeningV2ConstructorInputPacket): string[] {
  const metadataNodes = Array.isArray(packet.opportunity.structure.metadata?.nodes)
    ? packet.opportunity.structure.metadata.nodes
    : [];

  const nodeLabels = metadataNodes
    .map((node) => {
      if (!node || typeof node !== "object" || !("label" in node)) {
        return null;
      }

      return typeof node.label === "string" ? node.label : null;
    })
    .filter((label): label is string => Boolean(label))
    .filter((label) => {
      const normalizedLabel = normalizeForMarkerMatch(label);
      return !normalizedLabel.includes("almodo") && !normalizedLabel.includes("en ");
    })
    .flatMap((label) =>
      label
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part.length >= 4),
    );

  if (nodeLabels.length >= 2) {
    return nodeLabels;
  }

  return packet.opportunity.structure.elements.filter((element) => {
    const normalizedElement = normalizeForMarkerMatch(element);
    return !normalizedElement.includes("almodo") && !normalizedElement.includes("en ");
  });
}

function hasAnyMarker(input: string, markers: readonly string[]): boolean {
  const lower = normalizeForMarkerMatch(input);
  return markers.some((marker) => lower.includes(marker));
}

function startsWithWhyQuestion(question: string): boolean {
  return /^(miert|why)\b/u.test(normalizeForMarkerMatch(question).trim());
}

function isSpecificQuestion(question: string, packet: OpeningV2ConstructorInputPacket): boolean {
  const questionTokens = new Set(normalizeTokens(question));
  const anchorTokens = normalizeTokens(
    [
      packet.opportunity.summary,
      packet.opportunity.structure.label,
      ...packet.opportunity.structure.elements,
      ...packet.opportunity.evidenceBlocks.map((block) => block.summary ?? ""),
    ].join(" "),
  );

  return anchorTokens.some((token) => questionTokens.has(token));
}

function looksCompact(question: string): boolean {
  return question.trim().length <= 160;
}

function countMatchedStructureElements(question: string, packet: OpeningV2ConstructorInputPacket): number {
  const questionTokens = normalizeTokens(question);

  return extractMajorShiftFragments(packet).reduce((count, element) => {
    const elementTokens = normalizeTokens(element);
    if (elementTokens.length === 0) {
      return count;
    }

    const matchedTokenCount = elementTokens.filter((elementToken) =>
      questionTokens.some((questionToken) => tokensLooselyMatch(questionToken, elementToken)),
    ).length;

    const minimumMatchesRequired = elementTokens.length >= 3 ? 2 : 1;
    return matchedTokenCount >= minimumMatchesRequired ? count + 1 : count;
  }, 0);
}

function coversTooMuchOfOpportunity(question: string, packet: OpeningV2ConstructorInputPacket): boolean {
  const majorShiftFragments = extractMajorShiftFragments(packet);
  if (majorShiftFragments.length < 3) {
    return false;
  }

  const matchedElements = countMatchedStructureElements(question, packet);
  const normalizedQuestion = normalizeForMarkerMatch(question);
  const hasBroadArcConnector =
    normalizedQuestion.includes(" kozott") ||
    normalizedQuestion.includes(" utan") ||
    normalizedQuestion.includes(" kozben") ||
    normalizedQuestion.includes(" mikozben") ||
    normalizedQuestion.includes(" vegul");

  if (matchedElements >= 3 && hasBroadArcConnector) {
    return true;
  }

  return normalizedQuestion.includes(" kozott") && normalizedQuestion.includes(" es ");
}

function containsMultipleMajorShifts(question: string, packet: OpeningV2ConstructorInputPacket): boolean {
  const enumeratesShifts = hasEnumeratingShiftConnector(question);
  const matchedElements = countMatchedStructureElements(question, packet);
  if (matchedElements >= 3 && enumeratesShifts) {
    return true;
  }

  const questionTokens = normalizeTokens(question);
  const leadingShiftTokenMatches = new Set(extractMajorShiftFragments(packet)
    .map((fragment) => normalizeTokens(fragment)[0] ?? null)
    .filter((token): token is string => Boolean(token))
    .filter((token) => questionTokens.some((questionToken) => tokensLooselyMatch(questionToken, token))));

  return leadingShiftTokenMatches.size >= 2 && enumeratesShifts;
}

export function validateOpeningV2ConstructorOutput(input: {
  inputPacket: OpeningV2ConstructorInputPacket;
  parsed: unknown;
}): OpeningV2ConstructorValidationResult {
  const parsed = parseOpeningV2ConstructorOutput(input.parsed);
  if (!parsed) {
    return {
      ok: false,
      reason: "invalid_output_packet",
    };
  }

  if (!parsed.question || typeof parsed.question !== "string") {
    return {
      ok: false,
      reason: "missing_question",
    };
  }

  if (!looksCompact(parsed.question)) {
    return {
      ok: false,
      reason: "question_not_compact",
      details: { question: parsed.question },
    };
  }

  if (startsWithWhyQuestion(parsed.question)) {
    return {
      ok: false,
      reason: "question_contains_prohibited_explanatory_language",
      details: { question: parsed.question },
    };
  }

  if (!isSpecificQuestion(parsed.question, input.inputPacket)) {
    return {
      ok: false,
      reason: "question_not_specific_enough",
      details: { question: parsed.question },
    };
  }

  if (hasAnyMarker(parsed.question, PROHIBITED_AUTHORITY_MARKERS)) {
    return {
      ok: false,
      reason: "question_contains_prohibited_authority_language",
      details: { question: parsed.question },
    };
  }

  if (hasAnyMarker(parsed.question, PROHIBITED_BLUNT_FEELING_QUESTION_MARKERS)) {
    return {
      ok: false,
      reason: "question_contains_prohibited_blunt_feeling_language",
      details: { question: parsed.question },
    };
  }

  if (hasAnyMarker(parsed.question, PROHIBITED_REFLECTIVE_JARGON_QUESTION_MARKERS)) {
    return {
      ok: false,
      reason: "question_contains_prohibited_reflective_jargon",
      details: { question: parsed.question },
    };
  }

  if (coversTooMuchOfOpportunity(parsed.question, input.inputPacket)) {
    return {
      ok: false,
      reason: "question_covers_too_much_of_opportunity",
      details: { question: parsed.question },
    };
  }

  if (containsMultipleMajorShifts(parsed.question, input.inputPacket)) {
    return {
      ok: false,
      reason: "question_contains_multiple_major_shifts",
      details: { question: parsed.question },
    };
  }

  if (!parsed.context || typeof parsed.context !== "string") {
    return {
      ok: false,
      reason: "missing_context",
    };
  }

  const sentences = splitSentences(parsed.context);
  if (sentences.length < 2 || sentences.length > 4) {
    return {
      ok: false,
      reason: "context_sentence_count_out_of_range",
      details: { sentenceCount: sentences.length },
    };
  }

  if (hasAnyMarker(parsed.context, PROHIBITED_INTERNAL_MARKERS)) {
    return {
      ok: false,
      reason: "context_contains_prohibited_internal_language",
      details: { sourceOpportunityManifestationId: parsed.sourceOpportunityManifestationId },
    };
  }

  if (hasAnyMarker(parsed.context, PROHIBITED_AUTHORITY_MARKERS)) {
    return {
      ok: false,
      reason: "context_contains_prohibited_authority_language",
      details: { sourceOpportunityManifestationId: parsed.sourceOpportunityManifestationId },
    };
  }

  if (hasAnyMarker(parsed.context, PROHIBITED_COACHING_MARKERS)) {
    return {
      ok: false,
      reason: "context_contains_prohibited_coaching_language",
      details: { sourceOpportunityManifestationId: parsed.sourceOpportunityManifestationId },
    };
  }

  if (hasAnyMarker(parsed.context, PROHIBITED_SUMMARY_CONTEXT_MARKERS)) {
    return {
      ok: false,
      reason: "context_contains_prohibited_summary_language",
      details: { sourceOpportunityManifestationId: parsed.sourceOpportunityManifestationId },
    };
  }

  if (parsed.sourceOpportunityManifestationId !== input.inputPacket.generationContext.sourceOpportunityManifestationId) {
    return {
      ok: false,
      reason: "source_opportunity_manifestation_mismatch",
      details: {
        expected: input.inputPacket.generationContext.sourceOpportunityManifestationId,
        actual: parsed.sourceOpportunityManifestationId,
      },
    };
  }

  if (parsed.reflectiveObjectId !== input.inputPacket.generationContext.reflectiveObjectId) {
    return {
      ok: false,
      reason: "reflective_object_id_mismatch",
      details: {
        expected: input.inputPacket.generationContext.reflectiveObjectId,
        actual: parsed.reflectiveObjectId,
      },
    };
  }

  if (parsed.openingKind !== "question") {
    return {
      ok: false,
      reason: "invalid_opening_kind",
    };
  }

  if (parsed.sourceRuntime !== "opening_v2_constructor_mvp") {
    return {
      ok: false,
      reason: "invalid_source_runtime",
    };
  }

  const value: ValidatedOpeningV2ConstructorOutput = {
    ...parsed,
    inputPacket: input.inputPacket,
  };

  return {
    ok: true,
    value,
  };
}

export function parseAndValidateOpeningV2ConstructorOutput(input: {
  input: OpeningV2ConstructorInputPacket;
  raw: unknown;
}): OpeningV2ConstructorValidationResult {
  return validateOpeningV2ConstructorOutput({
    inputPacket: input.input,
    parsed: input.raw,
  });
}
