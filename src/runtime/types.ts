import type { ReflectiveObject, ReflectiveThread, ReflectiveOpening } from "@/src/domain";

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
