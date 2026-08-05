import {
  COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
  COMPLETENESS_ANALYZER_VERSION,
  type CompletenessReport,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analysis-contract";
import {
  analyzeObservationCompleteness,
} from "@/src/cognition/observation-v3/completeness-analysis/completeness-analyzer";
import {
  compareCompletenessWithV2Diagnostics,
  type CompletenessEquivalenceResult,
  type V2AttemptDiagnosticsReference,
} from "@/src/cognition/observation-v3/completeness-analysis/v2-equivalence";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export type CompletenessAnalysisShadowResult =
  | {
      schemaVersion: typeof COMPLETENESS_ANALYSIS_SCHEMA_VERSION;
      analyzerVersion: typeof COMPLETENESS_ANALYZER_VERSION;
      generatedAt: string;
      elapsedMs: number;
      attemptNumber: 1 | 2;
      status: "available";
      report: CompletenessReport;
      v2DiagnosticReference: V2AttemptDiagnosticsReference;
      equivalence: CompletenessEquivalenceResult;
    }
  | {
      schemaVersion: typeof COMPLETENESS_ANALYSIS_SCHEMA_VERSION;
      analyzerVersion: typeof COMPLETENESS_ANALYZER_VERSION;
      generatedAt: string;
      elapsedMs: number;
      attemptNumber: 1 | 2;
      status: "unavailable";
      v2DiagnosticReference: V2AttemptDiagnosticsReference | null;
      equivalence: CompletenessEquivalenceResult;
      failure: {
        code: "analyzer_failed" | "not_emitted";
        message: string;
      };
    };

async function emitResultSafely(input: {
  onResult?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
  result: CompletenessAnalysisShadowResult;
}): Promise<void> {
  try {
    await input.onResult?.(input.result);
  } catch (error) {
    console.warn("observation_v3_completeness_shadow_delivery_failed", {
      attemptNumber: input.result.attemptNumber,
      status: input.result.status,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function runShadowCompletenessAnalysis(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
  attemptNumber: 1 | 2;
  v2AttemptDiagnostics: V2AttemptDiagnosticsReference;
  onResult?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
  now?: () => Date;
}): Promise<CompletenessAnalysisShadowResult> {
  const startedAtMs = Date.now();
  const now = input.now ?? (() => new Date());

  try {
    const report = analyzeObservationCompleteness({
      dreamText: input.dreamText,
      bundle: input.bundle,
    });
    const equivalence = compareCompletenessWithV2Diagnostics({
      report,
      v2AttemptDiagnostics: input.v2AttemptDiagnostics,
    });
    const result: CompletenessAnalysisShadowResult = {
      schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
      generatedAt: now().toISOString(),
      elapsedMs: Date.now() - startedAtMs,
      attemptNumber: input.attemptNumber,
      status: "available",
      report,
      v2DiagnosticReference: input.v2AttemptDiagnostics,
      equivalence,
    };
    await emitResultSafely({
      onResult: input.onResult,
      result,
    });
    return result;
  } catch (error) {
    const result: CompletenessAnalysisShadowResult = {
      schemaVersion: COMPLETENESS_ANALYSIS_SCHEMA_VERSION,
      analyzerVersion: COMPLETENESS_ANALYZER_VERSION,
      generatedAt: now().toISOString(),
      elapsedMs: Date.now() - startedAtMs,
      attemptNumber: input.attemptNumber,
      status: "unavailable",
      v2DiagnosticReference: input.v2AttemptDiagnostics,
      equivalence: {
        classification: "comparison_unavailable",
        reasons: ["shadow_analyzer_failed"],
        discrepancies: [],
      },
      failure: {
        code: "analyzer_failed",
        message: error instanceof Error ? error.message : "unknown_error",
      },
    };
    await emitResultSafely({
      onResult: input.onResult,
      result,
    });
    return result;
  }
}
