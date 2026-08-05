import type {
  CanonicalAlternative,
  CanonicalLocality,
  CanonicalTransition,
  CanonicalUncertaintyRecord,
  MemoryRealizationFinding,
} from "@/src/cognition/observation-v3/memory-realization/memory-realization-contract";

function numericOrMax(value: number | null | undefined): number {
  return typeof value === "number" ? value : Number.MAX_SAFE_INTEGER;
}

export function compareLocalities(left: { sourceStart: number | null; sourceEnd: number | null; label: string | null; canonicalLocalityId: string }, right: { sourceStart: number | null; sourceEnd: number | null; label: string | null; canonicalLocalityId: string }): number {
  return numericOrMax(left.sourceStart) - numericOrMax(right.sourceStart)
    || numericOrMax(left.sourceEnd) - numericOrMax(right.sourceEnd)
    || (left.label ?? "").localeCompare(right.label ?? "")
    || left.canonicalLocalityId.localeCompare(right.canonicalLocalityId);
}

export function compareUnits(left: { localityId: string | null; order: number; canonicalUnitId: string; evidenceRefs: ReadonlyArray<{ spanStart: number | null; spanEnd: number | null }> }, right: { localityId: string | null; order: number; canonicalUnitId: string; evidenceRefs: ReadonlyArray<{ spanStart: number | null; spanEnd: number | null }> }): number {
  const leftStart = numericOrMax(left.evidenceRefs[0]?.spanStart);
  const rightStart = numericOrMax(right.evidenceRefs[0]?.spanStart);
  const leftEnd = numericOrMax(left.evidenceRefs[0]?.spanEnd);
  const rightEnd = numericOrMax(right.evidenceRefs[0]?.spanEnd);

  return leftStart - rightStart
    || leftEnd - rightEnd
    || (left.localityId ?? "").localeCompare(right.localityId ?? "")
    || left.order - right.order
    || left.canonicalUnitId.localeCompare(right.canonicalUnitId);
}

export function compareTransitions(left: CanonicalTransition, right: CanonicalTransition): number {
  const leftStart = numericOrMax(left.evidenceRefs[0]?.spanStart);
  const rightStart = numericOrMax(right.evidenceRefs[0]?.spanStart);

  return leftStart - rightStart
    || (left.fromLocalityId ?? "").localeCompare(right.fromLocalityId ?? "")
    || (left.toLocalityId ?? "").localeCompare(right.toLocalityId ?? "")
    || left.order - right.order
    || left.canonicalTransitionId.localeCompare(right.canonicalTransitionId);
}

export function compareAlternatives(left: CanonicalAlternative, right: CanonicalAlternative): number {
  return left.reasonCode.localeCompare(right.reasonCode)
    || left.canonicalAlternativeId.localeCompare(right.canonicalAlternativeId);
}

export function compareUncertainty(left: CanonicalUncertaintyRecord, right: CanonicalUncertaintyRecord): number {
  return left.subjectType.localeCompare(right.subjectType)
    || (left.subjectId ?? "").localeCompare(right.subjectId ?? "")
    || left.uncertaintyType.localeCompare(right.uncertaintyType)
    || (left.note ?? "").localeCompare(right.note ?? "")
    || left.canonicalUncertaintyId.localeCompare(right.canonicalUncertaintyId);
}

const SEVERITY_RANK: Record<MemoryRealizationFinding["severity"], number> = {
  critical: 0,
  major: 1,
  moderate: 2,
  minor: 3,
  info: 4,
};

export function compareFindings(left: MemoryRealizationFinding, right: MemoryRealizationFinding): number {
  return Number(right.blocking) - Number(left.blocking)
    || SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    || left.dimension.localeCompare(right.dimension)
    || left.signalId.localeCompare(right.signalId)
    || left.reasonCode.localeCompare(right.reasonCode);
}

export function orderLocalities(localities: CanonicalLocality[]): CanonicalLocality[] {
  return [...localities].sort(compareLocalities).map((locality, index) => ({ ...locality, order: index }));
}

export function orderAlternatives(alternatives: CanonicalAlternative[]): CanonicalAlternative[] {
  return [...alternatives].sort(compareAlternatives);
}

export function orderUncertainty(records: CanonicalUncertaintyRecord[]): CanonicalUncertaintyRecord[] {
  return [...records].sort(compareUncertainty);
}
