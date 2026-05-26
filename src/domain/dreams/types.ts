import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

export interface DreamObject extends ReflectiveObject {
  objectType: "dream";
  sleepPhase?: "night" | "nap" | "unknown";
}
