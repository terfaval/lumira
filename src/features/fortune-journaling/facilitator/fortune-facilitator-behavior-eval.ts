import type {
  FortuneFacilitatorPacket,
  FortuneFacilitatorResponse,
} from "@/src/features/fortune-journaling/facilitator/facilitator-types";

export interface FortuneFacilitatorBehaviorEvalCase {
  caseId: string;
  packet: FortuneFacilitatorPacket;
  output: FortuneFacilitatorResponse;
  expectations: {
    rejectCardReadingLeakage?: boolean;
    rejectUnsupportedPsychologizing?: boolean;
    requireSingleQuestion?: boolean;
    rejectOracleLanguage?: boolean;
    requireUserAnchors?: string[];
  };
}

export interface FortuneFacilitatorBehaviorEvalCaseResult {
  caseId: string;
  passed: boolean;
  failures: string[];
}

export interface FortuneFacilitatorBehaviorEvalSuiteResult {
  passedCases: string[];
  failedCases: string[];
  caseResults: FortuneFacilitatorBehaviorEvalCaseResult[];
}

const CARD_READING_PATTERNS = [
  /\b(a\s+)?(mágus|csillag|bolond|főpapnő|fopapno|főpap|világ|magus)\b[^.?!]{0,120}\b(jelenti|jelzi|képviseli|reprezentálja|mutatja)\b/i,
  /\b(a\s+)?lap(ok)?\b[^.?!]{0,80}\b(szerint|azt mutatja|azt jelzi|üzeni|üzenik|arra utal)\b/i,
  /\bkártya\b[^.?!]{0,80}\b(jelenti|jelzi|mutatja|üzeni|arra utal)\b/i,
];

const ORACLE_PATTERNS = [
  /\ba lapok szerint\b/i,
  /\ba kártyák azt üzenik\b/i,
  /\bez azt jelzi, hogy\b/i,
  /\bez arra utal, hogy a jövőben\b/i,
  /\ba lap szerint\b/i,
  /\belkerülhetetlenül\b/i,
];

const PSYCHOLOGIZING_PATTERNS = [
  /\bmenekül(s|és|ni|ok)?\b/i,
  /\bkerül(öd|öm|ni|és)\b/i,
  /\belkerül(öd|öm|ni|és)\b/i,
  /\bfélsz\b/i,
  /\bfélelem\b/i,
  /\belköteleződéstől félsz\b/i,
  /\bönszabot/i,
  /\btrauma\b/i,
  /\btudattalan\b/i,
  /\bunconscious\b/i,
  /\bellenállás\b/i,
  /\bvalójában\b/i,
  /\brejtett ok\b/i,
  /\bhidden cause\b/i,
];

const USER_AUTHORED_UNCERTAINTY_MARKERS = [
  "megjelent a kérdés",
  "benned is megjelent",
  "attól tartok",
  "attol tartok",
  "inkább hátralépés",
  "inkabb hatralepes",
];

export function evaluateFortuneFacilitatorBehaviorSuite(
  cases: FortuneFacilitatorBehaviorEvalCase[],
): FortuneFacilitatorBehaviorEvalSuiteResult {
  const caseResults = cases.map(evaluateFortuneFacilitatorBehaviorCase);

  return {
    passedCases: caseResults.filter((result) => result.passed).map((result) => result.caseId),
    failedCases: caseResults.filter((result) => !result.passed).map((result) => result.caseId),
    caseResults,
  };
}

export function evaluateFortuneFacilitatorBehaviorCase(
  input: FortuneFacilitatorBehaviorEvalCase,
): FortuneFacilitatorBehaviorEvalCaseResult {
  const failures: string[] = [];
  const reflection = input.output.reflection ?? "";
  const question = input.output.mode === "question" ? input.output.question : "";
  const combined = `${reflection}\n${question}`;
  const normalizedCombined = normalize(combined);
  const normalizedPacket = normalize(JSON.stringify(input.packet));

  if (
    input.expectations.rejectCardReadingLeakage &&
    CARD_READING_PATTERNS.some((pattern) => pattern.test(combined))
  ) {
    failures.push("card_reading_leakage");
  }

  if (
    input.expectations.rejectOracleLanguage &&
    ORACLE_PATTERNS.some((pattern) => pattern.test(combined))
  ) {
    failures.push("oracle_or_prediction_language");
  }

  if (input.expectations.rejectUnsupportedPsychologizing) {
    const containsPsychologizing = PSYCHOLOGIZING_PATTERNS.some((pattern) => pattern.test(combined));
    const containsSoftUserFraming = USER_AUTHORED_UNCERTAINTY_MARKERS.some((marker) =>
      normalizedCombined.includes(normalize(marker)),
    );
    const packetAlreadyCarriesSameLanguage = PSYCHOLOGIZING_PATTERNS.some(
      (pattern) => pattern.test(JSON.stringify(input.packet)),
    );

    if (containsPsychologizing && (!containsSoftUserFraming || !packetAlreadyCarriesSameLanguage)) {
      failures.push("unsupported_psychologizing");
    }
  }

  if (input.expectations.requireSingleQuestion && input.output.mode === "question") {
    const questionCount = countQuestionMarks(question) + countQuestionMarks(reflection);
    if (questionCount !== 1) {
      failures.push("multiple_questions");
    }
  }

  if (input.expectations.requireUserAnchors?.length) {
    const matchedAnchor = input.expectations.requireUserAnchors.some((anchor) =>
      normalizedCombined.includes(normalize(anchor)),
    );

    if (!matchedAnchor) {
      failures.push("missing_user_language_anchor");
    }
  }

  if (input.expectations.requireUserAnchors?.length) {
    const packetAnchorsPresent = input.expectations.requireUserAnchors.some((anchor) =>
      normalizedPacket.includes(normalize(anchor)),
    );

    if (!packetAnchorsPresent) {
      failures.push("invalid_test_fixture_missing_anchor_in_packet");
    }
  }

  return {
    caseId: input.caseId,
    passed: failures.length === 0,
    failures,
  };
}

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) ?? []).length;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}
