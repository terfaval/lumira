import type {
  DescriptiveExtractionAttemptResult,
  StructuredDescriptiveExtractionProviderResult,
} from "@/src/cognition/observation-v3/descriptive-extraction/extraction-contract";
import { buildDescriptiveExtractionPrompt, parseStructuredDescriptiveExtraction } from "@/src/cognition/observation-v3/descriptive-extraction/parser";
import {
  DESCRIPTIVE_EXTRACTION_SCHEMA_NAME,
  OBSERVATION_SCENE_EXTRACTION_MODEL,
  OPENAI_REQUEST_TIMEOUT_MS,
  requestOpenAiStructuredDescriptiveExtraction,
  SCENE_EXTRACTION_JSON_SCHEMA,
} from "@/src/cognition/observation-v3/descriptive-extraction/provider-adapter";
import { buildDescriptiveExtractionCandidateFromStructuredResult } from "@/src/cognition/observation-v3/descriptive-extraction/normalization";
import { buildAttemptDiagnostics } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import {
  createDescriptiveExtractionProviderEvidenceCapture,
  sha256StableProviderEvidence,
  type DescriptiveExtractionProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";

async function emitProviderEvidenceSafely(input: {
  onProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
  evidence: DescriptiveExtractionProviderEvidence;
}): Promise<void> {
  try {
    await input.onProviderEvidence?.(input.evidence);
  } catch (error) {
    console.warn("observation_v3_descriptive_provider_evidence_capture_failed", {
      sourceIdentity: input.evidence.sourceIdentity,
      attemptIdentity: input.evidence.attemptIdentity.identity,
      errorMessage: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function executeDescriptiveExtractionAttempt(input: {
  userId: string;
  reflectiveObjectId: string;
  dreamText: string;
  attempt: 1 | 2;
  startedAtMs?: number;
  sourceIdentity?: string;
  extractionRequestId?: string;
  retryParentAttemptIdentity?: string | null;
  onProviderEvidence?: (evidence: DescriptiveExtractionProviderEvidence) => void | Promise<void>;
  requestStructuredOutput?: (
    input: {
      dreamText: string;
      prompt: string;
      model: string;
      schemaName: string;
      schema: Record<string, unknown>;
      timeoutMs: number;
      startedAtMs: number;
    },
  ) => Promise<StructuredDescriptiveExtractionProviderResult | null>;
}): Promise<DescriptiveExtractionAttemptResult> {
  const startedAtMs = input.startedAtMs ?? Date.now();
  const requestStructuredOutput = input.requestStructuredOutput ?? requestOpenAiStructuredDescriptiveExtraction;
  const prompt = buildDescriptiveExtractionPrompt(input.dreamText);
  const sourceIdentity = input.sourceIdentity ?? input.reflectiveObjectId;
  const extractionRequestId = input.extractionRequestId ?? `${sourceIdentity}:descriptive-extraction`;
  const providerEvidenceCapture = createDescriptiveExtractionProviderEvidenceCapture({
    sourceIdentity,
    sourceHash: sha256StableProviderEvidence(input.dreamText),
    extractionRequestId,
    attemptNumber: input.attempt,
    retryParentAttemptIdentity: input.retryParentAttemptIdentity,
    request: {
      requestFingerprint: sha256StableProviderEvidence({
        model: OBSERVATION_SCENE_EXTRACTION_MODEL,
        prompt,
        schemaName: DESCRIPTIVE_EXTRACTION_SCHEMA_NAME,
      }),
      promptFingerprint: sha256StableProviderEvidence(prompt),
      schemaFingerprint: sha256StableProviderEvidence(SCENE_EXTRACTION_JSON_SCHEMA),
      modelIdentifier: OBSERVATION_SCENE_EXTRACTION_MODEL,
    },
    sanitizationVersion: "descriptive-extraction-provider-sanitization-v1",
    parserFingerprint: sha256StableProviderEvidence(parseStructuredDescriptiveExtraction.toString()),
    parserSchemaFingerprint: sha256StableProviderEvidence(SCENE_EXTRACTION_JSON_SCHEMA),
    artifactVersion: "1",
  });

  const providerResult = await requestStructuredOutput({
    dreamText: input.dreamText,
    prompt,
    model: OBSERVATION_SCENE_EXTRACTION_MODEL,
    schemaName: DESCRIPTIVE_EXTRACTION_SCHEMA_NAME,
    schema: SCENE_EXTRACTION_JSON_SCHEMA,
    timeoutMs: OPENAI_REQUEST_TIMEOUT_MS,
    startedAtMs,
  });

  if (providerResult === null) {
    return {
      status: "missing_openai_api_key",
      bundle: null,
      payload: null,
      diagnostics: null,
    };
  }

  providerEvidenceCapture.captureProviderBoundary({
    status: providerResult.outputText ? "completed" : "incomplete",
    incompleteReason: providerResult.providerDiagnostics.providerIncompleteReason,
    sanitizedPayload: {
      outputText: providerResult.outputText,
      providerDiagnostics: providerResult.providerDiagnostics,
    },
    tokenUsage: {
      input: providerResult.providerDiagnostics.inputTokenUsage,
      output: providerResult.providerDiagnostics.outputTokenUsage,
      total: providerResult.providerDiagnostics.totalTokenUsage,
    },
    latencyMs: providerResult.providerDiagnostics.elapsedMs,
    providerMetadata: {
      providerStatus: providerResult.providerDiagnostics.providerStatus,
      providerReturnedStructuredOutput: providerResult.providerDiagnostics.providerReturnedStructuredOutput,
      modelIdentifier: OBSERVATION_SCENE_EXTRACTION_MODEL,
    },
    occurredAt: new Date(startedAtMs + providerResult.providerDiagnostics.elapsedMs).toISOString(),
  });

  if (!providerResult.outputText) {
    await emitProviderEvidenceSafely({
      onProviderEvidence: input.onProviderEvidence,
      evidence: providerEvidenceCapture.captureParsing({
        status: "not_available",
        structuredOutput: null,
        failure: null,
        parseFailureClass: null,
        producedDirectlyFromProviderPayload: false,
      }),
    });
    return {
      status: "empty_response",
      bundle: null,
      payload: null,
      diagnostics: buildAttemptDiagnostics({
        attempt: input.attempt,
        model: OBSERVATION_SCENE_EXTRACTION_MODEL,
        ...providerResult.providerDiagnostics,
        rawMetrics: {
          rawSceneCount: 0,
          rawObservationCount: 0,
          rawEvidenceSpanCount: 0,
          rawLargestCoveredSpanEnd: null,
          rawLateSectionObservationCount: 0,
        },
        normalizedMetrics: {
          dreamTextLength: input.dreamText.length,
          normalizedSceneCount: 0,
          normalizedObservationCount: 0,
          normalizedEvidenceSpanCount: 0,
          defaultedFieldCount: 0,
          largestCoveredSpanEnd: null,
          coverageRatio: null,
          uncoveredTailChars: null,
          lateSectionStart: 0,
          lateSectionSentenceUnits: 0,
          lateSectionObservationCount: 0,
          overmergeMatchedCueGroups: 0,
          overmergeTotalCueMatches: 0,
          projectedFragmentCount: 0,
          projectedSummaryTraceCount: 0,
          guardVerdict: "pass",
          fallbackReason: "empty_response",
        },
      }),
    };
  }

  try {
    const structured = parseStructuredDescriptiveExtraction(providerResult.outputText);
    await emitProviderEvidenceSafely({
      onProviderEvidence: input.onProviderEvidence,
      evidence: providerEvidenceCapture.captureParsing({
        status: "parsed",
        structuredOutput: structured,
        failure: null,
        parseFailureClass: null,
        producedDirectlyFromProviderPayload: true,
      }),
    });
    return buildDescriptiveExtractionCandidateFromStructuredResult({
      userId: input.userId,
      reflectiveObjectId: input.reflectiveObjectId,
      dreamText: input.dreamText,
      structured,
      attempt: input.attempt,
      model: OBSERVATION_SCENE_EXTRACTION_MODEL,
      providerDiagnostics: providerResult.providerDiagnostics,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      await emitProviderEvidenceSafely({
        onProviderEvidence: input.onProviderEvidence,
        evidence: providerEvidenceCapture.captureParsing({
          status: "parse_failed",
          structuredOutput: null,
          failure: {
            message: error.message,
          },
          parseFailureClass: "invalid_json",
          producedDirectlyFromProviderPayload: true,
        }),
      });
    }
    throw error;
  }
}
