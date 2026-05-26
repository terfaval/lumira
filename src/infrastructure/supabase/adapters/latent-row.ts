import type {
  CreateLatentSignalInput,
  LatentCenterLifecycle,
  CreateLatentSnapshotInput,
  CreateLatentSuggestionInput,
  LatentProvenance,
  LatentSignal,
  LatentSnapshot,
  LatentSuggestion,
} from "@/src/domain/latent/types";
import { normalizeLatentCenterLifecyclePayload } from "@/src/domain/latent/validation";
import type { LatentSnapshotId } from "@/src/shared/types";

export interface LatentSnapshotRow {
  id: string;
  user_id: string;
  summary: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[] | null;
  source_observations: string[] | null;
  source_glossary_terms: string[] | null;
  source_threads: string[] | null;
  source_responses: string[] | null;
  center_category?: string | null;
  center_state?: "possible" | "emerging" | "stabilized" | "weakening" | "dormant" | "suppressed" | null;
  center_score?: number | null;
  center_persistence_streak?: number | null;
  center_cooldown_until?: string | null;
  lifecycle_payload?: unknown;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LatentSignalRow {
  id: string;
  snapshot_id: string;
  user_id: string;
  signal_type:
    | "recurrence_possibility"
    | "continuity_possibility"
    | "dormant_thread_resurfacing_possibility"
    | "reflective_opportunity_possibility";
  label: string;
  description: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[] | null;
  source_observations: string[] | null;
  source_glossary_terms: string[] | null;
  source_threads: string[] | null;
  source_responses: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface LatentSuggestionRow {
  id: string;
  snapshot_id: string;
  user_id: string;
  suggestion_type: "possible_connection" | "possible_recurrence" | "possible_resurfacing" | "possible_opening";
  phrasing: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[] | null;
  source_observations: string[] | null;
  source_glossary_terms: string[] | null;
  source_threads: string[] | null;
  source_responses: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface LatentSnapshotInsertRow {
  user_id: string;
  summary: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[];
  source_observations: string[];
  source_glossary_terms: string[];
  source_threads: string[];
  source_responses: string[];
  center_category?: string | null;
  center_state?: "possible" | "emerging" | "stabilized" | "weakening" | "dormant" | "suppressed" | null;
  center_score?: number | null;
  center_persistence_streak?: number | null;
  center_cooldown_until?: string | null;
  lifecycle_payload?: Record<string, unknown>;
}

export interface LatentSignalInsertRow {
  snapshot_id: string;
  user_id: string;
  signal_type: LatentSignalRow["signal_type"];
  label: string;
  description: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[];
  source_observations: string[];
  source_glossary_terms: string[];
  source_threads: string[];
  source_responses: string[];
}

export interface LatentSuggestionInsertRow {
  snapshot_id: string;
  user_id: string;
  suggestion_type: LatentSuggestionRow["suggestion_type"];
  phrasing: string;
  confidence_band: "low" | "tentative" | "moderate";
  visibility: "internal_only" | "reflective_space_optional";
  generation_context: string;
  source_reflective_objects: string[];
  source_observations: string[];
  source_glossary_terms: string[];
  source_threads: string[];
  source_responses: string[];
}

function toProvenance(row: {
  generation_context: string;
  source_reflective_objects: string[] | null;
  source_observations: string[] | null;
  source_glossary_terms: string[] | null;
  source_threads: string[] | null;
  source_responses: string[] | null;
}): LatentProvenance {
  return {
    generationContext: row.generation_context,
    sourceReflectiveObjects: row.source_reflective_objects ?? [],
    sourceObservations: row.source_observations ?? [],
    sourceGlossaryTerms: row.source_glossary_terms ?? [],
    sourceThreads: row.source_threads ?? [],
    sourceResponses: row.source_responses ?? [],
  };
}

function fromSignalRow(row: LatentSignalRow): LatentSignal {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    userId: row.user_id,
    signalType: row.signal_type,
    label: row.label,
    description: row.description,
    confidenceBand: row.confidence_band,
    visibility: row.visibility,
    provenance: toProvenance(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromSuggestionRow(row: LatentSuggestionRow): LatentSuggestion {
  return {
    id: row.id,
    snapshotId: row.snapshot_id,
    userId: row.user_id,
    suggestionType: row.suggestion_type,
    phrasing: row.phrasing,
    confidenceBand: row.confidence_band,
    visibility: row.visibility,
    provenance: toProvenance(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toLegacyLifecycle(snapshotRow: LatentSnapshotRow): LatentCenterLifecycle | undefined {
  if (!snapshotRow.center_state) {
    return undefined;
  }
  return {
    centerCategory: (snapshotRow.center_category as LatentCenterLifecycle["centerCategory"]) ?? null,
    centerState: snapshotRow.center_state,
    centerScore: snapshotRow.center_score ?? 0,
    persistenceStreak: snapshotRow.center_persistence_streak ?? 0,
    cooldownUntil: snapshotRow.center_cooldown_until ?? null,
    noCenterReason: null,
    salience: {
      userOwnedScore: 1,
      highlightScore: 0,
      glossaryDensityScore: 0,
      revisitationScore: 0,
      explicitEmphasisScore: 0,
      persistenceSignalScore: 0,
    },
    attenuation: {
      repetitionDecay: 1,
      refractoryPenalty: 1,
      cooldownPenalty: 1,
    },
    neighborhood: {
      relatedCategories: [],
      glossaryAnchors: [],
      affectAdjacency: [],
      continuityCues: [],
    },
    processingMode: {
      selectedMode: null,
      candidateModes: [],
      modeConfidence: 0,
      uncertainty: 1,
      rationaleTrace: [],
      noModeReason: "legacy_payload",
      materialPriorities: {
        observations: 0,
        glossary: 0,
        notes: 0,
        responses: 0,
        neighborhood: 0,
      },
    },
  };
}

export function fromLatentRows(
  snapshotRow: LatentSnapshotRow,
  signalRows: LatentSignalRow[],
  suggestionRows: LatentSuggestionRow[],
): LatentSnapshot {
  const snapshotId: LatentSnapshotId = snapshotRow.id;
  const normalizedLifecycle =
    normalizeLatentCenterLifecyclePayload(snapshotRow.lifecycle_payload) ??
    normalizeLatentCenterLifecyclePayload(toLegacyLifecycle(snapshotRow));

  return {
    id: snapshotId,
    userId: snapshotRow.user_id,
    summary: snapshotRow.summary,
    confidenceBand: snapshotRow.confidence_band,
    visibility: snapshotRow.visibility,
    provenance: toProvenance(snapshotRow),
    signals: signalRows.filter((row) => row.snapshot_id === snapshotId).map(fromSignalRow),
    suggestions: suggestionRows.filter((row) => row.snapshot_id === snapshotId).map(fromSuggestionRow),
    lifecycle: normalizedLifecycle ?? undefined,
    archivedAt: snapshotRow.archived_at,
    createdAt: snapshotRow.created_at,
    updatedAt: snapshotRow.updated_at,
  };
}

export function toLatentSnapshotInsertRow(input: CreateLatentSnapshotInput): LatentSnapshotInsertRow {
  const normalizedLifecycle = normalizeLatentCenterLifecyclePayload(input.lifecycle);
  return {
    user_id: input.userId,
    summary: input.summary,
    confidence_band: input.confidenceBand,
    visibility: input.visibility,
    generation_context: input.provenance.generationContext,
    source_reflective_objects: input.provenance.sourceReflectiveObjects,
    source_observations: input.provenance.sourceObservations,
    source_glossary_terms: input.provenance.sourceGlossaryTerms,
    source_threads: input.provenance.sourceThreads,
    source_responses: input.provenance.sourceResponses,
    center_category: normalizedLifecycle?.centerCategory ?? null,
    center_state: normalizedLifecycle?.centerState ?? null,
    center_score: normalizedLifecycle?.centerScore ?? 0,
    center_persistence_streak: normalizedLifecycle?.persistenceStreak ?? 0,
    center_cooldown_until: normalizedLifecycle?.cooldownUntil ?? null,
    lifecycle_payload: (normalizedLifecycle ?? {}) as Record<string, unknown>,
  };
}

export function toLatentSignalInsertRows(snapshotId: string, input: CreateLatentSnapshotInput): LatentSignalInsertRow[] {
  return input.signals.map((signal: CreateLatentSignalInput) => ({
    snapshot_id: snapshotId,
    user_id: input.userId,
    signal_type: signal.signalType,
    label: signal.label,
    description: signal.description,
    confidence_band: signal.confidenceBand,
    visibility: signal.visibility,
    generation_context: signal.provenance.generationContext,
    source_reflective_objects: signal.provenance.sourceReflectiveObjects,
    source_observations: signal.provenance.sourceObservations,
    source_glossary_terms: signal.provenance.sourceGlossaryTerms,
    source_threads: signal.provenance.sourceThreads,
    source_responses: signal.provenance.sourceResponses,
  }));
}

export function toLatentSuggestionInsertRows(snapshotId: string, input: CreateLatentSnapshotInput): LatentSuggestionInsertRow[] {
  return input.suggestions.map((suggestion: CreateLatentSuggestionInput) => ({
    snapshot_id: snapshotId,
    user_id: input.userId,
    suggestion_type: suggestion.suggestionType,
    phrasing: suggestion.phrasing,
    confidence_band: suggestion.confidenceBand,
    visibility: suggestion.visibility,
    generation_context: suggestion.provenance.generationContext,
    source_reflective_objects: suggestion.provenance.sourceReflectiveObjects,
    source_observations: suggestion.provenance.sourceObservations,
    source_glossary_terms: suggestion.provenance.sourceGlossaryTerms,
    source_threads: suggestion.provenance.sourceThreads,
    source_responses: suggestion.provenance.sourceResponses,
  }));
}
