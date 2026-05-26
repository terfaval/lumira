import type { ContinuityLink } from "@/src/domain/continuity/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";

export interface ContinuityInference {
  inferLinks(thread: ReflectiveThread): Promise<ContinuityLink[]>;
}
