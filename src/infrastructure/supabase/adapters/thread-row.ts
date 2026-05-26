import type {
  CreateReflectiveThreadInput,
  CreateThreadGlossaryAssociationInput,
  CreateThreadObjectAssociationInput,
  ReflectiveThread,
  ReflectiveThreadAssociation,
  ThreadContinuityCue,
  ThreadState,
  ThreadVisibility,
  UpdateReflectiveThreadInput,
} from "@/src/domain/threads/types";

export interface ReflectiveThreadRow {
  id: string;
  user_id: string;
  title: string;
  context_note: string | null;
  state: ThreadState;
  visibility: ThreadVisibility;
  continuity_cues: unknown;
  dormant_since: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadObjectAssociationRow {
  id: string;
  user_id: string;
  thread_id: string;
  reflective_object_id: string;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadGlossaryAssociationRow {
  id: string;
  user_id: string;
  thread_id: string;
  glossary_term_id: string;
  association_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReflectiveThreadInsertRow {
  user_id: string;
  title: string;
  context_note: string | null;
  state: "active" | "dormant" | "quiet";
  visibility: ThreadVisibility;
  continuity_cues: ThreadContinuityCue[];
  dormant_since: string | null;
}

export interface ReflectiveThreadUpdateRow {
  title?: string;
  context_note?: string | null;
  state?: ThreadState;
  visibility?: ThreadVisibility;
  continuity_cues?: ThreadContinuityCue[];
  dormant_since?: string | null;
}

export interface ThreadObjectAssociationInsertRow {
  user_id: string;
  thread_id: string;
  reflective_object_id: string;
  association_label: string | null;
}

export interface ThreadGlossaryAssociationInsertRow {
  user_id: string;
  thread_id: string;
  glossary_term_id: string;
  association_label: string | null;
}

function parseContinuityCues(input: unknown): ThreadContinuityCue[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value))
    .map((value) => {
      const label = typeof value.label === "string" ? value.label.trim() : "";
      const phrasing = typeof value.phrasing === "string" ? value.phrasing.trim() : "";
      let source: ThreadContinuityCue["source"] = "manual_note";
      if (value.source === "object_association" || value.source === "glossary_association" || value.source === "manual_note") {
        source = value.source;
      }

      return { label, phrasing, source };
    })
    .filter((cue) => cue.label.length > 0 && cue.phrasing.length > 0);
}

export function fromReflectiveThreadRow(row: ReflectiveThreadRow): ReflectiveThread {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    contextNote: row.context_note,
    state: row.state,
    visibility: row.visibility,
    dormantSince: row.dormant_since,
    archivedAt: row.archived_at,
    continuityCues: parseContinuityCues(row.continuity_cues),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromThreadObjectAssociationRow(row: ThreadObjectAssociationRow): ReflectiveThreadAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    kind: "reflective_object",
    reflectiveObjectId: row.reflective_object_id,
    glossaryTermId: null,
    reflectiveResponseId: null,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromThreadGlossaryAssociationRow(row: ThreadGlossaryAssociationRow): ReflectiveThreadAssociation {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    kind: "glossary_term",
    reflectiveObjectId: null,
    glossaryTermId: row.glossary_term_id,
    reflectiveResponseId: null,
    associationLabel: row.association_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toReflectiveThreadInsertRow(input: CreateReflectiveThreadInput, now: string): ReflectiveThreadInsertRow {
  const state = input.state ?? "active";

  return {
    user_id: input.userId,
    title: input.title,
    context_note: input.contextNote ?? null,
    state,
    visibility: input.visibility ?? "ambient",
    continuity_cues: input.continuityCues ?? [],
    dormant_since: state === "dormant" ? now : null,
  };
}

export function toReflectiveThreadUpdateRow(input: UpdateReflectiveThreadInput, now: string): ReflectiveThreadUpdateRow {
  const row: ReflectiveThreadUpdateRow = {};

  if (input.title !== undefined) {
    row.title = input.title;
  }

  if (input.contextNote !== undefined) {
    row.context_note = input.contextNote;
  }

  if (input.nextState !== undefined) {
    row.state = input.nextState;
    row.dormant_since = input.nextState === "dormant" ? now : null;
  }

  if (input.visibility !== undefined) {
    row.visibility = input.visibility;
  }

  if (input.continuityCues !== undefined) {
    row.continuity_cues = input.continuityCues;
  }

  return row;
}

export function toThreadObjectAssociationInsertRow(input: CreateThreadObjectAssociationInput): ThreadObjectAssociationInsertRow {
  return {
    user_id: input.userId,
    thread_id: input.threadId,
    reflective_object_id: input.reflectiveObjectId,
    association_label: input.associationLabel ?? null,
  };
}

export function toThreadGlossaryAssociationInsertRow(
  input: CreateThreadGlossaryAssociationInput,
): ThreadGlossaryAssociationInsertRow {
  return {
    user_id: input.userId,
    thread_id: input.threadId,
    glossary_term_id: input.glossaryTermId,
    association_label: input.associationLabel ?? null,
  };
}
