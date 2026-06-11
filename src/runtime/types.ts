import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";
import type { ReflectiveOpening } from "@/src/domain/openings/types";
import type { ReflectiveThread } from "@/src/domain/threads/types";

export interface ReflectiveRuntimeSnapshot {
  center: ReflectiveObject;
  threads: ReflectiveThread[];
  openings: ReflectiveOpening[];
}

export interface RuntimeMovementHint {
  fromObjectId: string;
  toObjectId: string;
  reason: string;
}
