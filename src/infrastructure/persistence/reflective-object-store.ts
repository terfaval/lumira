import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";

export type ReflectiveObjectStore = ReflectiveObjectRepository;

export function createReflectiveObjectStore(): ReflectiveObjectStore {
  return createReflectiveObjectRepository();
}
