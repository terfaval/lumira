import type {
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  CreateGlossaryTermInput,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  GlossarySuppressionState,
  GlossaryTerm,
} from "@/src/domain/glossary/types";

type GlossaryTermStateRow = "active" | "archived";
type GlossaryCandidateStateRow = "candidate" | "pinned" | "suppressed" | "ignored";
type GlossarySuppressionStateRow = "none" | "suppressed";

export interface GlossaryTermRow {
  id: string;
  user_id: string;
  normalized_key: string;
  display_label: string;
  notes: string | null;
  state: GlossaryTermStateRow;
  suppression_state: GlossarySuppressionStateRow;
  suppression_reason: string | null;
  suppressed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlossaryCandidateRow {
  id: string;
  user_id: string;
  reflective_object_id: string;
  normalized_key: string;
  display_label: string;
  source_category:
    | "scene"
    | "actor"
    | "interaction"
    | "emotion"
    | "location"
    | "transition"
    | "object"
    | "body_state"
    | "dream_quality"
    | "recurrence_candidate"
    | "agency_state"
    | "metacognitive_moment"
    | "affect_transition"
    | "emotional_contradiction"
    | "affective_atmosphere"
    | "spatial_instability"
    | "dream_state_quality"
    | "continuity_fragment"
    | "altered_realism";
  source_observation_id: string | null;
  source_observation_fragment_id: string | null;
  recurrence_count: number;
  state: GlossaryCandidateStateRow;
  suppression_state: GlossarySuppressionStateRow;
  suppression_reason: string | null;
  suppressed_at: string | null;
  last_seen_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlossaryAssociationRow {
  id: string;
  user_id: string;
  glossary_term_id: string;
  reflective_object_id: string | null;
  observation_id: string | null;
  observation_fragment_id: string | null;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTermInsertRow {
  user_id: string;
  normalized_key: string;
  display_label: string;
  notes: string | null;
  state: "active";
  suppression_state: "none";
}

export interface GlossaryCandidateInsertRow {
  user_id: string;
  reflective_object_id: string;
  normalized_key: string;
  display_label: string;
  source_category: GlossaryCandidateRow["source_category"];
  source_observation_id: string | null;
  source_observation_fragment_id: string | null;
  recurrence_count: number;
  state: "candidate";
  suppression_state: "none";
  suppression_reason: null;
  suppressed_at: null;
  last_seen_at: string;
}

export interface GlossaryAssociationInsertRow {
  user_id: string;
  glossary_term_id: string;
  reflective_object_id: string | null;
  observation_id: string | null;
  observation_fragment_id: string | null;
  association_label: string | null;
}

export interface GlossaryCandidateLifecycleUpdateRow {
  state: GlossaryCandidateStateRow;
  display_label?: string;
  suppression_state: GlossarySuppressionStateRow;
  suppression_reason: string | null;
  suppressed_at: string | null;
}

function toSuppression(
  suppressionState: GlossarySuppressionStateRow,
  suppressedAt: string | null,
  reason: string | null,
): GlossarySuppressionState {
  return {
    state: suppressionState,
    suppressedAt,
    reason,
  };
}

export function fromGlossaryTermRow(row: GlossaryTermRow): GlossaryTerm {
  return {
    id: row.id,
    userId: row.user_id,
    normalizedKey: row.normalized_key,
    displayLabel: row.display_label,
    notes: row.notes,
    state: row.state,
    suppression: toSuppression(row.suppression_state, row.suppressed_at, row.suppression_reason),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromGlossaryCandidateRow(row: GlossaryCandidateRow): GlossaryCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    reflectiveObjectId: row.reflective_object_id,
    normalizedKey: row.normalized_key,
    displayLabel: row.display_label,
    sourceCategory: row.source_category,
    sourceObservationId: row.source_observation_id,
    sourceObservationFragmentId: row.source_observation_fragment_id,
    recurrenceCount: row.recurrence_count,
    state: row.state,
    suppression: toSuppression(row.suppression_state, row.suppressed_at, row.suppression_reason),
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromGlossaryAssociationRow(row: GlossaryAssociationRow): GlossaryAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    glossaryTermId: row.glossary_term_id,
    reflectiveObjectId: row.reflective_object_id,
    observationId: row.observation_id,
    observationFragmentId: row.observation_fragment_id,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGlossaryTermInsertRow(input: CreateGlossaryTermInput): GlossaryTermInsertRow {
  return {
    user_id: input.userId,
    normalized_key: input.normalizedKey,
    display_label: input.displayLabel,
    notes: input.notes ?? null,
    state: "active",
    suppression_state: "none",
  };
}

export function toGlossaryCandidateInsertRow(
  input: CreateGlossaryCandidateInput,
  now: string,
): GlossaryCandidateInsertRow {
  return {
    user_id: input.userId,
    reflective_object_id: input.reflectiveObjectId,
    normalized_key: input.normalizedKey,
    display_label: input.displayLabel,
    source_category: input.sourceCategory,
    source_observation_id: input.sourceObservationId ?? null,
    source_observation_fragment_id: input.sourceObservationFragmentId ?? null,
    recurrence_count: input.recurrenceCount ?? 1,
    state: "candidate",
    suppression_state: "none",
    suppression_reason: null,
    suppressed_at: null,
    last_seen_at: now,
  };
}

export function toGlossaryAssociationInsertRow(input: CreateGlossaryAssociationInput): GlossaryAssociationInsertRow {
  return {
    user_id: input.userId,
    glossary_term_id: input.glossaryTermId,
    reflective_object_id: input.reflectiveObjectId ?? null,
    observation_id: input.observationId ?? null,
    observation_fragment_id: input.observationFragmentId ?? null,
    association_label: input.associationLabel ?? null,
  };
}

export function toGlossaryCandidateLifecycleUpdateRow(
  input: GlossaryCandidateLifecycleUpdate,
  now: string,
): GlossaryCandidateLifecycleUpdateRow {
  const isSuppressed = input.nextState === "suppressed";

  return {
    state: input.nextState,
    display_label: input.displayLabel,
    suppression_state: isSuppressed ? "suppressed" : "none",
    suppression_reason: isSuppressed ? input.suppressionReason ?? null : null,
    suppressed_at: isSuppressed ? now : null,
  };
}
