import type {
  OpeningId,
  ReflectionCandidateId,
  ReflectiveObjectId,
  ReflectiveResponseId,
  ThreadId,
  UserId,
  VersionedTimestamps,
} from "@/src/shared/types";

export const REFLECTION_CANDIDATE_STATES = ["provisional"] as const;
export type ReflectionCandidateState = (typeof REFLECTION_CANDIDATE_STATES)[number];

export interface ReflectionCandidate extends VersionedTimestamps {
  id: ReflectionCandidateId;
  userId: UserId;
  threadId: ThreadId;
  sourceResponseId: ReflectiveResponseId;
  sourceOpeningId: OpeningId | null;
  sourceReflectiveObjectIds: ReflectiveObjectId[];
  state: ReflectionCandidateState;
  archivedAt: string | null;
}

export interface ReflectionCandidateEvidence {
  id: string;
  userId: UserId;
  candidateId: ReflectionCandidateId;
  responseId: ReflectiveResponseId;
  openingId: OpeningId | null;
  createdAt: string;
}

export interface CreateReflectionCandidateInput {
  userId: UserId;
  threadId: ThreadId;
  sourceResponseId: ReflectiveResponseId;
  sourceOpeningId?: OpeningId | null;
  sourceReflectiveObjectIds?: ReflectiveObjectId[];
}

export interface AppendReflectionCandidateEvidenceInput {
  userId: UserId;
  candidateId: ReflectionCandidateId;
  responseId: ReflectiveResponseId;
  openingId?: OpeningId | null;
}
