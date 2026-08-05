import type {
  SceneObservationAttemptDiagnostics,
  SceneObservationGuardVerdict,
} from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export type ObservationExtractionAttemptStatus =
  | "provider_failed"
  | "provider_incomplete"
  | "parse_failed"
  | "schema_failed"
  | "candidate_rejected"
  | "candidate_accepted"
  | "unexpected_error";

export interface ObservationExtractionAttemptEvidence {
  attempt: 1 | 2;
  status: ObservationExtractionAttemptStatus;
  startedAt: string;
  completedAt: string;
  elapsedMs: number | null;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  providerReturnedStructuredOutput: boolean | null;
  parseStatus: "not_attempted" | "failed" | "parsed";
  schemaValidationStatus: "not_applicable" | "failed" | "passed";
  candidateBundle: ObservationV2Bundle | null;
  diagnostics: SceneObservationAttemptDiagnostics | null;
  sceneCount: number | null;
  observationCount: number | null;
  evidenceSpanCount: number | null;
  guardVerdict: SceneObservationGuardVerdict | null;
  rejectionReasons: string[];
  retryReason: string | null;
  inputTokenUsage: number | null;
  outputTokenUsage: number | null;
  totalTokenUsage: number | null;
  acceptedAttempt: boolean;
  causedFinalFallback: boolean;
  causedRetry: boolean;
  rawProviderResponsePreserved: false;
  errorMessage: string | null;
}

export interface ObservationExtractionAttemptEvidenceSink {
  recordAttempt(evidence: ObservationExtractionAttemptEvidence): void | Promise<void>;
}

