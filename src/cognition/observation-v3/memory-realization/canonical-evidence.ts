import { canonicalId } from "@/src/cognition/observation-v3/memory-realization/canonical-identity";
import type {
  CanonicalEvidenceReference,
  EvidenceReference,
  MemoryRealizationFinding,
  SourceIdentity,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

export interface CanonicalizedEvidenceResult {
  evidenceRefs: CanonicalEvidenceReference[];
  findings: MemoryRealizationFinding[];
}

function finding(input: MemoryRealizationFinding): MemoryRealizationFinding {
  return input;
}

export function canonicalizeEvidenceReferences(input: {
  evidenceRefs: readonly EvidenceReference[];
  sourceIdentity: SourceIdentity;
  evidenceRefPrefix: string;
  required: boolean;
}): CanonicalizedEvidenceResult {
  const findings: MemoryRealizationFinding[] = [];
  const evidenceRefs: CanonicalEvidenceReference[] = [];

  if (input.evidenceRefs.length === 0) {
    if (input.required) {
      findings.push(finding({
        dimension: "evidence",
        signalId: `${input.evidenceRefPrefix}.missing_required_evidence`,
        severity: "critical",
        blocking: true,
        reasonCode: "required_evidence_missing",
        evidenceRef: input.evidenceRefPrefix,
      }));
    }
    return { evidenceRefs, findings };
  }

  for (const [index, evidence] of input.evidenceRefs.entries()) {
    const evidenceRef = `${input.evidenceRefPrefix}[${index}]`;
    if (
      typeof evidence.spanStart === "number"
      && typeof evidence.spanEnd === "number"
      && evidence.spanStart > evidence.spanEnd
    ) {
      findings.push(finding({
        dimension: "evidence",
        signalId: `${evidenceRef}.reversed_span`,
        severity: "critical",
        blocking: true,
        reasonCode: "evidence_span_reversed",
        evidenceRef,
      }));
      continue;
    }

    if (
      typeof evidence.spanStart === "number"
      && evidence.spanStart < 0
      || typeof evidence.spanEnd === "number"
      && evidence.spanEnd > input.sourceIdentity.sourceLength
    ) {
      findings.push(finding({
        dimension: "evidence",
        signalId: `${evidenceRef}.out_of_bounds`,
        severity: "critical",
        blocking: true,
        reasonCode: "evidence_span_out_of_bounds",
        evidenceRef,
      }));
      continue;
    }

    if (typeof evidence.spanStart !== "number" || typeof evidence.spanEnd !== "number") {
      findings.push(finding({
        dimension: "evidence",
        signalId: `${evidenceRef}.null_span`,
        severity: input.required ? "critical" : "minor",
        blocking: input.required,
        reasonCode: input.required ? "required_evidence_unavailable" : "evidence_span_unavailable_non_blocking",
        evidenceRef,
      }));
      if (input.required) {
        continue;
      }
    }

    evidenceRefs.push({
      evidenceId: canonicalId("evidence", {
        sourceHash: input.sourceIdentity.sourceHash,
        snippet: evidence.snippet,
        spanStart: evidence.spanStart,
        spanEnd: evidence.spanEnd,
        contextLabel: evidence.contextLabel,
      }),
      sourceHash: input.sourceIdentity.sourceHash,
      snippet: evidence.snippet,
      spanStart: evidence.spanStart,
      spanEnd: evidence.spanEnd,
      contextLabel: evidence.contextLabel,
    });
  }

  return {
    evidenceRefs: evidenceRefs.sort((left, right) =>
      (left.spanStart ?? Number.MAX_SAFE_INTEGER) - (right.spanStart ?? Number.MAX_SAFE_INTEGER)
      || (left.spanEnd ?? Number.MAX_SAFE_INTEGER) - (right.spanEnd ?? Number.MAX_SAFE_INTEGER)
      || left.evidenceId.localeCompare(right.evidenceId)),
    findings,
  };
}
