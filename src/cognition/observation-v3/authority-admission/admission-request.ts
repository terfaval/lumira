import type {
  AdmissionIdentityInputComparison,
  AdmissionRequest,
  EvidenceIntegrityAssessment,
  MemoryRealizationValidationResult,
  ObservationProvenanceManifest,
  UncertaintyPreservationAssessment,
} from "@/src/cognition/observation-v3/authority-admission/authority-admission-contract";
import { classifyIdentityComparison, type IdentitySnapshot } from "@/src/cognition/observation-v3/identity-comparison";
import type { CompletenessReport } from "@/src/cognition/observation-v3/completeness-analysis";
import type {
  CanonicalMemoryCandidate,
  MemoryRealizationResult,
} from "@/src/cognition/observation-v3/memory-realization";

interface NativeAdmissionCompletenessInput {
  status: "available" | "unavailable";
  reportId: string | null;
  report?: CompletenessReport;
}

function buildNativeProvenanceManifest(input: {
  nativeResult: MemoryRealizationResult;
}): ObservationProvenanceManifest {
  const provenance = input.nativeResult.canonicalCandidate?.provenance;
  return {
    provenanceId: provenance?.provenanceId ?? "native-provenance-unavailable",
    status: provenance ? "available" : "unavailable",
    derivationKind: provenance ? "adapter_derived" : "unavailable",
    sourceBoundaryVersion: provenance?.realizationPolicyVersion ?? null,
    provenanceTier: "system_extract",
    dreamLanguage: null,
    evidenceRef: "canonical-provenance",
  };
}

function assessEvidenceIntegrity(input: {
  candidate: CanonicalMemoryCandidate;
}): EvidenceIntegrityAssessment {
  let malformedSpanCount = 0;
  let missingSpanCount = 0;
  let outOfBoundsSpanCount = 0;
  let totalEvidenceSpanCount = 0;

  const evidenceRefs = [
    ...input.candidate.localities.flatMap((locality) => locality.evidenceRefs),
    ...input.candidate.descriptiveUnits.flatMap((unit) => unit.evidenceRefs),
    ...input.candidate.transitions.flatMap((transition) => transition.evidenceRefs),
    ...input.candidate.unresolvedAlternatives.flatMap((alternative) => alternative.evidenceRefs),
  ];

  if (evidenceRefs.length === 0) {
    missingSpanCount += 1;
  }

  for (const evidence of evidenceRefs) {
    totalEvidenceSpanCount += 1;
    if (typeof evidence.spanStart !== "number" || typeof evidence.spanEnd !== "number" || evidence.spanStart > evidence.spanEnd) {
      malformedSpanCount += 1;
      continue;
    }

    if (evidence.spanStart < 0 || evidence.spanEnd > input.candidate.sourceIdentity.sourceLength) {
      outOfBoundsSpanCount += 1;
    }
  }

  return {
    assessmentId: `evidence-${input.candidate.canonicalHash.slice(0, 16)}`,
    status: malformedSpanCount === 0 && missingSpanCount === 0 && outOfBoundsSpanCount === 0 && totalEvidenceSpanCount > 0
      ? "pass"
      : "failed",
    malformedSpanCount,
    missingSpanCount,
    outOfBoundsSpanCount,
    totalEvidenceSpanCount,
    evidenceRef: "canonicalCandidate.evidence",
    observations: [],
  };
}

function assessUncertaintyPreservation(input: {
  candidate: CanonicalMemoryCandidate;
}): UncertaintyPreservationAssessment {
  const uncertaintySignals = input.candidate.uncertaintyRecords.filter((record) => record.note || record.uncertaintyType);

  return {
    assessmentId: `uncertainty-${input.candidate.canonicalHash.slice(0, 16)}`,
    status: uncertaintySignals.length > 0
      ? "acceptable"
      : "indeterminate",
    evidenceRef: "canonicalCandidate.uncertaintyRecords",
    observations: [],
  };
}

function buildAdmissionIdentityInputComparison(input: {
  canonicalCandidate: CanonicalMemoryCandidate;
  nativeResult: MemoryRealizationResult;
  compatibilityIdentity?: IdentitySnapshot | null;
}): AdmissionIdentityInputComparison {
  const nativeIdentity = {
    candidateId: input.canonicalCandidate.canonicalCandidateId,
    candidateHash: input.canonicalCandidate.canonicalHash,
  };
  const comparison = classifyIdentityComparison({
    legacyIdentity: input.compatibilityIdentity ?? null,
    nativeIdentity,
    substantiveEquality: true,
    lineagePreserved: true,
    deterministic: input.nativeResult.validation.candidateHashStable && input.nativeResult.validation.stableOrdering,
  });

  return {
    sourceIdentity: input.canonicalCandidate.sourceIdentity,
    parentIdentity: {
      candidateId: input.canonicalCandidate.composedCandidateIdentity.composedCandidateId,
      candidateHash: input.canonicalCandidate.composedCandidateIdentity.composedCandidateHash,
    },
    nativeIdentity,
    compatibilityIdentity: input.compatibilityIdentity ?? null,
    legacyIdentity: input.compatibilityIdentity ?? null,
    subsystemFingerprint: input.nativeResult.contractFingerprint,
    policyFingerprint: input.nativeResult.realizationPolicyFingerprint,
    lineageRefs: [
      input.canonicalCandidate.composedCandidateIdentity.composedCandidateId,
      input.canonicalCandidate.provenance.provenanceId,
    ],
    substantiveEquality: true,
    classification: comparison.classification,
    reasonCode: comparison.reasonCode,
    artifactRefs: [
      "canonical-memory-candidate",
      "memory-realization-validation",
      "canonical-identity-transition.json",
    ],
  };
}

function buildNativeRealizationValidationSummary(input: {
  nativeResult: MemoryRealizationResult;
}): MemoryRealizationValidationResult {
  const validation = input.nativeResult.validation;
  return {
    validationId: validation.validationId,
    status: validation.status === "valid" || validation.status === "valid_with_observations"
      ? "pass"
      : validation.status === "indeterminate"
        ? "unavailable"
        : "failed",
    candidateHashStable: validation.candidateHashStable,
    stableOrdering: validation.stableOrdering,
    unitIdentitiesAvailable: validation.unitIdentitiesAvailable,
    evidenceReferencesAvailable: validation.evidenceReferencesAvailable,
    structuralConflicts: validation.structuralConflicts,
    observations: validation.observations,
    evidenceRef: validation.evidenceRef,
  };
}

export function buildNativeAdmissionRequest(input: {
  nativeResult: MemoryRealizationResult;
  completeness: NativeAdmissionCompletenessInput;
  compatibilityIdentity?: IdentitySnapshot | null;
}): AdmissionRequest | null {
  const canonicalCandidate = input.nativeResult.canonicalCandidate;
  if (!canonicalCandidate) {
    return null;
  }

  return {
    sourceIdentity: {
      sourceId: canonicalCandidate.sourceIdentity.sourceId,
      sourceHash: canonicalCandidate.sourceIdentity.sourceHash,
      sourceLength: canonicalCandidate.sourceIdentity.sourceLength,
    },
    canonicalCandidate,
    provenanceManifest: buildNativeProvenanceManifest({
      nativeResult: input.nativeResult,
    }),
    completeness: input.completeness.status === "available"
      ? {
          status: "available",
          reportId: input.completeness.reportId!,
          report: input.completeness.report!,
        }
      : {
          status: "unavailable",
          reportId: null,
          reason: "completeness_input_unavailable",
          evidenceRef: "completeness-report.json",
        },
    memoryRealizationValidation: buildNativeRealizationValidationSummary({
      nativeResult: input.nativeResult,
    }),
    evidenceIntegrity: assessEvidenceIntegrity({
      candidate: canonicalCandidate,
    }),
    uncertaintyPreservation: assessUncertaintyPreservation({
      candidate: canonicalCandidate,
    }),
    admissionIdentityInputComparison: buildAdmissionIdentityInputComparison({
      canonicalCandidate,
      nativeResult: input.nativeResult,
      compatibilityIdentity: input.compatibilityIdentity ?? null,
    }),
    governanceObservations: [],
    contractFingerprint: "shadow-authority-admission-contract-v1",
  };
}

export function buildNativeShadowAdmissionRequest(input: {
  nativeResult: MemoryRealizationResult;
  completeness: NativeAdmissionCompletenessInput;
  legacyIdentity?: IdentitySnapshot | null;
}): AdmissionRequest | null {
  return buildNativeAdmissionRequest({
    nativeResult: input.nativeResult,
    completeness: input.completeness,
    compatibilityIdentity: input.legacyIdentity ?? null,
  });
}
