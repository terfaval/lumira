import type { SceneObservationAttemptDiagnostics } from "@/src/cognition/observation/llm-scene-observation-diagnostics";
import type { CreateObservationInput } from "@/src/domain/observation/types";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

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
  bundle: ObservationV2Bundle | null;
  payload: CreateObservationInput | null;
  diagnostics: SceneObservationAttemptDiagnostics;
}

export interface DescriptiveExtractionAttemptResult {
  status: "candidate_available" | "missing_scenes" | "empty_response" | "missing_openai_api_key";
  bundle: ObservationV2Bundle | null;
  payload: CreateObservationInput | null;
  diagnostics: SceneObservationAttemptDiagnostics | null;
}
