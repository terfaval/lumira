import type { AdaptedObservationCandidate } from "@/src/cognition/observation-v3/completeness-analysis/candidate-adapter";
import type {
  EndingRetentionAssessment,
  LateRetentionAssessment,
  MaterialGapAssessment,
  MaterialGapRecord,
  MeasurementRange,
  PhysicalGapSet,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import { COMPLETENESS_ANALYSIS_RULES } from "@/src/cognition/observation-v3/completeness-analysis/fingerprint";

const CONNECTIVE_ONLY_TOKENS = new Set([
  "after",
  "afterward",
  "afterwards",
  "and",
  "as",
  "at",
  "aztan",
  "because",
  "but",
  "de",
  "ekkor",
  "es",
  "eventually",
  "finally",
  "kozben",
  "later",
  "meanwhile",
  "mert",
  "so",
  "suddenly",
  "then",
  "utana",
  "vegul",
  "while",
]);

function countSentenceUnits(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function buildCoveredNormalizedSegments(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
}): string[] {
  return input.candidate.observations
    .flatMap((observation) => observation.evidence)
    .map((evidence) => (
      typeof evidence.spanStart === "number" && typeof evidence.spanEnd === "number"
        ? input.dreamText.slice(evidence.spanStart, evidence.spanEnd)
        : ""
    ))
    .map((segment) => normalizeText(segment))
    .filter((segment) => segment.length > 0);
}

function isGapTextAlreadyCoveredElsewhere(input: {
  normalizedGapText: string;
  coveredSegments: string[];
}): boolean {
  if (input.normalizedGapText.length < 12) {
    return false;
  }

  return input.coveredSegments.some((segment) => segment.includes(input.normalizedGapText));
}

function isReflectiveTailCommentary(input: {
  gapText: string;
  gapRange: MeasurementRange;
}): boolean {
  const trimmed = input.gapText.trim().toLowerCase();
  if (!trimmed || (input.gapRange.end - input.gapRange.start) > COMPLETENESS_ANALYSIS_RULES.reflectiveTailMaxChars) {
    return false;
  }

  if (countSentenceUnits(trimmed) > COMPLETENESS_ANALYSIS_RULES.reflectiveTailMaxSentenceUnits) {
    return false;
  }

  return COMPLETENESS_ANALYSIS_RULES.reflectiveTailMarkers.some((marker) => trimmed.startsWith(marker));
}

function isConnectiveOnlyGapText(gapText: string): boolean {
  const tokens = tokenize(gapText);
  return tokens.length > 0 && tokens.every((token) => CONNECTIVE_ONLY_TOKENS.has(token));
}

function classifyGap(input: {
  gap: PhysicalGapSet["gaps"][number];
  dreamText: string;
  coveredSegments: string[];
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
  explicitTerminalCuePresent: boolean;
  sourceLength: number;
}): MaterialGapRecord {
  const gapRange = {
    start: input.gap.sourceStart,
    end: input.gap.sourceEnd,
  };
  const gapText = input.dreamText.slice(gapRange.start, gapRange.end);
  const normalizedGapText = normalizeText(gapText);
  const sentenceUnits = countSentenceUnits(gapText);
  const gapLength = gapRange.end - gapRange.start;

  if (input.gap.kind === "prefix") {
    return {
      gapId: input.gap.id,
      classification: "material_missing",
      admissionRelevant: true,
      reasons: ["prefix_gap_presumed_material"],
    };
  }

  if (input.gap.kind === "tail" && isReflectiveTailCommentary({ gapText, gapRange })) {
    return {
      gapId: input.gap.id,
      classification: "non_material",
      admissionRelevant: false,
      reasons: ["reflective_tail_commentary"],
    };
  }

  if (
    input.gap.kind === "tail"
    && input.explicitTerminalCuePresent
    && input.sourceLength <= COMPLETENESS_ANALYSIS_RULES.boundedTerminalCueSourceMaxChars
    && gapLength <= COMPLETENESS_ANALYSIS_RULES.boundedTerminalCueTailMaxChars
  ) {
    return {
      gapId: input.gap.id,
      classification: "already_represented",
      admissionRelevant: false,
      reasons: ["terminal_state_already_represented"],
    };
  }

  if (
    input.gap.reasons.includes("late_section_missing")
    || input.gap.reasons.includes("ending_not_retained")
    || input.lateRetention.status === "missing"
    || input.endingRetention.status === "not_retained"
  ) {
    return {
      gapId: input.gap.id,
      classification: "material_missing",
      admissionRelevant: true,
      reasons: ["late_or_ending_loss_presumed_material"],
    };
  }

  if (!normalizedGapText) {
    return {
      gapId: input.gap.id,
      classification: "non_material",
      admissionRelevant: false,
      reasons: ["non_lexical_gap_text"],
    };
  }

  if (isGapTextAlreadyCoveredElsewhere({
    normalizedGapText,
    coveredSegments: input.coveredSegments,
  })) {
    return {
      gapId: input.gap.id,
      classification: "already_represented",
      admissionRelevant: false,
      reasons: ["duplicate_source_text_already_covered"],
    };
  }

  if (isConnectiveOnlyGapText(gapText)) {
    return {
      gapId: input.gap.id,
      classification: "non_material",
      admissionRelevant: false,
      reasons: ["connective_only_gap_text"],
    };
  }

  if (input.gap.kind === "internal" && sentenceUnits >= 2 && gapLength >= COMPLETENESS_ANALYSIS_RULES.internalGapMinCharsFloor) {
    return {
      gapId: input.gap.id,
      classification: "unresolved",
      admissionRelevant: true,
      reasons: ["multi_sentence_internal_gap"],
    };
  }

  if (input.gap.kind === "tail") {
    return {
      gapId: input.gap.id,
      classification: "unresolved",
      admissionRelevant: false,
      reasons: ["tail_gap_not_proven_material"],
    };
  }

  return {
    gapId: input.gap.id,
    classification: "unresolved",
    admissionRelevant: false,
    reasons: ["internal_gap_not_deterministically_classified"],
  };
}

export function analyzeMaterialGapAssessment(input: {
  dreamText: string;
  candidate: AdaptedObservationCandidate;
  gaps: PhysicalGapSet;
  lateRetention: LateRetentionAssessment;
  endingRetention: EndingRetentionAssessment;
  explicitTerminalCuePresent: boolean;
}): MaterialGapAssessment {
  const coveredSegments = buildCoveredNormalizedSegments({
    dreamText: input.dreamText,
    candidate: input.candidate,
  });
  const gaps = input.gaps.gaps.map((gap) => classifyGap({
    gap,
    dreamText: input.dreamText,
    coveredSegments,
    lateRetention: input.lateRetention,
    endingRetention: input.endingRetention,
    explicitTerminalCuePresent: input.explicitTerminalCuePresent,
    sourceLength: input.dreamText.length,
  }));

  return {
    gaps,
    targetedGapIds: gaps
      .filter((gap) => gap.classification === "material_missing" || (gap.classification === "unresolved" && gap.admissionRelevant))
      .map((gap) => gap.gapId),
  };
}
