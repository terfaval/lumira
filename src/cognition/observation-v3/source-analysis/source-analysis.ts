import type {
  SourceAmbiguityCharacteristics,
  SourceContinuityCharacteristics,
  SourceExtractionRiskProfile,
  SourceMetrics,
  SourceProfile,
  SourceRiskLevel,
  SourceStructuralCharacteristics,
} from "@/src/cognition/observation-v3/source-analysis/source-analysis-contract";

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function readNewlineStyle(dreamText: string): SourceStructuralCharacteristics["newlineStyle"] {
  const hasCrLf = dreamText.includes("\r\n");
  const normalized = dreamText.replaceAll("\r\n", "");
  const hasLf = normalized.includes("\n");

  if (!hasCrLf && !hasLf) {
    return "none";
  }

  if (hasCrLf && hasLf) {
    return "mixed";
  }

  return hasCrLf ? "crlf" : "lf";
}

function readSentenceLikeUnitCount(dreamText: string): number {
  return dreamText
    .split(/[.!?\n]+/u)
    .map((unit) => unit.trim())
    .filter(Boolean).length;
}

function readSourceMetrics(dreamText: string): SourceMetrics {
  const trimmed = dreamText.trim();
  const paragraphCount =
    trimmed.length === 0
      ? 0
      : trimmed
          .split(/\n\s*\n/u)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean).length;

  return {
    characterCount: dreamText.length,
    nonWhitespaceCharacterCount: dreamText.replaceAll(/\s/gu, "").length,
    lineCount: dreamText.length === 0 ? 0 : dreamText.split(/\r?\n/u).length,
    paragraphCount,
    sentenceLikeUnitCount: readSentenceLikeUnitCount(dreamText),
  };
}

function readStructuralCharacteristics(dreamText: string): SourceStructuralCharacteristics {
  return {
    isWhitespaceOnly: dreamText.trim().length === 0,
    hasParagraphBreaks: /\n\s*\n/u.test(dreamText),
    containsNonAscii: /[^\u0000-\u007F]/u.test(dreamText),
    newlineStyle: readNewlineStyle(dreamText),
    punctuationSignalCount: countMatches(dreamText, /[.!?,;:]/gu),
  };
}

function readContinuityCharacteristics(dreamText: string): SourceContinuityCharacteristics {
  return {
    transitionCueCount: countMatches(dreamText, /\b(then|later|after that|afterwards|suddenly|next|at the end)\b/giu),
    localityShiftCueCount: countMatches(dreamText, /\b(into|inside|outside|through|across|back in|in a|at the)\b/giu),
    chronologyShiftCueCount: countMatches(dreamText, /\b(before|after|later|meanwhile|suddenly|eventually)\b/giu),
    perspectiveShiftCueCount: countMatches(dreamText, /\b(we|they|he|she)\b/giu),
    fragmentationSignalCount:
      countMatches(dreamText, /\n\s*\n/gu) +
      countMatches(dreamText, /(^|\n)\s*[-*]\s/gu) +
      countMatches(dreamText, /\?{2,}|\.{3,}/gu),
  };
}

function readAmbiguityCharacteristics(dreamText: string): SourceAmbiguityCharacteristics {
  return {
    uncertaintyCueCount: countMatches(dreamText, /\b(maybe|perhaps|seemed|as if|kind of|sort of|mintha)\b/giu),
    unresolvedReferenceCueCount: countMatches(dreamText, /\b(someone|something|somewhere|they|it)\b/giu),
    contradictionCueCount: countMatches(dreamText, /\b(but then|except|although|however)\b/giu),
  };
}

function readRiskLevel(score: number): SourceRiskLevel {
  if (score >= 3) {
    return "high";
  }

  if (score >= 1) {
    return "moderate";
  }

  return "low";
}

function readHighestRisk(...levels: SourceRiskLevel[]): SourceRiskLevel {
  if (levels.includes("high")) {
    return "high";
  }

  if (levels.includes("moderate")) {
    return "moderate";
  }

  return "low";
}

function readExtractionRiskProfile(input: {
  metrics: SourceMetrics;
  continuity: SourceContinuityCharacteristics;
  ambiguity: SourceAmbiguityCharacteristics;
  structural: SourceStructuralCharacteristics;
}): SourceExtractionRiskProfile {
  const longFormRisk = readRiskLevel(
    Number(input.metrics.characterCount > 2_000) + Number(input.metrics.sentenceLikeUnitCount > 20),
  );
  const fragmentationRisk = readRiskLevel(
    input.continuity.fragmentationSignalCount + Number(input.structural.hasParagraphBreaks),
  );
  const ambiguityRisk = readRiskLevel(
    input.ambiguity.uncertaintyCueCount +
      input.ambiguity.unresolvedReferenceCueCount +
      input.ambiguity.contradictionCueCount,
  );
  const tailCoverageRisk = readRiskLevel(
    Number(input.metrics.characterCount > 1_200) + Number(input.continuity.transitionCueCount > 3),
  );
  const continuityRisk = readRiskLevel(
    input.continuity.transitionCueCount +
      input.continuity.localityShiftCueCount +
      input.continuity.chronologyShiftCueCount,
  );

  return {
    overallRisk: readHighestRisk(longFormRisk, fragmentationRisk, ambiguityRisk, tailCoverageRisk, continuityRisk),
    longFormRisk,
    fragmentationRisk,
    ambiguityRisk,
    tailCoverageRisk,
    continuityRisk,
  };
}

export function analyzeSourceText(input: { dreamText: string }): SourceProfile {
  const metrics = readSourceMetrics(input.dreamText);
  const structural = readStructuralCharacteristics(input.dreamText);
  const continuity = readContinuityCharacteristics(input.dreamText);
  const ambiguity = readAmbiguityCharacteristics(input.dreamText);

  return {
    sourceMetrics: metrics,
    structuralCharacteristics: structural,
    continuityCharacteristics: continuity,
    ambiguityCharacteristics: ambiguity,
    extractionRiskProfile: readExtractionRiskProfile({
      metrics,
      structural,
      continuity,
      ambiguity,
    }),
  };
}
