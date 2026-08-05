import { buildDescriptiveExtractionAttemptIdentity } from "@/src/cognition/observation-v3/provider-evidence/attempt-identity";
import { createSupplementalRealizationAttemptIdentity } from "@/src/cognition/observation-v3/provider-evidence/attempt-identity";
import { sha256StableProviderEvidence } from "@/src/cognition/observation-v3/provider-evidence/serialization";
import type {
  DescriptiveExtractionProviderEvidence,
  ProviderEvidenceCompatibilityAssessment,
  ProviderEvidenceRequestMetadata,
  ProviderParsingSection,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence/types";

const DEFAULT_COMPATIBILITY: ProviderEvidenceCompatibilityAssessment = {
  replayMode: "frozen_parsed_output",
  state: "comparison_unavailable",
  replayable: false,
};

function createBaseDescriptiveEvidence(input: {
  sourceIdentity: string;
  sourceHash: string;
  extractionRequestId: string;
  attemptNumber: number;
  retryParentAttemptIdentity?: string | null;
  request: ProviderEvidenceRequestMetadata;
  sanitizationVersion: string;
  parserFingerprint: string;
  parserSchemaFingerprint: string;
  artifactVersion: string;
}): DescriptiveExtractionProviderEvidence {
  return {
    schemaVersion: "1",
    artifactVersion: input.artifactVersion,
    sanitizationVersion: input.sanitizationVersion,
    subsystem: "descriptive_extraction",
    sourceIdentity: input.sourceIdentity,
    sourceHash: input.sourceHash,
    attemptIdentity: buildDescriptiveExtractionAttemptIdentity({
      sourceIdentity: input.sourceIdentity,
      extractionRequestId: input.extractionRequestId,
      attemptNumber: input.attemptNumber,
      retryParentAttemptIdentity: input.retryParentAttemptIdentity,
    }),
    evidenceLifecycle: "initialized",
    request: input.request,
    providerBoundary: {
      status: "failed",
      incompleteReason: null,
      sanitizedPayload: null,
      payloadHash: null,
      tokenUsage: null,
      latencyMs: null,
      providerMetadata: null,
      occurredAt: null,
    },
    parsing: {
      parserFingerprint: input.parserFingerprint,
      parserSchemaFingerprint: input.parserSchemaFingerprint,
      status: "not_available",
      structuredOutput: null,
      structuredOutputHash: null,
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: false,
    },
    compatibility: DEFAULT_COMPATIBILITY,
    capture: {
      providerExecutionState: "not_started",
      parsingState: "not_started",
      evidenceCaptureState: "initialized",
      artifactWriteState: "not_written",
    },
  };
}

function withLifecycle<T extends DescriptiveExtractionProviderEvidence | SupplementalRealizationProviderEvidence>(
  evidence: T,
  lifecycle: T["evidenceLifecycle"],
): T {
  return {
    ...evidence,
    evidenceLifecycle: lifecycle,
    capture: {
      ...evidence.capture,
      evidenceCaptureState: lifecycle,
    },
  } as T;
}

function captureParsingSection(
  prior: DescriptiveExtractionProviderEvidence | SupplementalRealizationProviderEvidence,
  input: {
    status: ProviderParsingSection["status"];
    structuredOutput: unknown | null;
    failure: Record<string, unknown> | null;
    parseFailureClass: string | null;
    producedDirectlyFromProviderPayload: boolean;
  },
): DescriptiveExtractionProviderEvidence | SupplementalRealizationProviderEvidence {
  const next = {
    ...prior,
    parsing: {
      ...prior.parsing,
      status: input.status,
      structuredOutput: input.structuredOutput,
      structuredOutputHash: input.structuredOutput === null ? null : sha256StableProviderEvidence(input.structuredOutput),
      failure: input.failure,
      parseFailureClass: input.parseFailureClass,
      producedDirectlyFromProviderPayload: input.producedDirectlyFromProviderPayload,
    },
    capture: {
      ...prior.capture,
      parsingState: input.status,
    },
  };

  return withLifecycle(next, "complete");
}

export function createDescriptiveExtractionProviderEvidenceCapture(input: {
  sourceIdentity: string;
  sourceHash: string;
  extractionRequestId: string;
  attemptNumber: number;
  retryParentAttemptIdentity?: string | null;
  request: ProviderEvidenceRequestMetadata;
  sanitizationVersion: string;
  parserFingerprint: string;
  parserSchemaFingerprint: string;
  artifactVersion: string;
}) {
  let current = createBaseDescriptiveEvidence(input);

  return {
    current(): DescriptiveExtractionProviderEvidence {
      return current;
    },
    captureProviderBoundary(inputSection: {
      status: DescriptiveExtractionProviderEvidence["providerBoundary"]["status"];
      incompleteReason: string | null;
      sanitizedPayload: unknown | null;
      tokenUsage: {
        input: number | null;
        output: number | null;
        total: number | null;
      } | null;
      latencyMs: number | null;
      providerMetadata: Record<string, unknown> | null;
      occurredAt: string | null;
    }): DescriptiveExtractionProviderEvidence {
      current = withLifecycle({
        ...current,
        providerBoundary: {
          status: inputSection.status,
          incompleteReason: inputSection.incompleteReason,
          sanitizedPayload: inputSection.sanitizedPayload,
          payloadHash: inputSection.sanitizedPayload === null ? null : sha256StableProviderEvidence(inputSection.sanitizedPayload),
          tokenUsage: inputSection.tokenUsage,
          latencyMs: inputSection.latencyMs,
          providerMetadata: inputSection.providerMetadata,
          occurredAt: inputSection.occurredAt,
        },
        capture: {
          ...current.capture,
          providerExecutionState: inputSection.status,
        },
      }, "provider_boundary_captured");

      return current;
    },
    captureParsing(inputSection: {
      status: ProviderParsingSection["status"];
      structuredOutput: unknown | null;
      failure: Record<string, unknown> | null;
      parseFailureClass: string | null;
      producedDirectlyFromProviderPayload: boolean;
    }): DescriptiveExtractionProviderEvidence {
      current = captureParsingSection(current, inputSection) as DescriptiveExtractionProviderEvidence;
      return current;
    },
    markCaptureFailed(failure: {
      failureClass: string;
      message: string;
    }): DescriptiveExtractionProviderEvidence {
      current = withLifecycle({
        ...current,
        parsing: {
          ...current.parsing,
          failure,
          parseFailureClass: failure.failureClass,
        },
      }, "capture_failed");
      return current;
    },
  };
}

export function createSupplementalRealizationProviderEvidenceCapture(input: {
  sourceIdentity: string;
  sourceHash: string;
  supplementalRequestId: string;
  targetId: string;
  providerAttemptNumber: number;
  retryParentAttemptIdentity?: string | null;
  request: ProviderEvidenceRequestMetadata;
  sanitizationVersion: string;
  parserFingerprint: string;
  parserSchemaFingerprint: string;
  artifactVersion: string;
}) {
  let current: SupplementalRealizationProviderEvidence = {
    schemaVersion: "1",
    artifactVersion: input.artifactVersion,
    sanitizationVersion: input.sanitizationVersion,
    subsystem: "supplemental_realization",
    sourceIdentity: input.sourceIdentity,
    sourceHash: input.sourceHash,
    attemptIdentity: createSupplementalRealizationAttemptIdentity({
      sourceIdentity: input.sourceIdentity,
      supplementalRequestId: input.supplementalRequestId,
      targetId: input.targetId,
      targetExecutionAttempt: input.providerAttemptNumber,
      retryParentAttemptIdentity: input.retryParentAttemptIdentity,
    }),
    evidenceLifecycle: "initialized",
    request: input.request,
    providerBoundary: {
      status: "failed",
      incompleteReason: null,
      sanitizedPayload: null,
      payloadHash: null,
      tokenUsage: null,
      latencyMs: null,
      providerMetadata: null,
      occurredAt: null,
    },
    parsing: {
      parserFingerprint: input.parserFingerprint,
      parserSchemaFingerprint: input.parserSchemaFingerprint,
      status: "not_available",
      structuredOutput: null,
      structuredOutputHash: null,
      failure: null,
      parseFailureClass: null,
      producedDirectlyFromProviderPayload: false,
    },
    compatibility: DEFAULT_COMPATIBILITY,
    capture: {
      providerExecutionState: "not_started",
      parsingState: "not_started",
      evidenceCaptureState: "initialized",
      artifactWriteState: "not_written",
    },
  };

  return {
    current(): SupplementalRealizationProviderEvidence {
      return current;
    },
    captureProviderBoundary(inputSection: {
      status: SupplementalRealizationProviderEvidence["providerBoundary"]["status"];
      incompleteReason: string | null;
      sanitizedPayload: unknown | null;
      tokenUsage: {
        input: number | null;
        output: number | null;
        total: number | null;
      } | null;
      latencyMs: number | null;
      providerMetadata: Record<string, unknown> | null;
      occurredAt: string | null;
    }): SupplementalRealizationProviderEvidence {
      current = withLifecycle({
        ...current,
        providerBoundary: {
          status: inputSection.status,
          incompleteReason: inputSection.incompleteReason,
          sanitizedPayload: inputSection.sanitizedPayload,
          payloadHash: inputSection.sanitizedPayload === null ? null : sha256StableProviderEvidence(inputSection.sanitizedPayload),
          tokenUsage: inputSection.tokenUsage,
          latencyMs: inputSection.latencyMs,
          providerMetadata: inputSection.providerMetadata,
          occurredAt: inputSection.occurredAt,
        },
        capture: {
          ...current.capture,
          providerExecutionState: inputSection.status,
        },
      }, "provider_boundary_captured");

      return current;
    },
    captureParsing(inputSection: {
      status: ProviderParsingSection["status"];
      structuredOutput: unknown | null;
      failure: Record<string, unknown> | null;
      parseFailureClass: string | null;
      producedDirectlyFromProviderPayload: boolean;
    }): SupplementalRealizationProviderEvidence {
      current = captureParsingSection(current, inputSection) as SupplementalRealizationProviderEvidence;
      return current;
    },
  };
}
