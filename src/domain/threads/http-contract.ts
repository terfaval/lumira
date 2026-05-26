import type {
  CreateReflectiveThreadInput,
  CreateThreadGlossaryAssociationInput,
  CreateThreadObjectAssociationInput,
  ThreadContinuityCue,
  ThreadState,
  ThreadVisibility,
  UpdateReflectiveThreadInput,
} from "@/src/domain/threads/types";
import { THREAD_STATES, THREAD_VISIBILITIES } from "@/src/domain/threads/types";
import type { GlossaryTermId, ReflectiveObjectId, ThreadId, UserId } from "@/src/shared/types";

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function parseThreadState(value: unknown): ThreadState | null {
  if (typeof value !== "string") {
    return null;
  }

  return THREAD_STATES.includes(value as ThreadState) ? (value as ThreadState) : null;
}

function parseThreadVisibility(value: unknown): ThreadVisibility | null {
  if (typeof value !== "string") {
    return null;
  }

  return THREAD_VISIBILITIES.includes(value as ThreadVisibility) ? (value as ThreadVisibility) : null;
}

function parseContinuityCues(value: unknown): ThreadContinuityCue[] | null {
  if (!Array.isArray(value)) {
    return [];
  }

  const cues: ThreadContinuityCue[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const cue = asRecord(value[i]);
    if (!cue) {
      return null;
    }

    const label = typeof cue.label === "string" ? cue.label.trim() : "";
    const phrasing = typeof cue.phrasing === "string" ? cue.phrasing.trim() : "";
    const source = cue.source;

    if (!label || !phrasing) {
      return null;
    }

    if (source !== "manual_note" && source !== "object_association" && source !== "glossary_association") {
      return null;
    }

    cues.push({
      label,
      phrasing,
      source,
    });
  }

  return cues;
}

export function parseCreateReflectiveThreadInput(payload: unknown, userId: UserId): ParseResult<CreateReflectiveThreadInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!title) {
    return { ok: false, error: "title is required." };
  }

  const contextNote = typeof record.contextNote === "string" ? record.contextNote.trim() : undefined;
  const state = record.state === undefined ? undefined : parseThreadState(record.state);
  if (record.state !== undefined && !state) {
    return { ok: false, error: "Invalid thread state." };
  }
  if (state === "archived") {
    return { ok: false, error: "New threads cannot start archived." };
  }

  const visibility = record.visibility === undefined ? undefined : parseThreadVisibility(record.visibility);
  if (record.visibility !== undefined && !visibility) {
    return { ok: false, error: "Invalid thread visibility." };
  }

  const continuityCues = parseContinuityCues(record.continuityCues);
  if (continuityCues === null) {
    return { ok: false, error: "Invalid continuity cues." };
  }

  return {
    ok: true,
    value: {
      userId,
      title,
      contextNote,
      state: state ?? undefined,
      visibility: visibility ?? undefined,
      continuityCues: continuityCues ?? undefined,
    },
  };
}

export function parseUpdateReflectiveThreadInput(
  payload: unknown,
  threadId: ThreadId,
  userId: UserId,
): ParseResult<UpdateReflectiveThreadInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const title = typeof record.title === "string" ? record.title.trim() : undefined;
  const contextNote = typeof record.contextNote === "string" ? record.contextNote.trim() : undefined;

  const nextState = record.nextState === undefined ? undefined : parseThreadState(record.nextState);
  if (record.nextState !== undefined && !nextState) {
    return { ok: false, error: "Invalid thread state transition target." };
  }

  const visibility = record.visibility === undefined ? undefined : parseThreadVisibility(record.visibility);
  if (record.visibility !== undefined && !visibility) {
    return { ok: false, error: "Invalid thread visibility." };
  }

  const continuityCues = record.continuityCues === undefined ? undefined : parseContinuityCues(record.continuityCues);
  if (record.continuityCues !== undefined && continuityCues === null) {
    return { ok: false, error: "Invalid continuity cues." };
  }

  if (!title && contextNote === undefined && !nextState && !visibility && continuityCues === undefined) {
    return { ok: false, error: "At least one update field is required." };
  }

  return {
    ok: true,
    value: {
      threadId,
      userId,
      title,
      contextNote,
      nextState: nextState ?? undefined,
      visibility: visibility ?? undefined,
      continuityCues: continuityCues ?? undefined,
    },
  };
}

export function parseCreateThreadObjectAssociationInput(
  payload: unknown,
  threadId: ThreadId,
  userId: UserId,
): ParseResult<CreateThreadObjectAssociationInput> {
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
      threadId,
      reflectiveObjectId,
      associationLabel,
    },
  };
}

export function parseCreateThreadGlossaryAssociationInput(
  payload: unknown,
  threadId: ThreadId,
  userId: UserId,
): ParseResult<CreateThreadGlossaryAssociationInput> {
  const record = asRecord(payload);

  if (!record) {
    return { ok: false, error: "Request body must be an object." };
  }

  const glossaryTermId = typeof record.glossaryTermId === "string" ? (record.glossaryTermId.trim() as GlossaryTermId) : null;

  if (!glossaryTermId) {
    return { ok: false, error: "glossaryTermId is required." };
  }

  const associationLabel = typeof record.associationLabel === "string" ? record.associationLabel.trim() : undefined;

  return {
    ok: true,
    value: {
      userId,
      threadId,
      glossaryTermId,
      associationLabel,
    },
  };
}
