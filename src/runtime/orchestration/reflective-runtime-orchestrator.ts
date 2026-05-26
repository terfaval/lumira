import type { RuntimeBoundary } from "@/src/runtime/contracts/runtime-boundary";
import type { ReflectiveRuntimeSnapshot } from "@/src/runtime/types";
import type { UserId } from "@/src/shared/types";

export class ReflectiveRuntimeOrchestrator {
  constructor(private readonly boundary: RuntimeBoundary) {}

  async getSnapshot(userId: UserId): Promise<ReflectiveRuntimeSnapshot> {
    return this.boundary.buildSnapshot(userId);
  }
}
