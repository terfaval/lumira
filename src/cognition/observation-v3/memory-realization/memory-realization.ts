import { canonicalizeEvidenceReferences } from "@/src/cognition/observation-v3/memory-realization/canonical-evidence";
import { canonicalId, sha256Hex, stableStringify } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import { realizeCanonicalAlternatives } from "@/src/cognition/observation-v3/memory-realization/canonical-alternatives";
import { orderAlternatives, orderLocalities, orderUncertainty, compareTransitions, compareUnits, compareFindings } from "@/src/cognition/observation-v3/memory-realization/canonical-ordering";
import { realizeCanonicalProvenance } from "@/src/cognition/observation-v3/memory-realization/canonical-provenance";
import { realizeCanonicalUncertainty } from "@/src/cognition/observation-v3/memory-realization/canonical-uncertainty";
import { buildMemoryRealizationValidation } from "@/src/cognition/observation-v3/memory-realization/memory-realization-validation";
import {
  MEMORY_REALIZATION_CONTRACT_VERSION,
  type CanonicalDescriptiveUnit,
  type CanonicalLocality,
  type CanonicalMemoryCandidate,
  type CanonicalTransition,
  type MemoryRealizationDiagnostics,
  type MemoryRealizationFailure,
  type MemoryRealizationFinding,
  type MemoryRealizationRequest,
  type MemoryRealizationResult,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

function finding(input: MemoryRealizationFinding): MemoryRealizationFinding {
  return input;
}

function failure(code: MemoryRealizationFailure["code"], message: string, evidenceRef: string | null): MemoryRealizationFailure {
  return { code, message, evidenceRef };
}

export function realizeCanonicalMemoryCandidate(
  request: MemoryRealizationRequest,
): MemoryRealizationResult {
  const findings: MemoryRealizationFinding[] = [];
  const failures: MemoryRealizationFailure[] = [];
  const structuralConflicts: string[] = [];

  if (!request.realizationPolicyFingerprint || !request.realizationPolicyVersion) {
    failures.push(failure("policy_unavailable", "memory_realization_policy_unavailable", "request.policy"));
  }
  if (!request.sourceIdentity.sourceHash || request.sourceIdentity.sourceLength <= 0) {
    failures.push(failure("provenance_unavailable", "source_identity_unavailable", "request.sourceIdentity"));
  }
  if (!request.composedCandidate || !request.composedCandidate.candidateId) {
    failures.push(failure("candidate_unavailable", "composed_candidate_unavailable", "request.composedCandidate"));
  }

  if (failures.length > 0) {
    const validation = buildMemoryRealizationValidation({
      request,
      findings: [
        ...findings,
        ...failures.map((entry) => finding({
          dimension: entry.code === "provenance_unavailable" ? "provenance" : "schema",
          signalId: entry.code,
          severity: "critical",
          blocking: true,
          reasonCode: entry.code,
          evidenceRef: entry.evidenceRef ?? "memory-realization",
        })),
      ],
      stableOrdering: false,
      unitIdentitiesAvailable: false,
      evidenceReferencesAvailable: false,
      structuralConflicts,
    });

    return {
      disposition: failures.some((entry) => entry.code === "provenance_unavailable" || entry.code === "policy_unavailable")
        ? "aborted_governance_failure"
        : "aborted_candidate_failure",
      canonicalCandidate: null,
      validation,
      findings: [...validation.blockingFindings, ...validation.nonBlockingObservations],
      diagnostics: {
        localityCount: 0,
        unitCount: 0,
        transitionCount: 0,
        alternativeCount: 0,
        uncertaintyCount: 0,
        evidenceRefCount: 0,
        normalizedOrderingApplied: false,
      },
      failures,
      realizationPolicyVersion: request.realizationPolicyVersion,
      realizationPolicyFingerprint: request.realizationPolicyFingerprint,
      contractFingerprint: MEMORY_REALIZATION_CONTRACT_VERSION,
    };
  }

  const sourceLocalityIds = new Set<string>();
  const canonicalLocalities: CanonicalLocality[] = [];
  for (const locality of request.composedCandidate.localityRecords) {
    if (sourceLocalityIds.has(locality.localityId)) {
      structuralConflicts.push(`duplicate_locality_id:${locality.localityId}`);
      findings.push(finding({
        dimension: "identity",
        signalId: `locality.${locality.localityId}.duplicate_source_id`,
        severity: "critical",
        blocking: true,
        reasonCode: "duplicate_locality_identity",
        evidenceRef: "composedCandidate.localityRecords",
      }));
      continue;
    }
    sourceLocalityIds.add(locality.localityId);
    const canonicalizedEvidence = canonicalizeEvidenceReferences({
      evidenceRefs: locality.evidenceRefs,
      sourceIdentity: request.sourceIdentity,
      evidenceRefPrefix: `locality:${locality.localityId}.evidence`,
      required: false,
    });
    findings.push(...canonicalizedEvidence.findings);
    canonicalLocalities.push({
      canonicalLocalityId: canonicalId("locality", {
        derivedFrom: [...locality.derivedFrom].sort(),
        label: locality.label,
        sourceStart: locality.sourceStart,
        sourceEnd: locality.sourceEnd,
      }),
      derivedFromLocalityIds: [...locality.derivedFrom].sort(),
      order: 0,
      label: locality.label,
      sourceStart: locality.sourceStart,
      sourceEnd: locality.sourceEnd,
      boundaryUncertainty: locality.boundaryUncertainty,
      evidenceRefs: canonicalizedEvidence.evidenceRefs,
    });
  }

  const orderedLocalities = orderLocalities(canonicalLocalities);
  const canonicalLocalityBySourceId = new Map(
    request.composedCandidate.localityRecords.map((locality, index) => [locality.localityId, orderedLocalities[index]?.canonicalLocalityId ?? null] as const),
  );

  const canonicalUnits: CanonicalDescriptiveUnit[] = [];
  const sourceUnitIds = new Set<string>();
  const canonicalUnitIds = new Set<string>();
  const canonicalUnitIdsBySourceUnitId = new Map<string, string>();
  for (const unit of request.composedCandidate.descriptiveUnits) {
    if (sourceUnitIds.has(unit.unitId)) {
      structuralConflicts.push(`duplicate_unit_id:${unit.unitId}`);
      findings.push(finding({
        dimension: "identity",
        signalId: `unit.${unit.unitId}.duplicate_source_id`,
        severity: "critical",
        blocking: true,
        reasonCode: "duplicate_unit_identity",
        evidenceRef: "composedCandidate.descriptiveUnits",
      }));
      continue;
    }
    sourceUnitIds.add(unit.unitId);
    if (unit.localityId && !canonicalLocalityBySourceId.get(unit.localityId)) {
      structuralConflicts.push(`missing_locality_reference:${unit.unitId}`);
      findings.push(finding({
        dimension: "schema",
        signalId: `unit.${unit.unitId}.missing_locality_reference`,
        severity: "critical",
        blocking: true,
        reasonCode: "locality_reference_missing",
        evidenceRef: "composedCandidate.descriptiveUnits",
      }));
      continue;
    }

    const canonicalizedEvidence = canonicalizeEvidenceReferences({
      evidenceRefs: unit.evidenceRefs,
      sourceIdentity: request.sourceIdentity,
      evidenceRefPrefix: `unit:${unit.unitId}.evidence`,
      required: true,
    });
    findings.push(...canonicalizedEvidence.findings);

    const canonicalUnitId = canonicalId("unit", {
      localityId: unit.localityId,
      statement: unit.statement,
      derivedFrom: [...unit.derivedFrom].sort(),
      evidence: canonicalizedEvidence.evidenceRefs,
    });
    if (canonicalUnitIds.has(canonicalUnitId)) {
      structuralConflicts.push(`duplicate_canonical_unit_id:${canonicalUnitId}`);
      findings.push(finding({
        dimension: "identity",
        signalId: `unit.${unit.unitId}.canonical_collision`,
        severity: "critical",
        blocking: true,
        reasonCode: "duplicate_canonical_identity",
        evidenceRef: "canonical-identity-map",
      }));
      continue;
    }
    canonicalUnitIds.add(canonicalUnitId);
    canonicalUnitIdsBySourceUnitId.set(unit.unitId, canonicalUnitId);
    canonicalUnits.push({
      canonicalUnitId,
      derivedFromUnitIds: [...unit.derivedFrom].sort(),
      localityId: unit.localityId ? canonicalLocalityBySourceId.get(unit.localityId) ?? null : null,
      order: unit.evidenceRefs[0]?.spanStart ?? 0,
      statement: unit.statement,
      evidenceRefs: canonicalizedEvidence.evidenceRefs,
      uncertainty: unit.uncertainty,
    });
  }

  const orderedUnits = [...canonicalUnits].sort(compareUnits).map((unit, index) => ({ ...unit, order: index }));

  const canonicalTransitions: CanonicalTransition[] = [];
  const canonicalTransitionIds = new Set<string>();
  for (const transition of request.composedCandidate.transitionRecords) {
    if (transition.fromLocalityId && !canonicalLocalityBySourceId.get(transition.fromLocalityId)
      || transition.toLocalityId && !canonicalLocalityBySourceId.get(transition.toLocalityId)) {
      structuralConflicts.push(`missing_transition_locality:${transition.transitionId}`);
      findings.push(finding({
        dimension: "schema",
        signalId: `transition.${transition.transitionId}.missing_locality_reference`,
        severity: "critical",
        blocking: true,
        reasonCode: "transition_locality_reference_missing",
        evidenceRef: "composedCandidate.transitionRecords",
      }));
      continue;
    }
    const canonicalizedEvidence = canonicalizeEvidenceReferences({
      evidenceRefs: transition.evidenceRefs,
      sourceIdentity: request.sourceIdentity,
      evidenceRefPrefix: `transition:${transition.transitionId}.evidence`,
      required: false,
    });
    findings.push(...canonicalizedEvidence.findings);
    const canonicalTransitionId = canonicalId("transition", {
      fromLocalityId: transition.fromLocalityId,
      toLocalityId: transition.toLocalityId,
      statement: transition.statement,
      derivedFrom: [...transition.derivedFrom].sort(),
      evidence: canonicalizedEvidence.evidenceRefs,
    });
    if (canonicalTransitionIds.has(canonicalTransitionId)) {
      structuralConflicts.push(`duplicate_canonical_transition_id:${canonicalTransitionId}`);
      findings.push(finding({
        dimension: "identity",
        signalId: `transition.${transition.transitionId}.canonical_collision`,
        severity: "critical",
        blocking: true,
        reasonCode: "duplicate_canonical_identity",
        evidenceRef: "canonical-identity-map",
      }));
      continue;
    }
    canonicalTransitionIds.add(canonicalTransitionId);
    canonicalTransitions.push({
      canonicalTransitionId,
      derivedFromTransitionIds: [...transition.derivedFrom].sort(),
      fromLocalityId: transition.fromLocalityId ? canonicalLocalityBySourceId.get(transition.fromLocalityId) ?? null : null,
      toLocalityId: transition.toLocalityId ? canonicalLocalityBySourceId.get(transition.toLocalityId) ?? null : null,
      order: transition.evidenceRefs[0]?.spanStart ?? 0,
      statement: transition.statement,
      evidenceRefs: canonicalizedEvidence.evidenceRefs,
      uncertainty: transition.uncertainty,
    });
  }
  const orderedTransitions = [...canonicalTransitions].sort(compareTransitions).map((transition, index) => ({ ...transition, order: index }));

  const canonicalAlternativeResult = realizeCanonicalAlternatives({
    request,
    canonicalUnitIdsBySourceUnitId,
  });
  findings.push(...canonicalAlternativeResult.findings);
  const orderedAlternatives = orderAlternatives(canonicalAlternativeResult.alternatives);

  const provenanceResult = realizeCanonicalProvenance({ request });
  findings.push(...provenanceResult.findings);

  const uncertaintyRecords = orderUncertainty(realizeCanonicalUncertainty({
    bundleNotes: request.composedCandidate.uncertaintyNotes,
    localities: orderedLocalities,
    units: orderedUnits,
    transitions: orderedTransitions,
    alternatives: orderedAlternatives,
  }));

  const validation = buildMemoryRealizationValidation({
    request,
    findings,
    stableOrdering: true,
    unitIdentitiesAvailable: structuralConflicts.length === 0,
    evidenceReferencesAvailable: !findings.some((entry) => entry.dimension === "evidence" && entry.blocking),
    structuralConflicts,
  });

  const diagnostics: MemoryRealizationDiagnostics = {
    localityCount: orderedLocalities.length,
    unitCount: orderedUnits.length,
    transitionCount: orderedTransitions.length,
    alternativeCount: orderedAlternatives.length,
    uncertaintyCount: uncertaintyRecords.length,
    evidenceRefCount:
      orderedLocalities.reduce((count, locality) => count + locality.evidenceRefs.length, 0)
      + orderedUnits.reduce((count, unit) => count + unit.evidenceRefs.length, 0)
      + orderedTransitions.reduce((count, transition) => count + transition.evidenceRefs.length, 0),
    normalizedOrderingApplied: true,
  };

  if (validation.status === "invalid_candidate" || validation.status === "invalid_governance") {
    failures.push(
      ...validation.blockingFindings.map((entry) => failure(
        entry.dimension === "provenance" ? "provenance_unavailable" : entry.dimension === "evidence" ? "evidence_invalid" : "candidate_structurally_invalid",
        entry.reasonCode,
        entry.evidenceRef,
      )),
    );

    return {
      disposition: validation.status === "invalid_governance" ? "aborted_governance_failure" : "aborted_candidate_failure",
      canonicalCandidate: null,
      validation,
      findings: [...validation.blockingFindings, ...validation.nonBlockingObservations].sort(compareFindings),
      diagnostics,
      failures,
      realizationPolicyVersion: request.realizationPolicyVersion,
      realizationPolicyFingerprint: request.realizationPolicyFingerprint,
      contractFingerprint: MEMORY_REALIZATION_CONTRACT_VERSION,
    };
  }

  const canonicalCandidateBase = {
    canonicalCandidateId: canonicalId("canonical-candidate", {
      sourceIdentity: request.sourceIdentity,
      composedCandidateIdentity: request.composedCandidateIdentity,
      localities: orderedLocalities,
      descriptiveUnits: orderedUnits,
      transitions: orderedTransitions,
      unresolvedAlternatives: orderedAlternatives,
      uncertaintyRecords,
      provenance: provenanceResult.provenance,
    }),
    sourceIdentity: request.sourceIdentity,
    composedCandidateIdentity: request.composedCandidateIdentity,
    localities: orderedLocalities,
    descriptiveUnits: orderedUnits,
    transitions: orderedTransitions,
    unresolvedAlternatives: orderedAlternatives,
    uncertaintyRecords,
    provenance: provenanceResult.provenance!,
  };
  const canonicalHash = sha256Hex(stableStringify(canonicalCandidateBase));
  const canonicalCandidate: CanonicalMemoryCandidate = {
    ...canonicalCandidateBase,
    canonicalHash,
  };

  return {
    disposition: validation.status === "valid_with_observations" ? "realized_with_observations" : "realized",
    canonicalCandidate,
    validation: {
      ...validation,
      canonicalHashStable: true,
      candidateHashStable: true,
    },
    findings: [...validation.blockingFindings, ...validation.nonBlockingObservations].sort(compareFindings),
    diagnostics,
    failures,
    realizationPolicyVersion: request.realizationPolicyVersion,
    realizationPolicyFingerprint: request.realizationPolicyFingerprint,
    contractFingerprint: MEMORY_REALIZATION_CONTRACT_VERSION,
  };
}
