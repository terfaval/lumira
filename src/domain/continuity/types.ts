import type { ReflectiveObjectId, ThreadId, UserId, VersionedTimestamps } from "@/src/shared/types";

export interface ContinuityLink extends VersionedTimestamps {
  id: string;
  userId: UserId;
  threadId: ThreadId;
  reflectiveObjectId: ReflectiveObjectId;
  rationale: string;
}
