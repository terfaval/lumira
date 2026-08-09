import type {
  ExperimentalEvidenceSpan,
  ExperimentalObservationUnit,
  ExperimentalReconciledObservationUnit,
  ExperimentalRegion,
  ExperimentalRegionDecision,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type {
  DuplicateResolutionDecision,
  LocalityMergeDecision,
  LocalityOverlapAnalysis,
  MemoryCompositionRequest,
  NativeCompositionLegacyResult,
  ObservationOverlapClassification,
  OverlapGovernanceDecision,
  ReconciliationReplacementDecision,
  SourceOrderAssemblyRecord,
} from "@/src/cognition/observation-v3/memory-composition/memory-composition-contract";

export interface NormalizedCompositionRequest {
  dreamTextLength: number;
  baselineRegions: ExperimentalRegion[];
  supplementalRegions: ExperimentalRegion[];
  baselineUnits: ExperimentalReconciledObservationUnit[];
  supplementalUnits: ExperimentalReconciledObservationUnit[];
  allUnits: ExperimentalReconciledObservationUnit[];
}

export interface DuplicateAndCoexistenceStage {
  duplicateAnalysis: ObservationOverlapClassification[];
  replacementDecisions: ReconciliationReplacementDecision[];
  duplicateResolution: DuplicateResolutionDecision[];
  unresolvedOverlaps: ObservationOverlapClassification[];
  overlapGovernance: OverlapGovernanceDecision[];
  retainedUnits: ExperimentalReconciledObservationUnit[];
}

export interface LocalityCompositionStage {
  regions: ExperimentalRegionDecision[];
  units: ExperimentalReconciledObservationUnit[];
  overlapAnalysis: LocalityOverlapAnalysis[];
  mergeDecisions: LocalityMergeDecision[];
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mark}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildSemanticSignature(statement: string): string {
  return normalizeText(statement);
}

function buildEntitySignature(statement: string): string[] {
  return uniqueSorted(tokenize(statement).filter((token) => token.length >= 4));
}

function inferEventStateType(statement: string): "event" | "state" | "unknown" {
  const normalized = normalizeText(statement);
  if (/\b(meghal|kel|megy|jon|fut|keres|lat|fel[ae]bred|mond|kiab[ae]l|siet|elvesz[iy]t|talalkoz)\b/.test(normalized)) {
    return "event";
  }
  if (/\b(vagyok|van|volt|tun|erzem|szennyezett|szomoru|egett|eloltottak)\b/.test(normalized)) {
    return "state";
  }
  return "unknown";
}

function evidenceRange(unit: { evidence: ExperimentalEvidenceSpan[] }): { start: number | null; end: number | null } {
  const starts = unit.evidence
    .map((entry) => entry.spanStart)
    .filter((value): value is number => typeof value === "number");
  const ends = unit.evidence
    .map((entry) => entry.spanEnd)
    .filter((value): value is number => typeof value === "number");

  return {
    start: starts.length > 0 ? Math.min(...starts) : null,
    end: ends.length > 0 ? Math.max(...ends) : null,
  };
}

function computeEvidenceOverlapRatio(
  left: { start: number | null; end: number | null },
  right: { start: number | null; end: number | null },
): number {
  if (left.start === null || left.end === null || right.start === null || right.end === null) {
    return 0;
  }

  const overlapStart = Math.max(left.start, right.start);
  const overlapEnd = Math.min(left.end, right.end);
  if (overlapEnd <= overlapStart) {
    return 0;
  }

  const leftLength = Math.max(1, left.end - left.start);
  const rightLength = Math.max(1, right.end - right.start);
  return (overlapEnd - overlapStart) / Math.min(leftLength, rightLength);
}

function computeSemanticSimilarity(leftText: string, rightText: string): number {
  const left = new Set(tokenize(leftText));
  const right = new Set(tokenize(rightText));
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function computeEntityOverlap(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = [...leftSet].filter((token) => rightSet.has(token)).length;
  return intersection / Math.min(leftSet.size, rightSet.size);
}

function uncertaintyStrength(value: string | null | undefined): number {
  const normalized = normalizeText(value ?? "");
  if (!normalized) {
    return 0;
  }
  if (/\b(low|slight|minor|minimal|small)\b/.test(normalized)) {
    return 1;
  }
  if (/\b(high|severe|strong|major|very)\b/.test(normalized)) {
    return 3;
  }
  return 2;
}

function computeSemanticNovelty(statement: string, supportingStatements: string[]): number {
  const supplementalTokens = new Set(tokenize(statement));
  if (supplementalTokens.size === 0) {
    return 0;
  }

  const supportingTokens = new Set(supportingStatements.flatMap((entry) => tokenize(entry)));
  const novelTokens = [...supplementalTokens].filter((token) => !supportingTokens.has(token)).length;
  return novelTokens / supplementalTokens.size;
}

function toComparableUnit(
  unit: ExperimentalObservationUnit & Partial<Pick<
    ExperimentalReconciledObservationUnit,
    "origin" | "admissionStatus" | "reconciliationStatus" | "supersededByObservationId" | "supersedesObservationIds"
  >>,
): ExperimentalReconciledObservationUnit {
  return {
    ...unit,
    recoveryProvenance: unit.recoveryProvenance ?? {
      canonicalRecoveryWindowId: null,
      physicalGapId: null,
      extractionLocalRegionId: null,
      semanticSignature: buildSemanticSignature(unit.statement),
      entitySignature: buildEntitySignature(unit.statement),
      eventStateType: inferEventStateType(unit.statement),
    },
    origin: unit.origin ?? (unit.source === "recovery" ? "recovery" : "baseline"),
    admissionStatus: unit.admissionStatus ?? "accepted",
    reconciliationStatus: unit.reconciliationStatus ?? "retained",
    supersededByObservationId: unit.supersededByObservationId ?? null,
    supersedesObservationIds: unit.supersedesObservationIds ?? [],
  };
}

function unitEarliestStart(unit: { evidence: ExperimentalEvidenceSpan[] }): number {
  return evidenceRange(unit).start ?? Number.MAX_SAFE_INTEGER;
}

function unitLatestEnd(unit: { evidence: ExperimentalEvidenceSpan[] }): number {
  return evidenceRange(unit).end ?? Number.MAX_SAFE_INTEGER;
}

function rangesAreNear(
  left: { start: number | null; end: number | null },
  right: { start: number | null; end: number | null },
  padding: number,
): boolean {
  if (left.start === null || left.end === null || right.start === null || right.end === null) {
    return false;
  }

  return right.start <= left.end + padding && right.end >= left.start - padding;
}

function sortUnitsByEvidence<T extends { observationId?: string; order: number; evidence: ExperimentalEvidenceSpan[] }>(units: T[]): T[] {
  return [...units].sort((left, right) => {
    const leftStart = unitEarliestStart(left);
    const rightStart = unitEarliestStart(right);
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }
    const leftEnd = unitLatestEnd(left);
    const rightEnd = unitLatestEnd(right);
    if (leftEnd !== rightEnd) {
      return leftEnd - rightEnd;
    }
    if (left.order !== right.order) {
      return left.order - right.order;
    }
    return (left.observationId ?? "").localeCompare(right.observationId ?? "");
  });
}

function findInternalGaps(units: ExperimentalReconciledObservationUnit[]): Array<{ start: number; end: number }> {
  const ordered = sortUnitsByEvidence(units);
  const gaps: Array<{ start: number; end: number }> = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const current = evidenceRange(ordered[index]!);
    const next = evidenceRange(ordered[index + 1]!);
    if (current.end === null || next.start === null) {
      continue;
    }
    if (next.start - current.end >= 200) {
      gaps.push({ start: current.end, end: next.start });
    }
  }
  return gaps;
}

function classifyRegionBoundarySupport(region: ExperimentalRegion): ExperimentalRegionDecision["boundarySupport"] {
  if ((region.transitionCues ?? []).some((cue) => /dream|lucid|awareness/i.test(cue))) {
    return ["dream_awareness_change"];
  }
  if ((region.transitionCues ?? []).length > 0) {
    return ["activity_change"];
  }
  return ["uncertain_boundary"];
}

function regionEvidenceBounds(region: ExperimentalRegionDecision, units: ExperimentalReconciledObservationUnit[]): { start: number | null; end: number | null } {
  const regionUnits = units.filter((unit) => unit.regionId === region.regionId);
  if (regionUnits.length === 0) {
    return { start: region.spanStart, end: region.spanEnd };
  }

  const starts = regionUnits
    .map((unit) => evidenceRange(unit).start)
    .filter((value): value is number => typeof value === "number");
  const ends = regionUnits
    .map((unit) => evidenceRange(unit).end)
    .filter((value): value is number => typeof value === "number");

  return {
    start: starts.length > 0 ? Math.min(...starts) : region.spanStart,
    end: ends.length > 0 ? Math.max(...ends) : region.spanEnd,
  };
}

function regionSignature(units: ExperimentalReconciledObservationUnit[]): string[] {
  return uniqueSorted(units.map((unit) => unit.recoveryProvenance?.semanticSignature ?? buildSemanticSignature(unit.statement)));
}

function repeatedSourceSpanRealizationCount(units: ExperimentalReconciledObservationUnit[]): number {
  const counts = new Map<string, number>();
  for (const unit of units) {
    const range = evidenceRange(unit);
    const key = `${range.start ?? "null"}:${range.end ?? "null"}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
}

function regionOriginPriority(region: ExperimentalRegionDecision): number {
  if (region.origin === "baseline_container") {
    return 0;
  }
  if (region.origin === "reconstructed") {
    return 1;
  }
  return 2;
}

export function classifyObservationOverlap(
  left: ExperimentalObservationUnit,
  right: ExperimentalObservationUnit,
): ObservationOverlapClassification {
  const leftRange = evidenceRange(left);
  const rightRange = evidenceRange(right);
  const overlapRatio = computeEvidenceOverlapRatio(leftRange, rightRange);
  const semanticSimilarity = computeSemanticSimilarity(left.statement, right.statement);
  const leftNormalized = normalizeText(left.statement);
  const rightNormalized = normalizeText(right.statement);
  const leftEntities = left.recoveryProvenance?.entitySignature ?? buildEntitySignature(left.statement);
  const rightEntities = right.recoveryProvenance?.entitySignature ?? buildEntitySignature(right.statement);
  const entityOverlapRatio = computeEntityOverlap(leftEntities, rightEntities);
  const physicalGapMatch = Boolean(
    left.recoveryProvenance?.physicalGapId &&
    right.recoveryProvenance?.physicalGapId &&
    left.recoveryProvenance.physicalGapId === right.recoveryProvenance.physicalGapId,
  );
  const recoveryWindowMatch = Boolean(
    left.recoveryProvenance?.canonicalRecoveryWindowId &&
    right.recoveryProvenance?.canonicalRecoveryWindowId &&
    left.recoveryProvenance.canonicalRecoveryWindowId === right.recoveryProvenance.canonicalRecoveryWindowId,
  );
  const normalizedEquality = leftNormalized === rightNormalized;
  const containmentText = leftNormalized.includes(rightNormalized) || rightNormalized.includes(leftNormalized);

  let classification: ObservationOverlapClassification["classification"] = "distinct";

  if (
    overlapRatio >= 0.5 &&
    entityOverlapRatio >= 0.5 &&
    semanticSimilarity <= 0.34 &&
    !containmentText
  ) {
    classification = "conflict";
  } else if (
    normalizedEquality ||
    ((recoveryWindowMatch || physicalGapMatch) && overlapRatio >= 0.5 && (semanticSimilarity >= 0.6 || entityOverlapRatio >= 0.8 || containmentText)) ||
    (semanticSimilarity >= 0.9 && overlapRatio >= 0.5) ||
    (containmentText && overlapRatio >= 0.75)
  ) {
    classification = "confirmed_duplicate";
  } else if (overlapRatio > 0) {
    classification = "partial_overlap";
  } else if (
    overlapRatio >= 0.05 &&
    (semanticSimilarity >= 0.45 || entityOverlapRatio >= 0.6 || physicalGapMatch)
  ) {
    classification = "possible_duplicate";
  }

  return {
    leftObservationId: left.observationId,
    rightObservationId: right.observationId,
    classification,
    evidenceOverlapRatio: overlapRatio,
    semanticSimilarity,
    entityOverlapRatio,
    physicalGapMatch,
    recoveryWindowMatch,
  };
}

function chooseRetainedUnit(
  left: ExperimentalReconciledObservationUnit,
  right: ExperimentalReconciledObservationUnit,
): ExperimentalReconciledObservationUnit {
  if (left.origin !== right.origin) {
    if (left.origin === "baseline") {
      return left;
    }
    if (right.origin === "baseline") {
      return right;
    }
  }

  const acceptedDelta = Number(left.admissionStatus === "accepted") - Number(right.admissionStatus === "accepted");
  if (acceptedDelta !== 0) {
    return acceptedDelta > 0 ? left : right;
  }

  const sameCanonicalWindow = Boolean(
    left.recoveryProvenance?.canonicalRecoveryWindowId &&
    right.recoveryProvenance?.canonicalRecoveryWindowId &&
    left.recoveryProvenance.canonicalRecoveryWindowId === right.recoveryProvenance.canonicalRecoveryWindowId,
  );
  const samePhysicalGap = Boolean(
    left.recoveryProvenance?.physicalGapId &&
    right.recoveryProvenance?.physicalGapId &&
    left.recoveryProvenance.physicalGapId === right.recoveryProvenance.physicalGapId,
  );
  if (left.origin === "recovery" && right.origin === "recovery" && sameCanonicalWindow && samePhysicalGap) {
    return left.observationId.localeCompare(right.observationId) <= 0 ? left : right;
  }

  const leftRange = evidenceRange(left);
  const rightRange = evidenceRange(right);
  const leftSpanLength = leftRange.start === null || leftRange.end === null ? Number.MAX_SAFE_INTEGER : leftRange.end - leftRange.start;
  const rightSpanLength = rightRange.start === null || rightRange.end === null ? Number.MAX_SAFE_INTEGER : rightRange.end - rightRange.start;
  if (leftSpanLength !== rightSpanLength) {
    return leftSpanLength < rightSpanLength ? left : right;
  }

  const leftNormalized = normalizeText(left.statement);
  const rightNormalized = normalizeText(right.statement);
  if (leftNormalized.includes(rightNormalized) && leftNormalized.length !== rightNormalized.length) {
    return leftNormalized.length <= rightNormalized.length * 2 ? left : right;
  }
  if (rightNormalized.includes(leftNormalized) && leftNormalized.length !== rightNormalized.length) {
    return rightNormalized.length <= leftNormalized.length * 2 ? right : left;
  }

  if (left.statement.length !== right.statement.length) {
    return left.statement.length > right.statement.length ? left : right;
  }

  return left.observationId.localeCompare(right.observationId) <= 0 ? left : right;
}

function buildDuplicateResolutionRationale(
  retained: ExperimentalReconciledObservationUnit,
  discarded: ExperimentalReconciledObservationUnit,
  classification: ObservationOverlapClassification,
): string {
  if (retained.admissionStatus === "accepted" && discarded.admissionStatus !== "accepted") {
    return "accepted_unit_preferred_over_provisional_duplicate";
  }
  if (
    retained.recoveryProvenance?.canonicalRecoveryWindowId &&
    retained.recoveryProvenance.canonicalRecoveryWindowId === discarded.recoveryProvenance?.canonicalRecoveryWindowId
  ) {
    return "equivalent_recovery_window_duplicate_collapsed";
  }
  if (classification.evidenceOverlapRatio >= 0.75) {
    return "tighter_or_more_complete_duplicate_retained";
  }
  return "deterministic_duplicate_tie_break";
}

function toResolutionClassification(
  classification: ObservationOverlapClassification["classification"],
): DuplicateResolutionDecision["classification"] {
  if (classification === "confirmed_duplicate" || classification === "possible_duplicate" || classification === "partial_overlap" || classification === "conflict") {
    return classification;
  }
  return "partial_overlap";
}

function regionIdForUnit(unit: ExperimentalReconciledObservationUnit, regionMap: Map<string, ExperimentalRegionDecision>): ExperimentalRegionDecision {
  const existing = regionMap.get(unit.regionId);
  if (existing) {
    return existing;
  }

  const range = evidenceRange(unit);
  const created: ExperimentalRegionDecision = {
    regionId: unit.regionId,
    order: Number.MAX_SAFE_INTEGER,
    heading: null,
    spanStart: range.start,
    spanEnd: range.end,
    evidence: unit.evidence,
    boundaryConfidence: "low",
    uncertainty: null,
    transitionCues: [],
    origin: unit.origin === "baseline" ? "baseline_container" : "reconstructed",
    boundarySupport: ["uncertain_boundary"],
  };
  regionMap.set(unit.regionId, created);
  return created;
}

export function normalizeCompositionRequest(request: MemoryCompositionRequest): NormalizedCompositionRequest {
  const baselineUnits = request.baseline.units.map((unit) =>
    toComparableUnit({
      ...unit,
      source: unit.source ?? "baseline",
      origin: "baseline",
      admissionStatus: unit.admissionStatus ?? "accepted",
    }));
  const supplementalUnits = request.supplemental.units.map((unit) =>
    toComparableUnit({
      ...unit,
      source: unit.source ?? "recovery",
      origin: "recovery",
      admissionStatus: unit.admissionStatus ?? "accepted",
    }));

  return {
    dreamTextLength: request.dreamTextLength,
    baselineRegions: [...request.baseline.regions],
    supplementalRegions: [...request.supplemental.regions],
    baselineUnits,
    supplementalUnits,
    allUnits: [...baselineUnits, ...supplementalUnits],
  };
}

export function classifyCompositionOverlaps(allUnits: ExperimentalReconciledObservationUnit[]): DuplicateAndCoexistenceStage {
  const duplicateAnalysis: ObservationOverlapClassification[] = [];
  const replacementDecisions: ReconciliationReplacementDecision[] = [];
  const duplicateResolution: DuplicateResolutionDecision[] = [];
  const unresolvedOverlaps: ObservationOverlapClassification[] = [];
  const discardedObservationIds = new Set<string>();

  for (let leftIndex = 0; leftIndex < allUnits.length; leftIndex += 1) {
    const left = allUnits[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < allUnits.length; rightIndex += 1) {
      const right = allUnits[rightIndex]!;
      const classification = classifyObservationOverlap(left, right);
      if (classification.classification === "distinct") {
        continue;
      }

      duplicateAnalysis.push(classification);

      if (classification.classification === "confirmed_duplicate") {
        const retained = chooseRetainedUnit(left, right);
        const discarded = retained.observationId === left.observationId ? right : left;
        discarded.reconciliationStatus = "discarded";
        discardedObservationIds.add(discarded.observationId);
        duplicateResolution.push({
          retainedObservationId: retained.observationId,
          discardedObservationId: discarded.observationId,
          classification: "confirmed_duplicate",
          rationale: buildDuplicateResolutionRationale(retained, discarded, classification),
        });
        if (retained.origin === "recovery" && discarded.origin === "baseline") {
          discarded.reconciliationStatus = "replaced";
          discarded.supersededByObservationId = retained.observationId;
          retained.origin = "merged";
          retained.supersedesObservationIds = [...(retained.supersedesObservationIds ?? []), discarded.observationId];
          replacementDecisions.push({
            replacedObservationId: discarded.observationId,
            replacementObservationId: retained.observationId,
            evidenceOverlapRatio: classification.evidenceOverlapRatio,
            rationale: "recovery_unit_more_complete_than_baseline_duplicate",
          });
        }
        continue;
      }

      unresolvedOverlaps.push(classification);
    }
  }

  const recoveryUnits = allUnits.filter((unit) => unit.origin === "recovery");
  for (const recoveryUnit of recoveryUnits) {
    if (discardedObservationIds.has(recoveryUnit.observationId)) {
      continue;
    }

    const relatedOverlaps = unresolvedOverlaps.filter((entry) =>
      entry.leftObservationId === recoveryUnit.observationId || entry.rightObservationId === recoveryUnit.observationId,
    );
    if (relatedOverlaps.length === 0) {
      continue;
    }

    const matchedBaselineUnits = relatedOverlaps
      .map((entry) => entry.leftObservationId === recoveryUnit.observationId ? entry.rightObservationId : entry.leftObservationId)
      .map((observationId) => allUnits.find((unit) => unit.observationId === observationId))
      .filter((unit): unit is ExperimentalReconciledObservationUnit => Boolean(unit && unit.origin === "baseline"));
    if (matchedBaselineUnits.length === 0) {
      continue;
    }

    const matchedRanges = matchedBaselineUnits.map((unit) => evidenceRange(unit));
    const clusterStart = matchedRanges
      .map((range) => range.start)
      .filter((value): value is number => typeof value === "number");
    const clusterEnd = matchedRanges
      .map((range) => range.end)
      .filter((value): value is number => typeof value === "number");
    const supportingClusterUnits = allUnits.filter((unit) =>
      unit.origin === "baseline"
      && matchedBaselineUnits.some((matched) => matched.regionId === unit.regionId)
      && rangesAreNear(
        {
          start: clusterStart.length > 0 ? Math.min(...clusterStart) : null,
          end: clusterEnd.length > 0 ? Math.max(...clusterEnd) : null,
        },
        evidenceRange(unit),
        80,
      ),
    );
    if (supportingClusterUnits.length < 2) {
      continue;
    }

    const semanticNovelty = computeSemanticNovelty(
      recoveryUnit.statement,
      supportingClusterUnits.map((unit) => unit.statement),
    );
    const aggregateEvidenceOverlap = relatedOverlaps.reduce((sum, overlap) => sum + overlap.evidenceOverlapRatio, 0);
    const maxEntityOverlap = relatedOverlaps.reduce((max, overlap) => Math.max(max, overlap.entityOverlapRatio), 0);
    const maxSemanticSimilarity = relatedOverlaps.reduce((max, overlap) => Math.max(max, overlap.semanticSimilarity), 0);
    const uncertaintyStrengthened = supportingClusterUnits.some((unit) =>
      uncertaintyStrength(recoveryUnit.uncertainty) < uncertaintyStrength(unit.uncertainty),
    );

    const shouldSuppressRedundantSupplement = semanticNovelty <= 0.35
      && (aggregateEvidenceOverlap >= 0.9 || uncertaintyStrengthened)
      && (maxEntityOverlap >= 0.5 || maxSemanticSimilarity >= 0.45);

    if (!shouldSuppressRedundantSupplement) {
      continue;
    }

    recoveryUnit.reconciliationStatus = "discarded";
    discardedObservationIds.add(recoveryUnit.observationId);

    for (const overlap of relatedOverlaps) {
      const baselineObservationId = overlap.leftObservationId === recoveryUnit.observationId
        ? overlap.rightObservationId
        : overlap.leftObservationId;
      duplicateResolution.push({
        retainedObservationId: baselineObservationId,
        discardedObservationId: recoveryUnit.observationId,
        classification: toResolutionClassification(overlap.classification),
        rationale: uncertaintyStrengthened
          ? "redundant_recovery_overlap_abstained_without_strengthening_uncertainty"
          : "redundant_recovery_overlap_abstained_due_to_low_novelty",
      });
    }
  }

  const filteredUnresolvedOverlaps = unresolvedOverlaps.filter((overlap) =>
    !discardedObservationIds.has(overlap.leftObservationId) && !discardedObservationIds.has(overlap.rightObservationId),
  );
  const overlapGovernance = recoveryUnits.map((recoveryUnit): OverlapGovernanceDecision => {
    const baselineOverlaps = duplicateAnalysis.filter((entry) => {
      const otherObservationId = entry.leftObservationId === recoveryUnit.observationId
        ? entry.rightObservationId
        : entry.rightObservationId === recoveryUnit.observationId
          ? entry.leftObservationId
          : null;
      if (!otherObservationId) {
        return false;
      }
      return allUnits.some((unit) => unit.observationId === otherObservationId && unit.origin === "baseline");
    });
    const baselineObservationIds = uniqueSorted(
      baselineOverlaps.map((entry) => entry.leftObservationId === recoveryUnit.observationId ? entry.rightObservationId : entry.leftObservationId),
    );
    const baselineUnits = baselineObservationIds
      .map((observationId) => allUnits.find((unit) => unit.observationId === observationId))
      .filter((unit): unit is ExperimentalReconciledObservationUnit => Boolean(unit));
    const redundancyResolution = duplicateResolution.find((entry) =>
      entry.discardedObservationId === recoveryUnit.observationId
      && entry.rationale.startsWith("redundant_recovery_overlap_abstained"),
    );
    const duplicateResolutionEntry = duplicateResolution.find((entry) =>
      entry.discardedObservationId === recoveryUnit.observationId
      && entry.classification === "confirmed_duplicate",
    );
    const unresolvedAlternative = filteredUnresolvedOverlaps.some((entry) =>
      entry.leftObservationId === recoveryUnit.observationId || entry.rightObservationId === recoveryUnit.observationId,
    );

    return {
      supplementalObservationId: recoveryUnit.observationId,
      baselineObservationIds,
      overlapClassifications: baselineOverlaps.map((entry) => ({
        baselineObservationId: entry.leftObservationId === recoveryUnit.observationId ? entry.rightObservationId : entry.leftObservationId,
        classification: entry.classification,
        evidenceOverlapRatio: entry.evidenceOverlapRatio,
        semanticSimilarity: entry.semanticSimilarity,
        entityOverlapRatio: entry.entityOverlapRatio,
      })),
      decision: redundancyResolution
        ? "abstain_redundant_supplemental"
        : duplicateResolutionEntry
          ? "merged_duplicate"
          : unresolvedAlternative
            ? "retain_as_unresolved_alternative"
            : "retain_distinct",
      rationale: redundancyResolution?.rationale
        ?? duplicateResolutionEntry?.rationale
        ?? (unresolvedAlternative ? "overlap_preserved_as_explicit_alternative" : "supplemental_unit_retained_as_distinct"),
      supplementalUncertainty: recoveryUnit.uncertainty,
      baselineUncertainties: baselineUnits
        .map((unit) => unit.uncertainty)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
      independentlySurvives: !discardedObservationIds.has(recoveryUnit.observationId),
    };
  });

  const retainedUnits = sortUnitsByEvidence(
    allUnits.filter((unit) => !discardedObservationIds.has(unit.observationId) && unit.reconciliationStatus !== "replaced"),
  ).map((unit) => ({
    ...unit,
    reconciliationStatus: unit.reconciliationStatus ?? "retained",
  }));

  return {
    duplicateAnalysis,
    replacementDecisions,
    duplicateResolution,
    unresolvedOverlaps: filteredUnresolvedOverlaps,
    overlapGovernance,
    retainedUnits,
  };
}

export function composeMemoryLocalities(input: {
  baselineRegions: ExperimentalRegion[];
  supplementalRegions: ExperimentalRegion[];
  retainedUnits: ExperimentalReconciledObservationUnit[];
}): LocalityCompositionStage {
  const regionMap = new Map<string, ExperimentalRegionDecision>();
  for (const region of input.baselineRegions) {
    regionMap.set(region.regionId, {
      ...region,
      origin: "baseline_container",
      boundarySupport: classifyRegionBoundarySupport(region),
    });
  }
  for (const region of input.supplementalRegions) {
    regionMap.set(region.regionId, {
      ...region,
      origin: "recovery",
      boundarySupport: classifyRegionBoundarySupport(region),
    });
  }
  for (const unit of input.retainedUnits) {
    regionIdForUnit(unit, regionMap);
  }

  const workingUnits = input.retainedUnits.map((unit) => ({ ...unit }));
  const overlapAnalysis: LocalityOverlapAnalysis[] = [];
  const mergeDecisions: LocalityMergeDecision[] = [];
  const removedRegions = new Set<string>();
  const regions = [...regionMap.values()];

  for (let leftIndex = 0; leftIndex < regions.length; leftIndex += 1) {
    const leftRegion = regions[leftIndex]!;
    if (removedRegions.has(leftRegion.regionId)) {
      continue;
    }
    const leftUnits = workingUnits.filter((unit) => unit.regionId === leftRegion.regionId);
    for (let rightIndex = leftIndex + 1; rightIndex < regions.length; rightIndex += 1) {
      const rightRegion = regions[rightIndex]!;
      if (removedRegions.has(rightRegion.regionId)) {
        continue;
      }
      const rightUnits = workingUnits.filter((unit) => unit.regionId === rightRegion.regionId);
      const leftBounds = regionEvidenceBounds(leftRegion, workingUnits);
      const rightBounds = regionEvidenceBounds(rightRegion, workingUnits);
      const spanOverlapRatio = computeEvidenceOverlapRatio(leftBounds, rightBounds);
      const leftSignature = regionSignature(leftUnits);
      const rightSignature = regionSignature(rightUnits);
      const sharedObservationCount = [...new Set(leftSignature)].filter((signature) => new Set(rightSignature).has(signature)).length;

      let classification: LocalityOverlapAnalysis["classification"] = "adjacent_distinct_locality";
      if (
        ((sharedObservationCount > 0 && spanOverlapRatio >= 0.5) || (
          (leftUnits.length === 0 || rightUnits.length === 0) &&
          leftRegion.origin !== "baseline_container" &&
          rightRegion.origin !== "baseline_container" &&
          spanOverlapRatio >= 0.95
        ))
      ) {
        classification = "duplicate_locality";
      } else if (spanOverlapRatio > 0) {
        classification = "overlapping_locality";
      } else if (Math.abs((leftBounds.end ?? 0) - (rightBounds.start ?? 0)) <= 48) {
        classification = "adjacent_distinct_locality";
      } else {
        classification = "uncertain_boundary";
      }

      overlapAnalysis.push({
        leftRegionId: leftRegion.regionId,
        rightRegionId: rightRegion.regionId,
        classification,
        sharedObservationCount,
        spanOverlapRatio,
      });

      if (classification !== "duplicate_locality") {
        continue;
      }

      const keptRegion = leftRegion.regionId.localeCompare(rightRegion.regionId) <= 0 ? leftRegion : rightRegion;
      const mergedRegion = keptRegion.regionId === leftRegion.regionId ? rightRegion : leftRegion;
      for (const unit of workingUnits) {
        if (unit.regionId === mergedRegion.regionId) {
          unit.regionId = keptRegion.regionId;
        }
      }
      removedRegions.add(mergedRegion.regionId);
      mergeDecisions.push({
        keptRegionId: keptRegion.regionId,
        mergedRegionId: mergedRegion.regionId,
        rationale: "duplicate_recovery_locality_merged_after_unit_overlap_analysis",
      });
    }
  }

  return {
    regions: [...regionMap.values()].filter((region) => !removedRegions.has(region.regionId)),
    units: workingUnits,
    overlapAnalysis,
    mergeDecisions,
  };
}

export function orderComposedRegions(
  regions: ExperimentalRegionDecision[],
  units: ExperimentalReconciledObservationUnit[],
): { regions: ExperimentalRegionDecision[]; assembly: SourceOrderAssemblyRecord } {
  const withBounds = regions.map((region) => {
    const bounds = regionEvidenceBounds(region, units);
    return {
      region,
      earliestStart: bounds.start,
      latestEnd: bounds.end,
    };
  });

  const outOfOrderBefore = withBounds.reduce((count, current, index) => {
    if (index === 0) {
      return count;
    }
    const previous = withBounds[index - 1]!;
    const previousStart = previous.earliestStart ?? Number.MIN_SAFE_INTEGER;
    const currentStart = current.earliestStart ?? Number.MIN_SAFE_INTEGER;
    return currentStart < previousStart ? count + 1 : count;
  }, 0);

  const ordered = [...withBounds].sort((left, right) => {
    const leftStart = left.earliestStart ?? Number.MAX_SAFE_INTEGER;
    const rightStart = right.earliestStart ?? Number.MAX_SAFE_INTEGER;
    if (leftStart !== rightStart) {
      return leftStart - rightStart;
    }
    const leftEnd = left.latestEnd ?? Number.MAX_SAFE_INTEGER;
    const rightEnd = right.latestEnd ?? Number.MAX_SAFE_INTEGER;
    if (leftEnd !== rightEnd) {
      return leftEnd - rightEnd;
    }
    const originDelta = regionOriginPriority(left.region) - regionOriginPriority(right.region);
    if (originDelta !== 0) {
      return originDelta;
    }
    return left.region.regionId.localeCompare(right.region.regionId);
  }).map((entry, index) => ({
    ...entry.region,
    order: index,
    spanStart: entry.earliestStart,
    spanEnd: entry.latestEnd,
  }));

  return {
    regions: ordered,
    assembly: {
      finalLocalityOrderValid: true,
      outOfOrderUnitCount: 0,
      outOfOrderLocalityCount: outOfOrderBefore,
      repeatedSourceSpanRealizationCount: repeatedSourceSpanRealizationCount(units),
      localityOrder: ordered.map((region) => ({
        regionId: region.regionId,
        earliestStart: region.spanStart,
        latestEnd: region.spanEnd,
        assignedOrder: region.order,
      })),
    },
  };
}

export function composeNativeMemoryPackages(request: MemoryCompositionRequest): NativeCompositionLegacyResult {
  const normalized = normalizeCompositionRequest(request);
  const overlapStage = classifyCompositionOverlaps(normalized.allUnits);
  const localityStage = composeMemoryLocalities({
    baselineRegions: normalized.baselineRegions,
    supplementalRegions: normalized.supplementalRegions,
    retainedUnits: overlapStage.retainedUnits,
  });

  const sortedUnits = sortUnitsByEvidence(localityStage.units);
  const perRegionOrder = new Map<string, number>();
  const normalizedUnits = sortedUnits.map((unit) => {
    const nextOrder = perRegionOrder.get(unit.regionId) ?? 0;
    perRegionOrder.set(unit.regionId, nextOrder + 1);
    return {
      ...unit,
      order: nextOrder,
    };
  });

  const chronology = orderComposedRegions(
    localityStage.regions.filter((region) => normalizedUnits.some((unit) => unit.regionId === region.regionId)),
    normalizedUnits,
  );
  const earliestRepresentedPosition = normalizedUnits.length > 0 ? evidenceRange(normalizedUnits[0]!).start : null;
  const latestRepresentedPosition = normalizedUnits.length > 0 ? evidenceRange(normalizedUnits[normalizedUnits.length - 1]!).end : null;
  const internalGaps = findInternalGaps(normalizedUnits);

  return {
    finalRegions: chronology.regions,
    finalUnits: normalizedUnits,
    duplicateAnalysis: overlapStage.duplicateAnalysis,
    replacementDecisions: overlapStage.replacementDecisions,
    duplicateResolution: overlapStage.duplicateResolution,
    unresolvedOverlaps: overlapStage.unresolvedOverlaps,
    overlapGovernance: overlapStage.overlapGovernance,
    localityOverlapAnalysis: localityStage.overlapAnalysis,
    localityMergeDecisions: localityStage.mergeDecisions,
    sourceOrderAssembly: {
      ...chronology.assembly,
      outOfOrderUnitCount: 0,
      finalLocalityOrderValid: true,
      repeatedSourceSpanRealizationCount: repeatedSourceSpanRealizationCount(normalizedUnits),
    },
    earliestRepresentedPosition,
    latestRepresentedPosition,
    uncoveredPrefix: earliestRepresentedPosition ?? 0,
    uncoveredTail: latestRepresentedPosition === null ? request.dreamTextLength : Math.max(0, request.dreamTextLength - latestRepresentedPosition),
    internalGaps,
  };
}
