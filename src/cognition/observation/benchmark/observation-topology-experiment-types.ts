import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import type {
  DescriptiveExtractionProviderEvidence,
  SupplementalRealizationProviderEvidence,
} from "@/src/cognition/observation-v3/provider-evidence";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export const OBSERVATION_TOPOLOGY_EXPERIMENT_OUTPUT_ROOT = ".validation/observation-topology-experiments/runs";

export type ObservationTopologyConfigurationId =
  | "A_CURRENT_BASELINE"
  | "C_TARGETED_RECOVERY"
  | "D_HIERARCHICAL_LOCAL_EXTRACTION"
  | "F_LAYERED_OUTPUT";

export type ObservationTopologyRunStatus =
  | "running"
  | "completed"
  | "completed_with_failures"
  | "aborted";

export interface ExperimentalEvidenceSpan {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ExperimentalRegion {
  regionId: string;
  order: number;
  heading: string | null;
  spanStart: number | null;
  spanEnd: number | null;
  evidence: ExperimentalEvidenceSpan[];
  boundaryConfidence: "high" | "medium" | "low";
  uncertainty: string | null;
  transitionCues: string[];
}

export interface ExperimentalObservationUnit {
  observationId: string;
  regionId: string;
  order: number;
  statement: string;
  evidence: ExperimentalEvidenceSpan[];
  uncertainty: string | null;
  source: "baseline" | "recovery" | "hierarchical" | "layered";
  recoveryProvenance?: {
    canonicalRecoveryWindowId: string | null;
    physicalGapId: string | null;
    extractionLocalRegionId: string | null;
    semanticSignature: string;
    entitySignature: string[];
    eventStateType: "event" | "state" | "unknown";
  } | null;
}

export type ExperimentalAdmissionStatus =
  | "accepted"
  | "rejected_parseable";

export type ExperimentalReconciliationStatus =
  | "retained"
  | "replaced"
  | "conflicted"
  | "discarded";

export type ExperimentalUnitOrigin =
  | "baseline"
  | "recovery"
  | "merged";

export interface ExperimentalReconciledObservationUnit extends ExperimentalObservationUnit {
  origin: ExperimentalUnitOrigin;
  admissionStatus: ExperimentalAdmissionStatus;
  reconciliationStatus: ExperimentalReconciliationStatus;
  supersededByObservationId?: string | null;
  supersedesObservationIds?: string[];
}

export interface ExperimentalRegionDecision extends ExperimentalRegion {
  origin: ExperimentalUnitOrigin | "baseline_container" | "reconstructed";
  boundarySupport: Array<
    "spatial_change"
    | "temporal_discontinuity"
    | "activity_change"
    | "entity_group_change"
    | "dream_awareness_change"
    | "uncertain_boundary"
  >;
}

export interface ExperimentalTransition {
  transitionId: string;
  fromRegionId: string | null;
  toRegionId: string | null;
  order: number;
  statement: string;
  evidence: ExperimentalEvidenceSpan[];
  uncertainty: string | null;
}

export interface ExperimentalCompletenessMetadata {
  sourceCoverageRatio: number | null;
  lateSectionRetention: {
    observed: number;
    thresholdStart: number;
    retained: boolean;
  };
  endingRetention: boolean;
  transitionCoverage: {
    total: number;
    withEvidence: number;
  };
  regionCoverage: {
    total: number;
    covered: number;
  };
  uncertaintyPreserved: boolean;
  knownIncompleteRegions: string[];
  structuralCompleteness: "complete" | "partial" | "incomplete";
}

export interface ExperimentalObservationBundle {
  kind: "layered_bundle";
  bundleId: string;
  sourceDreamHash: string;
  regions: ExperimentalRegion[];
  observations: ExperimentalObservationUnit[];
  transitions: ExperimentalTransition[];
  uncertainty: string[];
  completeness: ExperimentalCompletenessMetadata;
  provenance: {
    configurationId: ObservationTopologyConfigurationId;
    provider: string | null;
    model: string | null;
    sourceFingerprint: string;
  };
}

export type ObservationTopologyFinalRepresentation =
  | {
      kind: "scene_bundle";
      bundle: ObservationV2Bundle;
    }
  | {
      kind: "layered_bundle";
      bundle: ExperimentalObservationBundle;
    };

export interface ObservationTopologyStageRecord {
  stageId: string;
  stageType:
    | "baseline_extraction"
    | "recovery_selection"
    | "recovery_extraction"
    | "reconciliation"
    | "locality_discovery"
    | "region_extraction"
    | "assembly"
    | "transition_extraction"
    | "finalization";
  order: number;
  status: "success" | "failed" | "skipped";
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  provider: string | null;
  model: string | null;
  promptFingerprint: string | null;
  schemaFingerprint: string | null;
  diagnostics: Record<string, unknown> | null;
  artifact: Record<string, unknown> | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  };
}

export interface ObservationTopologyExecutionSummary {
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  success: boolean;
  sceneOrRegionCount: number;
  observationCount: number;
  transitionCount: number;
  evidenceSpanCoverage: number | null;
  lateSectionRetention: boolean;
  endingRetention: boolean;
  retryOrStageCount: number;
  tokenUsageTotal: number | null;
  elapsedMs: number;
  structuralCompleteness: "complete" | "partial" | "incomplete";
  artifactAvailable: boolean;
  finalStatus: "success" | "failed";
  failureReason: string | null;
  anonymizedCandidateLabel: string;
}

export interface ObservationTopologyExecutionResult {
  benchmarkId: string;
  configurationId: ObservationTopologyConfigurationId;
  repeatIndex: number;
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  success: boolean;
  provider: string | null;
  model: string | null;
  promptFingerprint: string | null;
  schemaFingerprint: string | null;
  topologyImplementationFingerprint: string;
  sourceFingerprint: string;
  stages: ObservationTopologyStageRecord[];
  attempts: ObservationExtractionAttemptEvidence[];
  descriptiveProviderEvidence?: DescriptiveExtractionProviderEvidence[];
  supplementalProviderEvidence?: Array<{
    requestId: string;
    targetId: string;
    physicalGapId?: string | null;
    providerAttemptNumber: number;
    retryParentAttemptIdentity: string | null;
    evidence: SupplementalRealizationProviderEvidence;
  }>;
  finalRepresentation: ObservationTopologyFinalRepresentation | null;
  completeness: ExperimentalCompletenessMetadata | null;
  diagnostics: Record<string, unknown>;
  artifacts?: Record<string, unknown>;
  summary: ObservationTopologyExecutionSummary;
}

export interface ObservationTopologyConfigurationDefinition {
  configurationId: ObservationTopologyConfigurationId;
  execute(input: ObservationTopologyConfigurationExecutionInput): Promise<ObservationTopologyExecutionResult>;
}

export interface ObservationTopologyConfigurationExecutionInput {
  benchmarkId: string;
  repeatIndex: number;
  dreamText: string;
  sourceFingerprint: string;
  topologyImplementationFingerprint: string;
  anonymizedCandidateLabel: string;
}
