import { compareFindings } from "@/src/cognition/observation-v3/memory-realization/canonical-ordering";
import { canonicalId } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import type {
  MemoryRealizationFinding,
  MemoryRealizationRequest,
  MemoryRealizationValidation,
  ValidationDimension,
  ValidationDimensionStatus,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

function dimension(input: {
  evidenceRef: string;
  relevant: readonly MemoryRealizationFinding[];
}): ValidationDimension {
  const blocking = input.relevant.some((finding) => finding.blocking);
  const observations = input.relevant.filter((finding) => !finding.blocking).map((finding) => finding.signalId);
  const indeterminate = input.relevant.some((finding) => finding.reasonCode.includes("indeterminate"));

  const status: ValidationDimensionStatus = indeterminate
    ? "indeterminate"
    : blocking
      ? input.relevant.some((finding) => finding.dimension === "provenance") ? "failed_governance" : "failed_candidate"
      : observations.length > 0
        ? "pass_with_observations"
        : "pass";

  return {
    status,
    evidenceRef: input.evidenceRef,
    observations,
  };
}

export function buildMemoryRealizationValidation(input: {
  request: MemoryRealizationRequest;
  findings: MemoryRealizationFinding[];
  stableOrdering: boolean;
  unitIdentitiesAvailable: boolean;
  evidenceReferencesAvailable: boolean;
  structuralConflicts: string[];
}): MemoryRealizationValidation {
  const findings = [...input.findings].sort(compareFindings);
  const byDimension = (dimensionName: MemoryRealizationFinding["dimension"]) =>
    findings.filter((finding) => finding.dimension === dimensionName);

  const schemaValidation = dimension({
    evidenceRef: "canonical-candidate",
    relevant: byDimension("schema"),
  });
  const identityValidation = dimension({
    evidenceRef: "canonical-identity-map",
    relevant: byDimension("identity"),
  });
  const orderingValidation = dimension({
    evidenceRef: "canonical-ordering",
    relevant: byDimension("ordering"),
  });
  const evidenceValidation = dimension({
    evidenceRef: "canonical-evidence",
    relevant: byDimension("evidence"),
  });
  const provenanceValidation = dimension({
    evidenceRef: "canonical-provenance",
    relevant: byDimension("provenance"),
  });
  const uncertaintyValidation = dimension({
    evidenceRef: "canonical-uncertainty",
    relevant: byDimension("uncertainty"),
  });
  const alternativeValidation = dimension({
    evidenceRef: "canonical-alternatives",
    relevant: byDimension("alternatives"),
  });

  const hasBlocking = findings.some((finding) => finding.blocking);
  const hasGovernanceBlocking = findings.some((finding) => finding.blocking && finding.dimension === "provenance");
  const hasObservations = findings.some((finding) => !finding.blocking);
  const status = hasBlocking
    ? hasGovernanceBlocking ? "invalid_governance" : "invalid_candidate"
    : hasObservations ? "valid_with_observations" : "valid";

  return {
    validationId: canonicalId("realization-validation", {
      requestId: input.request.requestId,
      composedCandidateId: input.request.composedCandidateIdentity.composedCandidateId,
      findings,
    }),
    status,
    schemaValidation,
    identityValidation,
    orderingValidation,
    evidenceValidation,
    provenanceValidation,
    uncertaintyValidation,
    alternativeValidation,
    canonicalHashStable: !hasBlocking,
    candidateHashStable: !hasBlocking,
    stableOrdering: input.stableOrdering,
    unitIdentitiesAvailable: input.unitIdentitiesAvailable,
    evidenceReferencesAvailable: input.evidenceReferencesAvailable,
    structuralConflicts: [...input.structuralConflicts],
    observations: findings.filter((finding) => !finding.blocking).map((finding) => finding.signalId),
    evidenceRef: "memory-realization",
    blockingFindings: findings.filter((finding) => finding.blocking),
    nonBlockingObservations: findings.filter((finding) => !finding.blocking),
  };
}
