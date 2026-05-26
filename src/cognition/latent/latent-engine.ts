import type {
  CreateLatentSnapshotInput,
  LatentConfidenceBand,
  LatentCenterLifecycle,
  LatentCenterLifecycleState,
  LatentProcessingMode,
  LatentProcessingModeState,
  LatentProvenance,
  LatentSuggestion,
  LatentSuggestionType,
} from "@/src/domain/latent/types";
import type { GlossaryTerm } from "@/src/domain/glossary/types";
import type { Observation } from "@/src/domain/observation/types";
import type { Opening } from "@/src/domain/openings/types";
import type { ReflectiveResponse } from "@/src/domain/responses/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";
import type { ObservationId, ReflectiveObjectId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

const FORBIDDEN_AUTHORITY_MARKERS = ["means", "reveals", "proves", "you should", "must"];
const RECURRENCE_CUES = ["again", "repeated", "recurring", "similar", "previously", "before", "same pattern"];
const STOPWORDS = new Set(["the", "and", "that", "this", "with", "from", "were", "was", "then", "into", "over"]);

const CATEGORY_WEIGHTS: Record<string, number> = {
  scene: 0.45,
  actor: 0.4,
  interaction: 0.5,
  emotion: 0.55,
  location: 0.45,
  transition: 0.45,
  object: 0.4,
  body_state: 0.6,
  dream_quality: 0.55,
  recurrence_candidate: 0.65,
  agency_state: 1.05,
  metacognitive_moment: 1.05,
  affect_transition: 0.95,
  emotional_contradiction: 0.9,
  affective_atmosphere: 0.85,
  spatial_instability: 0.9,
  dream_state_quality: 0.9,
  continuity_fragment: 0.8,
  altered_realism: 0.8,
};

const PHENOMENOLOGICAL_CATEGORIES = new Set([
  "agency_state",
  "metacognitive_moment",
  "affect_transition",
  "emotional_contradiction",
  "affective_atmosphere",
  "spatial_instability",
  "dream_state_quality",
  "continuity_fragment",
  "altered_realism",
]);

const PROVENANCE_WEIGHT: Record<Observation["provenanceTier"], number> = {
  manual_user: 1.25,
  reviewed: 1.2,
  imported_transform: 1,
  system_extract: 0.9,
};

const EVIDENCE_WEIGHT: Record<Observation["fragments"][number]["evidenceAdequacy"], number> = {
  strong_span: 1.25,
  snippet_only: 0.85,
  weak_fallback: 0.35,
};

const SEMANTIC_POLICY_WEIGHT: Record<Observation["semanticPolicyResult"], number> = {
  accept: 1,
  accept_with_uncertainty: 0.72,
  defer_insufficient_evidence: 0.45,
  reject_interpretive: 0.2,
};

const CENTER_ELIGIBILITY_THRESHOLD = 1.1;
const RECURRENCE_ELIGIBILITY_THRESHOLD = 1;
const MODERATE_CONFIDENCE_THRESHOLD = 1.75;
const LIFECYCLE_STABILIZE_STREAK = 3;
const LIFECYCLE_EMERGE_STREAK = 2;
const HYSTERESIS_CHALLENGER_MARGIN = 1.18;
const COOLDOWN_SWITCH_WINDOW = 5;
const COOLDOWN_SWITCH_THRESHOLD = 2;
const COOLDOWN_MINUTES = 30;
const COOLDOWN_RECURRENCE_PENALTY = 0.86;
const COOLDOWN_CHALLENGER_PENALTY = 0.72;
const COOLDOWN_USER_OVERRIDE_SCORE = 1.42;
const COOLDOWN_USER_OVERRIDE_HIGHLIGHT = 0.9;
const COOLDOWN_USER_OVERRIDE_PERSISTENCE = 0.7;
const NEIGHBORHOOD_CATEGORY_LIMIT = 4;
const LOCAL_PROVENANCE_OBSERVATION_LIMIT = 8;
const LOCAL_PROVENANCE_OBSERVATION_MIN_SCORE = 2;
const LOCAL_PROVENANCE_OBSERVATION_FALLBACK = 3;
const SUPPRESSION_STRONG_OBSERVATION_LINEAGE_MAX = 6;
const MODE_SELECTION_MIN_SCORE = 0.95;
const MODE_SELECTION_MARGIN = 0.12;
const MODE_SELECTION_MAX_UNCERTAINTY = 0.72;
const MODE_CANDIDATE_LIMIT = 3;

export interface BuildLatentSnapshotScaffoldInput {
  userId: UserId;
  reflectiveObjectId: ReflectiveObjectId;
  observations: Observation[];
  glossaryTerms: GlossaryTerm[];
  threads: ReflectiveThread[];
  responses: ReflectiveResponse[];
  reflectiveObjectMetadata?: Record<string, string | number | boolean | null>;
  recentSnapshots?: Array<{ createdAt: string; lifecycle?: LatentCenterLifecycle; provenance: { sourceReflectiveObjects: ReflectiveObjectId[] } }>;
  recentOpenings?: Opening[];
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function buildProvenance(input: BuildLatentSnapshotScaffoldInput): LatentProvenance {
  const observationIds: ObservationId[] = unique(input.observations.map((observation) => observation.id));
  const threadIds: ThreadId[] = unique(input.threads.map((thread) => thread.id));
  const responseIds: ReflectiveResponseId[] = unique(input.responses.map((response) => response.id));

  return {
    sourceReflectiveObjects: unique([input.reflectiveObjectId]),
    sourceObservations: observationIds,
    sourceGlossaryTerms: unique(input.glossaryTerms.map((term) => term.id)),
    sourceThreads: threadIds,
    sourceResponses: responseIds,
    generationContext: "phase6_latent_scaffold",
  };
}

function buildSuggestionPhrase(type: LatentSuggestionType, mode?: LatentProcessingMode): string {
  switch (type) {
    case "possible_recurrence":
      return "This may connect with nearby recurring reflective material.";
    case "possible_resurfacing":
      return "A dormant continuity area might relate to this reflection.";
    case "possible_opening":
      if (mode === "affective") {
        return "A gentle opening around emotional movement may be worth considering.";
      }
      if (mode === "agency_oriented") {
        return "A gentle opening around agency or awareness shift may be worth considering.";
      }
      if (mode === "existential") {
        return "A gentle opening around dream-state uncertainty may be worth considering.";
      }
      if (mode === "continuity_oriented") {
        return "A gentle opening around continuity may be worth considering.";
      }
      return "A gentle reflective opening might relate here.";
    default:
      return "Some nearby material may connect with this reflection.";
  }
}

function hasForbiddenAuthorityLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_AUTHORITY_MARKERS.some((marker) => lower.includes(marker));
}

function ensureNonAuthoritativeSuggestion(suggestion: LatentSuggestion): LatentSuggestion {
  if (!hasForbiddenAuthorityLanguage(suggestion.phrasing)) {
    return suggestion;
  }

  return {
    ...suggestion,
    phrasing: "This may connect with nearby reflective continuity.",
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function toConfidenceBand(score: number): LatentConfidenceBand {
  if (score >= MODERATE_CONFIDENCE_THRESHOLD) {
    return "moderate";
  }
  if (score >= 0.95) {
    return "tentative";
  }
  return "low";
}

function glossaryBoost(fragmentTokens: string[], glossaryTerms: GlossaryTerm[]): number {
  const activeTerms = glossaryTerms.filter((term) => term.state === "active" && term.suppression.state === "none");
  let overlapCount = 0;
  let noteBoost = 0;

  for (const term of activeTerms) {
    const termTokens = tokenize(term.normalizedKey);
    if (termTokens.length === 0) {
      continue;
    }
    const overlap = termTokens.some((token) => fragmentTokens.includes(token));
    if (overlap) {
      overlapCount += 1;
      if (term.notes && term.notes.trim().length > 0) {
        noteBoost = 0.1;
      }
    }
  }

  return 1 + Math.min(0.25, overlapCount * 0.1) + noteBoost;
}

function hasRecurrenceCue(fragmentText: string): boolean {
  const lower = fragmentText.toLowerCase();
  return RECURRENCE_CUES.some((cue) => lower.includes(cue));
}

function recurrencePenalty(occurrenceCount: number, evidenceAdequacy: Observation["fragments"][number]["evidenceAdequacy"]): number {
  if (occurrenceCount <= 1) {
    return 1;
  }
  if (evidenceAdequacy === "weak_fallback") {
    return 0;
  }
  return 1 / Math.sqrt(occurrenceCount);
}

function traceMultiplierForFragment(observation: Observation, fragmentPosition: number): number {
  const trace = observation.summaryTrace.find((entry) => entry.fragmentPosition === fragmentPosition);
  if (!trace) {
    return 1;
  }
  if (trace.strength === "strong" && trace.reason === "explicit_anchor") {
    return 1.1;
  }
  if (trace.strength === "strong") {
    return 1.05;
  }
  if (trace.reason === "explicit_anchor") {
    return 0.9;
  }
  return 0.75;
}

function deriveProcessingMode(category: string): LatentProcessingMode {
  if (category === "affect_transition" || category === "emotional_contradiction" || category === "affective_atmosphere") {
    return "affective";
  }
  if (category === "agency_state" || category === "metacognitive_moment") {
    return "agency_oriented";
  }
  if (category === "spatial_instability" || category === "dream_state_quality" || category === "altered_realism") {
    return "existential";
  }
  if (category === "continuity_fragment" || category === "recurrence_candidate") {
    return "continuity_oriented";
  }
  return "exploratory";
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getNumericMetadataValue(metadata: Record<string, string | number | boolean | null> | undefined, keys: string[]): number {
  if (!metadata) {
    return 0;
  }
  for (const key of keys) {
    const raw = metadata[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function hasActiveSuppression(opening: Opening, nowIso: string): boolean {
  if (opening.suppressionState !== "suppressed") {
    return false;
  }
  if (opening.suppressionDuration === "user_reactivated") {
    return false;
  }
  if (opening.suppressionDuration === "temporary") {
    const expiry = opening.suppressionExpiry.at;
    if (!expiry) {
      return true;
    }
    return Date.parse(nowIso) < Date.parse(expiry);
  }
  return true;
}

function hasIdOverlap(values: string[], eligible: Set<string>): boolean {
  return values.some((value) => eligible.has(value));
}

function collectObservationIdsByCategory(observations: Observation[]): Map<string, Set<string>> {
  const byCategory = new Map<string, Set<string>>();
  for (const observation of observations) {
    for (const fragment of observation.fragments) {
      const next = byCategory.get(fragment.category) ?? new Set<string>();
      next.add(observation.id);
      byCategory.set(fragment.category, next);
    }
  }
  return byCategory;
}

function collectObservationIdsForCategories(
  observationIdsByCategory: Map<string, Set<string>>,
  categories: Array<string | null | undefined>,
): Set<string> {
  const ids = new Set<string>();
  for (const category of categories) {
    if (!category) {
      continue;
    }
    const byCategory = observationIdsByCategory.get(category);
    if (!byCategory) {
      continue;
    }
    for (const observationId of byCategory) {
      ids.add(observationId);
    }
  }
  return ids;
}

function isCenterLineSuppressionActive(
  opening: Opening,
  nowIso: string,
  reflectiveObjectId: ReflectiveObjectId,
  centerCategory: LatentCenterLifecycle["centerCategory"],
  centerObservationIds: Set<string>,
  neighborhoodObservationIds: Set<string>,
  affectObservationIds: Set<string>,
  localGlossaryTermIds: Set<string>,
  localThreadIds: Set<string>,
  localResponseIds: Set<string>,
): boolean {
  if (!hasActiveSuppression(opening, nowIso)) {
    return false;
  }
  if (!opening.provenance.sourceObjects.includes(reflectiveObjectId)) {
    return false;
  }
  if (!centerCategory) {
    return false;
  }

  const centerObservationOverlap = hasIdOverlap(opening.provenance.sourceObservations, centerObservationIds);
  const neighborhoodObservationOverlap = hasIdOverlap(opening.provenance.sourceObservations, neighborhoodObservationIds);
  const affectAdjacencyOverlap = hasIdOverlap(opening.provenance.sourceObservations, affectObservationIds);
  const glossaryOverlap = hasIdOverlap(opening.provenance.sourceGlossaryTerms, localGlossaryTermIds);
  const threadOverlap = hasIdOverlap(opening.provenance.sourceThreads, localThreadIds);
  const responseOverlap = hasIdOverlap(opening.provenance.sourceResponses, localResponseIds);
  const observationLineageBounded =
    opening.provenance.sourceObservations.length > 0 &&
    opening.provenance.sourceObservations.length <= SUPPRESSION_STRONG_OBSERVATION_LINEAGE_MAX;
  const reinforcedCenterObservationOverlap = centerObservationOverlap && (glossaryOverlap || threadOverlap || responseOverlap);
  const boundedCenterObservationOverlap = centerObservationOverlap && observationLineageBounded;
  const strongLineageOverlap = glossaryOverlap || threadOverlap || reinforcedCenterObservationOverlap || boundedCenterObservationOverlap;
  const weakLineageOverlap = neighborhoodObservationOverlap || affectAdjacencyOverlap;

  if (strongLineageOverlap) {
    return true;
  }

  if (weakLineageOverlap && (responseOverlap || glossaryOverlap || threadOverlap)) {
    return true;
  }

  return false;
}

function computeCenterStreak(
  recentSnapshots: Array<{ lifecycle?: LatentCenterLifecycle }>,
  centerCategory: LatentCenterLifecycle["centerCategory"],
): number {
  if (!centerCategory || recentSnapshots.length === 0) {
    return 0;
  }

  let streak = 0;
  for (const snapshot of recentSnapshots) {
    if (snapshot.lifecycle?.centerCategory === centerCategory) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

function computeSwitchCountWindow(recentSnapshots: Array<{ lifecycle?: LatentCenterLifecycle }>, windowSize: number): number {
  const categories = recentSnapshots
    .slice(0, windowSize)
    .map((snapshot) => snapshot.lifecycle?.centerCategory ?? null)
    .filter((category): category is NonNullable<LatentCenterLifecycle["centerCategory"]> => category !== null);

  if (categories.length < 2) {
    return 0;
  }

  let switches = 0;
  for (let index = 1; index < categories.length; index += 1) {
    if (categories[index] !== categories[index - 1]) {
      switches += 1;
    }
  }
  return switches;
}

function toLifecycleState(
  previous: LatentCenterLifecycle | undefined,
  centerCategory: LatentCenterLifecycle["centerCategory"],
  centerEligible: boolean,
  centerSuppressed: boolean,
  persistenceStreak: number,
): LatentCenterLifecycleState {
  if (centerSuppressed) {
    return "suppressed";
  }

  if (!centerEligible || !centerCategory) {
    if (!previous) {
      return "dormant";
    }
    if (previous.centerState === "weakening" || previous.centerState === "suppressed" || previous.centerState === "dormant") {
      return "dormant";
    }
    return "weakening";
  }

  if (persistenceStreak >= LIFECYCLE_STABILIZE_STREAK) {
    return "stabilized";
  }
  if (persistenceStreak >= LIFECYCLE_EMERGE_STREAK) {
    return "emerging";
  }
  return "possible";
}

function modeBaseScore(mode: LatentProcessingMode, categoryScores: Map<string, number>, recurrenceScore: number): number {
  if (mode === "affective") {
    return (
      (categoryScores.get("affect_transition") ?? 0) +
      (categoryScores.get("emotional_contradiction") ?? 0) +
      (categoryScores.get("affective_atmosphere") ?? 0)
    );
  }
  if (mode === "agency_oriented") {
    return (categoryScores.get("agency_state") ?? 0) + (categoryScores.get("metacognitive_moment") ?? 0);
  }
  if (mode === "existential") {
    return (
      (categoryScores.get("spatial_instability") ?? 0) +
      (categoryScores.get("dream_state_quality") ?? 0) +
      (categoryScores.get("altered_realism") ?? 0)
    );
  }
  if (mode === "continuity_oriented") {
    return (categoryScores.get("continuity_fragment") ?? 0) + (categoryScores.get("recurrence_candidate") ?? 0) + recurrenceScore * 0.55;
  }
  return 0;
}

function toMaterialPriority(value: number): number {
  return clamp(value, 0, 1.5);
}

function buildProcessingModeState(input: {
  categoryScores: Map<string, number>;
  recurrenceScore: number;
  centerCategory: LatentCenterLifecycle["centerCategory"];
  centerEligible: boolean;
  centerSuppressed: boolean;
  uncertaintyRatio: number;
  relatedCategories: Observation["fragments"][number]["category"][];
  localGlossaryTerms: GlossaryTerm[];
  localResponses: ReflectiveResponse[];
  localThreads: ReflectiveThread[];
  persistenceStreak: number;
  previousCooldownActive: boolean;
  strongUserSalienceOverride: boolean;
}): LatentProcessingModeState {
  const modeScores = new Map<LatentProcessingMode, number>();
  const exploratoryBase =
    0.4 +
    input.uncertaintyRatio * 1.1 +
    (input.centerEligible ? 0 : 0.2) +
    (input.centerSuppressed ? 0.2 : 0) +
    (input.previousCooldownActive && !input.strongUserSalienceOverride ? 0.15 : 0);
  modeScores.set("exploratory", exploratoryBase);
  modeScores.set("affective", modeBaseScore("affective", input.categoryScores, input.recurrenceScore));
  modeScores.set("agency_oriented", modeBaseScore("agency_oriented", input.categoryScores, input.recurrenceScore));
  modeScores.set("existential", modeBaseScore("existential", input.categoryScores, input.recurrenceScore));
  modeScores.set(
    "continuity_oriented",
    modeBaseScore("continuity_oriented", input.categoryScores, input.recurrenceScore) +
      clamp(input.persistenceStreak / 5, 0, 1) * 0.35 +
      clamp(input.localThreads.length / 4, 0, 1) * 0.2,
  );

  if (input.uncertaintyRatio >= 0.6) {
    for (const mode of ["affective", "agency_oriented", "existential", "continuity_oriented"] as const) {
      modeScores.set(mode, (modeScores.get(mode) ?? 0) * 0.72);
    }
  }
  if (input.previousCooldownActive && !input.strongUserSalienceOverride) {
    for (const mode of ["affective", "agency_oriented", "existential", "continuity_oriented"] as const) {
      modeScores.set(mode, (modeScores.get(mode) ?? 0) * 0.86);
    }
  }
  if (input.centerSuppressed) {
    for (const mode of ["affective", "agency_oriented", "existential", "continuity_oriented"] as const) {
      modeScores.set(mode, (modeScores.get(mode) ?? 0) * 0.8);
    }
  }

  const ranked = [...modeScores.entries()]
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    });
  const top = ranked[0] ?? (["exploratory", 0] as const);
  const second = ranked[1] ?? (["exploratory", 0] as const);

  const topScore = top[1];
  const secondScore = second[1];
  const margin = topScore - secondScore;
  const conflictWeak = margin < MODE_SELECTION_MARGIN && topScore < 1.45;
  const nonExploratoryCompetitiveCount = ranked.filter(([mode, score]) => mode !== "exploratory" && score >= 0.3).length;
  const sparseWeak = !input.centerEligible && topScore < MODE_SELECTION_MIN_SCORE;
  const exploratoryWeakAmbiguous = top[0] === "exploratory" && !input.centerEligible && nonExploratoryCompetitiveCount >= 2 && topScore < 1.8;
  const uncertaintyBlocked = input.uncertaintyRatio >= MODE_SELECTION_MAX_UNCERTAINTY && top[0] !== "exploratory";
  const suppressedBlocked = input.centerSuppressed && topScore < 1.8;

  let selectedMode: LatentProcessingMode | null = top[0];
  let noModeReason: string | null = null;
  if (sparseWeak) {
    selectedMode = null;
    noModeReason = "sparse_reflective_gravity";
  } else if (exploratoryWeakAmbiguous) {
    selectedMode = null;
    noModeReason = "ambiguous_weak_competition";
  } else if (conflictWeak) {
    selectedMode = null;
    noModeReason = "competing_weak_modes";
  } else if (uncertaintyBlocked) {
    if ((modeScores.get("exploratory") ?? 0) >= topScore * 0.88) {
      selectedMode = "exploratory";
    } else {
      selectedMode = null;
      noModeReason = "high_uncertainty";
    }
  } else if (suppressedBlocked) {
    selectedMode = null;
    noModeReason = "suppression_active";
  }

  const modeConfidence = clamp(
    topScore / (topScore + 1.2) + clamp(margin, 0, 0.4) * 0.4 - input.uncertaintyRatio * 0.4 - (selectedMode ? 0 : 0.1),
    0,
    1,
  );
  const modeUncertainty = clamp(input.uncertaintyRatio + (selectedMode ? 0 : 0.12), 0, 1);

  const candidateModes = ranked.slice(0, MODE_CANDIDATE_LIMIT).map(([mode, score]) => ({
    mode,
    score: clamp(score, 0, 3),
    confidenceBand: toConfidenceBand(score),
    rationale: [
      `base=${score.toFixed(2)}`,
      input.centerCategory ? `center=${input.centerCategory}` : "center=none",
      `uncertainty=${input.uncertaintyRatio.toFixed(2)}`,
    ],
  }));

  return {
    selectedMode,
    candidateModes,
    modeConfidence,
    uncertainty: modeUncertainty,
    rationaleTrace: [
      `top=${top[0]}:${topScore.toFixed(2)}`,
      `margin=${margin.toFixed(2)}`,
      `cooldown=${input.previousCooldownActive ? "active" : "none"}`,
      `suppression=${input.centerSuppressed ? "active" : "none"}`,
      `uncertainty=${input.uncertaintyRatio.toFixed(2)}`,
    ],
    noModeReason,
    materialPriorities: {
      observations: toMaterialPriority(clamp(topScore / 1.6, 0, 1.2) + clamp(input.relatedCategories.length / 4, 0, 0.5)),
      glossary: toMaterialPriority(clamp(input.localGlossaryTerms.length / 3, 0, 1.2)),
      notes: toMaterialPriority(clamp(input.localGlossaryTerms.filter((term) => !!term.notes).length / 2, 0, 1.2)),
      responses: toMaterialPriority(clamp(input.localResponses.length / 4, 0, 1.2)),
      neighborhood: toMaterialPriority(clamp(input.relatedCategories.length / 4, 0, 1) + clamp(input.persistenceStreak / 6, 0, 0.5)),
    },
  };
}

function collectLocalTokens(observations: Observation[]): string[] {
  const allTokens = observations.flatMap((observation) =>
    observation.fragments.flatMap((fragment) => tokenize(`${fragment.fragmentText} ${observation.summary}`)),
  );
  return unique(allTokens);
}

function threadHasLocalOverlap(thread: ReflectiveThread, localTokens: string[]): boolean {
  const continuityText = [
    thread.title,
    thread.contextNote ?? "",
    ...thread.continuityCues.flatMap((cue) => [cue.label, cue.phrasing]),
  ].join(" ");
  const threadTokens = new Set(tokenize(continuityText));
  return localTokens.some((token) => threadTokens.has(token));
}

function responseHasLocalOverlap(response: ReflectiveResponse, localTokens: string[]): boolean {
  if (localTokens.length === 0) {
    return false;
  }
  const responseTokens = new Set(tokenize(`${response.title} ${response.responseText}`));
  return localTokens.some((token) => responseTokens.has(token));
}

function hasTokenOverlap(tokens: string[], cueTokens: Set<string>): boolean {
  if (cueTokens.size === 0 || tokens.length === 0) {
    return false;
  }
  return tokens.some((token) => cueTokens.has(token));
}

function selectLocalProvenanceObservations(input: {
  observations: Observation[];
  centerObservationIds: Set<string>;
  neighborhoodObservationIds: Set<string>;
  affectObservationIds: Set<string>;
  localGlossaryTerms: GlossaryTerm[];
  localThreads: ReflectiveThread[];
  localResponses: ReflectiveResponse[];
}): Observation[] {
  const glossaryCueTokens = new Set(input.localGlossaryTerms.flatMap((term) => tokenize(term.normalizedKey)));
  const threadCueTokens = new Set(
    input.localThreads.flatMap((thread) =>
      tokenize(
        [
          thread.title,
          thread.contextNote ?? "",
          ...thread.continuityCues.flatMap((cue) => [cue.label, cue.phrasing]),
        ].join(" "),
      ),
    ),
  );
  const responseCueTokens = new Set(
    input.localResponses.flatMap((response) => tokenize(`${response.title} ${response.responseText}`)),
  );

  const scored = input.observations.map((observation, index) => {
    const observationTokens = tokenize(
      `${observation.summary} ${observation.fragments.map((fragment) => fragment.fragmentText).join(" ")}`,
    );
    let score = 0;
    if (input.centerObservationIds.has(observation.id)) {
      score += 3;
    }
    if (input.neighborhoodObservationIds.has(observation.id)) {
      score += 2;
    }
    if (input.affectObservationIds.has(observation.id)) {
      score += 1;
    }
    if (hasTokenOverlap(observationTokens, glossaryCueTokens)) {
      score += 1;
    }
    if (hasTokenOverlap(observationTokens, threadCueTokens)) {
      score += 1;
    }
    if (hasTokenOverlap(observationTokens, responseCueTokens)) {
      score += 1;
    }
    if (observation.summaryTrace.some((trace) => trace.reason === "explicit_anchor" && trace.strength === "strong")) {
      score += 1;
    }
    return { observation, index, score };
  });

  const selected = scored
    .filter((entry) => entry.score >= LOCAL_PROVENANCE_OBSERVATION_MIN_SCORE)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .slice(0, LOCAL_PROVENANCE_OBSERVATION_LIMIT)
    .map((entry) => entry.observation);

  if (selected.length > 0) {
    return selected;
  }

  return input.observations.slice(0, LOCAL_PROVENANCE_OBSERVATION_FALLBACK);
}

export function buildLatentSnapshotScaffold(input: BuildLatentSnapshotScaffoldInput): CreateLatentSnapshotInput {
  const fragmentCounts = new Map<string, number>();
  const localTokens = collectLocalTokens(input.observations);
  const observationIdsByCategory = collectObservationIdsByCategory(input.observations);
  const nowIso = new Date().toISOString();
  const categoryScores = new Map<string, number>();
  let recurrenceScore = 0;
  let phenomenologyScore = 0;
  let uncertaintyWeightedFragments = 0;
  let totalFragments = 0;

  for (const observation of input.observations) {
    const observationUncertaintyMultiplier = observation.uncertaintyNotes.length > 0 ? 0.85 : 1;
    const semanticMultiplier = SEMANTIC_POLICY_WEIGHT[observation.semanticPolicyResult];
    const provenanceMultiplier = PROVENANCE_WEIGHT[observation.provenanceTier];

    for (const fragment of observation.fragments) {
      const baseWeight = CATEGORY_WEIGHTS[fragment.category] ?? 0.4;
      const evidenceMultiplier = EVIDENCE_WEIGHT[fragment.evidenceAdequacy];
      const uncertaintyMultiplier = fragment.uncertaintyNote ? 0.82 : 1;
      const traceMultiplier = traceMultiplierForFragment(observation, fragment.position);
      const supportMultiplier = fragment.evidence.spanStart !== null && fragment.evidence.spanEnd !== null ? 1.05 : 1;
      const normalizedFragment = fragment.fragmentText.toLowerCase().trim();
      const nextCount = (fragmentCounts.get(normalizedFragment) ?? 0) + 1;
      fragmentCounts.set(normalizedFragment, nextCount);
      const repeatPenalty = recurrencePenalty(nextCount, fragment.evidenceAdequacy);
      const fragmentTokens = tokenize(fragment.fragmentText);
      const glossaryMultiplier = glossaryBoost(fragmentTokens, input.glossaryTerms);
      const responseMultiplier = input.responses.length > 0 ? 1.03 : 1;

      const score =
        baseWeight *
        evidenceMultiplier *
        provenanceMultiplier *
        semanticMultiplier *
        uncertaintyMultiplier *
        observationUncertaintyMultiplier *
        traceMultiplier *
        supportMultiplier *
        repeatPenalty *
        glossaryMultiplier *
        responseMultiplier;

      categoryScores.set(fragment.category, (categoryScores.get(fragment.category) ?? 0) + score);
      totalFragments += 1;
      if (fragment.evidenceAdequacy === "weak_fallback" || fragment.uncertaintyNote || observation.semanticPolicyResult !== "accept") {
        uncertaintyWeightedFragments += 1;
      }

      if (fragment.category === "recurrence_candidate" && hasRecurrenceCue(fragment.fragmentText)) {
        recurrenceScore += score;
      }

      if (PHENOMENOLOGICAL_CATEGORIES.has(fragment.category) && fragment.evidenceAdequacy !== "weak_fallback") {
        phenomenologyScore += score;
      }
    }
  }

  const uncertaintyRatio = totalFragments === 0 ? 1 : uncertaintyWeightedFragments / totalFragments;
  const uncertaintyPropagationPenalty = uncertaintyRatio >= 0.6 ? 0.7 : uncertaintyRatio >= 0.35 ? 0.85 : 1;
  recurrenceScore *= uncertaintyPropagationPenalty;
  phenomenologyScore *= uncertaintyPropagationPenalty;

  const activeGlossaryTerms = input.glossaryTerms.filter(
    (term) => term.state === "active" && term.suppression.state === "none",
  );
  const glossaryNotesCount = activeGlossaryTerms.filter((term) => !!term.notes && term.notes.trim().length > 0).length;
  const glossaryDensityScore = activeGlossaryTerms.length === 0 ? 0 : clamp(glossaryNotesCount / activeGlossaryTerms.length, 0, 1);

  const highlightMetadata = getNumericMetadataValue(input.reflectiveObjectMetadata, [
    "highlightCount",
    "highlight_count",
    "userHighlightCount",
    "user_highlight_count",
  ]);
  const explicitEmphasisMetadata = getNumericMetadataValue(input.reflectiveObjectMetadata, [
    "explicitEmphasis",
    "explicit_emphasis",
    "emphasisScore",
    "emphasis_score",
  ]);

  const highlightProxyFromObservation = input.observations.reduce((count, observation) => {
    const explicitAnchorCount = observation.summaryTrace.filter((trace) => trace.reason === "explicit_anchor").length;
    const userWeighted = observation.provenanceTier === "manual_user" || observation.provenanceTier === "reviewed";
    return count + (userWeighted ? explicitAnchorCount : 0);
  }, 0);

  const recentSnapshots = input.recentSnapshots ?? [];
  const revisitationEvents = recentSnapshots.filter((snapshot) =>
    snapshot.provenance.sourceReflectiveObjects.includes(input.reflectiveObjectId),
  ).length;
  const revisitationScore = clamp(revisitationEvents / 5, 0, 1);

  const recentOpenings = input.recentOpenings ?? [];
  const activatedOpenings = recentOpenings.filter(
    (opening) =>
      opening.provenance.sourceObjects.includes(input.reflectiveObjectId) &&
      (opening.state === "activated" || opening.activatedAt !== null),
  ).length;
  const persistenceSignalScore = clamp(input.responses.length * 0.12 + activatedOpenings * 0.18, 0, 1.2);

  const highlightScore = clamp(highlightMetadata / 5 + highlightProxyFromObservation / 4, 0, 1.4);
  const explicitEmphasisScore = clamp(explicitEmphasisMetadata / 4, 0, 1.2);
  const userOwnedScore = 1 + highlightScore * 0.3 + glossaryDensityScore * 0.2 + revisitationScore * 0.2 + explicitEmphasisScore * 0.15 + persistenceSignalScore * 0.15;

  const recentLifecycles = recentSnapshots.map((snapshot) => snapshot.lifecycle).filter((value): value is LatentCenterLifecycle => !!value);
  const previousLifecycle = recentLifecycles[0];
  const previousCenterCategory = previousLifecycle?.centerCategory ?? null;
  const previousCenterScore = previousLifecycle?.centerScore ?? 0;
  const previousCooldownUntil = previousLifecycle?.cooldownUntil ?? null;
  const previousCooldownActive = previousCooldownUntil ? Date.parse(nowIso) < Date.parse(previousCooldownUntil) : false;
  const strongUserSalienceOverride =
    userOwnedScore >= COOLDOWN_USER_OVERRIDE_SCORE ||
    highlightScore >= COOLDOWN_USER_OVERRIDE_HIGHLIGHT ||
    persistenceSignalScore >= COOLDOWN_USER_OVERRIDE_PERSISTENCE;
  const repeatedCenterCount = computeCenterStreak(recentSnapshots, previousCenterCategory);
  const switchCountWindow = computeSwitchCountWindow(recentSnapshots, COOLDOWN_SWITCH_WINDOW);
  const cooldownSwitchPenalty = switchCountWindow >= COOLDOWN_SWITCH_THRESHOLD ? 0.88 : 1;
  const recurrenceDecay = repeatedCenterCount <= 1 ? 1 : clamp(1 - (repeatedCenterCount - 1) * 0.12, 0.5, 1);
  const refractoryPenalty = userOwnedScore < 1.2 && repeatedCenterCount >= 2 ? 0.82 : 1;
  const attenuationMultiplier = recurrenceDecay * refractoryPenalty * cooldownSwitchPenalty;

  recurrenceScore *= attenuationMultiplier;
  phenomenologyScore *= attenuationMultiplier;
  if (previousCooldownActive && !strongUserSalienceOverride) {
    recurrenceScore *= COOLDOWN_RECURRENCE_PENALTY;
    phenomenologyScore *= COOLDOWN_RECURRENCE_PENALTY;
  }

  const rankedCategories = [...categoryScores.entries()]
    .filter(([category]) => PHENOMENOLOGICAL_CATEGORIES.has(category))
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return left[0].localeCompare(right[0]);
    });
  const centerCandidate = rankedCategories[0] ?? null;
  let centerScore = (centerCandidate?.[1] ?? 0) * attenuationMultiplier * clamp(userOwnedScore, 0.8, 1.6);
  let centerCategory: LatentCenterLifecycle["centerCategory"] =
    (centerCandidate?.[0] as LatentCenterLifecycle["centerCategory"] | undefined) ?? null;

  const candidateIsChallenger = previousCenterCategory && centerCategory && previousCenterCategory !== centerCategory;
  const cooldownChallengesActive = previousCooldownActive && candidateIsChallenger && !strongUserSalienceOverride;
  if (cooldownChallengesActive) {
    centerScore *= COOLDOWN_CHALLENGER_PENALTY;
  }
  if (
    candidateIsChallenger &&
    previousLifecycle &&
    (previousLifecycle.centerState === "stabilized" || previousLifecycle.centerState === "emerging")
  ) {
    const challengerNeedsMargin = switchCountWindow >= COOLDOWN_SWITCH_THRESHOLD ? HYSTERESIS_CHALLENGER_MARGIN + 0.08 : HYSTERESIS_CHALLENGER_MARGIN;
    const cooldownMarginBoost = previousCooldownActive && !strongUserSalienceOverride ? 0.12 : 0;
    if (centerScore < previousCenterScore * (challengerNeedsMargin + cooldownMarginBoost)) {
      centerCategory = previousCenterCategory;
      centerScore = previousCenterScore * 0.94;
    }
  }

  const relatedCategories = rankedCategories
    .slice(0, NEIGHBORHOOD_CATEGORY_LIMIT)
    .map(([category]) => category as LatentCenterLifecycle["neighborhood"]["relatedCategories"][number]);
  const affectAdjacency = relatedCategories.filter(
    (category) => category === "affect_transition" || category === "emotional_contradiction" || category === "affective_atmosphere",
  );
  const localGlossaryTerms = activeGlossaryTerms.filter((term) =>
    tokenize(term.normalizedKey).some((token) => localTokens.includes(token)),
  );
  const localGlossaryTermIds = new Set(localGlossaryTerms.map((term) => term.id));
  const localThreadIds = new Set(
    input.threads
      .filter((thread) => threadHasLocalOverlap(thread, localTokens))
      .map((thread) => thread.id),
  );
  const localThreads = input.threads.filter((thread) => localThreadIds.has(thread.id));
  const localResponses = input.responses.filter((entry) => responseHasLocalOverlap(entry, localTokens));
  const localResponseIds = new Set(localResponses.map((entry) => entry.id));
  const globalCenterObservationIds = collectObservationIdsForCategories(observationIdsByCategory, [centerCategory]);
  const globalNeighborhoodObservationIds = collectObservationIdsForCategories(observationIdsByCategory, relatedCategories);
  const globalAffectObservationIds = collectObservationIdsForCategories(observationIdsByCategory, affectAdjacency);
  const localProvenanceObservations = selectLocalProvenanceObservations({
    observations: input.observations,
    centerObservationIds: globalCenterObservationIds,
    neighborhoodObservationIds: globalNeighborhoodObservationIds,
    affectObservationIds: globalAffectObservationIds,
    localGlossaryTerms,
    localThreads,
    localResponses,
  });
  const localObservationIdsByCategory = collectObservationIdsByCategory(localProvenanceObservations);
  const centerObservationIds = collectObservationIdsForCategories(localObservationIdsByCategory, [centerCategory]);
  const neighborhoodObservationIds = collectObservationIdsForCategories(localObservationIdsByCategory, relatedCategories);
  const affectObservationIds = collectObservationIdsForCategories(localObservationIdsByCategory, affectAdjacency);
  const centerSuppressed = recentOpenings.some((opening) =>
    isCenterLineSuppressionActive(
      opening,
      nowIso,
      input.reflectiveObjectId,
      centerCategory,
      centerObservationIds,
      neighborhoodObservationIds,
      affectObservationIds,
      localGlossaryTermIds,
      localThreadIds,
      localResponseIds,
    ),
  );

  const centerEligible = !centerSuppressed && centerScore >= CENTER_ELIGIBILITY_THRESHOLD && phenomenologyScore >= CENTER_ELIGIBILITY_THRESHOLD;
  const processingModeState = buildProcessingModeState({
    categoryScores,
    recurrenceScore,
    centerCategory,
    centerEligible,
    centerSuppressed,
    uncertaintyRatio,
    relatedCategories,
    localGlossaryTerms,
    localResponses,
    localThreads,
    persistenceStreak: centerEligible && centerCategory
      ? (previousLifecycle?.centerCategory === centerCategory ? (previousLifecycle.persistenceStreak ?? 1) + 1 : 1)
      : 0,
    previousCooldownActive,
    strongUserSalienceOverride,
  });
  const processingMode = processingModeState.selectedMode ?? (centerCategory ? deriveProcessingMode(centerCategory) : "exploratory");

  const provenance = buildProvenance({
    ...input,
    observations: localProvenanceObservations,
    threads: input.threads.filter((thread) => localThreadIds.has(thread.id)),
    responses: localResponses,
  });

  const signals = [];
  const suggestions: Array<Omit<LatentSuggestion, "id" | "snapshotId" | "createdAt" | "updatedAt">> = [];

  const recurrenceEligibilityThreshold =
    previousCooldownActive && !strongUserSalienceOverride ? RECURRENCE_ELIGIBILITY_THRESHOLD * 1.15 : RECURRENCE_ELIGIBILITY_THRESHOLD;
  if (recurrenceScore >= recurrenceEligibilityThreshold) {
    const confidenceBand = toConfidenceBand(recurrenceScore);
    signals.push({
      signalType: "recurrence_possibility" as const,
      label: "Possible recurrence nearby",
      description: "A recurrence-oriented observation fragment appears in current material.",
      confidenceBand,
      visibility: "reflective_space_optional" as const,
      provenance,
    });

    if (confidenceBand !== "low") {
      suggestions.push({
        userId: input.userId,
        suggestionType: "possible_recurrence",
        phrasing: buildSuggestionPhrase("possible_recurrence"),
        confidenceBand,
        visibility: "reflective_space_optional",
        provenance,
      });
    }
  }

  const scopedDormantThreads = input.threads.filter(
    (thread) => thread.state === "dormant" && threadHasLocalOverlap(thread, localTokens),
  );
  if (scopedDormantThreads.length > 0 && totalFragments > 0 && uncertaintyRatio < 0.8 && !(previousCooldownActive && !strongUserSalienceOverride)) {
    const dormantConfidenceBand: LatentConfidenceBand = scopedDormantThreads.length > 1 ? "tentative" : "low";
    signals.push({
      signalType: "dormant_thread_resurfacing_possibility" as const,
      label: "Dormant continuity may be nearby",
      description: "A dormant thread overlaps local reflective context and remains optional.",
      confidenceBand: dormantConfidenceBand,
      visibility: "reflective_space_optional" as const,
      provenance,
    });

    if (dormantConfidenceBand !== "low") {
      suggestions.push({
        userId: input.userId,
        suggestionType: "possible_resurfacing",
        phrasing: buildSuggestionPhrase("possible_resurfacing"),
        confidenceBand: dormantConfidenceBand,
        visibility: "reflective_space_optional",
        provenance,
      });
    }
  }

  if (centerEligible && centerCategory) {
    const centerConfidence = toConfidenceBand(centerScore);
    signals.push({
      signalType: "reflective_opportunity_possibility" as const,
      label: `Reflective center candidate: ${centerCategory}`,
      description: `Weighted center remains provisional (${processingMode}); uncertainty and demotion remain active.`,
      confidenceBand: centerConfidence,
      visibility: "internal_only" as const,
      provenance,
    });

    suggestions.push({
      userId: input.userId,
      suggestionType: "possible_opening",
      phrasing: buildSuggestionPhrase("possible_opening", processingMode),
      confidenceBand: centerConfidence,
      visibility: "reflective_space_optional",
      provenance,
    });
  }

  if (signals.length === 0) {
    signals.push({
      signalType: "continuity_possibility" as const,
      label: "Continuity remains open",
      description: "No center reached eligibility; continuity remains provisional, demotable, and silence-preserving.",
      confidenceBand: "low" as const,
      visibility: "internal_only" as const,
      provenance,
    });
  }

  const persistenceStreak = centerEligible && centerCategory
    ? (previousLifecycle?.centerCategory === centerCategory ? (previousLifecycle.persistenceStreak ?? 1) + 1 : 1)
    : 0;
  const centerState = toLifecycleState(previousLifecycle, centerCategory, centerEligible, centerSuppressed, persistenceStreak);
  const shouldCoolDown =
    (candidateIsChallenger && switchCountWindow >= COOLDOWN_SWITCH_THRESHOLD) ||
    (candidateIsChallenger && previousCooldownActive);
  const cooldownUntil = shouldCoolDown
    ? new Date(Date.parse(nowIso) + COOLDOWN_MINUTES * 60000).toISOString()
    : previousCooldownActive
      ? previousCooldownUntil
      : null;

  const glossaryAnchors = localGlossaryTerms
    .slice(0, 4)
    .map((term) => term.displayLabel);
  const continuityCues = input.threads
    .filter((thread) => threadHasLocalOverlap(thread, localTokens))
    .flatMap((thread) => thread.continuityCues.map((cue) => cue.label))
    .slice(0, 4);

  const lifecycle: LatentCenterLifecycle = {
    centerCategory: centerEligible ? (centerCategory as LatentCenterLifecycle["centerCategory"]) : previousLifecycle?.centerCategory ?? null,
    centerState,
    centerScore: centerEligible ? centerScore : previousCenterScore * (centerState === "weakening" ? 0.68 : 0.52),
    persistenceStreak,
    cooldownUntil,
    noCenterReason: centerEligible
      ? null
      : centerSuppressed
        ? "suppression_active"
        : previousCooldownActive && !strongUserSalienceOverride
          ? "cooldown_active"
          : "insufficient_center_eligibility",
    salience: {
      userOwnedScore: clamp(userOwnedScore, 0.5, 2),
      highlightScore: clamp(highlightScore, 0, 1.5),
      glossaryDensityScore,
      revisitationScore,
      explicitEmphasisScore: clamp(explicitEmphasisScore, 0, 1.3),
      persistenceSignalScore: clamp(persistenceSignalScore, 0, 1.4),
    },
    attenuation: {
      repetitionDecay: recurrenceDecay,
      refractoryPenalty,
      cooldownPenalty: cooldownSwitchPenalty,
    },
    neighborhood: {
      relatedCategories,
      glossaryAnchors,
      affectAdjacency,
      continuityCues,
    },
    processingMode: processingModeState,
  };

  const safeSuggestions = suggestions.map((suggestion, index) =>
    ensureNonAuthoritativeSuggestion({
      id: `latent-suggestion-scaffold-${index}`,
      snapshotId: "latent-snapshot-scaffold",
      userId: suggestion.userId,
      suggestionType: suggestion.suggestionType,
      phrasing: suggestion.phrasing,
      confidenceBand: suggestion.confidenceBand,
      visibility: suggestion.visibility,
      provenance: suggestion.provenance,
      createdAt: "",
      updatedAt: "",
    }),
  );

  return {
    userId: input.userId,
    summary:
      centerEligible && centerCategory
        ? `Center candidate selected: ${centerCategory} (${processingModeState.selectedMode ?? "no_mode"}) with lifecycle state ${centerState}.`
        : `No strong reflective center selected; continuity remains provisional (${centerState}).`,
    confidenceBand: centerEligible ? toConfidenceBand(centerScore) : recurrenceScore >= RECURRENCE_ELIGIBILITY_THRESHOLD ? "tentative" : "low",
    visibility: "internal_only",
    provenance,
    lifecycle,
    signals,
    suggestions: safeSuggestions.map((suggestion) => ({
      suggestionType: suggestion.suggestionType,
      phrasing: suggestion.phrasing,
      confidenceBand: suggestion.confidenceBand,
      visibility: suggestion.visibility,
      provenance: suggestion.provenance,
    })),
  };
}
