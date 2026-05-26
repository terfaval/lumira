import type {
  CreateOpeningActivationEventInput,
  CreateOpeningResponseAssociationInput,
  OpeningActivationContext,
  OpeningResponseContext,
  CreateReflectiveResponseInput,
  CreateResponseObjectAssociationInput,
  CreateResponseThreadAssociationInput,
  ReflectiveResponseSource,
  ReflectiveResponseState,
  ReflectiveResponseVisibility,
  UpdateReflectiveResponseInput,
} from "@/src/domain/responses/types";
import {
  OPENING_ACTIVATION_CONTEXTS,
  OPENING_RESPONSE_CONTEXTS,
  REFLECTIVE_RESPONSE_SOURCES,
  REFLECTIVE_RESPONSE_STATES,
  REFLECTIVE_RESPONSE_VISIBILITIES,
} from "@/src/domain/responses/types";
import type { OpeningId, ReflectiveObjectId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseResponseState(value: unknown): ReflectiveResponseState | null {
  if (typeof value !== "string") {
    return null;
  }
  return REFLECTIVE_RESPONSE_STATES.includes(value as ReflectiveResponseState)
    ? (value as ReflectiveResponseState)
    : null;
}

function parseResponseVisibility(value: unknown): ReflectiveResponseVisibility | null {
  if (typeof value !== "string") {
    return null;
  }
  return REFLECTIVE_RESPONSE_VISIBILITIES.includes(value as ReflectiveResponseVisibility)
    ? (value as ReflectiveResponseVisibility)
    : null;
}

function parseResponseSource(value: unknown): ReflectiveResponseSource | null {
  if (typeof value !== "string") {
    return null;
  }
  return REFLECTIVE_RESPONSE_SOURCES.includes(value as ReflectiveResponseSource)
    ? (value as ReflectiveResponseSource)
    : null;
}

function parseOpeningActivationContext(value: unknown): OpeningActivationContext | null {
  if (typeof value !== "string") {
    return null;
  }

  return OPENING_ACTIVATION_CONTEXTS.includes(value as OpeningActivationContext)
    ? (value as OpeningActivationContext)
    : null;
}

function parseOpeningResponseContext(value: unknown): OpeningResponseContext | null {
  if (typeof value !== "string") {
    return null;
  }

  return OPENING_RESPONSE_CONTEXTS.includes(value as OpeningResponseContext)
    ? (value as OpeningResponseContext)
    : null;
}

export function parseCreateReflectiveResponseInput(
  payload: unknown,
  userId: UserId,
): ParseResult<CreateReflectiveResponseInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) {
    return { ok: false, error: "title is required." };
  }

  const responseText = typeof record.responseText === "string" ? record.responseText.trim() : "";
  if (!responseText) {
    return { ok: false, error: "responseText is required." };
  }

  const source = record.source === undefined ? undefined : parseResponseSource(record.source);
  if (record.source !== undefined && !source) {
    return { ok: false, error: "Invalid response source." };
  }

  const state = record.state === undefined ? undefined : parseResponseState(record.state);
  if (record.state !== undefined && !state) {
    return { ok: false, error: "Invalid response state." };
  }
  if (state === "archived") {
    return { ok: false, error: "New responses cannot start archived." };
  }

  const visibility = record.visibility === undefined ? undefined : parseResponseVisibility(record.visibility);
  if (record.visibility !== undefined && !visibility) {
    return { ok: false, error: "Invalid response visibility." };
  }

  return {
    ok: true,
    value: {
      userId,
      title,
      responseText,
      source: source ?? undefined,
      state: state ?? undefined,
      visibility: visibility ?? undefined,
    },
  };
}

export function parseUpdateReflectiveResponseInput(
  payload: unknown,
  responseId: ReflectiveResponseId,
  userId: UserId,
): ParseResult<UpdateReflectiveResponseInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const title = typeof record.title === "string" ? record.title.trim() : undefined;
  const responseText = typeof record.responseText === "string" ? record.responseText.trim() : undefined;

  const nextState = record.nextState === undefined ? undefined : parseResponseState(record.nextState);
  if (record.nextState !== undefined && !nextState) {
    return { ok: false, error: "Invalid response state transition target." };
  }

  const visibility = record.visibility === undefined ? undefined : parseResponseVisibility(record.visibility);
  if (record.visibility !== undefined && !visibility) {
    return { ok: false, error: "Invalid response visibility." };
  }

  if (!title && !responseText && !nextState && !visibility) {
    return { ok: false, error: "At least one update field is required." };
  }

  return {
    ok: true,
    value: {
      responseId,
      userId,
      title,
      responseText,
      nextState: nextState ?? undefined,
      visibility: visibility ?? undefined,
    },
  };
}

export function parseCreateResponseObjectAssociationInput(
  payload: unknown,
  responseId: ReflectiveResponseId,
  userId: UserId,
): ParseResult<CreateResponseObjectAssociationInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const reflectiveObjectId = typeof record.reflectiveObjectId === "string"
    ? (record.reflectiveObjectId.trim() as ReflectiveObjectId)
    : null;

  if (!reflectiveObjectId) {
    return { ok: false, error: "reflectiveObjectId is required." };
  }

  const associationLabel = typeof record.associationLabel === "string" ? record.associationLabel.trim() : undefined;

  return {
    ok: true,
    value: {
      userId,
      responseId,
      reflectiveObjectId,
      associationLabel,
    },
  };
}

export function parseCreateResponseThreadAssociationInput(
  payload: unknown,
  responseId: ReflectiveResponseId,
  userId: UserId,
): ParseResult<CreateResponseThreadAssociationInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const threadId = typeof record.threadId === "string" ? (record.threadId.trim() as ThreadId) : null;
  if (!threadId) {
    return { ok: false, error: "threadId is required." };
  }

  const associationLabel = typeof record.associationLabel === "string" ? record.associationLabel.trim() : undefined;

  return {
    ok: true,
    value: {
      userId,
      responseId,
      threadId,
      associationLabel,
    },
  };
}

export function parseDeleteAssociationTarget(payload: unknown, field: "threadId" | "reflectiveObjectId"): ParseResult<string> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const value = typeof record[field] === "string" ? record[field].trim() : "";
  if (!value) {
    return { ok: false, error: `${field} is required.` };
  }

  return { ok: true, value };
}

export function parseCreateOpeningActivationEventInput(
  payload: unknown,
  openingId: OpeningId,
  userId: UserId,
): ParseResult<CreateOpeningActivationEventInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const activationSource = parseOpeningActivationContext(record.activationSource);
  if (!activationSource) {
    return { ok: false, error: "Valid activationSource is required." };
  }

  const activationContext = record.activationContext === undefined
    ? activationSource
    : parseOpeningActivationContext(record.activationContext);
  if (!activationContext) {
    return { ok: false, error: "Invalid activationContext." };
  }

  const openingResponseContext = record.openingResponseContext === undefined
    ? "activation_without_response"
    : parseOpeningResponseContext(record.openingResponseContext);
  if (!openingResponseContext) {
    return { ok: false, error: "Invalid openingResponseContext." };
  }

  const responseId = typeof record.responseId === "string" ? record.responseId.trim() : "";
  if (openingResponseContext === "response_authored" && !responseId) {
    return { ok: false, error: "responseId is required when openingResponseContext is response_authored." };
  }
  if (openingResponseContext === "activation_without_response" && responseId) {
    return { ok: false, error: "responseId is not allowed for activation_without_response context." };
  }

  return {
    ok: true,
    value: {
      userId,
      openingId,
      activationSource,
      activationContext,
      openingResponseContext,
      responseId: responseId || undefined,
    },
  };
}

export function parseCreateOpeningResponseAssociationInput(
  payload: unknown,
  openingId: OpeningId,
  userId: UserId,
): ParseResult<CreateOpeningResponseAssociationInput> {
  const record = asRecord(payload);
  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const activationContext = parseOpeningActivationContext(record.openingActivationContext);
  if (!activationContext) {
    return { ok: false, error: "Valid openingActivationContext is required." };
  }

  const openingResponseContext = record.openingResponseContext === undefined
    ? "response_authored"
    : parseOpeningResponseContext(record.openingResponseContext);
  if (!openingResponseContext || openingResponseContext === "activation_without_response") {
    return { ok: false, error: "openingResponseContext must be response_authored for response associations." };
  }

  const activationEventId = typeof record.activationEventId === "string" ? record.activationEventId.trim() : undefined;
  const threadId = typeof record.threadId === "string" ? record.threadId.trim() : undefined;
  const associationLabel = typeof record.associationLabel === "string" ? record.associationLabel.trim() : undefined;

  return {
    ok: true,
    value: {
      userId,
      openingId,
      responseId: "" as ReflectiveResponseId,
      openingActivationContext: activationContext,
      openingResponseContext,
      activationEventId,
      threadId,
      associationLabel,
    },
  };
}
