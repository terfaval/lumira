import type {
  GlossaryTermId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadAssociationId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const THREAD_STATES = ["active", "dormant", "quiet", "archived"] as const;
export type ThreadState = (typeof THREAD_STATES)[number];

export const THREAD_VISIBILITIES = ["foreground", "ambient", "hidden"] as const;
export type ThreadVisibility = (typeof THREAD_VISIBILITIES)[number];

export interface ThreadContinuityCue {
  label: string;
  phrasing: string;
  source: "manual_note" | "object_association" | "glossary_association";
}

export interface ReflectiveThread extends VersionedTimestamps {
  id: ThreadId;
  userId: UserId;
  title: string;
  contextNote: string | null;
  state: ThreadState;
  visibility: ThreadVisibility;
  dormantSince: string | null;
  archivedAt: string | null;
  continuityCues: ThreadContinuityCue[];
}

export type ThreadAssociationKind = "reflective_object" | "glossary_term" | "reflective_response";

export interface ReflectiveThreadAssociation extends VersionedTimestamps {
  id: ThreadAssociationId;
  userId: UserId;
  threadId: ThreadId;
  kind: ThreadAssociationKind;
  reflectiveObjectId: ReflectiveObjectId | null;
  glossaryTermId: GlossaryTermId | null;
  reflectiveResponseId: ReflectiveResponseId | null;
  associationLabel: string | null;
}

export interface CreateReflectiveThreadInput {
  userId: UserId;
  title: string;
  contextNote?: string | null;
  state?: Extract<ThreadState, "active" | "dormant" | "quiet">;
  visibility?: ThreadVisibility;
  continuityCues?: ThreadContinuityCue[];
}

export interface UpdateReflectiveThreadInput {
  threadId: ThreadId;
  userId: UserId;
  title?: string;
  contextNote?: string | null;
  nextState?: ThreadState;
  visibility?: ThreadVisibility;
  continuityCues?: ThreadContinuityCue[];
}

export interface CreateThreadObjectAssociationInput {
  userId: UserId;
  threadId: ThreadId;
  reflectiveObjectId: ReflectiveObjectId;
  associationLabel?: string | null;
}

export interface CreateThreadGlossaryAssociationInput {
  userId: UserId;
  threadId: ThreadId;
  glossaryTermId: GlossaryTermId;
  associationLabel?: string | null;
}
