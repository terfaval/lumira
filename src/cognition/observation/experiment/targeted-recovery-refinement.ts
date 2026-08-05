import type {
  ExperimentalAdmissionStatus,
  ExperimentalEvidenceSpan,
  ExperimentalObservationUnit,
  ExperimentalReconciledObservationUnit,
  ExperimentalRegion,
  ExperimentalRegionDecision,
} from "@/src/cognition/observation/benchmark/observation-topology-experiment-types";
import type { ObservationExtractionAttemptEvidence } from "@/src/cognition/observation/observation-extraction-attempt-evidence";
import type { ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";

export type RecoveryGapKind = "prefix" | "internal" | "tail";

export type RecoveryGapReason =
  | "uncovered_prefix"
  | "uncovered_internal_region"
  | "uncovered_tail"
  | "thin_region"
  | "missing_late_section"
  | "missing_ending"
  | "transition_gap";

export interface RecoveryGap {
  gapId: string;
  kind: RecoveryGapKind;
  gapReason: RecoveryGapReason;
  gapConfidence: "high" | "medium" | "low";
  spanStart: number;
  spanEnd: number;
  includesEnding: boolean;
  includesCriticalTransition: boolean;
  precedingUnitId: string | null;
  followingUnitId: string | null;
}

export interface CanonicalPhysicalGap {
  physicalGapId: string;
  kind: RecoveryGapKind;
  spanStart: number;
  spanEnd: number;
  gapConfidence: "high" | "medium" | "low";
  precedingUnitId: string | null;
  followingUnitId: string | null;
  reasons: RecoveryGapReason[];
  contributingGapIds: string[];
  includesEnding: boolean;
  includesCriticalTransition: boolean;
}

export interface RecoveryWindow {
  windowId: string;
  gapId: string;
  gapStart: number;
  gapEnd: number;
  windowStart: number;
  windowEnd: number;
  contextStart: number;
  contextEnd: number;
  includesEnding: boolean;
}

export interface CanonicalRecoveryWindow {
  canonicalWindowId: string;
  physicalGapId: string;
  contributingWindowIds: string[];
  contributingGapIds: string[];
  contributingReasons: RecoveryGapReason[];
  windowStart: number;
  windowEnd: number;
  contextStart: number;
  contextEnd: number;
  includesEnding: boolean;
  mergeRationale: string;
}

export interface WindowNormalizationDecision {
  canonicalWindowId: string;
  physicalGapId: string;
  contributingWindowIds: string[];
  contributingGapIds: string[];
  contributingReasons: RecoveryGapReason[];
  chosenWindowStart: number;
  chosenWindowEnd: number;
  mergeRationale: string;
}

export interface ParseableBaselineSelection {
  admissionStatus: ExperimentalAdmissionStatus;
  attemptEvidence: ObservationExtractionAttemptEvidence;
  bundle: ObservationV2Bundle;
}

export interface ObservationOverlapClassification {
  leftObservationId: string;
  rightObservationId: string;
  classification: "distinct" | "possible_duplicate" | "confirmed_duplicate" | "partial_overlap" | "conflict";
  evidenceOverlapRatio: number;
  semanticSimilarity: number;
  entityOverlapRatio: number;
  physicalGapMatch: boolean;
  recoveryWindowMatch: boolean;
}

export interface ReconciliationReplacementDecision {
  replacedObservationId: string;
  replacementObservationId: string;
  evidenceOverlapRatio: number;
  rationale: string;
}

export interface DuplicateResolutionDecision {
  retainedObservationId: string;
  discardedObservationId: string;
  classification: "confirmed_duplicate" | "partial_overlap" | "conflict";
  rationale: string;
}

export interface LocalityOverlapAnalysis {
  leftRegionId: string;
  rightRegionId: string;
  classification: "duplicate_locality" | "overlapping_locality" | "adjacent_distinct_locality" | "uncertain_boundary";
  sharedObservationCount: number;
  spanOverlapRatio: number;
}

export interface LocalityMergeDecision {
  keptRegionId: string;
  mergedRegionId: string;
  rationale: string;
}

export interface SourceOrderAssemblyRecord {
  finalLocalityOrderValid: boolean;
  outOfOrderUnitCount: number;
  outOfOrderLocalityCount: number;
  repeatedSourceSpanRealizationCount: number;
  localityOrder: Array<{
    regionId: string;
    earliestStart: number | null;
    latestEnd: number | null;
    assignedOrder: number;
  }>;
}

export interface ReconciliationResult {
  finalRegions: ExperimentalRegionDecision[];
  finalUnits: ExperimentalReconciledObservationUnit[];
  duplicateAnalysis: ObservationOverlapClassification[];
  replacementDecisions: ReconciliationReplacementDecision[];
  duplicateResolution: DuplicateResolutionDecision[];
  unresolvedOverlaps: ObservationOverlapClassification[];
  localityOverlapAnalysis: LocalityOverlapAnalysis[];
  localityMergeDecisions: LocalityMergeDecision[];
  sourceOrderAssembly: SourceOrderAssemblyRecord;
  earliestRepresentedPosition: number | null;
  latestRepresentedPosition: number | null;
  uncoveredPrefix: number;
  uncoveredTail: number;
  internalGaps: Array<{ start: number; end: number }>;
}

export interface ProjectedBundleMaterial {
  regions: ExperimentalRegion[];
  units: ExperimentalReconciledObservationUnit[];
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

function computeContainmentRatio(
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

  const overlapLength = overlapEnd - overlapStart;
  const leftLength = Math.max(1, left.end - left.start);
  const rightLength = Math.max(1, right.end - right.start);

  return Math.max(overlapLength / leftLength, overlapLength / rightLength);
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

function compareConfidence(left: "high" | "medium" | "low", right: "high" | "medium" | "low"): "high" | "medium" | "low" {
  const rank = { high: 3, medium: 2, low: 1 } as const;
  return rank[left] >= rank[right] ? left : right;
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

function canonicalGapKey(gap: RecoveryGap): string {
  return [
    gap.kind,
    gap.spanStart,
    gap.spanEnd,
    gap.precedingUnitId ?? "none",
    gap.followingUnitId ?? "none",
  ].join(":");
}

function substantiallyEquivalentWindows(left: RecoveryWindow, right: RecoveryWindow): boolean {
  return left.gapStart === right.gapStart
    && left.gapEnd === right.gapEnd
    && Math.abs(left.windowStart - right.windowStart) <= 64
    && Math.abs(left.windowEnd - right.windowEnd) <= 64;
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

export function selectBestParseableBaselineAttempt(
  attempts: ObservationExtractionAttemptEvidence[],
): ParseableBaselineSelection | null {
  const accepted = attempts.find((attempt) =>
    attempt.acceptedAttempt &&
    attempt.parseStatus === "parsed" &&
    attempt.candidateBundle,
  );
  if (accepted?.candidateBundle) {
    return {
      admissionStatus: "accepted",
      attemptEvidence: accepted,
      bundle: accepted.candidateBundle,
    };
  }

  const rejectedParseable = [...attempts].reverse().find((attempt) =>
    attempt.status === "candidate_rejected" &&
    attempt.parseStatus === "parsed" &&
    attempt.candidateBundle,
  );
  if (rejectedParseable?.candidateBundle) {
    return {
      admissionStatus: "rejected_parseable",
      attemptEvidence: rejectedParseable,
      bundle: rejectedParseable.candidateBundle,
    };
  }

  return null;
}

export function projectObservationBundleMaterial(input: {
  bundle: ObservationV2Bundle;
  admissionStatus: ExperimentalAdmissionStatus;
  source: "baseline" | "recovery";
}): ProjectedBundleMaterial {
  return {
    regions: input.bundle.scenes.map((scene) => ({
      regionId: scene.sceneId,
      order: scene.position,
      heading: scene.summary,
      spanStart: scene.evidenceContext.spanStart,
      spanEnd: scene.evidenceContext.spanEnd,
      evidence: [scene.evidenceContext],
      boundaryConfidence: "medium",
      uncertainty: scene.uncertaintyNotes?.[0] ?? null,
      transitionCues: scene.boundaryReasoning.map((reason) => reason.note),
    })),
    units: input.bundle.scenes.flatMap((scene) =>
      scene.observations.map((observation) =>
        toComparableUnit({
          observationId: observation.observationId,
          regionId: scene.sceneId,
          order: observation.position,
          statement: observation.text,
          evidence: observation.evidence,
          uncertainty: observation.uncertaintyNote,
          source: input.source,
          origin: input.source,
          admissionStatus: input.admissionStatus,
        }),
      ),
    ),
  };
}

export function analyzeRecoveryGaps(input: {
  dreamTextLength: number;
  bundle: ObservationV2Bundle;
  baselineAttemptDiagnostics: {
    uncoveredTailChars: number | null;
    largestCoveredSpanEnd: number | null;
    lateSectionObservationCount: number | null;
  };
}): RecoveryGap[] {
  const gaps: RecoveryGap[] = [];
  const orderedObservations = input.bundle.scenes
    .flatMap((scene) => scene.observations)
    .map((observation) => ({
      observationId: observation.observationId,
      evidence: observation.evidence,
    }))
    .sort((left, right) => unitEarliestStart(left) - unitEarliestStart(right));

  const earliestStart = orderedObservations.length > 0 ? evidenceRange(orderedObservations[0]!).start : null;
  const latestEnd = input.baselineAttemptDiagnostics.largestCoveredSpanEnd
    ?? (orderedObservations.length > 0 ? evidenceRange(orderedObservations[orderedObservations.length - 1]!).end : null);
  const lateSectionStart = Math.floor(input.dreamTextLength * 0.75);
  const endingThreshold = Math.max(input.dreamTextLength - 250, Math.floor(input.dreamTextLength * 0.9));
  const significantTailThreshold = Math.max(120, Math.floor(input.dreamTextLength * 0.08));

  if (earliestStart !== null && earliestStart >= significantTailThreshold) {
    gaps.push({
      gapId: "gap-prefix-1",
      kind: "prefix",
      gapReason: "uncovered_prefix",
      gapConfidence: "medium",
      spanStart: 0,
      spanEnd: earliestStart,
      includesEnding: false,
      includesCriticalTransition: false,
      precedingUnitId: null,
      followingUnitId: orderedObservations[0]?.observationId ?? null,
    });
  }

  const uncoveredTailChars = input.baselineAttemptDiagnostics.uncoveredTailChars ?? 0;
  const lateSectionObservationCount = input.baselineAttemptDiagnostics.lateSectionObservationCount ?? 0;
  if (
    latestEnd !== null &&
    uncoveredTailChars >= significantTailThreshold &&
    input.dreamTextLength - latestEnd >= significantTailThreshold
  ) {
    gaps.push({
      gapId: "gap-tail-1",
      kind: "tail",
      gapReason: "uncovered_tail",
      gapConfidence: "high",
      spanStart: latestEnd,
      spanEnd: input.dreamTextLength,
      includesEnding: latestEnd < endingThreshold,
      includesCriticalTransition: lateSectionObservationCount === 0,
      precedingUnitId: orderedObservations[orderedObservations.length - 1]?.observationId ?? null,
      followingUnitId: null,
    });
  }

  if (
    lateSectionObservationCount === 0 &&
    latestEnd !== null &&
    latestEnd < lateSectionStart &&
    input.dreamTextLength - latestEnd >= significantTailThreshold
  ) {
    gaps.push({
      gapId: "gap-late-1",
      kind: "tail",
      gapReason: "missing_late_section",
      gapConfidence: "high",
      spanStart: latestEnd,
      spanEnd: input.dreamTextLength,
      includesEnding: latestEnd < endingThreshold,
      includesCriticalTransition: true,
      precedingUnitId: orderedObservations[orderedObservations.length - 1]?.observationId ?? null,
      followingUnitId: null,
    });
  }

  return gaps;
}

export function canonicalizeRecoveryGaps(gaps: RecoveryGap[]): CanonicalPhysicalGap[] {
  const grouped = new Map<string, CanonicalPhysicalGap>();
  for (const gap of gaps) {
    const key = canonicalGapKey(gap);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        physicalGapId: `physical-gap-${grouped.size + 1}`,
        kind: gap.kind,
        spanStart: gap.spanStart,
        spanEnd: gap.spanEnd,
        gapConfidence: gap.gapConfidence,
        precedingUnitId: gap.precedingUnitId,
        followingUnitId: gap.followingUnitId,
        reasons: [gap.gapReason],
        contributingGapIds: [gap.gapId],
        includesEnding: gap.includesEnding,
        includesCriticalTransition: gap.includesCriticalTransition,
      });
      continue;
    }

    existing.reasons = uniqueSorted([...existing.reasons, gap.gapReason]) as RecoveryGapReason[];
    existing.contributingGapIds = uniqueSorted([...existing.contributingGapIds, gap.gapId]);
    existing.gapConfidence = compareConfidence(existing.gapConfidence, gap.gapConfidence);
    existing.includesEnding ||= gap.includesEnding;
    existing.includesCriticalTransition ||= gap.includesCriticalTransition;
  }

  return [...grouped.values()].sort((left, right) => {
    if (left.spanStart !== right.spanStart) {
      return left.spanStart - right.spanStart;
    }
    return left.spanEnd - right.spanEnd;
  });
}

export function buildRecoveryWindows(input: {
  dreamTextLength: number;
  gaps: RecoveryGap[];
  maximumWindowLength: number;
  contextPadding: number;
}): RecoveryWindow[] {
  return input.gaps.map((gap, index) => {
    let windowStart = Math.max(0, gap.spanStart - input.contextPadding);
    let windowEnd = Math.min(input.dreamTextLength, gap.spanEnd + input.contextPadding);

    if (windowEnd - windowStart > input.maximumWindowLength) {
      if (gap.kind === "tail" || gap.includesEnding) {
        windowEnd = gap.spanEnd;
        windowStart = Math.max(0, windowEnd - input.maximumWindowLength);
      } else if (gap.kind === "prefix") {
        windowStart = 0;
        windowEnd = Math.min(input.dreamTextLength, input.maximumWindowLength);
      } else {
        const midpoint = Math.floor((gap.spanStart + gap.spanEnd) / 2);
        const half = Math.floor(input.maximumWindowLength / 2);
        windowStart = Math.max(0, midpoint - half);
        windowEnd = Math.min(input.dreamTextLength, windowStart + input.maximumWindowLength);
      }
    }

    return {
      windowId: `window-${index + 1}`,
      gapId: gap.gapId,
      gapStart: gap.spanStart,
      gapEnd: gap.spanEnd,
      windowStart,
      windowEnd,
      contextStart: windowStart,
      contextEnd: windowEnd,
      includesEnding: gap.includesEnding,
    };
  });
}

export function normalizeRecoveryWindows(input: {
  rawWindows: RecoveryWindow[];
  canonicalGaps: CanonicalPhysicalGap[];
}): {
  canonicalWindows: CanonicalRecoveryWindow[];
  decisions: WindowNormalizationDecision[];
  duplicateWindowsRemoved: number;
} {
  const gapByContributingId = new Map<string, CanonicalPhysicalGap>();
  for (const gap of input.canonicalGaps) {
    for (const contributingGapId of gap.contributingGapIds) {
      gapByContributingId.set(contributingGapId, gap);
    }
  }

  const groups: Array<{
    gap: CanonicalPhysicalGap;
    windows: RecoveryWindow[];
  }> = [];

  for (const window of input.rawWindows) {
    const gap = gapByContributingId.get(window.gapId);
    if (!gap) {
      continue;
    }

    const matchingGroup = groups.find((candidate) =>
      candidate.gap.physicalGapId === gap.physicalGapId &&
      candidate.windows.some((existingWindow) => substantiallyEquivalentWindows(existingWindow, window)),
    );
    if (matchingGroup) {
      matchingGroup.windows.push(window);
      continue;
    }

    groups.push({
      gap,
      windows: [window],
    });
  }

  const decisions = groups.map((group, index) => {
    const windowStart = Math.min(...group.windows.map((window) => window.windowStart));
    const windowEnd = Math.max(...group.windows.map((window) => window.windowEnd));

    return {
      canonicalWindowId: `canonical-window-${index + 1}`,
      physicalGapId: group.gap.physicalGapId,
      contributingWindowIds: uniqueSorted(group.windows.map((window) => window.windowId)),
      contributingGapIds: group.gap.contributingGapIds,
      contributingReasons: group.gap.reasons,
      chosenWindowStart: windowStart,
      chosenWindowEnd: windowEnd,
      mergeRationale: group.windows.length > 1
        ? "substantially_equivalent_windows_for_same_physical_gap_collapsed"
        : "single_window_for_physical_gap",
    } satisfies WindowNormalizationDecision;
  });

  return {
    canonicalWindows: decisions.map((decision) => ({
      canonicalWindowId: decision.canonicalWindowId,
      physicalGapId: decision.physicalGapId,
      contributingWindowIds: decision.contributingWindowIds,
      contributingGapIds: decision.contributingGapIds,
      contributingReasons: decision.contributingReasons,
      windowStart: decision.chosenWindowStart,
      windowEnd: decision.chosenWindowEnd,
      contextStart: decision.chosenWindowStart,
      contextEnd: decision.chosenWindowEnd,
      includesEnding: input.canonicalGaps.find((gap) => gap.physicalGapId === decision.physicalGapId)?.includesEnding ?? false,
      mergeRationale: decision.mergeRationale,
    })),
    decisions,
    duplicateWindowsRemoved: Math.max(0, input.rawWindows.length - decisions.length),
  };
}

export function classifyObservationOverlap(
  left: ExperimentalObservationUnit,
  right: ExperimentalObservationUnit,
): ObservationOverlapClassification {
  const leftRange = evidenceRange(left);
  const rightRange = evidenceRange(right);
  const overlapRatio = computeEvidenceOverlapRatio(leftRange, rightRange);
  computeContainmentRatio(leftRange, rightRange);
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

  const acceptedDelta =
    Number(left.admissionStatus === "accepted") - Number(right.admissionStatus === "accepted");
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
  if (retained.recoveryProvenance?.canonicalRecoveryWindowId && retained.recoveryProvenance.canonicalRecoveryWindowId === discarded.recoveryProvenance?.canonicalRecoveryWindowId) {
    return "equivalent_recovery_window_duplicate_collapsed";
  }
  if (classification.evidenceOverlapRatio >= 0.75) {
    return "tighter_or_more_complete_duplicate_retained";
  }
  return "deterministic_duplicate_tie_break";
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

function mergeDuplicateLocalities(input: {
  regions: ExperimentalRegionDecision[];
  units: ExperimentalReconciledObservationUnit[];
}): {
  regions: ExperimentalRegionDecision[];
  units: ExperimentalReconciledObservationUnit[];
  overlapAnalysis: LocalityOverlapAnalysis[];
  mergeDecisions: LocalityMergeDecision[];
} {
  const workingUnits = input.units.map((unit) => ({ ...unit }));
  const overlapAnalysis: LocalityOverlapAnalysis[] = [];
  const mergeDecisions: LocalityMergeDecision[] = [];
  const removedRegions = new Set<string>();
  const regionMap = new Map(input.regions.map((region) => [region.regionId, { ...region }]));
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

function orderRegionsBySource(
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

  const assembly: SourceOrderAssemblyRecord = {
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
  };

  return { regions: ordered, assembly };
}

export function reconcileTargetedRecoveryCandidate(input: {
  dreamTextLength: number;
  baselineRegions: ExperimentalRegion[];
  baselineUnits: Array<ExperimentalObservationUnit & Partial<Pick<ExperimentalReconciledObservationUnit, "admissionStatus">>>;
  recoveryRegions: ExperimentalRegion[];
  recoveryUnits: Array<ExperimentalObservationUnit & Partial<Pick<ExperimentalReconciledObservationUnit, "admissionStatus">>>;
}): ReconciliationResult {
  const baselineUnits = input.baselineUnits.map((unit) =>
    toComparableUnit({
      ...unit,
      source: unit.source ?? "baseline",
      origin: "baseline",
      admissionStatus: unit.admissionStatus ?? "accepted",
    }));
  const recoveryUnits = input.recoveryUnits.map((unit) =>
    toComparableUnit({
      ...unit,
      source: unit.source ?? "recovery",
      origin: "recovery",
      admissionStatus: unit.admissionStatus ?? "accepted",
    }));

  const allUnits = [...baselineUnits, ...recoveryUnits];
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

  const retainedUnits = sortUnitsByEvidence(
    allUnits.filter((unit) => !discardedObservationIds.has(unit.observationId) && unit.reconciliationStatus !== "replaced"),
  ).map((unit) => ({
    ...unit,
    reconciliationStatus: unit.reconciliationStatus ?? "retained",
  }));

  const regionMap = new Map<string, ExperimentalRegionDecision>();
  for (const region of input.baselineRegions) {
    regionMap.set(region.regionId, {
      ...region,
      origin: "baseline_container",
      boundarySupport: classifyRegionBoundarySupport(region),
    });
  }
  for (const region of input.recoveryRegions) {
    regionMap.set(region.regionId, {
      ...region,
      origin: "recovery",
      boundarySupport: classifyRegionBoundarySupport(region),
    });
  }
  for (const unit of retainedUnits) {
    regionIdForUnit(unit, regionMap);
  }

  const mergedLocalities = mergeDuplicateLocalities({
    regions: [...regionMap.values()],
    units: retainedUnits,
  });

  const sortedUnits = sortUnitsByEvidence(mergedLocalities.units);
  const perRegionOrder = new Map<string, number>();
  const normalizedUnits = sortedUnits.map((unit) => {
    const nextOrder = perRegionOrder.get(unit.regionId) ?? 0;
    perRegionOrder.set(unit.regionId, nextOrder + 1);
    return {
      ...unit,
      order: nextOrder,
    };
  });

  const orderedRegions = orderRegionsBySource(
    mergedLocalities.regions.filter((region) => normalizedUnits.some((unit) => unit.regionId === region.regionId)),
    normalizedUnits,
  );
  const earliestRepresentedPosition = normalizedUnits.length > 0 ? evidenceRange(normalizedUnits[0]!).start : null;
  const latestRepresentedPosition = normalizedUnits.length > 0 ? evidenceRange(normalizedUnits[normalizedUnits.length - 1]!).end : null;
  const internalGaps = findInternalGaps(normalizedUnits);

  return {
    finalRegions: orderedRegions.regions,
    finalUnits: normalizedUnits,
    duplicateAnalysis,
    replacementDecisions,
    duplicateResolution,
    unresolvedOverlaps,
    localityOverlapAnalysis: mergedLocalities.overlapAnalysis,
    localityMergeDecisions: mergedLocalities.mergeDecisions,
    sourceOrderAssembly: {
      ...orderedRegions.assembly,
      outOfOrderUnitCount: 0,
      finalLocalityOrderValid: true,
      repeatedSourceSpanRealizationCount: repeatedSourceSpanRealizationCount(normalizedUnits),
    },
    earliestRepresentedPosition,
    latestRepresentedPosition,
    uncoveredPrefix: earliestRepresentedPosition ?? 0,
    uncoveredTail: latestRepresentedPosition === null ? input.dreamTextLength : Math.max(0, input.dreamTextLength - latestRepresentedPosition),
    internalGaps,
  };
}
