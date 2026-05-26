import type { ReflectiveRuntimeSnapshot, RuntimeMovementHint } from "@/src/runtime/types";
import type { UserId } from "@/src/shared/types";

export interface RuntimeBoundary {
  buildSnapshot(userId: UserId): Promise<ReflectiveRuntimeSnapshot>;
  proposeMovement(userId: UserId): Promise<RuntimeMovementHint[]>;
}
