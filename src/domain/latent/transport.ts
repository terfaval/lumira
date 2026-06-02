import type { LatentCenterLifecycleState, LatentConfidenceBand, LatentProvenance, LatentSnapshot, LatentSignal, LatentSuggestion } from "@/src/domain/latent/types";

/**
 * Explicit marker list for orchestration fields that must remain internal-only.
 * These keys must never be returned by default route transport payloads.
 */
export const LATENT_INTERNAL_ONLY_ORCHESTRATION_FIELDS = [
  "centerCategory",
  "centerScore",
  "persistenceStreak",
  "cooldownUntil",
  "salience",
  "attenuation",
  "neighborhood",
  "processingMode",
  "candidateModes",
  "rationaleTrace",
  "materialPriorities",
  "modeConfidence",
  "uncertainty",
] as const;

export interface PublicLatentLifecycleState {
  centerState: LatentCenterLifecycleState;
  noCenterReason: string | null;
}

export interface PublicLatentSignal {
  id: string;
  signalType: LatentSignal["signalType"];
  label: string;
  description: string;
  confidenceBand: LatentConfidenceBand;
  provenance: LatentProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface PublicLatentSuggestion {
  id: string;
  suggestionType: LatentSuggestion["suggestionType"];
  phrasing: string;
  confidenceBand: LatentConfidenceBand;
  provenance: LatentProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface PublicLatentSnapshot {
  id: string;
  userId: string;
  summary: string;
  confidenceBand: LatentConfidenceBand;
  provenance: LatentProvenance;
  lifecycle: PublicLatentLifecycleState | null;
  signals: PublicLatentSignal[];
  suggestions: PublicLatentSuggestion[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function toSafeSummary(snapshot: LatentSnapshot): string {
  const state = snapshot.lifecycle?.centerState;
  if (!state) {
    return "Reflective continuity remains open and revisable.";
  }
  if (state === "suppressed") {
    return "A continuity line is currently suppressed and optional.";
  }
  if (state === "dormant" || state === "weakening") {
    return "No strong center is currently foregrounded; continuity remains open.";
  }
  return "A provisional reflective center is present and remains revisable.";
}

function toPublicSignal(signal: LatentSignal): PublicLatentSignal {
  return {
    id: signal.id,
    signalType: signal.signalType,
    label: signal.label,
    description: signal.description,
    confidenceBand: signal.confidenceBand,
    provenance: signal.provenance,
    createdAt: signal.createdAt,
    updatedAt: signal.updatedAt,
  };
}

function toPublicSuggestion(suggestion: LatentSuggestion): PublicLatentSuggestion {
  return {
    id: suggestion.id,
    suggestionType: suggestion.suggestionType,
    phrasing: suggestion.phrasing,
    confidenceBand: suggestion.confidenceBand,
    provenance: suggestion.provenance,
    createdAt: suggestion.createdAt,
    updatedAt: suggestion.updatedAt,
  };
}

/**
 * Public/downstream-safe transport projection.
 * Internal orchestration details are intentionally excluded.
 */
export function toPublicLatentSnapshot(snapshot: LatentSnapshot): PublicLatentSnapshot {
  return {
    id: snapshot.id,
    userId: snapshot.userId,
    summary: toSafeSummary(snapshot),
    confidenceBand: snapshot.confidenceBand,
    provenance: snapshot.provenance,
    lifecycle: snapshot.lifecycle
      ? {
          centerState: snapshot.lifecycle.centerState,
          noCenterReason: snapshot.lifecycle.noCenterReason,
        }
      : null,
    signals: snapshot.signals.filter((signal) => signal.visibility === "reflective_space_optional").map(toPublicSignal),
    suggestions: snapshot.suggestions.filter((suggestion) => suggestion.visibility === "reflective_space_optional").map(toPublicSuggestion),
    archivedAt: snapshot.archivedAt,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

export function toPublicLatentSnapshots(snapshots: LatentSnapshot[]): PublicLatentSnapshot[] {
  return snapshots.map(toPublicLatentSnapshot);
}

/**
 * Internal/orchestration projection.
 * This is an explicit identity boundary to document intentional internal access.
 */
export function toInternalLatentSnapshot(snapshot: LatentSnapshot): LatentSnapshot {
  return snapshot;
}
