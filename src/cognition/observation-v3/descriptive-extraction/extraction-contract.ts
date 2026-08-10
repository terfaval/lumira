import type { SceneObservationAttemptDiagnostics } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import type { ObservationV3NativeC0Candidate } from "@/src/cognition/observation-v3/descriptive-extraction/native-candidate";

export type DescriptiveExtractionContractVariant = "control" | "no_derived";

export interface DescriptiveExtractionProviderDiagnostics {
  elapsedMs: number;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  providerReturnedStructuredOutput: boolean;
  inputTokenUsage: number | null;
  outputTokenUsage: number | null;
  totalTokenUsage: number | null;
}

export interface StructuredDescriptiveExtractionProviderResult {
  outputText: string | null;
  providerDiagnostics: DescriptiveExtractionProviderDiagnostics;
}

export interface DescriptiveExtractionProviderRequest {
  dreamText: string;
  prompt: string;
  model: string;
  schemaName: string;
  schema: Record<string, unknown>;
  timeoutMs: number;
  startedAtMs: number;
}

export interface DescriptiveExtractionCandidateAttemptResult {
  status: "candidate_available" | "missing_scenes";
  candidate: ObservationV3NativeC0Candidate | null;
  diagnostics: SceneObservationAttemptDiagnostics;
}

export interface DescriptiveExtractionAttemptResult {
  status: "candidate_available" | "missing_scenes" | "empty_response" | "missing_openai_api_key";
  candidate: ObservationV3NativeC0Candidate | null;
  diagnostics: SceneObservationAttemptDiagnostics | null;
}
