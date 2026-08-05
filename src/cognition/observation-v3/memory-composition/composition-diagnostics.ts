import type { MemoryCompositionResult } from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";

export function buildMemoryCompositionArtifacts(input: {
  result: MemoryCompositionResult;
  baselinePackage: {
    regionCount: number;
    unitCount: number;
  };
  supplementalPackage: {
    regionCount: number;
    unitCount: number;
  };
}): Record<string, unknown> {
  return {
    "composition-inputs": {
      baselineRegionCount: input.baselinePackage.regionCount,
      baselineUnitCount: input.baselinePackage.unitCount,
      supplementalRegionCount: input.supplementalPackage.regionCount,
      supplementalUnitCount: input.supplementalPackage.unitCount,
    },
    "provisional-identity-transition": {
      sourceIdentity: input.result.provisionalIdentityTransition.sourceIdentity,
      parentIdentity: input.result.provisionalIdentityTransition.parentIdentity,
      nativeIdentity: input.result.provisionalIdentityTransition.nativeIdentity,
      legacyIdentity: input.result.provisionalIdentityTransition.legacyIdentity,
      subsystemFingerprint: input.result.provisionalIdentityTransition.subsystemFingerprint,
      policyFingerprint: input.result.provisionalIdentityTransition.policyFingerprint,
      lineageRefs: input.result.provisionalIdentityTransition.lineageRefs,
      substantiveEquality: input.result.provisionalIdentityTransition.substantiveEquality,
      classification: input.result.provisionalIdentityTransition.classification,
      reasonCode: input.result.provisionalIdentityTransition.reasonCode,
      artifactRefs: input.result.provisionalIdentityTransition.artifactRefs,
    },
    "duplicate-decisions": input.result.duplicateAnalysis.duplicateResolution,
    "duplicate-analysis": {
      duplicateCandidates: input.result.duplicateAnalysis.duplicateAnalysis,
      duplicateResolution: input.result.duplicateAnalysis.duplicateResolution,
      replacementDecisions: input.result.duplicateAnalysis.replacementDecisions,
      unresolvedOverlaps: input.result.duplicateAnalysis.unresolvedOverlaps,
    },
    "coexistence-analysis": input.result.duplicateAnalysis.unresolvedOverlaps,
    "locality-decisions": input.result.locality.mergeDecisions,
    "locality-composition": {
      finalRegions: input.result.composedRegions.map((region) => ({
        regionId: region.regionId,
        order: region.order,
        origin: region.origin,
        boundarySupport: region.boundarySupport,
      })),
      overlapAnalysis: input.result.locality.overlapAnalysis,
      mergeDecisions: input.result.locality.mergeDecisions,
    },
    "chronology-composition": input.result.chronology,
    "transition-decisions": input.result.composedRegions.map((region) => ({
      regionId: region.regionId,
      transitionCues: region.transitionCues,
    })),
    "transition-composition": {
      transitionCount: input.result.composedRegions.reduce((count, region) => count + region.transitionCues.length, 0),
      localityOrder: input.result.chronology.localityOrder,
    },
    "provenance-map": input.result.composedUnits.map((unit) => ({
      observationId: unit.observationId,
      origin: unit.origin,
      supersededByObservationId: unit.supersededByObservationId ?? null,
      supersedesObservationIds: unit.supersedesObservationIds ?? [],
    })),
    "provenance-composition": input.result.composedUnits.map((unit) => ({
      observationId: unit.observationId,
      regionId: unit.regionId,
      origin: unit.origin,
      admissionStatus: unit.admissionStatus,
      recoveryWindowId: unit.recoveryProvenance?.canonicalRecoveryWindowId ?? null,
      physicalGapId: unit.recoveryProvenance?.physicalGapId ?? null,
    })),
    "composition-trace": {
      stages: [
        "baseline_intake",
        "supplemental_intake",
        "candidate_normalization",
        "duplicate_classification",
        "coexistence_analysis",
        "chronology_analysis",
        "locality_composition",
        "transition_composition",
        "provenance_propagation",
        "composition_diagnostics",
      ],
      duplicateDecisionCount: input.result.duplicateAnalysis.duplicateResolution.length,
      coexistenceObservationCount: input.result.duplicateAnalysis.unresolvedOverlaps.length,
      localityMergeCount: input.result.locality.mergeDecisions.length,
      composedRegionCount: input.result.composedRegions.length,
      composedUnitCount: input.result.composedUnits.length,
    },
    "composition-summary": {
      composedRegionCount: input.result.composedRegions.length,
      composedUnitCount: input.result.composedUnits.length,
      uncoveredPrefix: input.result.coverage.uncoveredPrefix,
      uncoveredTail: input.result.coverage.uncoveredTail,
      internalGapCount: input.result.coverage.internalGaps.length,
      duplicateResolutionCount: input.result.duplicateAnalysis.duplicateResolution.length,
      localityMergeCount: input.result.locality.mergeDecisions.length,
      finalLocalityOrderValid: input.result.chronology.finalLocalityOrderValid,
    },
  };
}
