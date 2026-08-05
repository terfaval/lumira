export type ProviderEvidenceLifecycle =
  | "initialized"
  | "provider_boundary_captured"
  | "parsing_captured"
  | "complete"
  | "incomplete"
  | "capture_failed";

export type ProviderBoundaryStatus = "completed" | "incomplete" | "failed";
export type ProviderParsingStatus = "parsed" | "parse_failed" | "not_available";
export type ProviderEvidenceReplayMode =
  | "frozen_parsed_output"
  | "provider_boundary_reparse"
  | "dual_validation";

export type ProviderEvidenceCompatibilityState =
  | "compatible"
  | "compatible_with_parser_drift"
  | "compatible_with_schema_drift"
  | "payload_hash_mismatch"
  | "parsed_output_hash_mismatch"
  | "lineage_mismatch"
  | "not_replayable"
  | "comparison_unavailable";

export type ProviderEvidenceArtifactWriteStatus =
  | "written"
  | "write_failed"
  | "partial_write"
  | "verification_failed";

export interface ProviderEvidenceAttemptIdentity {
  subsystem:
    | "descriptive_extraction"
    | "supplemental_realization";
  identity: string;
  fingerprint: string;
  sourceIdentity: string;
  attemptNumber: number;
  retryParentAttemptIdentity: string | null;
  extractionRequestId?: string;
  supplementalRequestId?: string;
  targetId?: string;
  targetExecutionAttempt?: number;
}

export interface ProviderEvidenceRequestMetadata {
  requestFingerprint: string;
  promptFingerprint: string;
  schemaFingerprint: string;
  modelIdentifier: string;
}

export interface ProviderEvidenceCompatibilityAssessment {
  replayMode: ProviderEvidenceReplayMode;
  state: ProviderEvidenceCompatibilityState;
  replayable: boolean;
}

export interface ProviderEvidenceArtifactWriteReceipt {
  destination: string;
  expectedHash: string;
  observedHash: string | null;
  status: ProviderEvidenceArtifactWriteStatus;
  failureClass: string | null;
}

export interface ProviderBoundarySection {
  status: ProviderBoundaryStatus;
  incompleteReason: string | null;
  sanitizedPayload: unknown | null;
  payloadHash: string | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  } | null;
  latencyMs: number | null;
  providerMetadata: Record<string, unknown> | null;
  occurredAt: string | null;
}

export interface ProviderParsingSection {
  parserFingerprint: string;
  parserSchemaFingerprint: string;
  status: ProviderParsingStatus;
  structuredOutput: unknown | null;
  structuredOutputHash: string | null;
  failure: Record<string, unknown> | null;
  parseFailureClass: string | null;
  producedDirectlyFromProviderPayload: boolean;
}

export interface ProviderEvidenceCaptureState {
  providerExecutionState: ProviderBoundaryStatus | "not_started";
  parsingState: ProviderParsingStatus | "not_started";
  evidenceCaptureState: ProviderEvidenceLifecycle;
  artifactWriteState: ProviderEvidenceArtifactWriteStatus | "not_written";
}

export interface BaseProviderEvidence {
  schemaVersion: string;
  artifactVersion: string;
  sanitizationVersion: string;
  subsystem: ProviderEvidenceAttemptIdentity["subsystem"];
  sourceIdentity: string;
  sourceHash: string;
  attemptIdentity: ProviderEvidenceAttemptIdentity;
  evidenceLifecycle: ProviderEvidenceLifecycle;
  request: ProviderEvidenceRequestMetadata;
  providerBoundary: ProviderBoundarySection;
  parsing: ProviderParsingSection;
  compatibility: ProviderEvidenceCompatibilityAssessment;
  capture: ProviderEvidenceCaptureState;
}

export interface DescriptiveExtractionProviderEvidence extends BaseProviderEvidence {
  subsystem: "descriptive_extraction";
}

export interface SupplementalRealizationProviderEvidence extends BaseProviderEvidence {
  subsystem: "supplemental_realization";
}
