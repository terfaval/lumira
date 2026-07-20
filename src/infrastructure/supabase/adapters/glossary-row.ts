import type {
  CreateGlossaryAppearanceRecordInput,
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  CreateGlossaryTermInput,
  GlossaryAppearanceRecord,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  GlossarySuppressionState,
  GlossaryTerm,
} from "@/src/domain/glossary/types";

type GlossaryTermStateRow = "active" | "archived";
type GlossaryCandidateStateRow = "candidate" | "pinned" | "suppressed" | "ignored";
type GlossaryCandidateClassRow = "match_candidate" | "ambiguous_match_candidate" | "new_candidate";
type GlossarySuppressionStateRow = "none" | "suppressed";

export interface GlossaryTermRow {
  id: string;
  user_id: string;
  normalized_key: string;
  display_label: string;
  canonical_label: string;
  type: CreateGlossaryTermInput["type"];
  aliases: string[];
  general_note: string | null;
  appearance_count: number;
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
  identity_key?: string | null;
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
  candidate_class: GlossaryCandidateClassRow;
  proposed_entity_ids: string[];
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

export interface GlossaryAppearanceRecordRow {
  id: string;
  user_id: string;
  entity_id: string;
  dream_id: string;
  appearance_note: string | null;
  confirmed_at: string;
  created_at: string;
  updated_at: string;
}

export interface GlossaryTermInsertRow {
  user_id: string;
  normalized_key: string;
  display_label: string;
  canonical_label: string;
  type: CreateGlossaryTermInput["type"];
  aliases: string[];
  general_note: string | null;
  appearance_count: number;
  notes: string | null;
  state: "active";
  suppression_state: "none";
}

export interface GlossaryCandidateInsertRow {
  user_id: string;
  reflective_object_id: string;
  identity_key: string | null;
  normalized_key: string;
  display_label: string;
  source_category: GlossaryCandidateRow["source_category"];
  source_observation_id: string | null;
  source_observation_fragment_id: string | null;
  recurrence_count: number;
  candidate_class: GlossaryCandidateClassRow;
  proposed_entity_ids: string[];
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

export interface GlossaryAppearanceRecordInsertRow {
  user_id: string;
  entity_id: string;
  dream_id: string;
  appearance_note: string | null;
  confirmed_at: string;
}

export interface GlossaryCandidateLifecycleUpdateRow {
  state: GlossaryCandidateStateRow;
  display_label?: string;
  candidate_class?: GlossaryCandidateClassRow;
  proposed_entity_ids?: string[];
  suppression_state: GlossarySuppressionStateRow;
  suppression_reason: string | null;
  suppressed_at: string | null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidLike(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function toUniqueUuidList(values: string[] | undefined): string[] {
  if (!values) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!isUuidLike(value) || seen.has(value)) {
      continue;
    }

    seen.add(value);
    result.push(value);
  }

  return result;
}

export function normalizeGlossaryCandidateMetadata(input: {
  candidateClass?: GlossaryCandidate["candidateClass"];
  proposedEntityIds?: string[];
}): {
  candidateClass: GlossaryCandidate["candidateClass"];
  proposedEntityIds: string[];
} {
  const proposedEntityIds = toUniqueUuidList(input.proposedEntityIds);

  if (proposedEntityIds.length === 0) {
    return {
      candidateClass: "new_candidate",
      proposedEntityIds: [],
    };
  }

  if (proposedEntityIds.length === 1) {
    return {
      candidateClass: "match_candidate",
      proposedEntityIds,
    };
  }

  return {
    candidateClass: "ambiguous_match_candidate",
    proposedEntityIds,
  };
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

function resolveAuthoritativeGeneralNote(input: { general_note: string | null; notes: string | null }): string | null {
  return input.general_note ?? input.notes ?? null;
}

export function fromGlossaryTermRow(row: GlossaryTermRow): GlossaryTerm {
  const generalNote = resolveAuthoritativeGeneralNote(row);

  return {
    id: row.id,
    userId: row.user_id,
    normalizedKey: row.normalized_key,
    displayLabel: row.display_label,
    canonicalLabel: row.canonical_label,
    type: row.type,
    aliases: row.aliases,
    generalNote,
    appearanceCount: row.appearance_count,
    notes: generalNote,
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
    identityKey: row.identity_key ?? null,
    normalizedKey: row.normalized_key,
    displayLabel: row.display_label,
    sourceCategory: row.source_category,
    sourceObservationId: row.source_observation_id,
    sourceObservationFragmentId: row.source_observation_fragment_id,
    recurrenceCount: row.recurrence_count,
    candidateClass: row.candidate_class ?? "new_candidate",
    proposedEntityIds: row.proposed_entity_ids ?? [],
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

export function fromGlossaryAppearanceRecordRow(row: GlossaryAppearanceRecordRow): GlossaryAppearanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    entityId: row.entity_id,
    dreamId: row.dream_id,
    appearanceNote: row.appearance_note,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toGlossaryTermInsertRow(input: CreateGlossaryTermInput): GlossaryTermInsertRow {
  const generalNote = input.generalNote ?? null;

  return {
    user_id: input.userId,
    normalized_key: input.normalizedKey,
    display_label: input.displayLabel,
    canonical_label: input.canonicalLabel,
    type: input.type,
    aliases: input.aliases ?? [],
    general_note: generalNote,
    appearance_count: input.appearanceCount ?? 0,
    notes: generalNote,
    state: "active",
    suppression_state: "none",
  };
}

export function toGlossaryCandidateInsertRow(
  input: CreateGlossaryCandidateInput,
  now: string,
): GlossaryCandidateInsertRow {
  const metadata = normalizeGlossaryCandidateMetadata({
    candidateClass: input.candidateClass,
    proposedEntityIds: input.proposedEntityIds,
  });

  return {
    user_id: input.userId,
    reflective_object_id: input.reflectiveObjectId,
    identity_key: input.identityKey ?? null,
    normalized_key: input.normalizedKey,
    display_label: input.displayLabel,
    source_category: input.sourceCategory,
    source_observation_id: input.sourceObservationId ?? null,
    source_observation_fragment_id: input.sourceObservationFragmentId ?? null,
    recurrence_count: input.recurrenceCount ?? 1,
    candidate_class: metadata.candidateClass,
    proposed_entity_ids: metadata.proposedEntityIds,
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

export function toGlossaryAppearanceRecordInsertRow(
  input: CreateGlossaryAppearanceRecordInput,
): GlossaryAppearanceRecordInsertRow {
  return {
    user_id: input.userId,
    entity_id: input.entityId,
    dream_id: input.dreamId,
    appearance_note: input.appearanceNote ?? null,
    confirmed_at: input.confirmedAt,
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
    candidate_class: input.candidateClass,
    proposed_entity_ids: input.proposedEntityIds,
    suppression_state: isSuppressed ? "suppressed" : "none",
    suppression_reason: isSuppressed ? input.suppressionReason ?? null : null,
    suppressed_at: isSuppressed ? now : null,
  };
}
