import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";

export type GlossaryStore = GlossaryRepository;

export function createGlossaryStore(): GlossaryStore {
  return createGlossaryRepository();
}
