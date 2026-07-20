import type {
  OpeningId,
  ReflectionCandidateId,
  ReflectionId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export interface Reflection extends VersionedTimestamps {
  id: ReflectionId;
  userId: UserId;
  candidateId: ReflectionCandidateId;
  threadId: ThreadId;
  sourceResponseId: ReflectiveResponseId;
  sourceOpeningId: OpeningId | null;
  sourceReflectiveObjectIds: ReflectiveObjectId[];
  statement: string;
  pattern: string[];
  admittedAt: string;
  archivedAt: string | null;
}
