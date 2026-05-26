import {
  LATENT_CONFIDENCE_BANDS,
  LATENT_CENTER_LIFECYCLE_STATES,
  LATENT_PROCESSING_MODES,
  LATENT_SIGNAL_TYPES,
  LATENT_SUGGESTION_TYPES,
  LATENT_VISIBILITIES,
  type LatentCenterLifecycle,
  type LatentConfidenceBand,
  type LatentCenterLifecycleState,
  type LatentSignalType,
  type LatentSuggestionType,
  type LatentVisibility,
} from "@/src/domain/latent/types";
import { OBSERVATION_CATEGORIES, type ObservationCategory } from "@/src/domain/observation/types";

export function isLatentConfidenceBand(value: unknown): value is LatentConfidenceBand {
  return typeof value === "string" && LATENT_CONFIDENCE_BANDS.includes(value as LatentConfidenceBand);
}

export function isLatentVisibility(value: unknown): value is LatentVisibility {
  return typeof value === "string" && LATENT_VISIBILITIES.includes(value as LatentVisibility);
}

export function isLatentSignalType(value: unknown): value is LatentSignalType {
  return typeof value === "string" && LATENT_SIGNAL_TYPES.includes(value as LatentSignalType);
}

export function isLatentSuggestionType(value: unknown): value is LatentSuggestionType {
  return typeof value === "string" && LATENT_SUGGESTION_TYPES.includes(value as LatentSuggestionType);
}

export function isLatentCenterLifecycleState(value: unknown): value is LatentCenterLifecycleState {
  return typeof value === "string" && LATENT_CENTER_LIFECYCLE_STATES.includes(value as LatentCenterLifecycleState);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function normalizeCategories(values: unknown, maxSize: number): ObservationCategory[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const set = new Set<ObservationCategory>();
  for (const value of values) {
    if (typeof value === "string" && OBSERVATION_CATEGORIES.includes(value as ObservationCategory)) {
      set.add(value as ObservationCategory);
    }
    if (set.size >= maxSize) {
      break;
    }
  }
  return Array.from(set);
}

function normalizeStringArray(values: unknown, maxSize: number): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const set = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }
    set.add(normalized.slice(0, 120));
    if (set.size >= maxSize) {
      break;
    }
  }
  return Array.from(set);
}

function isLatentProcessingMode(value: unknown): value is Exclude<LatentCenterLifecycle["processingMode"]["selectedMode"], null> {
  return typeof value === "string" && LATENT_PROCESSING_MODES.includes(value as (typeof LATENT_PROCESSING_MODES)[number]);
}

function normalizeProcessingMode(payload: unknown): LatentCenterLifecycle["processingMode"] {
  const modePayload = isRecord(payload) ? payload : {};

  const selectedMode = isLatentProcessingMode(modePayload.selectedMode) ? modePayload.selectedMode : null;
  const candidateModesRaw = Array.isArray(modePayload.candidateModes) ? modePayload.candidateModes : [];
  const candidateModes = candidateModesRaw
    .map((candidate) => {
      if (!isRecord(candidate) || !isLatentProcessingMode(candidate.mode)) {
        return null;
      }
      const score = toFiniteNumber(candidate.score);
      const confidenceBand = isLatentConfidenceBand(candidate.confidenceBand) ? candidate.confidenceBand : null;
      if (score === null || !confidenceBand) {
        return null;
      }
      return {
        mode: candidate.mode,
        score: clamp(score, 0, 3),
        confidenceBand,
        rationale: normalizeStringArray(candidate.rationale, 4),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .slice(0, 5);

  const materialPriorities = isRecord(modePayload.materialPriorities) ? modePayload.materialPriorities : {};
  return {
    selectedMode,
    candidateModes,
    modeConfidence: clamp(toFiniteNumber(modePayload.modeConfidence) ?? 0, 0, 1),
    uncertainty: clamp(toFiniteNumber(modePayload.uncertainty) ?? 1, 0, 1),
    rationaleTrace: normalizeStringArray(modePayload.rationaleTrace, 8),
    noModeReason: typeof modePayload.noModeReason === "string" ? modePayload.noModeReason.slice(0, 120) : null,
    materialPriorities: {
      observations: clamp(toFiniteNumber(materialPriorities.observations) ?? 0, 0, 1.5),
      glossary: clamp(toFiniteNumber(materialPriorities.glossary) ?? 0, 0, 1.5),
      notes: clamp(toFiniteNumber(materialPriorities.notes) ?? 0, 0, 1.5),
      responses: clamp(toFiniteNumber(materialPriorities.responses) ?? 0, 0, 1.5),
      neighborhood: clamp(toFiniteNumber(materialPriorities.neighborhood) ?? 0, 0, 1.5),
    },
  };
}

export function normalizeLatentCenterLifecyclePayload(payload: unknown): LatentCenterLifecycle | null {
  if (!isRecord(payload) || Object.keys(payload).length === 0) {
    return null;
  }

  const centerState = payload.centerState;
  if (!isLatentCenterLifecycleState(centerState)) {
    return null;
  }

  const rawCenterScore = toFiniteNumber(payload.centerScore);
  const rawPersistenceStreak = toFiniteNumber(payload.persistenceStreak);
  if (rawCenterScore === null || rawPersistenceStreak === null) {
    return null;
  }

  const centerCategoryValue = payload.centerCategory;
  const centerCategory: ObservationCategory | null =
    centerCategoryValue === null
      ? null
      : typeof centerCategoryValue === "string" && OBSERVATION_CATEGORIES.includes(centerCategoryValue as ObservationCategory)
        ? (centerCategoryValue as ObservationCategory)
        : null;
  if (centerCategoryValue !== null && centerCategory === null) {
    return null;
  }

  const cooldownUntilRaw = payload.cooldownUntil;
  const cooldownUntil = cooldownUntilRaw === null ? null : isIsoTimestamp(cooldownUntilRaw) ? cooldownUntilRaw : null;

  const noCenterReasonRaw = payload.noCenterReason;
  const noCenterReason = noCenterReasonRaw === null ? null : typeof noCenterReasonRaw === "string" ? noCenterReasonRaw.slice(0, 120) : null;

  const salience = isRecord(payload.salience) ? payload.salience : {};
  const attenuation = isRecord(payload.attenuation) ? payload.attenuation : {};
  const neighborhood = isRecord(payload.neighborhood) ? payload.neighborhood : {};

  return {
    centerCategory,
    centerState,
    centerScore: clamp(rawCenterScore, 0, 100),
    persistenceStreak: Math.floor(clamp(rawPersistenceStreak, 0, 1000)),
    cooldownUntil,
    noCenterReason,
    salience: {
      userOwnedScore: clamp(toFiniteNumber(salience.userOwnedScore) ?? 1, 0, 4),
      highlightScore: clamp(toFiniteNumber(salience.highlightScore) ?? 0, 0, 4),
      glossaryDensityScore: clamp(toFiniteNumber(salience.glossaryDensityScore) ?? 0, 0, 1),
      revisitationScore: clamp(toFiniteNumber(salience.revisitationScore) ?? 0, 0, 2),
      explicitEmphasisScore: clamp(toFiniteNumber(salience.explicitEmphasisScore) ?? 0, 0, 4),
      persistenceSignalScore: clamp(toFiniteNumber(salience.persistenceSignalScore) ?? 0, 0, 4),
    },
    attenuation: {
      repetitionDecay: clamp(toFiniteNumber(attenuation.repetitionDecay) ?? 1, 0, 1.5),
      refractoryPenalty: clamp(toFiniteNumber(attenuation.refractoryPenalty) ?? 1, 0, 1.5),
      cooldownPenalty: clamp(toFiniteNumber(attenuation.cooldownPenalty) ?? 1, 0, 1.5),
    },
    neighborhood: {
      relatedCategories: normalizeCategories(neighborhood.relatedCategories, 6),
      glossaryAnchors: normalizeStringArray(neighborhood.glossaryAnchors, 8),
      affectAdjacency: normalizeCategories(neighborhood.affectAdjacency, 6),
      continuityCues: normalizeStringArray(neighborhood.continuityCues, 8),
    },
    processingMode: normalizeProcessingMode(payload.processingMode),
  };
}
