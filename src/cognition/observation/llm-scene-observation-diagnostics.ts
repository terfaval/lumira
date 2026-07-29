import type { CreateObservationInput } from "@/src/domain/observation/types";
import type {
  ObservationV2BoundaryReason,
  ObservationV2Bundle,
  ObservationV2DerivedItem,
  ObservationV2DerivedStructures,
  ObservationV2EvidenceRef,
  ObservationV2Observation,
  ObservationV2Scene,
} from "@/src/domain/observation/v2-runtime";

export const LONG_DREAM_TEXT_THRESHOLD = 3_000;
export const MAX_SINGLE_SCENE_COVERAGE_RATIO = 0.45;
export const MIN_UNCOVERED_TAIL_CHARS = 1_200;
export const LATE_SECTION_START_RATIO = 0.75;
export const LATE_SECTION_MIN_SENTENCE_UNITS = 2;
export const LATE_SECTION_MAX_THIN_TRACE_OBSERVATIONS = 1;
export const OVERMERGE_GUARD_MIN_OBSERVATIONS = 5;
export const OVERMERGE_GUARD_MIN_MATCHED_CUE_GROUPS = 3;
export const OVERMERGE_GUARD_MIN_TOTAL_CUE_MATCHES = 6;

const OVERMERGE_CUE_GROUPS = [
  /\b(then|later|after that|afterwards|at the end|suddenly|eventually|meanwhile|aztan|aztĂˇn|utana|utĂˇna|kesobb|kĂ©sĹ‘bb|vegul|vĂ©gĂĽl|ekkor)\b/giu,
  /\b(mock(?:ed|ing)?|pressure|threat(?:en(?:ed|ing)?)?|argu(?:e|ing|ed)|guid(?:e|ing|ed)|help(?:er|ing)?|unwanted|conflict|ignored|included)\b/giu,
  /\b(trying to|search(?:ing)?|find(?:ing)?|leave|left|escape|escaping|hide|hiding|follow(?:ing)?|resist(?:ing)?|wander(?:ing|ed)?|moved? toward)\b/giu,
  /\b(lucid|reali[sz](?:e|es|ed|ing)|dream(?:ing)?|unstable|impossible|transformed|changed|world rules|mirror|abyss|distorted|maze)\b/giu,
] as const;

export type SceneObservationGuardVerdict =
  | "pass"
  | "coverage_guard_failed"
  | "late_section_guard_failed"
  | "overmerge_guard_failed";

export interface SceneObservationNormalizationStats {
  defaultedFieldCount: number;
}

export interface SceneObservationAttemptDiagnostics {
  attempt: 1 | 2;
  model: string;
  dreamTextLength: number;
  elapsedMs: number;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  inputTokenUsage: number | null;
  outputTokenUsage: number | null;
  totalTokenUsage: number | null;
  providerReturnedStructuredOutput: boolean;
  rawSceneCount: number;
  rawObservationCount: number;
  rawEvidenceSpanCount: number;
  rawLargestCoveredSpanEnd: number | null;
  rawLateSectionObservationCount: number;
  normalizedSceneCount: number;
  normalizedObservationCount: number;
  normalizedEvidenceSpanCount: number;
  defaultedFieldCount: number;
  largestCoveredSpanEnd: number | null;
  coverageRatio: number | null;
  uncoveredTailChars: number | null;
  lateSectionStart: number;
  lateSectionSentenceUnits: number;
  lateSectionObservationCount: number;
  overmergeMatchedCueGroups: number;
  overmergeTotalCueMatches: number;
  projectedFragmentCount: number;
  projectedSummaryTraceCount: number;
  guardVerdict: SceneObservationGuardVerdict;
  fallbackReason: string | null;
}

export interface SceneObservationExtractionDiagnostics {
  attempts: SceneObservationAttemptDiagnostics[];
  acceptedAttempt?: 1 | 2;
  fallbackReason?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function countRawObservationEvidence(rawObservation: unknown): number {
  const observationRecord = asRecord(rawObservation);
  if (!observationRecord) {
    return 0;
  }

  return Array.isArray(observationRecord.evidence) ? observationRecord.evidence.length : 0;
}

function readRawSceneSpanEnd(rawScene: unknown): number | null {
  const sceneRecord = asRecord(rawScene);
  if (!sceneRecord) {
    return null;
  }

  const evidenceContext = asRecord(sceneRecord.evidenceContext);
  return typeof evidenceContext?.spanEnd === "number" ? evidenceContext.spanEnd : null;
}

function readRawObservationSpanEnd(rawObservation: unknown): number | null {
  const observationRecord = asRecord(rawObservation);
  if (!observationRecord || !Array.isArray(observationRecord.evidence)) {
    return null;
  }

  const spanEnds = observationRecord.evidence
    .map((evidence) => asRecord(evidence)?.spanEnd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (spanEnds.length === 0) {
    return null;
  }

  return Math.max(...spanEnds);
}

export function buildRawStructuredMetrics(input: {
  dreamText: string;
  structured: unknown;
}): Pick<
  SceneObservationAttemptDiagnostics,
  "rawSceneCount" | "rawObservationCount" | "rawEvidenceSpanCount" | "rawLargestCoveredSpanEnd" | "rawLateSectionObservationCount"
> {
  const structuredRecord = asRecord(input.structured);
  const scenes = Array.isArray(structuredRecord?.scenes) ? structuredRecord.scenes : [];
  const rawSceneCount = scenes.length;
  const rawObservationCount = scenes.reduce((count, rawScene) => {
    const sceneRecord = asRecord(rawScene);
    return count + (Array.isArray(sceneRecord?.observations) ? sceneRecord.observations.length : 0);
  }, 0);
  const rawEvidenceSpanCount = scenes.reduce((count, rawScene) => {
    const sceneRecord = asRecord(rawScene);
    if (!Array.isArray(sceneRecord?.observations)) {
      return count;
    }

    return count + sceneRecord.observations.reduce((observationCount, rawObservation) => {
      return observationCount + countRawObservationEvidence(rawObservation);
    }, 0);
  }, 0);

  const spanEnds = scenes.flatMap((rawScene) => {
    const sceneRecord = asRecord(rawScene);
    const sceneSpanEnd = readRawSceneSpanEnd(rawScene);
    const observationSpanEnds = Array.isArray(sceneRecord?.observations)
      ? sceneRecord.observations
          .map((rawObservation) => readRawObservationSpanEnd(rawObservation))
          .filter((value): value is number => typeof value === "number")
      : [];

    return sceneSpanEnd === null ? observationSpanEnds : [sceneSpanEnd, ...observationSpanEnds];
  });

  const rawLargestCoveredSpanEnd = spanEnds.length > 0 ? Math.max(...spanEnds) : null;
  const lateSectionStart = readLateSectionStartIndex(input.dreamText);
  const rawLateSectionObservationCount = scenes.reduce((count, rawScene) => {
    const sceneRecord = asRecord(rawScene);
    if (!Array.isArray(sceneRecord?.observations)) {
      return count;
    }

    return count + sceneRecord.observations.filter((rawObservation) => {
      const observationSpanEnd = readRawObservationSpanEnd(rawObservation);
      if (observationSpanEnd !== null) {
        return observationSpanEnd >= lateSectionStart;
      }

      const sceneSpanEnd = readRawSceneSpanEnd(rawScene);
      return sceneSpanEnd !== null && sceneSpanEnd >= lateSectionStart;
    }).length;
  }, 0);

  return {
    rawSceneCount,
    rawObservationCount,
    rawEvidenceSpanCount,
    rawLargestCoveredSpanEnd,
    rawLateSectionObservationCount,
  };
}

export function createNormalizationStats(): SceneObservationNormalizationStats {
  return {
    defaultedFieldCount: 0,
  };
}

export function recordDefault(stats: SceneObservationNormalizationStats, applied: boolean): void {
  if (applied) {
    stats.defaultedFieldCount += 1;
  }
}

export function normalizeEvidenceRefWithStats(
  value: Partial<ObservationV2EvidenceRef> | undefined,
  stats: SceneObservationNormalizationStats,
): ObservationV2EvidenceRef {
  const snippet = value?.snippet?.trim();
  recordDefault(stats, !snippet);
  recordDefault(stats, value?.spanStart === undefined);
  recordDefault(stats, value?.spanEnd === undefined);
  recordDefault(stats, value?.contextLabel === undefined);

  return {
    snippet: snippet ?? "",
    spanStart: value?.spanStart ?? null,
    spanEnd: value?.spanEnd ?? null,
    contextLabel: value?.contextLabel ?? null,
  };
}

function normalizeBoundaryReasonWithStats(
  value: Partial<ObservationV2BoundaryReason> | undefined,
  stats: SceneObservationNormalizationStats,
): ObservationV2BoundaryReason {
  recordDefault(stats, value?.kind === undefined);
  recordDefault(stats, !value?.note?.trim());

  return {
    kind: value?.kind ?? "narrative_change",
    note: value?.note?.trim() ?? "",
  };
}

function normalizeDerivedItemWithStats(
  value: Partial<ObservationV2DerivedItem> | undefined,
  stats: SceneObservationNormalizationStats,
): ObservationV2DerivedItem {
  const identityKey = value?.identityKey?.trim();
  const displayLabel = value?.displayLabel?.trim() ?? value?.label?.trim();
  const label = value?.label?.trim() ?? value?.displayLabel?.trim();
  const observationIds = Array.isArray(value?.observationIds)
    ? value.observationIds.filter((entry): entry is string => typeof entry === "string")
    : [];

  recordDefault(stats, !identityKey);
  recordDefault(stats, !displayLabel);
  recordDefault(stats, value?.sourceLanguage === undefined);
  recordDefault(stats, !label);
  recordDefault(stats, !Array.isArray(value?.observationIds));

  return {
    identityKey: identityKey ?? undefined,
    displayLabel: displayLabel ?? undefined,
    sourceLanguage: value?.sourceLanguage ?? undefined,
    label: label ?? undefined,
    observationIds,
  };
}

function normalizeDerivedCollection(
  value: Array<Partial<ObservationV2DerivedItem>> | undefined,
  stats: SceneObservationNormalizationStats,
): ObservationV2DerivedItem[] {
  return value?.map((item) => normalizeDerivedItemWithStats(item, stats)) ?? [];
}

export function normalizeDerivedWithStats(
  value: Partial<ObservationV2DerivedStructures> | undefined,
  stats: SceneObservationNormalizationStats,
): ObservationV2DerivedStructures {
  recordDefault(stats, value?.actors === undefined);
  recordDefault(stats, value?.locations === undefined);
  recordDefault(stats, value?.objects === undefined);
  recordDefault(stats, value?.interactions === undefined);
  recordDefault(stats, value?.affect === undefined);
  recordDefault(stats, value?.agency === undefined);
  recordDefault(stats, value?.phenomenology === undefined);
  recordDefault(stats, value?.metacognition === undefined);

  return {
    actors: normalizeDerivedCollection(value?.actors, stats),
    locations: normalizeDerivedCollection(value?.locations, stats),
    objects: normalizeDerivedCollection(value?.objects, stats),
    interactions: normalizeDerivedCollection(value?.interactions, stats),
    affect: normalizeDerivedCollection(value?.affect, stats),
    agency: normalizeDerivedCollection(value?.agency, stats),
    phenomenology: normalizeDerivedCollection(value?.phenomenology, stats),
    metacognition: normalizeDerivedCollection(value?.metacognition, stats),
  };
}

export function normalizeObservationWithStats(
  value: Partial<ObservationV2Observation> | undefined,
  index: number,
  stats: SceneObservationNormalizationStats,
): ObservationV2Observation {
  recordDefault(stats, !value?.observationId);
  recordDefault(stats, value?.position === undefined);
  recordDefault(stats, !value?.text?.trim());
  recordDefault(stats, !Array.isArray(value?.evidence) || value.evidence.length === 0);
  recordDefault(stats, value?.uncertaintyNote === undefined);

  return {
    observationId: value?.observationId ?? `observation-${index}`,
    position: value?.position ?? index,
    text: value?.text?.trim() ?? "",
    evidence: Array.isArray(value?.evidence) && value.evidence.length > 0
      ? value.evidence.map((entry) => normalizeEvidenceRefWithStats(entry, stats))
      : [normalizeEvidenceRefWithStats(undefined, stats)],
    uncertaintyNote: value?.uncertaintyNote ?? null,
  };
}

export function normalizeSceneWithStats(
  value: Partial<ObservationV2Scene> | undefined,
  index: number,
  stats: SceneObservationNormalizationStats,
): ObservationV2Scene {
  recordDefault(stats, !value?.sceneId);
  recordDefault(stats, value?.position === undefined);
  recordDefault(stats, !value?.summary?.trim());
  recordDefault(stats, !Array.isArray(value?.boundaryReasoning));
  recordDefault(stats, value?.evidenceContext === undefined);
  recordDefault(stats, !Array.isArray(value?.observations));
  recordDefault(stats, value?.derived === undefined);

  return {
    sceneId: value?.sceneId ?? `scene-${index}`,
    position: value?.position ?? index,
    summary: value?.summary?.trim() ?? "",
    boundaryReasoning: Array.isArray(value?.boundaryReasoning)
      ? value.boundaryReasoning.map((entry) => normalizeBoundaryReasonWithStats(entry, stats))
      : [],
    evidenceContext: normalizeEvidenceRefWithStats(value?.evidenceContext, stats),
    observations: Array.isArray(value?.observations)
      ? value.observations.map((entry, observationIndex) => normalizeObservationWithStats(entry, observationIndex, stats))
      : [],
    derived: normalizeDerivedWithStats(value?.derived, stats),
  };
}

export function readLateSectionStartIndex(dreamText: string): number {
  return Math.floor(dreamText.length * LATE_SECTION_START_RATIO);
}

function readSentenceUnitCount(text: string): number {
  return text
    .split(/[.!?]+/u)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;
}

function readObservationMaxSpanEnd(observation: ObservationV2Observation): number | null {
  const spanEnds = observation.evidence
    .map((evidence) => evidence.spanEnd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (spanEnds.length === 0) {
    return null;
  }

  return Math.max(...spanEnds);
}

function readLateSectionObservationCount(input: {
  bundle: ObservationV2Bundle;
  lateSectionStart: number;
}): number {
  return input.bundle.scenes.reduce((count, scene) => {
    return count + scene.observations.filter((observation) => {
      const observationMaxSpanEnd = readObservationMaxSpanEnd(observation);
      if (observationMaxSpanEnd !== null) {
        return observationMaxSpanEnd >= input.lateSectionStart;
      }

      return scene.evidenceContext.spanEnd !== null && scene.evidenceContext.spanEnd >= input.lateSectionStart;
    }).length;
  }, 0);
}

function countCueMatches(text: string, pattern: RegExp): number {
  return [...text.matchAll(pattern)].length;
}

function readOvermergeCueMetrics(scene: ObservationV2Scene): {
  matchedCueGroups: number;
  totalCueMatches: number;
} {
  const normalizedText = [scene.summary, ...scene.observations.map((observation) => observation.text)]
    .join(" ")
    .toLocaleLowerCase();

  let matchedCueGroups = 0;
  let totalCueMatches = 0;

  for (const pattern of OVERMERGE_CUE_GROUPS) {
    const matchCount = countCueMatches(normalizedText, pattern);
    if (matchCount > 0) {
      matchedCueGroups += 1;
      totalCueMatches += matchCount;
    }
  }

  return {
    matchedCueGroups,
    totalCueMatches,
  };
}

export function readLargestCoveredSpanEnd(bundle: ObservationV2Bundle): number | null {
  const spanEnds = bundle.scenes.flatMap((scene) => [
    scene.evidenceContext.spanEnd,
    ...scene.observations.flatMap((observation) => observation.evidence.map((evidence) => evidence.spanEnd)),
  ]);

  const numericSpanEnds = spanEnds.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (numericSpanEnds.length === 0) {
    return null;
  }

  return Math.max(...numericSpanEnds);
}

export function buildNormalizedBundleMetrics(input: {
  dreamText: string;
  bundle: ObservationV2Bundle;
  normalizationStats: SceneObservationNormalizationStats;
  payload: CreateObservationInput;
}): Omit<
  SceneObservationAttemptDiagnostics,
  | "attempt"
  | "model"
  | "elapsedMs"
  | "providerStatus"
  | "providerIncompleteReason"
  | "inputTokenUsage"
  | "outputTokenUsage"
  | "totalTokenUsage"
  | "providerReturnedStructuredOutput"
  | "rawSceneCount"
  | "rawObservationCount"
  | "rawEvidenceSpanCount"
  | "rawLargestCoveredSpanEnd"
  | "rawLateSectionObservationCount"
> {
  const largestCoveredSpanEnd = readLargestCoveredSpanEnd(input.bundle);
  const dreamTextLength = input.dreamText.length;
  const lateSectionStart = readLateSectionStartIndex(input.dreamText);
  const lateSectionText = input.dreamText.slice(lateSectionStart).trim();
  const lateSectionSentenceUnits = readSentenceUnitCount(lateSectionText);
  const lateSectionObservationCount = readLateSectionObservationCount({
    bundle: input.bundle,
    lateSectionStart,
  });
  const scene = input.bundle.scenes.length === 1 ? input.bundle.scenes[0] : null;
  const overmergeMetrics = scene ? readOvermergeCueMetrics(scene) : { matchedCueGroups: 0, totalCueMatches: 0 };
  const normalizedEvidenceSpanCount = input.bundle.scenes.reduce((count, sceneItem) => {
    return count + sceneItem.observations.reduce((observationCount, observation) => {
      return observationCount + observation.evidence.length;
    }, 0);
  }, 0);

  let guardVerdict: SceneObservationGuardVerdict = "pass";
  if (
    dreamTextLength >= LONG_DREAM_TEXT_THRESHOLD &&
    input.bundle.scenes.length === 1 &&
    scene &&
    scene.observations.length >= OVERMERGE_GUARD_MIN_OBSERVATIONS &&
    overmergeMetrics.matchedCueGroups >= OVERMERGE_GUARD_MIN_MATCHED_CUE_GROUPS &&
    overmergeMetrics.totalCueMatches >= OVERMERGE_GUARD_MIN_TOTAL_CUE_MATCHES
  ) {
    guardVerdict = "overmerge_guard_failed";
  } else if (
    dreamTextLength >= LONG_DREAM_TEXT_THRESHOLD &&
    input.bundle.scenes.length === 1 &&
    largestCoveredSpanEnd !== null &&
    dreamTextLength - largestCoveredSpanEnd >= MIN_UNCOVERED_TAIL_CHARS &&
    largestCoveredSpanEnd / dreamTextLength <= MAX_SINGLE_SCENE_COVERAGE_RATIO
  ) {
    guardVerdict = "coverage_guard_failed";
  } else if (
    dreamTextLength >= LONG_DREAM_TEXT_THRESHOLD &&
    lateSectionSentenceUnits >= LATE_SECTION_MIN_SENTENCE_UNITS &&
    lateSectionObservationCount <= LATE_SECTION_MAX_THIN_TRACE_OBSERVATIONS
  ) {
    guardVerdict = "late_section_guard_failed";
  }

  return {
    dreamTextLength,
    normalizedSceneCount: input.bundle.scenes.length,
    normalizedObservationCount: input.bundle.scenes.reduce((count, sceneItem) => count + sceneItem.observations.length, 0),
    normalizedEvidenceSpanCount,
    defaultedFieldCount: input.normalizationStats.defaultedFieldCount,
    largestCoveredSpanEnd,
    coverageRatio: largestCoveredSpanEnd === null || dreamTextLength === 0 ? null : largestCoveredSpanEnd / dreamTextLength,
    uncoveredTailChars: largestCoveredSpanEnd === null ? null : dreamTextLength - largestCoveredSpanEnd,
    lateSectionStart,
    lateSectionSentenceUnits,
    lateSectionObservationCount,
    overmergeMatchedCueGroups: overmergeMetrics.matchedCueGroups,
    overmergeTotalCueMatches: overmergeMetrics.totalCueMatches,
    projectedFragmentCount: input.payload.fragments.length,
    projectedSummaryTraceCount: input.payload.summaryTrace.length,
    guardVerdict,
    fallbackReason: guardVerdict === "pass" ? null : guardVerdict,
  };
}

export function buildAttemptDiagnostics(input: {
  attempt: 1 | 2;
  model: string;
  elapsedMs: number;
  providerStatus: string | null;
  providerIncompleteReason: string | null;
  inputTokenUsage: number | null;
  outputTokenUsage: number | null;
  totalTokenUsage: number | null;
  providerReturnedStructuredOutput: boolean;
  rawMetrics: Pick<
    SceneObservationAttemptDiagnostics,
    "rawSceneCount" | "rawObservationCount" | "rawEvidenceSpanCount" | "rawLargestCoveredSpanEnd" | "rawLateSectionObservationCount"
  >;
  normalizedMetrics: Omit<
    SceneObservationAttemptDiagnostics,
    | "attempt"
    | "model"
    | "elapsedMs"
    | "providerStatus"
    | "providerIncompleteReason"
    | "inputTokenUsage"
    | "outputTokenUsage"
    | "totalTokenUsage"
    | "providerReturnedStructuredOutput"
    | "rawSceneCount"
    | "rawObservationCount"
    | "rawEvidenceSpanCount"
    | "rawLargestCoveredSpanEnd"
    | "rawLateSectionObservationCount"
  >;
}): SceneObservationAttemptDiagnostics {
  return {
    attempt: input.attempt,
    model: input.model,
    elapsedMs: input.elapsedMs,
    providerStatus: input.providerStatus,
    providerIncompleteReason: input.providerIncompleteReason,
    inputTokenUsage: input.inputTokenUsage,
    outputTokenUsage: input.outputTokenUsage,
    totalTokenUsage: input.totalTokenUsage,
    providerReturnedStructuredOutput: input.providerReturnedStructuredOutput,
    ...input.rawMetrics,
    ...input.normalizedMetrics,
  };
}

export function emitSceneObservationAttemptDiagnostics(input: {
  reflectiveObjectId: string;
  attemptDiagnostics: SceneObservationAttemptDiagnostics;
}): void {
  const base = {
    reflectiveObjectId: input.reflectiveObjectId,
    attempt: input.attemptDiagnostics.attempt,
    model: input.attemptDiagnostics.model,
    dreamTextLength: input.attemptDiagnostics.dreamTextLength,
    elapsedMs: input.attemptDiagnostics.elapsedMs,
  };

  console.warn("llm_scene_observation_extraction_diagnostic", {
    ...base,
    stage: "provider_response",
    providerStatus: input.attemptDiagnostics.providerStatus,
    providerIncompleteReason: input.attemptDiagnostics.providerIncompleteReason,
    inputTokenUsage: input.attemptDiagnostics.inputTokenUsage,
    outputTokenUsage: input.attemptDiagnostics.outputTokenUsage,
    totalTokenUsage: input.attemptDiagnostics.totalTokenUsage,
    providerReturnedStructuredOutput: input.attemptDiagnostics.providerReturnedStructuredOutput,
  });

  console.warn("llm_scene_observation_extraction_diagnostic", {
    ...base,
    stage: "parsed_structured_output",
    rawSceneCount: input.attemptDiagnostics.rawSceneCount,
    rawObservationCount: input.attemptDiagnostics.rawObservationCount,
    rawEvidenceSpanCount: input.attemptDiagnostics.rawEvidenceSpanCount,
    rawLargestCoveredSpanEnd: input.attemptDiagnostics.rawLargestCoveredSpanEnd,
    rawLateSectionObservationCount: input.attemptDiagnostics.rawLateSectionObservationCount,
  });

  console.warn("llm_scene_observation_extraction_diagnostic", {
    ...base,
    stage: "normalized_bundle",
    normalizedSceneCount: input.attemptDiagnostics.normalizedSceneCount,
    normalizedObservationCount: input.attemptDiagnostics.normalizedObservationCount,
    normalizedEvidenceSpanCount: input.attemptDiagnostics.normalizedEvidenceSpanCount,
    defaultedFieldCount: input.attemptDiagnostics.defaultedFieldCount,
  });

  console.warn("llm_scene_observation_extraction_diagnostic", {
    ...base,
    stage: "guard_evaluation",
    largestCoveredSpanEnd: input.attemptDiagnostics.largestCoveredSpanEnd,
    coverageRatio: input.attemptDiagnostics.coverageRatio,
    uncoveredTailChars: input.attemptDiagnostics.uncoveredTailChars,
    lateSectionStart: input.attemptDiagnostics.lateSectionStart,
    lateSectionSentenceUnits: input.attemptDiagnostics.lateSectionSentenceUnits,
    lateSectionObservationCount: input.attemptDiagnostics.lateSectionObservationCount,
    overmergeMatchedCueGroups: input.attemptDiagnostics.overmergeMatchedCueGroups,
    overmergeTotalCueMatches: input.attemptDiagnostics.overmergeTotalCueMatches,
    guardVerdict: input.attemptDiagnostics.guardVerdict,
    fallbackReason: input.attemptDiagnostics.fallbackReason,
  });

  console.warn("llm_scene_observation_extraction_diagnostic", {
    ...base,
    stage: "projection",
    normalizedSceneCount: input.attemptDiagnostics.normalizedSceneCount,
    normalizedObservationCount: input.attemptDiagnostics.normalizedObservationCount,
    projectedFragmentCount: input.attemptDiagnostics.projectedFragmentCount,
    projectedSummaryTraceCount: input.attemptDiagnostics.projectedSummaryTraceCount,
  });
}

export function readResponseUsageMetrics(response: {
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}): Pick<SceneObservationAttemptDiagnostics, "inputTokenUsage" | "outputTokenUsage" | "totalTokenUsage"> {
  return {
    inputTokenUsage: typeof response.usage?.input_tokens === "number" ? response.usage.input_tokens : null,
    outputTokenUsage: typeof response.usage?.output_tokens === "number" ? response.usage.output_tokens : null,
    totalTokenUsage: typeof response.usage?.total_tokens === "number" ? response.usage.total_tokens : null,
  };
}

export function countBundleObservations(bundle: ObservationV2Bundle): number {
  return bundle.scenes.reduce((count, scene) => count + scene.observations.length, 0);
}
