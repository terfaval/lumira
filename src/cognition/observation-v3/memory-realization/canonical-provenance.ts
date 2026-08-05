import { canonicalId } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import type {
  CanonicalMemoryProvenance,
  MemoryRealizationFinding,
  MemoryRealizationRequest,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

function finding(input: MemoryRealizationFinding): MemoryRealizationFinding {
  return input;
}

export function realizeCanonicalProvenance(input: {
  request: MemoryRealizationRequest;
}): {
  provenance: CanonicalMemoryProvenance | null;
  findings: MemoryRealizationFinding[];
} {
  const findings: MemoryRealizationFinding[] = [];
  const { request } = input;
  const provenance = request.composedCandidate.provenance;

  if (!provenance.provenanceId || !provenance.baselineCandidateId || !provenance.policyFingerprint || !request.compositionResultRef) {
    findings.push(finding({
      dimension: "provenance",
      signalId: "provenance.missing_required_lineage",
      severity: "critical",
      blocking: true,
      reasonCode: "required_provenance_unavailable",
      evidenceRef: "composedCandidate.provenance",
    }));
    return {
      provenance: null,
      findings,
    };
  }

  return {
    provenance: {
      provenanceId: canonicalId("canonical-provenance", {
        sourceIdentity: request.sourceIdentity,
        composedCandidateId: request.composedCandidate.candidateId,
        compositionResultRef: request.compositionResultRef,
        realizationPolicyVersion: request.realizationPolicyVersion,
        realizationPolicyFingerprint: request.realizationPolicyFingerprint,
      }),
      sourceIdentity: request.sourceIdentity,
      primaryRealizationRefs: [provenance.baselineCandidateId],
      supplementalRealizationPackageRefs: [...provenance.supplementalPackageIds].sort(),
      compositionResultRef: request.compositionResultRef,
      composedCandidateId: request.composedCandidate.candidateId,
      realizationPolicyVersion: request.realizationPolicyVersion,
      realizationPolicyFingerprint: request.realizationPolicyFingerprint,
    },
    findings,
  };
}
