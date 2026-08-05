import { canonicalId } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import { canonicalizeEvidenceReferences } from "@/src/cognition/observation-v3/memory-realization/canonical-evidence";
import type {
  CanonicalAlternative,
  MemoryRealizationFinding,
  MemoryRealizationRequest,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

function finding(input: MemoryRealizationFinding): MemoryRealizationFinding {
  return input;
}

export function realizeCanonicalAlternatives(input: {
  request: MemoryRealizationRequest;
  canonicalUnitIdsBySourceUnitId: Map<string, string>;
}): {
  alternatives: CanonicalAlternative[];
  findings: MemoryRealizationFinding[];
} {
  const findings: MemoryRealizationFinding[] = [];
  const alternatives: CanonicalAlternative[] = [];

  for (const alternative of input.request.composedCandidate.unresolvedAlternatives) {
    const competingCanonicalUnitIds = alternative.competingUnitIds
      .map((unitId) => input.canonicalUnitIdsBySourceUnitId.get(unitId))
      .filter((unitId): unitId is string => typeof unitId === "string");

    if (competingCanonicalUnitIds.length !== alternative.competingUnitIds.length) {
      findings.push(finding({
        dimension: "alternatives",
        signalId: `${alternative.alternativeId}.invalid_unit_reference`,
        severity: "critical",
        blocking: true,
        reasonCode: "alternative_reference_missing",
        evidenceRef: "composedCandidate.unresolvedAlternatives",
      }));
      continue;
    }

    const canonicalizedEvidence = canonicalizeEvidenceReferences({
      evidenceRefs: alternative.evidenceRefs,
      sourceIdentity: input.request.sourceIdentity,
      evidenceRefPrefix: `alternative:${alternative.alternativeId}.evidence`,
      required: false,
    });
    findings.push(...canonicalizedEvidence.findings);

    alternatives.push({
      canonicalAlternativeId: canonicalId("alternative", {
        competingCanonicalUnitIds,
        reasonCode: alternative.reasonCode,
      }),
      competingCanonicalUnitIds: [...competingCanonicalUnitIds].sort(),
      reasonCode: alternative.reasonCode,
      evidenceRefs: canonicalizedEvidence.evidenceRefs,
    });

    findings.push(finding({
      dimension: "alternatives",
      signalId: `${alternative.alternativeId}.preserved_unresolved_alternative`,
      severity: "info",
      blocking: false,
      reasonCode: "alternative_preserved",
      evidenceRef: "canonical-alternatives",
    }));
  }

  return {
    alternatives,
    findings,
  };
}
