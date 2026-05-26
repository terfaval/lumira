import type { ThreadRepository } from "@/src/domain/threads/contracts";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";

export type ThreadStore = ThreadRepository;

export function createThreadStore(): ThreadStore {
  return createThreadRepository();
}
