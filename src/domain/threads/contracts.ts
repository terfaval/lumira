import type {
  CreateReflectiveThreadInput,
  CreateThreadGlossaryAssociationInput,
  CreateThreadObjectAssociationInput,
  ReflectiveThread,
  ReflectiveThreadAssociation,
  ThreadState,
  UpdateReflectiveThreadInput,
} from "@/src/domain/threads/types";
import type { ThreadId, UserId } from "@/src/shared/types";

export interface ThreadRepository {
  createThread(input: CreateReflectiveThreadInput): Promise<ReflectiveThread>;
  getThreadById(threadId: ThreadId, userId: UserId): Promise<ReflectiveThread | null>;
  listThreadsByUser(userId: UserId, limit?: number): Promise<ReflectiveThread[]>;
  updateThread(input: UpdateReflectiveThreadInput): Promise<ReflectiveThread | null>;
  setThreadState(threadId: ThreadId, userId: UserId, nextState: ThreadState): Promise<ReflectiveThread | null>;
  archiveThread(threadId: ThreadId, userId: UserId): Promise<ReflectiveThread | null>;

  createObjectAssociation(input: CreateThreadObjectAssociationInput): Promise<ReflectiveThreadAssociation>;
  createGlossaryAssociation(input: CreateThreadGlossaryAssociationInput): Promise<ReflectiveThreadAssociation>;
  listAssociationsByThread(threadId: ThreadId, userId: UserId): Promise<ReflectiveThreadAssociation[]>;
}
