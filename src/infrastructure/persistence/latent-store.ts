import type { LatentRepository } from "@/src/domain/latent/contracts";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";

export type LatentStore = LatentRepository;

export function createLatentStore(): LatentStore {
  return createLatentRepository();
}
