import type {
  AppendReflectionCandidateEvidenceInput,
  CreateReflectionCandidateInput,
  ReflectionCandidate,
  ReflectionCandidateEvidence,
} from "@/src/domain/reflection-candidates/types";
import type { ReflectionCandidateId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

export interface ReflectionCandidateRepository {
  createCandidate(input: CreateReflectionCandidateInput): Promise<ReflectionCandidate>;
  getCandidateById(candidateId: ReflectionCandidateId, userId: UserId): Promise<ReflectionCandidate | null>;
  getCandidateByIdIncludingArchived(candidateId: ReflectionCandidateId, userId: UserId): Promise<ReflectionCandidate | null>;
  getCandidateBySourceResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectionCandidate | null>;
  listCandidatesByThread(threadId: ThreadId, userId: UserId): Promise<ReflectionCandidate[]>;
  appendEvidence(input: AppendReflectionCandidateEvidenceInput): Promise<ReflectionCandidateEvidence>;
  listEvidenceByCandidate(candidateId: ReflectionCandidateId, userId: UserId): Promise<ReflectionCandidateEvidence[]>;
  archiveCandidate(candidateId: ReflectionCandidateId, userId: UserId): Promise<boolean>;
}
