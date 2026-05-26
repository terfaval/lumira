import type {
  CreateOpeningInput,
  Opening,
  OpeningReactivationInput,
  OpeningSurface,
  OpeningSurfaceEvent,
  OpeningSuppressionInput,
} from "@/src/domain/openings/types";

export interface OpeningRow {
  id: string;
  user_id: string;
  opening_type: Opening["openingType"];
  tone: Opening["tone"];
  utterance: string;
  state: Opening["state"];
  visibility: Opening["visibility"];
  suppression_state: Opening["suppressionState"];
  suppression_duration: Opening["suppressionDuration"];
  suppression_reason: string | null;
  suppression_expires_at: string | null;
  suppression_revisit_eligibility: Opening["suppressionRevisitEligibility"];
  suppression_reactivated_at: string | null;
  latent_snapshot_id: string | null;
  source_objects: string[] | null;
  source_observations: string[] | null;
  source_glossary_terms: string[] | null;
  source_threads: string[] | null;
  source_responses: string[] | null;
  confidence_band: Opening["provenance"]["confidenceBand"];
  opening_generation_context: string;
  activated_at: string | null;
  dismissed_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningSuppressionRow {
  id: string;
  user_id: string;
  opening_id: string;
  suppression_state: Opening["suppressionState"];
  suppression_duration: Opening["suppressionDuration"];
  suppression_reason: string | null;
  suppression_expires_at: string | null;
  suppression_revisit_eligibility: Opening["suppressionRevisitEligibility"];
  suppression_reactivated_at: string | null;
  suppressed_at: string;
  created_at: string;
  updated_at: string;
}

export interface OpeningSurfaceEventRow {
  id: string;
  user_id: string;
  opening_id: string;
  event_type: OpeningSurfaceEvent["eventType"];
  source: OpeningSurfaceEvent["source"];
  created_at: string;
  updated_at: string;
}

export interface OpeningInsertRow {
  user_id: string;
  opening_type: Opening["openingType"];
  tone: Opening["tone"];
  utterance: string;
  state: Opening["state"];
  visibility: Opening["visibility"];
  suppression_state: Opening["suppressionState"];
  suppression_duration: Opening["suppressionDuration"];
  suppression_reason: string | null;
  suppression_expires_at: string | null;
  suppression_revisit_eligibility: Opening["suppressionRevisitEligibility"];
  suppression_reactivated_at: string | null;
  latent_snapshot_id: string | null;
  source_objects: string[];
  source_observations: string[];
  source_glossary_terms: string[];
  source_threads: string[];
  source_responses: string[];
  confidence_band: Opening["provenance"]["confidenceBand"];
  opening_generation_context: string;
}

export interface OpeningUpdateRow {
  state?: Opening["state"];
  visibility?: Opening["visibility"];
  suppression_state?: Opening["suppressionState"];
  suppression_duration?: Opening["suppressionDuration"];
  suppression_reason?: string | null;
  suppression_expires_at?: string | null;
  suppression_revisit_eligibility?: Opening["suppressionRevisitEligibility"];
  suppression_reactivated_at?: string | null;
  activated_at?: string | null;
  dismissed_at?: string | null;
}

export interface OpeningSurfaceEventInsertRow {
  user_id: string;
  opening_id: string;
  event_type: OpeningSurfaceEvent["eventType"];
  source: OpeningSurfaceEvent["source"];
}

function toPreview(utterance: string): string {
  const normalized = utterance.trim();
  if (normalized.length <= 84) {
    return normalized;
  }

  return `${normalized.slice(0, 81)}...`;
}

export function fromOpeningRow(row: OpeningRow): Opening {
  return {
    id: row.id,
    userId: row.user_id,
    openingType: row.opening_type,
    tone: row.tone,
    utterance: row.utterance,
    state: row.state,
    visibility: row.visibility,
    suppressionState: row.suppression_state,
    suppressionDuration: row.suppression_duration,
    suppressionReason: row.suppression_reason,
    suppressionExpiry: {
      at: row.suppression_expires_at,
    },
    suppressionRevisitEligibility: row.suppression_revisit_eligibility,
    suppressionReactivatedAt: row.suppression_reactivated_at,
    provenance: {
      sourceObjects: row.source_objects ?? [],
      sourceObservations: row.source_observations ?? [],
      sourceGlossaryTerms: row.source_glossary_terms ?? [],
      sourceThreads: row.source_threads ?? [],
      sourceResponses: row.source_responses ?? [],
      latentSnapshotReference: row.latent_snapshot_id,
      confidenceBand: row.confidence_band,
      openingGenerationContext: row.opening_generation_context,
    },
    activatedAt: row.activated_at,
    dismissedAt: row.dismissed_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOpeningSurface(row: OpeningRow): OpeningSurface {
  return {
    openingId: row.id,
    userId: row.user_id,
    openingType: row.opening_type,
    tone: row.tone,
    visibility: row.visibility,
    suppressionState: row.suppression_state,
    suppressionDuration: row.suppression_duration,
    suppressionRevisitEligibility: row.suppression_revisit_eligibility,
    state: row.state,
    preview: toPreview(row.utterance),
    activated: row.state === "activated",
    createdAt: row.created_at,
  };
}

export function toOpeningInsertRow(input: CreateOpeningInput): OpeningInsertRow {
  return {
    user_id: input.userId,
    opening_type: input.openingType,
    tone: input.tone,
    utterance: input.utterance,
    state: "available",
    visibility: input.visibility ?? "invitation_surface",
    suppression_state: "none",
    suppression_duration: null,
    suppression_reason: null,
    suppression_expires_at: null,
    suppression_revisit_eligibility: "revisitable_dormant",
    suppression_reactivated_at: null,
    latent_snapshot_id: input.provenance.latentSnapshotReference,
    source_objects: input.provenance.sourceObjects,
    source_observations: input.provenance.sourceObservations,
    source_glossary_terms: input.provenance.sourceGlossaryTerms,
    source_threads: input.provenance.sourceThreads,
    source_responses: input.provenance.sourceResponses,
    confidence_band: input.provenance.confidenceBand,
    opening_generation_context: input.provenance.openingGenerationContext,
  };
}

export function toOpeningActivationUpdate(now: string): OpeningUpdateRow {
  return {
    state: "activated",
    visibility: "opened",
    activated_at: now,
  };
}

export function toOpeningDismissalUpdate(now: string): OpeningUpdateRow {
  return {
    state: "dismissed",
    dismissed_at: now,
  };
}

export function toOpeningSuppressionUpdate(input: OpeningSuppressionInput): OpeningUpdateRow {
  const isSuppressed = input.nextState === "suppressed";
  const isTemporary = input.duration === "temporary";
  const expiryMinutes = input.suppressionExpiryMinutes ?? null;
  const suppressionExpiresAt = isSuppressed && isTemporary && expiryMinutes && expiryMinutes > 0
    ? new Date(Date.now() + expiryMinutes * 60000).toISOString()
    : null;

  return {
    suppression_state: input.nextState,
    suppression_duration: isSuppressed ? (input.duration ?? "indefinite") : "user_reactivated",
    suppression_reason: isSuppressed ? input.suppressionReason ?? null : null,
    suppression_expires_at: suppressionExpiresAt,
    suppression_revisit_eligibility: isSuppressed
      ? (input.suppressionRevisitEligibility ?? "revisitable_dormant")
      : "user_reactivated",
    suppression_reactivated_at: isSuppressed ? null : new Date().toISOString(),
  };
}

export function toOpeningSuppressionRow(input: OpeningSuppressionInput): Omit<OpeningSuppressionRow, "id" | "created_at" | "updated_at"> {
  const isSuppressed = input.nextState === "suppressed";
  const isTemporary = input.duration === "temporary";
  const expiryMinutes = input.suppressionExpiryMinutes ?? null;
  const suppressionExpiresAt = isSuppressed && isTemporary && expiryMinutes && expiryMinutes > 0
    ? new Date(Date.now() + expiryMinutes * 60000).toISOString()
    : null;

  return {
    user_id: input.userId,
    opening_id: input.openingId,
    suppression_state: input.nextState,
    suppression_duration: isSuppressed ? (input.duration ?? "indefinite") : "user_reactivated",
    suppression_reason: isSuppressed ? input.suppressionReason ?? null : null,
    suppression_expires_at: suppressionExpiresAt,
    suppression_revisit_eligibility: isSuppressed
      ? (input.suppressionRevisitEligibility ?? "revisitable_dormant")
      : "user_reactivated",
    suppression_reactivated_at: isSuppressed ? null : new Date().toISOString(),
    suppressed_at: new Date().toISOString(),
  };
}

export function toOpeningReactivationUpdate(): OpeningUpdateRow {
  return {
    suppression_state: "none",
    suppression_duration: "user_reactivated",
    suppression_reason: null,
    suppression_expires_at: null,
    suppression_revisit_eligibility: "user_reactivated",
    suppression_reactivated_at: new Date().toISOString(),
  };
}

export function toOpeningReactivationSuppressionInput(input: OpeningReactivationInput): OpeningSuppressionInput {
  return {
    openingId: input.openingId,
    userId: input.userId,
    nextState: "none",
    duration: "user_reactivated",
    suppressionRevisitEligibility: "user_reactivated",
  };
}

export function fromOpeningSurfaceEventRow(row: OpeningSurfaceEventRow): OpeningSurfaceEvent {
  return {
    id: row.id,
    openingId: row.opening_id,
    userId: row.user_id,
    eventType: row.event_type,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toOpeningSurfaceEventInsertRow(
  event: Omit<OpeningSurfaceEvent, "id" | "createdAt" | "updatedAt">,
): OpeningSurfaceEventInsertRow {
  return {
    user_id: event.userId,
    opening_id: event.openingId,
    event_type: event.eventType,
    source: event.source,
  };
}
