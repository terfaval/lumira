import { sha256StableProviderEvidence } from "@/src/cognition/observation-v3/provider-evidence/serialization";
import type { ProviderEvidenceAttemptIdentity } from "@/src/cognition/observation-v3/provider-evidence/types";

export function buildDescriptiveExtractionAttemptIdentity(input: {
  sourceIdentity: string;
  extractionRequestId: string;
  attemptNumber: number;
  retryParentAttemptIdentity?: string | null;
}): ProviderEvidenceAttemptIdentity {
  const identity = [
    "descriptive_extraction",
    input.sourceIdentity,
    input.extractionRequestId,
    `attempt-${input.attemptNumber}`,
    input.retryParentAttemptIdentity ?? "root",
  ].join(":");

  return {
    subsystem: "descriptive_extraction",
    identity,
    fingerprint: sha256StableProviderEvidence({
      subsystem: "descriptive_extraction",
      sourceIdentity: input.sourceIdentity,
      extractionRequestId: input.extractionRequestId,
      attemptNumber: input.attemptNumber,
      retryParentAttemptIdentity: input.retryParentAttemptIdentity ?? null,
    }),
    sourceIdentity: input.sourceIdentity,
    extractionRequestId: input.extractionRequestId,
    attemptNumber: input.attemptNumber,
    retryParentAttemptIdentity: input.retryParentAttemptIdentity ?? null,
  };
}

export function createSupplementalRealizationAttemptIdentity(input: {
  sourceIdentity: string;
  supplementalRequestId: string;
  targetId: string;
  targetExecutionAttempt: number;
  retryParentAttemptIdentity?: string | null;
}): ProviderEvidenceAttemptIdentity {
  const identity = [
    "supplemental_realization",
    input.sourceIdentity,
    input.supplementalRequestId,
    input.targetId,
    `attempt-${input.targetExecutionAttempt}`,
    input.retryParentAttemptIdentity ?? "root",
  ].join(":");

  return {
    subsystem: "supplemental_realization",
    identity,
    fingerprint: sha256StableProviderEvidence({
      subsystem: "supplemental_realization",
      sourceIdentity: input.sourceIdentity,
      supplementalRequestId: input.supplementalRequestId,
      targetId: input.targetId,
      targetExecutionAttempt: input.targetExecutionAttempt,
      retryParentAttemptIdentity: input.retryParentAttemptIdentity ?? null,
    }),
    sourceIdentity: input.sourceIdentity,
    supplementalRequestId: input.supplementalRequestId,
    targetId: input.targetId,
    attemptNumber: input.targetExecutionAttempt,
    targetExecutionAttempt: input.targetExecutionAttempt,
    retryParentAttemptIdentity: input.retryParentAttemptIdentity ?? null,
  };
}
