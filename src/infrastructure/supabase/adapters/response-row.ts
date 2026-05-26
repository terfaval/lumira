import type {
  CreateOpeningActivationEventInput,
  CreateOpeningResponseAssociationInput,
  OpeningActivationEvent,
  OpeningResponseAssociation,
  CreateReflectiveResponseInput,
  CreateResponseObjectAssociationInput,
  CreateResponseThreadAssociationInput,
  ReflectiveResponse,
  ReflectiveResponseAssociation,
  ReflectiveResponseSource,
  ReflectiveResponseState,
  ReflectiveResponseVisibility,
  UpdateReflectiveResponseInput,
} from "@/src/domain/responses/types";

export interface ReflectiveResponseRow {
  id: string;
  user_id: string;
  title: string;
  response_text: string;
  state: ReflectiveResponseState;
  visibility: ReflectiveResponseVisibility;
  source: ReflectiveResponseSource;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseObjectAssociationRow {
  id: string;
  user_id: string;
  response_id: string;
  reflective_object_id: string;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseThreadAssociationRow {
  id: string;
  user_id: string;
  response_id: string;
  thread_id: string;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningActivationEventRow {
  id: string;
  user_id: string;
  opening_id: string;
  activation_source: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  activation_context: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  opening_response_context: "activation_without_response" | "response_authored";
  response_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpeningResponseAssociationRow {
  id: string;
  user_id: string;
  opening_id: string;
  response_id: string;
  activation_event_id: string | null;
  opening_response_context: "response_authored";
  opening_activation_context: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  thread_id: string | null;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReflectiveResponseInsertRow {
  user_id: string;
  title: string;
  response_text: string;
  state: "active" | "quiet";
  visibility: ReflectiveResponseVisibility;
  source: ReflectiveResponseSource;
}

export interface ReflectiveResponseUpdateRow {
  title?: string;
  response_text?: string;
  state?: ReflectiveResponseState;
  visibility?: ReflectiveResponseVisibility;
}

export interface ResponseObjectAssociationInsertRow {
  user_id: string;
  response_id: string;
  reflective_object_id: string;
  association_label: string | null;
}

export interface ResponseThreadAssociationInsertRow {
  user_id: string;
  response_id: string;
  thread_id: string;
  association_label: string | null;
}

export interface OpeningActivationEventInsertRow {
  user_id: string;
  opening_id: string;
  activation_source: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  activation_context: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  opening_response_context: "activation_without_response" | "response_authored";
  response_id: string | null;
}

export interface OpeningResponseAssociationInsertRow {
  user_id: string;
  opening_id: string;
  response_id: string;
  activation_event_id: string | null;
  opening_response_context: "response_authored";
  opening_activation_context: "reflective_space_surface" | "continuity_revisit" | "manual_revisit";
  thread_id: string | null;
  association_label: string | null;
}

export function fromReflectiveResponseRow(row: ReflectiveResponseRow): ReflectiveResponse {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    responseText: row.response_text,
    state: row.state,
    visibility: row.visibility,
    source: row.source,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromResponseObjectAssociationRow(row: ResponseObjectAssociationRow): ReflectiveResponseAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    responseId: row.response_id,
    kind: "reflective_object",
    openingId: null,
    reflectiveObjectId: row.reflective_object_id,
    threadId: null,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromResponseThreadAssociationRow(row: ResponseThreadAssociationRow): ReflectiveResponseAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    responseId: row.response_id,
    kind: "reflective_thread",
    openingId: null,
    reflectiveObjectId: null,
    threadId: row.thread_id,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromOpeningResponseAssociationAsResponseAssociation(
  row: OpeningResponseAssociationRow,
): ReflectiveResponseAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    responseId: row.response_id,
    kind: "opening",
    openingId: row.opening_id,
    reflectiveObjectId: null,
    threadId: row.thread_id,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromOpeningActivationEventRow(row: OpeningActivationEventRow): OpeningActivationEvent {
  return {
    id: row.id,
    userId: row.user_id,
    openingId: row.opening_id,
    activationSource: row.activation_source,
    activationContext: row.activation_context,
    openingResponseContext: row.opening_response_context,
    responseId: row.response_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromOpeningResponseAssociationRow(row: OpeningResponseAssociationRow): OpeningResponseAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    openingId: row.opening_id,
    responseId: row.response_id,
    activationEventId: row.activation_event_id,
    openingResponseContext: row.opening_response_context,
    openingActivationContext: row.opening_activation_context,
    threadId: row.thread_id,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toReflectiveResponseInsertRow(input: CreateReflectiveResponseInput): ReflectiveResponseInsertRow {
  return {
    user_id: input.userId,
    title: input.title,
    response_text: input.responseText,
    state: input.state ?? "active",
    visibility: input.visibility ?? "ambient",
    source: input.source ?? "manual_entry",
  };
}

export function toReflectiveResponseUpdateRow(input: UpdateReflectiveResponseInput): ReflectiveResponseUpdateRow {
  const row: ReflectiveResponseUpdateRow = {};

  if (input.title !== undefined) {
    row.title = input.title;
  }

  if (input.responseText !== undefined) {
    row.response_text = input.responseText;
  }

  if (input.nextState !== undefined) {
    row.state = input.nextState;
  }

  if (input.visibility !== undefined) {
    row.visibility = input.visibility;
  }

  return row;
}

export function toResponseObjectAssociationInsertRow(input: CreateResponseObjectAssociationInput): ResponseObjectAssociationInsertRow {
  return {
    user_id: input.userId,
    response_id: input.responseId,
    reflective_object_id: input.reflectiveObjectId,
    association_label: input.associationLabel ?? null,
  };
}

export function toResponseThreadAssociationInsertRow(input: CreateResponseThreadAssociationInput): ResponseThreadAssociationInsertRow {
  return {
    user_id: input.userId,
    response_id: input.responseId,
    thread_id: input.threadId,
    association_label: input.associationLabel ?? null,
  };
}

export function toOpeningActivationEventInsertRow(input: CreateOpeningActivationEventInput): OpeningActivationEventInsertRow {
  return {
    user_id: input.userId,
    opening_id: input.openingId,
    activation_source: input.activationSource,
    activation_context: input.activationContext,
    opening_response_context: input.openingResponseContext,
    response_id: input.responseId ?? null,
  };
}

export function toOpeningResponseAssociationInsertRow(input: CreateOpeningResponseAssociationInput): OpeningResponseAssociationInsertRow {
  return {
    user_id: input.userId,
    opening_id: input.openingId,
    response_id: input.responseId,
    activation_event_id: input.activationEventId ?? null,
    opening_response_context: input.openingResponseContext ?? "response_authored",
    opening_activation_context: input.openingActivationContext,
    thread_id: input.threadId ?? null,
    association_label: input.associationLabel ?? null,
  };
}
