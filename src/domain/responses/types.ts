import type {
  OpeningActivationEventId,
  OpeningId,
  OpeningResponseAssociationId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ResponseAssociationId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const REFLECTIVE_RESPONSE_STATES = ["active", "quiet", "archived"] as const;
export type ReflectiveResponseState = (typeof REFLECTIVE_RESPONSE_STATES)[number];

export const REFLECTIVE_RESPONSE_VISIBILITIES = ["foreground", "ambient", "hidden"] as const;
export type ReflectiveResponseVisibility = (typeof REFLECTIVE_RESPONSE_VISIBILITIES)[number];

export const REFLECTIVE_RESPONSE_SOURCES = ["manual_entry", "guided_prompt_response"] as const;
export type ReflectiveResponseSource = (typeof REFLECTIVE_RESPONSE_SOURCES)[number];

export const OPENING_RESPONSE_CONTEXTS = ["activation_without_response", "response_authored"] as const;
export type OpeningResponseContext = (typeof OPENING_RESPONSE_CONTEXTS)[number];

export const OPENING_ACTIVATION_CONTEXTS = [
  "reflective_space_surface",
  "continuity_revisit",
  "manual_revisit",
] as const;
export type OpeningActivationContext = (typeof OPENING_ACTIVATION_CONTEXTS)[number];

export interface ReflectiveResponse extends VersionedTimestamps {
  id: ReflectiveResponseId;
  userId: UserId;
  title: string;
  responseText: string;
  state: ReflectiveResponseState;
  visibility: ReflectiveResponseVisibility;
  source: ReflectiveResponseSource;
  archivedAt: string | null;
}

export type ReflectiveResponseAssociationKind = "reflective_object" | "reflective_thread" | "opening";

export interface ReflectiveResponseAssociation extends VersionedTimestamps {
  id: ResponseAssociationId;
  userId: UserId;
  responseId: ReflectiveResponseId;
  kind: ReflectiveResponseAssociationKind;
  openingId: OpeningId | null;
  reflectiveObjectId: ReflectiveObjectId | null;
  threadId: ThreadId | null;
  associationLabel: string | null;
}

export interface OpeningActivationEvent extends VersionedTimestamps {
  id: OpeningActivationEventId;
  userId: UserId;
  openingId: OpeningId;
  activationSource: OpeningActivationContext;
  activationContext: OpeningActivationContext;
  openingResponseContext: OpeningResponseContext;
  responseId: ReflectiveResponseId | null;
}

export interface OpeningResponseAssociation extends VersionedTimestamps {
  id: OpeningResponseAssociationId;
  userId: UserId;
  openingId: OpeningId;
  responseId: ReflectiveResponseId;
  activationEventId: OpeningActivationEventId | null;
  openingResponseContext: OpeningResponseContext;
  openingActivationContext: OpeningActivationContext;
  threadId: ThreadId | null;
  associationLabel: string | null;
}

export interface CreateReflectiveResponseInput {
  userId: UserId;
  title: string;
  responseText: string;
  source?: ReflectiveResponseSource;
  state?: Extract<ReflectiveResponseState, "active" | "quiet">;
  visibility?: ReflectiveResponseVisibility;
}

export interface UpdateReflectiveResponseInput {
  responseId: ReflectiveResponseId;
  userId: UserId;
  title?: string;
  responseText?: string;
  nextState?: ReflectiveResponseState;
  visibility?: ReflectiveResponseVisibility;
}

export interface CreateResponseObjectAssociationInput {
  userId: UserId;
  responseId: ReflectiveResponseId;
  reflectiveObjectId: ReflectiveObjectId;
  associationLabel?: string | null;
}

export interface CreateResponseThreadAssociationInput {
  userId: UserId;
  responseId: ReflectiveResponseId;
  threadId: ThreadId;
  associationLabel?: string | null;
}

export interface CreateOpeningActivationEventInput {
  userId: UserId;
  openingId: OpeningId;
  activationSource: OpeningActivationContext;
  activationContext: OpeningActivationContext;
  openingResponseContext: OpeningResponseContext;
  responseId?: ReflectiveResponseId | null;
}

export interface CreateOpeningResponseAssociationInput {
  userId: UserId;
  openingId: OpeningId;
  responseId: ReflectiveResponseId;
  activationEventId?: OpeningActivationEventId | null;
  openingResponseContext?: Exclude<OpeningResponseContext, "activation_without_response">;
  openingActivationContext: OpeningActivationContext;
  threadId?: ThreadId | null;
  associationLabel?: string | null;
}
