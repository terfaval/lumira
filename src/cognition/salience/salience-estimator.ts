import type { ReflectiveObject } from "@/src/domain/reflective-objects/types";

export interface SalienceScore {
  reflectiveObjectId: string;
  score: number;
  source: "user-highlight" | "latent-inference";
}

export interface SalienceEstimator {
  rank(objects: ReflectiveObject[]): Promise<SalienceScore[]>;
}
