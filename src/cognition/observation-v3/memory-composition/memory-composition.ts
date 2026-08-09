import type {
  ComposedDescriptiveUnit,
  ComposedProvisionalMemoryCandidate,
  ComposedProvisionalMemoryCandidateIdentity,
  ComposedTransitionRecord,
  MemoryCompositionEquivalence,
  MemoryCompositionRequest,
  MemoryCompositionResult,
  SourceIdentity,
} from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";
import {
  MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
  MEMORY_COMPOSITION_SCHEMA_VERSION,
} from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";
import { stableStringify } from "@/src/cognition/observation-v3/memory-composition/composition-fingerprint";
import { classifyIdentityComparison, sha256Hex } from "@/src/cognition/observation-v3/identity-comparison";
import {
  classifyCompositionOverlaps,
  classifyObservationOverlap,
  composeMemoryLocalities,
  composeNativeMemoryPackages,
  normalizeCompositionRequest,
  orderComposedRegions,
} from "@/src/cognition/observation-v3/memory-composition/native-composition-engine";

export {
  classifyCompositionOverlaps,
  classifyObservationOverlap,
  composeMemoryLocalities,
  normalizeCompositionRequest,
  orderComposedRegions,
};

function createSourceIdentity(request: MemoryCompositionRequest): SourceIdentity {
  if (request.sourceIdentity) {
    return request.sourceIdentity;
  }

  const fallbackBasis = {
    dreamTextLength: request.dreamTextLength,
    baselineRegionIds: request.baseline.regions.map((region) => region.regionId),
    baselineObservationIds: request.baseline.units.map((unit) => unit.observationId),
    supplementalRegionIds: request.supplemental.regions.map((region) => region.regionId),
    supplementalObservationIds: request.supplemental.units.map((unit) => unit.observationId),
  };
  const sourceHash = sha256Hex(fallbackBasis);
  return {
    sourceId: `source-${sourceHash.slice(0, 16)}`,
    sourceHash,
    sourceLength: request.dreamTextLength,
  };
}

function buildComposedCandidateIdentity(
  candidate: ComposedProvisionalMemoryCandidate,
): ComposedProvisionalMemoryCandidateIdentity {
  const composedCandidateHash = sha256Hex({
    sourceIdentity: candidate.sourceIdentity,
    localityRecords: candidate.localityRecords,
    descriptiveUnits: candidate.descriptiveUnits,
    transitionRecords: candidate.transitionRecords,
    unresolvedAlternatives: candidate.unresolvedAlternatives,
    uncertaintyNotes: candidate.uncertaintyNotes,
    provenance: candidate.provenance,
  });

  return {
    composedCandidateId: `composed-${composedCandidateHash.slice(0, 16)}`,
    composedCandidateHash,
  };
}

function buildLegacyProvisionalIdentity(input: {
  request: MemoryCompositionRequest;
  result: ReturnType<typeof composeNativeMemoryPackages>;
}): { candidateId: string; candidateHash: string } {
  const candidateHash = sha256Hex({
    baselineIdentity: input.request.baselineIdentity ?? null,
    supplementalIdentity: input.request.supplementalIdentity ?? null,
    legacyReconciliation: input.result,
  });

  return {
    candidateId: `legacy-provisional-${candidateHash.slice(0, 16)}`,
    candidateHash,
  };
}

function buildComposedCandidate(input: {
  request: MemoryCompositionRequest;
  result: ReturnType<typeof composeNativeMemoryPackages>;
  sourceIdentity: SourceIdentity;
}): ComposedProvisionalMemoryCandidate {
  const localityRecords = input.result.finalRegions.map((region) => ({
    localityId: region.regionId,
    derivedFrom: [region.regionId],
    label: region.heading ?? null,
    sourceStart: region.spanStart,
    sourceEnd: region.spanEnd,
    boundaryUncertainty: region.uncertainty,
    evidenceRefs: region.evidence,
  }));

  const descriptiveUnits: ComposedDescriptiveUnit[] = input.result.finalUnits.map((unit) => ({
    unitId: unit.observationId,
    derivedFrom: [
      unit.observationId,
      ...(unit.supersedesObservationIds ?? []),
    ].sort(),
    localityId: unit.regionId,
    statement: unit.statement,
    evidenceRefs: unit.evidence,
    uncertainty: unit.uncertainty,
    compositionStatus: unit.reconciliationStatus === "replaced"
      ? "replaced"
      : unit.reconciliationStatus === "discarded"
        ? "merged"
        : unit.reconciliationStatus === "conflicted"
          ? "unresolved"
          : "retained",
  }));

  const transitionRecords: ComposedTransitionRecord[] = [];
  const unresolvedAlternatives = input.result.unresolvedOverlaps.map((overlap, index) => ({
    alternativeId: `alternative-${index + 1}-${overlap.leftObservationId}-${overlap.rightObservationId}`,
    competingUnitIds: [overlap.leftObservationId, overlap.rightObservationId].sort(),
    reasonCode: "semantic_overlap_unresolved" as const,
    evidenceRefs: [],
  }));
  const uncertaintyNotes = [
    ...input.result.finalRegions.flatMap((region) => region.uncertainty ? [region.uncertainty] : []),
    ...input.result.finalUnits.flatMap((unit) => unit.uncertainty ? [unit.uncertainty] : []),
  ];

  const baselineCandidateId = input.request.baselineIdentity?.candidateId
    ?? `baseline-${sha256Hex({
      regionIds: input.request.baseline.regions.map((region) => region.regionId),
      observationIds: input.request.baseline.units.map((unit) => unit.observationId),
    }).slice(0, 16)}`;
  const supplementalPackageIds = input.request.supplementalIdentity?.candidateId
    ? [input.request.supplementalIdentity.candidateId]
    : input.request.supplemental.regions.length > 0 || input.request.supplemental.units.length > 0
      ? [`supplemental-${sha256Hex({
        regionIds: input.request.supplemental.regions.map((region) => region.regionId),
        observationIds: input.request.supplemental.units.map((unit) => unit.observationId),
      }).slice(0, 16)}`]
      : [];

  const provenance = {
    provenanceId: `composition-provenance-${sha256Hex({
      baselineCandidateId,
      supplementalPackageIds,
    }).slice(0, 16)}`,
    compositionKind: "memory_composition" as const,
    baselineCandidateId,
    supplementalPackageIds,
    policyVersion: MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
    policyFingerprint: MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
  };

  const candidateBase: ComposedProvisionalMemoryCandidate = {
    candidateId: "pending-composed-candidate-id",
    sourceIdentity: input.sourceIdentity,
    localityRecords,
    descriptiveUnits,
    transitionRecords,
    unresolvedAlternatives,
    uncertaintyNotes,
    provenance,
  };
  const identity = buildComposedCandidateIdentity(candidateBase);

  return {
    ...candidateBase,
    candidateId: identity.composedCandidateId,
  };
}

export function composeMemoryPackages(request: MemoryCompositionRequest): MemoryCompositionResult {
  const nativeComposition = composeNativeMemoryPackages(request);
  const sourceIdentity = createSourceIdentity(request);
  const composedCandidate = buildComposedCandidate({
    request,
    result: nativeComposition,
    sourceIdentity,
  });
  const composedCandidateIdentity = buildComposedCandidateIdentity(composedCandidate);
  const legacyIdentity = buildLegacyProvisionalIdentity({
    request,
    result: nativeComposition,
  });
  const identityComparison = classifyIdentityComparison({
    legacyIdentity,
    nativeIdentity: {
      candidateId: composedCandidateIdentity.composedCandidateId,
      candidateHash: composedCandidateIdentity.composedCandidateHash,
    },
    substantiveEquality: true,
    lineagePreserved: true,
    deterministic: true,
  });
  const parentIdentity = request.baselineIdentity ?? {
    candidateId: composedCandidate.provenance.baselineCandidateId,
    candidateHash: sha256Hex(request.baseline),
  };

  return {
    schemaVersion: MEMORY_COMPOSITION_SCHEMA_VERSION,
    implementationVersion: MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
    composedCandidateIdentity,
    composedCandidate,
    provisionalIdentityTransition: {
      sourceIdentity,
      parentIdentity,
      nativeIdentity: {
        candidateId: composedCandidateIdentity.composedCandidateId,
        candidateHash: composedCandidateIdentity.composedCandidateHash,
      },
      legacyIdentity,
      subsystemFingerprint: MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
      policyFingerprint: MEMORY_COMPOSITION_IMPLEMENTATION_VERSION,
      lineageRefs: [
        composedCandidate.provenance.baselineCandidateId,
        ...composedCandidate.provenance.supplementalPackageIds,
      ],
      substantiveEquality: true,
      classification: identityComparison.classification,
      reasonCode: identityComparison.reasonCode,
      artifactRefs: ["composition-summary", "provenance-map"],
    },
    composedRegions: nativeComposition.finalRegions,
    composedUnits: nativeComposition.finalUnits,
    duplicateAnalysis: {
      duplicateAnalysis: nativeComposition.duplicateAnalysis,
      replacementDecisions: nativeComposition.replacementDecisions,
      duplicateResolution: nativeComposition.duplicateResolution,
      unresolvedOverlaps: nativeComposition.unresolvedOverlaps,
      overlapGovernance: nativeComposition.overlapGovernance,
    },
    locality: {
      overlapAnalysis: nativeComposition.localityOverlapAnalysis,
      mergeDecisions: nativeComposition.localityMergeDecisions,
    },
    chronology: nativeComposition.sourceOrderAssembly,
    coverage: {
      earliestRepresentedPosition: nativeComposition.earliestRepresentedPosition,
      latestRepresentedPosition: nativeComposition.latestRepresentedPosition,
      uncoveredPrefix: nativeComposition.uncoveredPrefix,
      uncoveredTail: nativeComposition.uncoveredTail,
      internalGaps: nativeComposition.internalGaps,
    },
    legacyReconciliation: nativeComposition,
  };
}

export function compareMemoryCompositionOutputs(input: {
  experimental: MemoryCompositionResult["legacyReconciliation"];
  composition: MemoryCompositionResult;
}): MemoryCompositionEquivalence {
  const comparableExperimental = {
    finalRegions: input.experimental.finalRegions,
    finalUnits: input.experimental.finalUnits,
    duplicateAnalysis: input.experimental.duplicateAnalysis,
    replacementDecisions: input.experimental.replacementDecisions,
    duplicateResolution: input.experimental.duplicateResolution,
    unresolvedOverlaps: input.experimental.unresolvedOverlaps,
    localityOverlapAnalysis: input.experimental.localityOverlapAnalysis,
    localityMergeDecisions: input.experimental.localityMergeDecisions,
    sourceOrderAssembly: input.experimental.sourceOrderAssembly,
    earliestRepresentedPosition: input.experimental.earliestRepresentedPosition,
    latestRepresentedPosition: input.experimental.latestRepresentedPosition,
    uncoveredPrefix: input.experimental.uncoveredPrefix,
    uncoveredTail: input.experimental.uncoveredTail,
    internalGaps: input.experimental.internalGaps,
  };
  const comparableComposition = {
    finalRegions: input.composition.composedRegions,
    finalUnits: input.composition.composedUnits,
    duplicateAnalysis: input.composition.duplicateAnalysis.duplicateAnalysis,
    replacementDecisions: input.composition.duplicateAnalysis.replacementDecisions,
    duplicateResolution: input.composition.duplicateAnalysis.duplicateResolution,
    unresolvedOverlaps: input.composition.duplicateAnalysis.unresolvedOverlaps,
    localityOverlapAnalysis: input.composition.locality.overlapAnalysis,
    localityMergeDecisions: input.composition.locality.mergeDecisions,
    sourceOrderAssembly: input.composition.chronology,
    earliestRepresentedPosition: input.composition.coverage.earliestRepresentedPosition,
    latestRepresentedPosition: input.composition.coverage.latestRepresentedPosition,
    uncoveredPrefix: input.composition.coverage.uncoveredPrefix,
    uncoveredTail: input.composition.coverage.uncoveredTail,
    internalGaps: input.composition.coverage.internalGaps,
  };

  if (stableStringify(comparableExperimental) === stableStringify(comparableComposition)) {
    return {
      classification: "equivalent",
      reasons: ["identical_composed_representation"],
    };
  }

  return {
    classification: "equivalent_with_representation_difference",
    reasons: ["substantive_representation_difference_detected"],
  };
}
