import type { ObservationV3ShadowPipelineResult } from "@/src/cognition/observation-v3/pipeline/shadow-pipeline";

export type ObservationV3ReplayCompatibilityClassification =
  | "fully_replayable"
  | "replayable_with_representation_difference"
  | "replayable_with_contract_difference"
  | "requires_manual_mapping"
  | "artifact_incomplete"
  | "lineage_broken"
  | "unsupported";

export type ObservationV3ReplayFailureClassification =
  | "missing_replay_evidence"
  | "missing_lineage"
  | "fingerprint_incompatibility"
  | "contract_incompatibility"
  | "corrupt_artifact"
  | "native_subsystem_failure"
  | "governance_failure";

export interface ObservationV3ReplayDiscoveredRoots {
  baselineBenchmarkRoots: string[];
  topologyExperimentRoots: string[];
  completenessRoots: string[];
  supplementalRealizationRoots: string[];
  authorityAdmissionRoots: string[];
  pipelineRoots: string[];
}

export interface ObservationV3ReplayMatrixCase {
  benchmarkId: string;
  dreamText: string;
  sourceHash: string;
  sourceLength: number;
}

export interface ObservationV3ReplayMatrix {
  discovery: ObservationV3ReplayDiscoveredRoots;
  cases: ObservationV3ReplayMatrixCase[];
}

export interface ObservationV3ReplayFailure {
  classification: ObservationV3ReplayFailureClassification;
  message: string;
  sourceArtifactRef: string | null;
}

export interface ObservationV3ReplayCaseResult {
  benchmarkId: string;
  classification: ObservationV3ReplayCompatibilityClassification;
  executionStatus: "executed" | "not_executed";
  selectedRunId: string | null;
  selectionReason: string;
  failure: ObservationV3ReplayFailure | null;
  lineage: Record<string, unknown>;
  compatibility: Record<string, unknown>;
  pipelineResult: ObservationV3ShadowPipelineResult | null;
  artifacts: Record<string, unknown>;
}

export interface ObservationV3CorpusReplayResult {
  discovery: ObservationV3ReplayDiscoveredRoots;
  results: ObservationV3ReplayCaseResult[];
  artifacts: Record<string, unknown>;
}
