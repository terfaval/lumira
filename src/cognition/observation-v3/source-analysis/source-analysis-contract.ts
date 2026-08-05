export const SOURCE_ANALYSIS_SCHEMA_VERSION = "1";
export const SOURCE_ANALYZER_VERSION = "1";

export type SourceRiskLevel = "low" | "moderate" | "high";

export interface SourceMetrics {
  characterCount: number;
  nonWhitespaceCharacterCount: number;
  lineCount: number;
  paragraphCount: number;
  sentenceLikeUnitCount: number;
}

export interface SourceStructuralCharacteristics {
  isWhitespaceOnly: boolean;
  hasParagraphBreaks: boolean;
  containsNonAscii: boolean;
  newlineStyle: "none" | "lf" | "crlf" | "mixed";
  punctuationSignalCount: number;
}

export interface SourceContinuityCharacteristics {
  transitionCueCount: number;
  localityShiftCueCount: number;
  chronologyShiftCueCount: number;
  perspectiveShiftCueCount: number;
  fragmentationSignalCount: number;
}

export interface SourceAmbiguityCharacteristics {
  uncertaintyCueCount: number;
  unresolvedReferenceCueCount: number;
  contradictionCueCount: number;
}

export interface SourceExtractionRiskProfile {
  overallRisk: SourceRiskLevel;
  longFormRisk: SourceRiskLevel;
  fragmentationRisk: SourceRiskLevel;
  ambiguityRisk: SourceRiskLevel;
  tailCoverageRisk: SourceRiskLevel;
  continuityRisk: SourceRiskLevel;
}

export interface SourceProfile {
  sourceMetrics: SourceMetrics;
  structuralCharacteristics: SourceStructuralCharacteristics;
  continuityCharacteristics: SourceContinuityCharacteristics;
  ambiguityCharacteristics: SourceAmbiguityCharacteristics;
  extractionRiskProfile: SourceExtractionRiskProfile;
}

export interface SourceAnalysisAdvisory {
  topologyRecommendation: string;
  rationaleCodes: string[];
}

export type SourceAnalysisShadowResult =
  | {
      schemaVersion: typeof SOURCE_ANALYSIS_SCHEMA_VERSION;
      analyzerVersion: typeof SOURCE_ANALYZER_VERSION;
      generatedAt: string;
      elapsedMs: number;
      status: "available";
      profile: SourceProfile;
    }
  | {
      schemaVersion: typeof SOURCE_ANALYSIS_SCHEMA_VERSION;
      analyzerVersion: typeof SOURCE_ANALYZER_VERSION;
      generatedAt: string;
      elapsedMs: number;
      status: "unavailable";
      failure: {
        code: "analyzer_failed" | "not_emitted";
        message: string;
      };
    };
