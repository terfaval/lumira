import type { ReflectiveResponseRepository } from "@/src/domain/responses/contracts";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";

export type ResponseStore = ReflectiveResponseRepository;

export function createResponseStore(): ResponseStore {
  return createResponseRepository();
}
