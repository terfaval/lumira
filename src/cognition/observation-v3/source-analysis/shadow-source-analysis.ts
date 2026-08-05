import { analyzeSourceText } from "@/src/cognition/observation-v3/source-analysis/source-analysis";
import {
  SOURCE_ANALYSIS_SCHEMA_VERSION,
  SOURCE_ANALYZER_VERSION,
  type SourceAnalysisShadowResult,
  type SourceProfile,
} from "@/src/cognition/observation-v3/source-analysis/source-analysis-contract";

async function emitSourceAnalysisResultSafely(input: {
  onResult?: (result: SourceAnalysisShadowResult) => void | Promise<void>;
  result: SourceAnalysisShadowResult;
}): Promise<void> {
  try {
    await input.onResult?.(input.result);
  } catch (error) {
    console.warn("observation_v3_source_analysis_shadow_delivery_failed", {
      status: input.result.status,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function runShadowSourceAnalysis(input: {
  dreamText: string;
  analyzer?: (input: { dreamText: string }) => SourceProfile;
  onResult?: (result: SourceAnalysisShadowResult) => void | Promise<void>;
  now?: () => Date;
}): Promise<SourceAnalysisShadowResult> {
  const startedAtMs = Date.now();
  const now = input.now ?? (() => new Date());

  try {
    const profile = (input.analyzer ?? analyzeSourceText)({
      dreamText: input.dreamText,
    });
    const result: SourceAnalysisShadowResult = {
      schemaVersion: SOURCE_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: SOURCE_ANALYZER_VERSION,
      generatedAt: now().toISOString(),
      elapsedMs: Date.now() - startedAtMs,
      status: "available",
      profile,
    };
    await emitSourceAnalysisResultSafely({
      onResult: input.onResult,
      result,
    });
    return result;
  } catch (error) {
    const result: SourceAnalysisShadowResult = {
      schemaVersion: SOURCE_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: SOURCE_ANALYZER_VERSION,
      generatedAt: now().toISOString(),
      elapsedMs: Date.now() - startedAtMs,
      status: "unavailable",
      failure: {
        code: "analyzer_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
    await emitSourceAnalysisResultSafely({
      onResult: input.onResult,
      result,
    });
    return result;
  }
}
