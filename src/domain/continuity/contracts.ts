import type { ContinuityLink } from "@/src/domain/continuity/types";
import type { ThreadId } from "@/src/shared/types";

export interface ContinuityRepository {
  addLink(link: ContinuityLink): Promise<ContinuityLink>;
  listByThread(threadId: ThreadId): Promise<ContinuityLink[]>;
}
