import type { ReflectionCandidateId, ReflectionId, UserId } from "@/src/shared/types";
import type { Reflection } from "@/src/domain/reflections/types";

export interface AdmitReflectionInput {
  userId: UserId;
  candidateId: ReflectionCandidateId;
  statement: string;
  pattern: string[];
}

export interface ReflectionRepository {
  admitReflection(input: AdmitReflectionInput): Promise<Reflection>;
  getReflectionById(reflectionId: ReflectionId, userId: UserId): Promise<Reflection | null>;
  listReflectionsByUser(userId: UserId, limit?: number): Promise<Reflection[]>;
}
