import type {
  ExperimentalObservationUnit,
  ExperimentalReconciledObservationUnit,
  ExperimentalRegion,
  ExperimentalRegionDecision,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type {
  IdentityComparisonClassification,
  IdentitySnapshot,
} from "@/src/cognition/observation-v3/identity-comparison";

export const MEMORY_COMPOSITION_SCHEMA_VERSION = "1";
export const MEMORY_COMPOSITION_IMPLEMENTATION_VERSION = "1";

export interface SourceIdentity {
  sourceId: string;
  sourceHash: string;
  sourceLength: number;
}

export interface EvidenceReference {
  snippet: string;
  spanStart: number | null;
  spanEnd: number | null;
  contextLabel: string | null;
}

export interface ObservationOverlapClassification {
  leftObservationId: string;
  rightObservationId: string;
  classification: "distinct" | "possible_duplicate" | "confirmed_duplicate" | "partial_overlap" | "conflict";
  evidenceOverlapRatio: number;
  semanticSimilarity: number;
  entityOverlapRatio: number;
  physicalGapMatch: boolean;
  recoveryWindowMatch: boolean;
}

export interface ReconciliationReplacementDecision {
  replacedObservationId: string;
  replacementObservationId: string;
  evidenceOverlapRatio: number;
  rationale: string;
}

export interface DuplicateResolutionDecision {
  retainedObservationId: string;
  discardedObservationId: string;
  classification: "confirmed_duplicate" | "possible_duplicate" | "partial_overlap" | "conflict";
  rationale: string;
}

export interface OverlapGovernanceDecision {
  supplementalObservationId: string;
  baselineObservationIds: string[];
  overlapClassifications: Array<{
    baselineObservationId: string;
    classification: ObservationOverlapClassification["classification"];
    evidenceOverlapRatio: number;
    semanticSimilarity: number;
    entityOverlapRatio: number;
  }>;
  decision:
    | "merged_duplicate"
    | "retain_distinct"
    | "retain_as_unresolved_alternative"
    | "abstain_redundant_supplemental";
  rationale: string;
  supplementalUncertainty: string | null;
  baselineUncertainties: string[];
  independentlySurvives: boolean;
}

export interface LocalityOverlapAnalysis {
  leftRegionId: string;
  rightRegionId: string;
  classification: "duplicate_locality" | "overlapping_locality" | "adjacent_distinct_locality" | "uncertain_boundary";
  sharedObservationCount: number;
  spanOverlapRatio: number;
}

export interface LocalityMergeDecision {
  keptRegionId: string;
  mergedRegionId: string;
  rationale: string;
}

export interface SourceOrderAssemblyRecord {
  finalLocalityOrderValid: boolean;
  outOfOrderUnitCount: number;
  outOfOrderLocalityCount: number;
  repeatedSourceSpanRealizationCount: number;
  localityOrder: Array<{
    regionId: string;
    earliestStart: number | null;
    latestEnd: number | null;
    assignedOrder: number;
  }>;
}

export interface NativeCompositionLegacyResult {
  finalRegions: ExperimentalRegionDecision[];
  finalUnits: ExperimentalReconciledObservationUnit[];
  duplicateAnalysis: ObservationOverlapClassification[];
  replacementDecisions: ReconciliationReplacementDecision[];
  duplicateResolution: DuplicateResolutionDecision[];
  unresolvedOverlaps: ObservationOverlapClassification[];
  overlapGovernance: OverlapGovernanceDecision[];
  localityOverlapAnalysis: LocalityOverlapAnalysis[];
  localityMergeDecisions: LocalityMergeDecision[];
  sourceOrderAssembly: SourceOrderAssemblyRecord;
  earliestRepresentedPosition: number | null;
  latestRepresentedPosition: number | null;
  uncoveredPrefix: number;
  uncoveredTail: number;
  internalGaps: Array<{ start: number; end: number }>;
}

export interface ProvisionalRealizationPackage {
  regions: ExperimentalRegion[];
  units: Array<ExperimentalObservationUnit & Partial<Pick<ExperimentalReconciledObservationUnit, "admissionStatus">>>;
}

export interface MemoryCompositionRequest {
  dreamTextLength: number;
  sourceIdentity?: SourceIdentity;
  baselineIdentity?: IdentitySnapshot;
  supplementalIdentity?: IdentitySnapshot;
  baseline: ProvisionalRealizationPackage;
  supplemental: ProvisionalRealizationPackage;
}

export interface ComposedProvisionalMemoryCandidate {
  candidateId: string;
  sourceIdentity: SourceIdentity;
  localityRecords: readonly ComposedLocalityRecord[];
  descriptiveUnits: readonly ComposedDescriptiveUnit[];
  transitionRecords: readonly ComposedTransitionRecord[];
  unresolvedAlternatives: readonly CompositionAlternative[];
  uncertaintyNotes: readonly string[];
  provenance: MemoryCompositionProvenance;
}

export interface ComposedProvisionalMemoryCandidateIdentity {
  composedCandidateId: string;
  composedCandidateHash: string;
}

export interface ComposedLocalityRecord {
  localityId: string;
  derivedFrom: readonly string[];
  label: string | null;
  sourceStart: number | null;
  sourceEnd: number | null;
  boundaryUncertainty: string | null;
  evidenceRefs: readonly EvidenceReference[];
}

export interface ComposedDescriptiveUnit {
  unitId: string;
  derivedFrom: readonly string[];
  localityId: string | null;
  statement: string;
  evidenceRefs: readonly EvidenceReference[];
  uncertainty: string | null;
  compositionStatus: "retained" | "replaced" | "merged" | "coexisting" | "unresolved";
}

export interface ComposedTransitionRecord {
  transitionId: string;
  derivedFrom: readonly string[];
  fromLocalityId: string | null;
  toLocalityId: string | null;
  statement: string | null;
  evidenceRefs: readonly EvidenceReference[];
  uncertainty: string | null;
}

export interface CompositionAlternative {
  alternativeId: string;
  competingUnitIds: readonly string[];
  reasonCode:
    | "semantic_overlap_unresolved"
    | "locality_conflict_unresolved"
    | "chronology_conflict_unresolved"
    | "identity_conflict_unresolved";
  evidenceRefs: readonly EvidenceReference[];
}

export interface MemoryCompositionProvenance {
  provenanceId: string;
  compositionKind: "memory_composition";
  baselineCandidateId: string;
  supplementalPackageIds: readonly string[];
  policyVersion: string;
  policyFingerprint: string;
}

export interface ProvisionalIdentityTransition {
  sourceIdentity: SourceIdentity;
  parentIdentity: IdentitySnapshot;
  nativeIdentity: IdentitySnapshot;
  compatibilityIdentity: IdentitySnapshot | null;
  /**
   * Deprecated compatibility alias for preserved readers.
   */
  legacyIdentity: IdentitySnapshot | null;
  subsystemFingerprint: string;
  policyFingerprint: string;
  lineageRefs: string[];
  substantiveEquality: boolean;
  classification: IdentityComparisonClassification;
  reasonCode: string;
  artifactRefs: string[];
}

export interface MemoryCompositionDuplicateAnalysis {
  duplicateAnalysis: ObservationOverlapClassification[];
  replacementDecisions: ReconciliationReplacementDecision[];
  duplicateResolution: DuplicateResolutionDecision[];
  unresolvedOverlaps: ObservationOverlapClassification[];
  overlapGovernance: OverlapGovernanceDecision[];
}

export interface MemoryCompositionCoverage {
  earliestRepresentedPosition: number | null;
  latestRepresentedPosition: number | null;
  uncoveredPrefix: number;
  uncoveredTail: number;
  internalGaps: Array<{ start: number; end: number }>;
}

export interface MemoryCompositionResult {
  schemaVersion: string;
  implementationVersion: string;
  composedCandidateIdentity: ComposedProvisionalMemoryCandidateIdentity;
  composedCandidate: ComposedProvisionalMemoryCandidate;
  provisionalIdentityTransition: ProvisionalIdentityTransition;
  composedRegions: ExperimentalRegionDecision[];
  composedUnits: ExperimentalReconciledObservationUnit[];
  duplicateAnalysis: MemoryCompositionDuplicateAnalysis;
  locality: {
    overlapAnalysis: LocalityOverlapAnalysis[];
    mergeDecisions: LocalityMergeDecision[];
  };
  chronology: SourceOrderAssemblyRecord;
  coverage: MemoryCompositionCoverage;
  compatibilityProjection: NativeCompositionLegacyResult;
  /**
   * Deprecated compatibility alias for preserved readers.
   */
  legacyReconciliation: NativeCompositionLegacyResult;
}

export type MemoryCompositionEquivalenceClassification =
  | "equivalent"
  | "equivalent_with_representation_difference"
  | "composition_stricter"
  | "composition_more_permissive"
  | "semantically_incomparable";

export interface MemoryCompositionEquivalence {
  classification: MemoryCompositionEquivalenceClassification;
  reasons: string[];
}
