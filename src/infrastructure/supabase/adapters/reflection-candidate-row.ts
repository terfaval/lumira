import type {
  AppendReflectionCandidateEvidenceInput,
  CreateReflectionCandidateInput,
  ReflectionCandidate,
  ReflectionCandidateEvidence,
} from "@/src/domain/reflection-candidates/types";

type ReflectionCandidateStateRow = "provisional";

export interface ReflectionCandidateRow {
  id: string;
  user_id: string;
  thread_id: string;
  source_response_id: string;
  source_opening_id: string | null;
  source_reflective_object_ids: string[];
  state: ReflectionCandidateStateRow;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReflectionCandidateInsertRow {
  user_id: string;
  thread_id: string;
  source_response_id: string;
  source_opening_id: string | null;
  source_reflective_object_ids: string[];
  state: "provisional";
}

export interface ReflectionCandidateEvidenceRow {
  id: string;
  user_id: string;
  candidate_id: string;
  response_id: string;
  opening_id: string | null;
  created_at: string;
}

export interface ReflectionCandidateEvidenceInsertRow {
  user_id: string;
  candidate_id: string;
  response_id: string;
  opening_id: string | null;
}

export function fromReflectionCandidateRow(row: ReflectionCandidateRow): ReflectionCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    threadId: row.thread_id,
    sourceResponseId: row.source_response_id,
    sourceOpeningId: row.source_opening_id,
    sourceReflectiveObjectIds: row.source_reflective_object_ids ?? [],
    state: row.state,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toReflectionCandidateInsertRow(
  input: CreateReflectionCandidateInput,
): ReflectionCandidateInsertRow {
  return {
    user_id: input.userId,
    thread_id: input.threadId,
    source_response_id: input.sourceResponseId,
    source_opening_id: input.sourceOpeningId ?? null,
    source_reflective_object_ids: input.sourceReflectiveObjectIds ?? [],
    state: "provisional",
  };
}

export function fromReflectionCandidateEvidenceRow(row: ReflectionCandidateEvidenceRow): ReflectionCandidateEvidence {
  return {
    id: row.id,
    userId: row.user_id,
    candidateId: row.candidate_id,
    responseId: row.response_id,
    openingId: row.opening_id,
    createdAt: row.created_at,
  };
}

export function toReflectionCandidateEvidenceInsertRow(
  input: AppendReflectionCandidateEvidenceInput,
): ReflectionCandidateEvidenceInsertRow {
  return {
    user_id: input.userId,
    candidate_id: input.candidateId,
    response_id: input.responseId,
    opening_id: input.openingId ?? null,
  };
}
