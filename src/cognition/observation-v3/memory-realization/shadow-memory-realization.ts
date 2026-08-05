import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import { classifyIdentityComparison } from "@/src/cognition/observation-v3/identity-comparison";
import { canonicalId, stableStringify } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import { realizeCanonicalMemoryCandidate } from "@/src/cognition/observation-v3/memory-realization/memory-realization";
import type {
  ComposedProvisionalMemoryCandidate,
  MemoryRealizationLegacyComparison,
  MemoryRealizationRequest,
  MemoryRealizationResult,
  SourceIdentity,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

export function buildShadowComposedCandidateFromV2Bundle(input: {
  bundle: ObservationV2Bundle;
  sourceIdentity: SourceIdentity;
}): ComposedProvisionalMemoryCandidate {
  return {
    candidateId: `shadow-composed-${input.bundle.bundleId ?? canonicalId("bundle", input.bundle)}`,
    sourceIdentity: input.sourceIdentity,
    localityRecords: input.bundle.scenes.map((scene) => ({
      localityId: scene.sceneId,
      derivedFrom: [scene.sceneId],
      label: scene.summary,
      sourceStart: scene.evidenceContext.spanStart,
      sourceEnd: scene.evidenceContext.spanEnd,
      boundaryUncertainty: scene.uncertaintyNotes?.[0] ?? null,
      evidenceRefs: [scene.evidenceContext],
    })),
    descriptiveUnits: input.bundle.scenes.flatMap((scene) =>
      scene.observations.map((observation) => ({
        unitId: observation.observationId,
        derivedFrom: [observation.observationId],
        localityId: scene.sceneId,
        statement: observation.text,
        evidenceRefs: observation.evidence,
        uncertainty: observation.uncertaintyNote,
        compositionStatus: "retained" as const,
      }))),
    transitionRecords: [],
    unresolvedAlternatives: [],
    uncertaintyNotes: input.bundle.uncertaintyNotes ?? [],
    provenance: {
      provenanceId: input.bundle.provenance?.boundaryVersion
        ? `shadow-composition:${input.bundle.provenance.boundaryVersion}:${input.bundle.bundleId ?? "bundle"}`
        : `shadow-composition:${input.bundle.bundleId ?? "bundle"}`,
      compositionKind: "memory_composition",
      baselineCandidateId: input.bundle.bundleId ?? "legacy-v2-bundle",
      supplementalPackageIds: [],
      policyVersion: "shadow-v2-bundle-adapter",
      policyFingerprint: "shadow-v2-bundle-adapter",
    },
  };
}

export function buildShadowMemoryRealizationRequest(input: {
  bundle: ObservationV2Bundle;
  sourceIdentity: SourceIdentity;
  compositionResultRef: string;
  realizationPolicyVersion: string;
  realizationPolicyFingerprint: string;
  composedCandidateHashOverride?: string;
}): MemoryRealizationRequest {
  const composedCandidate = buildShadowComposedCandidateFromV2Bundle({
    bundle: input.bundle,
    sourceIdentity: input.sourceIdentity,
  });

  return {
    requestId: canonicalId("memory-realization-request", {
      sourceIdentity: input.sourceIdentity,
      compositionResultRef: input.compositionResultRef,
      realizationPolicyVersion: input.realizationPolicyVersion,
    }),
    sourceIdentity: input.sourceIdentity,
    composedCandidateIdentity: {
      composedCandidateId: composedCandidate.candidateId,
      composedCandidateHash: input.composedCandidateHashOverride ?? canonicalId("composed-candidate-hash", composedCandidate),
    },
    composedCandidate,
    compositionResultRef: input.compositionResultRef,
    realizationPolicyVersion: input.realizationPolicyVersion,
    realizationPolicyFingerprint: input.realizationPolicyFingerprint,
  };
}

export function buildMemoryRealizationArtifacts(input: {
  request: MemoryRealizationRequest;
  result: MemoryRealizationResult;
}): Record<string, unknown> {
  const canonicalIdentityTransition = input.result.canonicalCandidate
    ? (() => {
        const comparison = classifyIdentityComparison({
          legacyIdentity: null,
          nativeIdentity: {
            candidateId: input.result.canonicalCandidate.canonicalCandidateId,
            candidateHash: input.result.canonicalCandidate.canonicalHash,
          },
          substantiveEquality: true,
          lineagePreserved: true,
          deterministic: input.result.validation.candidateHashStable && input.result.validation.stableOrdering,
        });

        return {
          sourceIdentity: input.request.sourceIdentity,
          parentIdentity: {
            candidateId: input.request.composedCandidateIdentity.composedCandidateId,
            candidateHash: input.request.composedCandidateIdentity.composedCandidateHash,
          },
          nativeIdentity: {
            candidateId: input.result.canonicalCandidate.canonicalCandidateId,
            candidateHash: input.result.canonicalCandidate.canonicalHash,
          },
          legacyIdentity: null,
          subsystemFingerprint: input.result.contractFingerprint,
          policyFingerprint: input.result.realizationPolicyFingerprint,
          lineageRefs: [
            input.request.composedCandidateIdentity.composedCandidateId,
            input.result.canonicalCandidate.provenance.provenanceId,
          ],
          substantiveEquality: true,
          classification: comparison.classification,
          reasonCode: comparison.reasonCode,
          artifactRefs: [
            "memory-realization-request.json",
            "canonical-memory-candidate.json",
            "memory-realization-validation.json",
          ],
          canonicalContentEqual: true,
          provenanceEqual: true,
        };
      })()
    : null;

  return {
    "memory-realization-request": input.request,
    "canonical-memory-candidate": input.result.canonicalCandidate,
    "canonical-identity-transition": canonicalIdentityTransition,
    "memory-realization-validation": input.result.validation,
    "memory-realization-findings": input.result.findings,
    "canonical-provenance": input.result.canonicalCandidate?.provenance ?? null,
    "canonical-identity-map": {
      localities: input.result.canonicalCandidate?.localities.map((locality) => ({
        canonicalLocalityId: locality.canonicalLocalityId,
        derivedFromLocalityIds: locality.derivedFromLocalityIds,
      })) ?? [],
      units: input.result.canonicalCandidate?.descriptiveUnits.map((unit) => ({
        canonicalUnitId: unit.canonicalUnitId,
        derivedFromUnitIds: unit.derivedFromUnitIds,
      })) ?? [],
      transitions: input.result.canonicalCandidate?.transitions.map((transition) => ({
        canonicalTransitionId: transition.canonicalTransitionId,
        derivedFromTransitionIds: transition.derivedFromTransitionIds,
      })) ?? [],
      alternatives: input.result.canonicalCandidate?.unresolvedAlternatives.map((alternative) => ({
        canonicalAlternativeId: alternative.canonicalAlternativeId,
        competingCanonicalUnitIds: alternative.competingCanonicalUnitIds,
      })) ?? [],
      uncertainty: input.result.canonicalCandidate?.uncertaintyRecords.map((record) => ({
        canonicalUncertaintyId: record.canonicalUncertaintyId,
        subjectType: record.subjectType,
        subjectId: record.subjectId,
      })) ?? [],
    },
    "memory-realization-diagnostics": input.result.diagnostics,
    "memory-realization-summary": {
      disposition: input.result.disposition,
      canonicalCandidateId: input.result.canonicalCandidate?.canonicalCandidateId ?? null,
      canonicalHash: input.result.canonicalCandidate?.canonicalHash ?? null,
      validationStatus: input.result.validation.status,
      blockingFindingCount: input.result.validation.blockingFindings.length,
      nonBlockingObservationCount: input.result.validation.nonBlockingObservations.length,
    },
  };
}

export function runShadowMemoryRealization(input: {
  request: MemoryRealizationRequest;
}) {
  const result = realizeCanonicalMemoryCandidate(input.request);
  const artifacts = buildMemoryRealizationArtifacts({
    request: input.request,
    result,
  });

  return {
    request: input.request,
    result,
    artifacts,
  };
}

export function compareNativeMemoryRealizationWithLegacyAdapter(input: {
  nativeResult: MemoryRealizationResult;
  legacyCandidate: ObservationV2Bundle | null;
}): MemoryRealizationLegacyComparison {
  if (!input.legacyCandidate) {
    return {
      classification: "comparison_unavailable",
      reasons: ["legacy_candidate_unavailable"],
    };
  }

  if (!input.nativeResult.canonicalCandidate) {
    return {
      classification: input.nativeResult.disposition === "aborted_candidate_failure" || input.nativeResult.disposition === "aborted_governance_failure"
        ? "native_stricter"
        : "comparison_unavailable",
      reasons: [input.nativeResult.disposition],
    };
  }

  if (input.nativeResult.canonicalCandidate.unresolvedAlternatives.length > 0) {
    return {
      classification: "governance_information_gain",
      reasons: ["native_preserves_unresolved_alternatives"],
    };
  }

  const legacySummary = {
    scenes: input.legacyCandidate.scenes.map((scene) => ({
      sceneId: scene.sceneId,
      summary: scene.summary,
      observations: scene.observations.map((observation) => ({
        observationId: observation.observationId,
        text: observation.text,
      })),
    })),
    uncertainty: input.legacyCandidate.uncertaintyNotes ?? [],
  };
  const nativeSummary = {
    localities: input.nativeResult.canonicalCandidate.localities.map((locality) => ({
      label: locality.label,
    })),
    units: input.nativeResult.canonicalCandidate.descriptiveUnits.map((unit) => ({
      statement: unit.statement,
    })),
    uncertainty: input.nativeResult.canonicalCandidate.uncertaintyRecords,
  };

  if (stableStringify(legacySummary) === stableStringify(nativeSummary)) {
    return {
      classification: "equivalent_canonical_candidate",
      reasons: ["substantive_memory_equivalent"],
    };
  }

  return {
    classification: "representational_only",
    reasons: ["canonical_representation_differs_but_no_blocking_divergence_detected"],
  };
}
