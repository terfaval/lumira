import type { Reflection } from "@/src/domain/reflections/types";

export interface ReflectionRow {
  id: string;
  user_id: string;
  candidate_id: string;
  thread_id: string;
  source_response_id: string;
  source_opening_id: string | null;
  source_reflective_object_ids: string[];
  statement: string;
  pattern: string[];
  admitted_at: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function fromReflectionRow(row: ReflectionRow): Reflection {
  return {
    id: row.id,
    userId: row.user_id,
    candidateId: row.candidate_id,
    threadId: row.thread_id,
    sourceResponseId: row.source_response_id,
    sourceOpeningId: row.source_opening_id,
    sourceReflectiveObjectIds: row.source_reflective_object_ids ?? [],
    statement: row.statement,
    pattern: row.pattern ?? [],
    admittedAt: row.admitted_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
