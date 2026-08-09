import {
  emitSceneObservationAttemptDiagnostics,
  type SceneObservationAttemptDiagnostics,
  type SceneObservationExtractionDiagnostics,
} from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import type {
  ObservationExtractionAttemptEvidence,
  ObservationExtractionAttemptEvidenceSink,
} from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import {
  runShadowCompletenessAnalysis,
  type CompletenessAnalysisShadowResult,
} from "@/src/cognition/observation-v3/completeness-analysis";
import {
  buildDescriptiveExtractionCandidateFromStructuredResult,
  executeDescriptiveExtractionAttempt,
  projectNativeC0CandidateToCreateObservationInput,
  projectNativeC0CandidateToObservationV2Bundle,
} from "@/src/cognition/observation-v3/descriptive-extraction";
import {
  buildDescriptiveExtractionAttemptIdentity,
  type DescriptiveExtractionProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import {
  runShadowSourceAnalysis,
  type SourceAnalysisShadowResult,
  type SourceProfile,
} from "@/src/cognition/observation-v3/source-analysis";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export interface LlmSceneObservationExtractionResult {
  mode: "validated_llm" | "fallback";
  bundle?: ObservationV2Bundle;
  payload?: CreateObservationInput;
  reason?: string;
  diagnostics?: SceneObservationExtractionDiagnostics;
}

async function recordAttemptEvidenceSafely(input: {
  evidenceSink?: ObservationExtractionAttemptEvidenceSink;
  onAttemptEvidence?: (evidence: ObservationExtractionAttemptEvidence) => void | Promise<void>;
  evidence: ObservationExtractionAttemptEvidence;
}): Promise<void> {
  try {
    await input.evidenceSink?.recordAttempt(input.evidence);
    await input.onAttemptEvidence?.(input.evidence);
  } catch (error) {
    console.warn("llm_scene_observation_attempt_evidence_capture_failed", {
      attempt: input.evidence.attempt,
      status: input.evidence.status,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

function countBundleObservations(bundle: ObservationV2Bundle): number {
  return bundle.scenes.reduce((count, scene) => count + scene.observations.length, 0);
}

function countBundleEvidenceSpans(bundle: ObservationV2Bundle): number {
  return bundle.scenes.reduce((sceneCount, scene) => {
    return sceneCount + scene.observations.reduce((observationCount, observation) => {
      return observationCount + observation.evidence.length;
    }, 0);
  }, 0);
}

function buildFallback(reason: string): LlmSceneObservationExtractionResult {
  return {
    mode: "fallback",
    reason,
  };
}

function isProviderTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithMetadata = error as Error & {
    code?: string;
  };

  return (
    error.name === "AbortError" ||
    error.name === "APIConnectionTimeoutError" ||
    errorWithMetadata.code === "ABORT_ERR" ||
    /timeout|timed out|aborted/i.test(error.message)
  );
}

function readProviderErrorDiagnostics(error: unknown): {
  errorName: string;
  errorMessage: string;
  errorStatus?: number;
  errorCode?: string;
  timeoutMs?: number;
} {
  if (!(error instanceof Error)) {
    return {
      errorName: "UnknownError",
      errorMessage: "Non-Error value thrown during scene observation extraction.",
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
    timeoutMs: isProviderTimeoutError(error) ? 180_000 : undefined,
  };
}

function buildExtractionDiagnostics(input: {
  dreamText: string;
  startedAtMs: number;
}): {
  dreamTextLength: number;
  elapsedMs: number;
} {
  return {
    dreamTextLength: input.dreamText.length,
    elapsedMs: Date.now() - input.startedAtMs,
  };
}

async function finalizeCandidateAttempt(input: {
  attempt: 1 | 2;
  reflectiveObjectId: string;
  dreamText: string;
  bundle: ObservationV2Bundle;
  payload: CreateObservationInput;
  attemptDiagnostics: SceneObservationAttemptDiagnostics;
  evidenceSink?: ObservationExtractionAttemptEvidenceSink;
  onAttemptEvidence?: (evidence: ObservationExtractionAttemptEvidence) => void | Promise<void>;
  onCompletenessAnalysis?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
}): Promise<LlmSceneObservationExtractionResult> {
  const attemptStartedAt = new Date();
  const shadowCompleteness = await runShadowCompletenessAnalysis({
    dreamText: input.dreamText,
    bundle: input.bundle,
    attemptNumber: input.attempt,
    v2AttemptDiagnostics: {
      guardVerdict: input.attemptDiagnostics.guardVerdict,
      fallbackReason: input.attemptDiagnostics.fallbackReason,
      coverageRatio: input.attemptDiagnostics.coverageRatio,
      uncoveredTailChars: input.attemptDiagnostics.uncoveredTailChars,
      lateSectionObservationCount: input.attemptDiagnostics.lateSectionObservationCount,
      overmergeMatchedCueGroups: input.attemptDiagnostics.overmergeMatchedCueGroups,
      overmergeTotalCueMatches: input.attemptDiagnostics.overmergeTotalCueMatches,
    },
    onResult: input.onCompletenessAnalysis,
  });

  if (shadowCompleteness.status === "unavailable") {
    console.warn("observation_v3_completeness_shadow_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      attempt: input.attempt,
      failureCode: shadowCompleteness.failure.code,
      errorMessage: shadowCompleteness.failure.message,
    });
  } else {
    console.warn("observation_v3_completeness_shadow_diagnostic", {
      reflectiveObjectId: input.reflectiveObjectId,
      attempt: input.attempt,
      adequacy: shadowCompleteness.report.adequacy,
      physicalGapCount: shadowCompleteness.report.gaps.canonicalGapCount,
      recoveryRecommendation: shadowCompleteness.report.recoveryRecommendation.disposition,
      equivalenceClassification: shadowCompleteness.equivalence.classification,
      discrepancyCount: shadowCompleteness.report.metricDiscrepancies.length,
      elapsedMs: shadowCompleteness.elapsedMs,
    });
  }

  const baseAttemptEvidence = {
    attempt: input.attempt,
    startedAt: attemptStartedAt.toISOString(),
    completedAt: new Date().toISOString(),
    elapsedMs: input.attemptDiagnostics.elapsedMs,
    providerStatus: input.attemptDiagnostics.providerStatus,
    providerIncompleteReason: input.attemptDiagnostics.providerIncompleteReason,
    providerReturnedStructuredOutput: input.attemptDiagnostics.providerReturnedStructuredOutput,
    parseStatus: "parsed" as const,
    schemaValidationStatus: "passed" as const,
    candidateBundle: input.bundle,
    diagnostics: input.attemptDiagnostics,
    sceneCount: input.bundle.scenes.length,
    observationCount: countBundleObservations(input.bundle),
    evidenceSpanCount: countBundleEvidenceSpans(input.bundle),
    guardVerdict: input.attemptDiagnostics.guardVerdict,
    inputTokenUsage: input.attemptDiagnostics.inputTokenUsage,
    outputTokenUsage: input.attemptDiagnostics.outputTokenUsage,
    totalTokenUsage: input.attemptDiagnostics.totalTokenUsage,
    rawProviderResponsePreserved: false as const,
    errorMessage: null,
  };

  if (input.attemptDiagnostics.guardVerdict !== "pass") {
    await recordAttemptEvidenceSafely({
      evidenceSink: input.evidenceSink,
      onAttemptEvidence: input.onAttemptEvidence,
      evidence: {
        ...baseAttemptEvidence,
        status: "candidate_rejected",
        rejectionReasons: [input.attemptDiagnostics.guardVerdict],
        retryReason: input.attemptDiagnostics.guardVerdict,
        acceptedAttempt: false,
        causedFinalFallback: true,
        causedRetry: false,
      },
    });
    return {
      mode: "fallback",
      reason: input.attemptDiagnostics.guardVerdict,
      diagnostics: {
        attempts: [input.attemptDiagnostics],
        fallbackReason: input.attemptDiagnostics.guardVerdict,
      },
    };
  }

  await recordAttemptEvidenceSafely({
    evidenceSink: input.evidenceSink,
    onAttemptEvidence: input.onAttemptEvidence,
    evidence: {
      ...baseAttemptEvidence,
      status: "candidate_accepted",
      rejectionReasons: [],
      retryReason: null,
      acceptedAttempt: true,
      causedFinalFallback: false,
      causedRetry: false,
    },
  });

  return {
    mode: "validated_llm",
    bundle: input.bundle,
    payload: input.payload,
    diagnostics: {
      attempts: [input.attemptDiagnostics],
      acceptedAttempt: input.attempt,
    },
  };
}

function buildAttemptFallback(input: {
  reason: "missing_scenes" | "empty_response";
  attemptDiagnostics: SceneObservationAttemptDiagnostics;
}): LlmSceneObservationExtractionResult {
  return {
    ...buildFallback(input.reason),
    diagnostics: {
      attempts: [input.attemptDiagnostics],
      fallbackReason: input.reason,
    },
  };
}

export async function buildSceneObservationExtractionFromStructuredResult(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  structured: unknown;
  attempt?: 1 | 2;
  model?: string;
  evidenceSink?: ObservationExtractionAttemptEvidenceSink;
  onAttemptEvidence?: (evidence: ObservationExtractionAttemptEvidence) => void | Promise<void>;
  onCompletenessAnalysis?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
  sourceProfile?: SourceProfile;
  providerDiagnostics?: Pick<
    SceneObservationAttemptDiagnostics,
    | "elapsedMs"
    | "providerStatus"
    | "providerIncompleteReason"
    | "inputTokenUsage"
    | "outputTokenUsage"
    | "totalTokenUsage"
    | "providerReturnedStructuredOutput"
  >;
}): Promise<LlmSceneObservationExtractionResult> {
  void input.sourceProfile;

  const candidateResult = await buildDescriptiveExtractionCandidateFromStructuredResult({
    userId: input.userId,
    reflectiveObjectId: input.reflectiveObjectId,
    dreamText: input.dreamText,
    structured: input.structured,
    attempt: input.attempt,
    model: input.model,
    providerDiagnostics: input.providerDiagnostics,
  });

  if (candidateResult.status === "missing_scenes") {
    return buildAttemptFallback({
      reason: "missing_scenes",
      attemptDiagnostics: candidateResult.diagnostics,
    });
  }

  return finalizeCandidateAttempt({
    attempt: input.attempt ?? 1,
    reflectiveObjectId: input.reflectiveObjectId,
    dreamText: input.dreamText,
    bundle: projectNativeC0CandidateToObservationV2Bundle(candidateResult.candidate!),
    payload: projectNativeC0CandidateToCreateObservationInput(candidateResult.candidate!),
    attemptDiagnostics: candidateResult.diagnostics,
    evidenceSink: input.evidenceSink,
    onAttemptEvidence: input.onAttemptEvidence,
    onCompletenessAnalysis: input.onCompletenessAnalysis,
  });
}

function buildProviderIncompleteAttemptEvidence(input: {
  attempt: 1 | 2;
  attemptStartedAt: Date;
  diagnostics: SceneObservationAttemptDiagnostics;
}): ObservationExtractionAttemptEvidence {
  return {
    attempt: input.attempt,
    status: "provider_incomplete",
    startedAt: input.attemptStartedAt.toISOString(),
    completedAt: new Date().toISOString(),
    elapsedMs: input.diagnostics.elapsedMs,
    providerStatus: input.diagnostics.providerStatus,
    providerIncompleteReason: input.diagnostics.providerIncompleteReason,
    providerReturnedStructuredOutput: input.diagnostics.providerReturnedStructuredOutput,
    parseStatus: "not_attempted",
    schemaValidationStatus: "not_applicable",
    candidateBundle: null,
    diagnostics: input.diagnostics,
    sceneCount: null,
    observationCount: null,
    evidenceSpanCount: null,
    guardVerdict: null,
    rejectionReasons: ["empty_response"],
    retryReason: "empty_response",
    inputTokenUsage: input.diagnostics.inputTokenUsage,
    outputTokenUsage: input.diagnostics.outputTokenUsage,
    totalTokenUsage: input.diagnostics.totalTokenUsage,
    acceptedAttempt: false,
    causedFinalFallback: true,
    causedRetry: false,
    rawProviderResponsePreserved: false,
    errorMessage: null,
  };
}

export async function buildLlmSceneObservationExtraction(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  sourceIdentity?: string;
  extractionRequestId?: string;
  evidenceSink?: ObservationExtractionAttemptEvidenceSink;
  onAttemptEvidence?: (evidence: ObservationExtractionAttemptEvidence) => void | Promise<void>;
  onDescriptiveProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
  onSourceAnalysis?: (result: SourceAnalysisShadowResult) => void | Promise<void>;
  onCompletenessAnalysis?: (result: CompletenessAnalysisShadowResult) => void | Promise<void>;
}): Promise<LlmSceneObservationExtractionResult> {
  const shadowSourceAnalysis = await runShadowSourceAnalysis({
    dreamText: input.dreamText,
    onResult: input.onSourceAnalysis,
  });

  if (shadowSourceAnalysis.status === "unavailable") {
    console.warn("observation_v3_source_analysis_shadow_failed", {
      reflectiveObjectId: input.reflectiveObjectId,
      failureCode: shadowSourceAnalysis.failure.code,
      errorMessage: shadowSourceAnalysis.failure.message,
    });
  }

  const startedAtMs = Date.now();
  const capturedAttemptEvidence = new Map<1 | 2, ObservationExtractionAttemptEvidence>();

  const requestStructuredExtraction = async (attempt: 1 | 2): Promise<LlmSceneObservationExtractionResult> => {
    const attemptStartedAt = new Date();
    const sourceIdentity = input.sourceIdentity ?? input.reflectiveObjectId;
    const extractionRequestId = input.extractionRequestId ?? `${sourceIdentity}:descriptive-extraction`;

    try {
      const extractionAttempt = await executeDescriptiveExtractionAttempt({
        userId: input.userId,
        reflectiveObjectId: input.reflectiveObjectId,
        dreamText: input.dreamText,
        attempt,
        startedAtMs,
        sourceIdentity,
        extractionRequestId,
        retryParentAttemptIdentity: attempt === 2
          ? buildDescriptiveExtractionAttemptIdentity({
            sourceIdentity,
            extractionRequestId,
            attemptNumber: 1,
          }).identity
          : null,
        onProviderEvidence: input.onDescriptiveProviderEvidence,
      });

      if (extractionAttempt.status === "missing_openai_api_key") {
        return buildFallback("missing_openai_api_key");
      }

      if (extractionAttempt.status === "empty_response") {
        const diagnostics = extractionAttempt.diagnostics;
        if (!diagnostics) {
          return buildFallback("empty_response");
        }

        capturedAttemptEvidence.set(
          attempt,
          buildProviderIncompleteAttemptEvidence({
            attempt,
            attemptStartedAt,
            diagnostics,
          }),
        );

        return buildAttemptFallback({
          reason: "empty_response",
          attemptDiagnostics: diagnostics,
        });
      }

      if (extractionAttempt.status === "missing_scenes") {
        return buildAttemptFallback({
          reason: "missing_scenes",
          attemptDiagnostics: extractionAttempt.diagnostics!,
        });
      }

      return finalizeCandidateAttempt({
        attempt,
        reflectiveObjectId: input.reflectiveObjectId,
        dreamText: input.dreamText,
        bundle: projectNativeC0CandidateToObservationV2Bundle(extractionAttempt.candidate!),
        payload: projectNativeC0CandidateToCreateObservationInput(extractionAttempt.candidate!),
        attemptDiagnostics: extractionAttempt.diagnostics!,
        onCompletenessAnalysis: input.onCompletenessAnalysis,
        evidenceSink: {
          async recordAttempt(evidence) {
            capturedAttemptEvidence.set(attempt, evidence);
          },
        },
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        capturedAttemptEvidence.set(attempt, {
          attempt,
          status: "parse_failed",
          startedAt: attemptStartedAt.toISOString(),
          completedAt: new Date().toISOString(),
          elapsedMs: Date.now() - attemptStartedAt.getTime(),
          providerStatus: null,
          providerIncompleteReason: null,
          providerReturnedStructuredOutput: true,
          parseStatus: "failed",
          schemaValidationStatus: "not_applicable",
          candidateBundle: null,
          diagnostics: null,
          sceneCount: null,
          observationCount: null,
          evidenceSpanCount: null,
          guardVerdict: null,
          rejectionReasons: ["invalid_json"],
          retryReason: "invalid_json",
          inputTokenUsage: null,
          outputTokenUsage: null,
          totalTokenUsage: null,
          acceptedAttempt: false,
          causedFinalFallback: true,
          causedRetry: false,
          rawProviderResponsePreserved: false,
          errorMessage: error.message,
        });

        throw error;
      }

      capturedAttemptEvidence.set(attempt, {
        attempt,
        status: isProviderTimeoutError(error) ? "provider_failed" : "unexpected_error",
        startedAt: attemptStartedAt.toISOString(),
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - attemptStartedAt.getTime(),
        providerStatus: null,
        providerIncompleteReason: null,
        providerReturnedStructuredOutput: null,
        parseStatus: "not_attempted",
        schemaValidationStatus: "not_applicable",
        candidateBundle: null,
        diagnostics: null,
        sceneCount: null,
        observationCount: null,
        evidenceSpanCount: null,
        guardVerdict: null,
        rejectionReasons: [isProviderTimeoutError(error) ? "provider_timeout" : "provider_error"],
        retryReason: isProviderTimeoutError(error) ? "provider_timeout" : "provider_error",
        inputTokenUsage: null,
        outputTokenUsage: null,
        totalTokenUsage: null,
        acceptedAttempt: false,
        causedFinalFallback: true,
        causedRetry: false,
        rawProviderResponsePreserved: false,
        errorMessage: error instanceof Error ? error.message : "unknown_error",
      });

      throw error;
    }
  };

  try {
    const firstAttempt = await requestStructuredExtraction(1);
    const firstAttemptEvidence = capturedAttemptEvidence.get(1);

    if (firstAttempt.diagnostics?.attempts[0]) {
      emitSceneObservationAttemptDiagnostics({
        reflectiveObjectId: input.reflectiveObjectId,
        attemptDiagnostics: firstAttempt.diagnostics.attempts[0],
      });
    }

    if (
      firstAttempt.mode === "fallback" &&
      (
        firstAttempt.reason === "coverage_guard_failed" ||
        firstAttempt.reason === "overmerge_guard_failed" ||
        firstAttempt.reason === "late_section_guard_failed"
      )
    ) {
      if (firstAttemptEvidence) {
        firstAttemptEvidence.causedRetry = true;
        firstAttemptEvidence.causedFinalFallback = false;
      }

      const retryAttempt = await requestStructuredExtraction(2);
      const retryAttemptEvidence = capturedAttemptEvidence.get(2);

      if (retryAttempt.diagnostics?.attempts[0]) {
        emitSceneObservationAttemptDiagnostics({
          reflectiveObjectId: input.reflectiveObjectId,
          attemptDiagnostics: retryAttempt.diagnostics.attempts[0],
        });
      }

      const mergedAttempts = [
        ...(firstAttempt.diagnostics?.attempts ?? []),
        ...(retryAttempt.diagnostics?.attempts ?? []),
      ];

      const emitRetryAttemptEvidence = async (): Promise<void> => {
        if (firstAttemptEvidence) {
          await recordAttemptEvidenceSafely({
            evidenceSink: input.evidenceSink,
            onAttemptEvidence: input.onAttemptEvidence,
            evidence: firstAttemptEvidence,
          });
        }

        if (retryAttemptEvidence) {
          await recordAttemptEvidenceSafely({
            evidenceSink: input.evidenceSink,
            onAttemptEvidence: input.onAttemptEvidence,
            evidence: retryAttemptEvidence,
          });
        }
      };

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "coverage_guard_failed") {
        if (retryAttemptEvidence) {
          retryAttemptEvidence.causedFinalFallback = true;
          retryAttemptEvidence.acceptedAttempt = false;
        }
        await emitRetryAttemptEvidence();
        return {
          ...buildFallback("coverage_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "coverage_guard_failed_after_retry",
          },
        };
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "overmerge_guard_failed") {
        if (retryAttemptEvidence) {
          retryAttemptEvidence.causedFinalFallback = true;
          retryAttemptEvidence.acceptedAttempt = false;
        }
        await emitRetryAttemptEvidence();
        return {
          ...buildFallback("overmerge_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "overmerge_guard_failed_after_retry",
          },
        };
      }

      if (retryAttempt.mode === "fallback" && retryAttempt.reason === "late_section_guard_failed") {
        if (retryAttemptEvidence) {
          retryAttemptEvidence.causedFinalFallback = true;
          retryAttemptEvidence.acceptedAttempt = false;
        }
        await emitRetryAttemptEvidence();
        return {
          ...buildFallback("late_section_guard_failed_after_retry"),
          diagnostics: {
            attempts: mergedAttempts,
            fallbackReason: "late_section_guard_failed_after_retry",
          },
        };
      }

      if (retryAttemptEvidence) {
        retryAttemptEvidence.acceptedAttempt = true;
        retryAttemptEvidence.causedFinalFallback = false;
      }

      await emitRetryAttemptEvidence();

      return {
        ...retryAttempt,
        diagnostics: {
          attempts: mergedAttempts,
          acceptedAttempt: retryAttempt.diagnostics?.acceptedAttempt ?? 2,
        },
      };
    }

    if (firstAttemptEvidence) {
      await recordAttemptEvidenceSafely({
        evidenceSink: input.evidenceSink,
        onAttemptEvidence: input.onAttemptEvidence,
        evidence: firstAttemptEvidence,
      });
    }

    return firstAttempt;
  } catch (error) {
    const lastAttempt = capturedAttemptEvidence.get(2) ?? capturedAttemptEvidence.get(1);
    if (lastAttempt) {
      await recordAttemptEvidenceSafely({
        evidenceSink: input.evidenceSink,
        onAttemptEvidence: input.onAttemptEvidence,
        evidence: lastAttempt,
      });
    }

    if (error instanceof SyntaxError) {
      return buildFallback("invalid_json");
    }

    console.error("llm_scene_observation_extraction_provider_error", {
      reflectiveObjectId: input.reflectiveObjectId,
      ...buildExtractionDiagnostics({
        dreamText: input.dreamText,
        startedAtMs,
      }),
      ...readProviderErrorDiagnostics(error),
    });

    return buildFallback(isProviderTimeoutError(error) ? "provider_timeout" : "provider_error");
  }
}
