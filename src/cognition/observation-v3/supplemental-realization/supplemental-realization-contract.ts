import type {
  ExperimentalObservationUnit,
  ExperimentalRegion,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { CompletenessReport, PhysicalGap } from "@/src/cognition/observation-v3/completeness-analysis";
import type { SupplementalRealizationProviderEvidence } from "@/src/cognition/observation-v3/provider-evidence";

export const SUPPLEMENTAL_REALIZATION_SCHEMA_VERSION = "1";
export const SUPPLEMENTAL_REALIZATION_IMPLEMENTATION_VERSION = "1";
export const SUPPLEMENTAL_REALIZATION_MODEL = "gpt-4.1-mini";
export const SUPPLEMENTAL_REALIZATION_TIMEOUT_MS = 180_000;
export const SUPPLEMENTAL_REALIZATION_SCHEMA_NAME = "lumira_targeted_recovery_region_extraction_v2";

export interface SupplementalBaselineCandidate {
  candidateId: string;
  candidateHash: string;
  regions: ExperimentalRegion[];
  units: ExperimentalObservationUnit[];
}

export interface PlannedSupplementalGap {
  targetId: string;
  physicalGapId: string;
  kind: PhysicalGap["kind"];
  sourceStart: number;
  sourceEnd: number;
  contextStart: number;
  contextEnd: number;
  includesEnding: boolean;
  neighboringEvidence: PhysicalGap["neighboringEvidence"];
  reasons: PhysicalGap["reasons"];
  confidence: PhysicalGap["confidence"];
  wholeSourceForbidden: true;
}

export interface SupplementalRealizationRequest {
  requestId: string;
  sourceHash: string;
  primaryCandidateId: string;
  primaryCandidateHash: string;
  completenessReportId: string;
  policyVersion: string;
  policyFingerprint: string;
  selectedGaps: PlannedSupplementalGap[];
}

export interface PlannedSupplementalRealization {
  request: SupplementalRealizationRequest;
  selectedGaps: PlannedSupplementalGap[];
  realizationContext: PlannedSupplementalGap[];
}

export interface StructuredSupplementalRegionOutput {
  regionId: string;
  heading: string | null;
  spanStart: number;
  spanEnd: number;
  boundaryUncertainty: string | null;
  transitionCues: string[];
  observations: Array<{
    observationId: string;
    statement: string;
    uncertainty: string | null;
    evidence: Array<Record<string, unknown>>;
  }>;
}

export interface StructuredSupplementalOutput {
  regions?: StructuredSupplementalRegionOutput[];
}

export interface SupplementalPackageProvenance {
  provenanceId: string;
  requestId: string;
  physicalGapId: string;
  completenessReportId: string;
  policyVersion: string;
  policyFingerprint: string;
}

export interface SupplementalRealizationPackage {
  packageId: string;
  requestId: string;
  physicalGapId: string;
  regions: ExperimentalRegion[];
  observations: ExperimentalObservationUnit[];
  provenance: SupplementalPackageProvenance;
}

export interface SupplementalRealizationExecutionResponse {
  outputText: string | null;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  tokenUsage: {
    input: number | null;
    output: number | null;
    total: number | null;
  };
}

export interface SupplementalRealizationRunResult {
  disposition: "completed" | "completed_with_observations" | "abstained_not_justified" | "indeterminate";
  packages: SupplementalRealizationPackage[];
  diagnostics: {
    requestCount: number;
    targetCount: number;
    packageCount: number;
    realizedRegionCount: number;
    realizedObservationCount: number;
    abstainedTargetCount: number;
  };
  execution: Array<{
    targetId: string;
    packageId: string | null;
    providerStatus: string | null;
    providerIncompleteReason: string | null;
    tokenUsage: {
      input: number | null;
      output: number | null;
      total: number | null;
    };
    structured: StructuredSupplementalOutput;
  }>;
}

export interface SupplementalRealizationShadowRun {
  plan: PlannedSupplementalRealization;
  result: SupplementalRealizationRunResult;
}

export type SupplementalRealizationEquivalenceClassification =
  | "equivalent"
  | "equivalent_with_representation_difference"
  | "realization_stricter"
  | "realization_more_permissive"
  | "semantically_incomparable";

export interface SupplementalRealizationEquivalence {
  classification: SupplementalRealizationEquivalenceClassification;
  reasons: string[];
}

export interface SupplementalRealizationShadowInput {
  sourceText: string;
  sourceIdentity?: string;
  completeness: CompletenessReport;
  baseline: SupplementalBaselineCandidate;
  contextPadding: number;
  maximumWindowLength: number;
  onProviderEvidence?: (evidence: SupplementalRealizationProviderEvidence) => void | Promise<void>;
  executeStructuredRealization?: (input: {
    prompt: string;
    schema: Record<string, unknown>;
    schemaName: string;
    timeoutMs: number;
    model: string;
    target: PlannedSupplementalGap;
  }) => Promise<SupplementalRealizationExecutionResponse>;
}
