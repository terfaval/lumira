import type { ReflectionCandidateRepository } from "@/src/domain/reflection-candidates/contracts";
import type {
  AppendReflectionCandidateEvidenceInput,
  CreateReflectionCandidateInput,
  ReflectionCandidate,
  ReflectionCandidateEvidence,
} from "@/src/domain/reflection-candidates/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromReflectionCandidateEvidenceRow,
  fromReflectionCandidateRow,
  toReflectionCandidateEvidenceInsertRow,
  toReflectionCandidateInsertRow,
  type ReflectionCandidateEvidenceRow,
  type ReflectionCandidateRow,
} from "@/src/infrastructure/supabase/adapters/reflection-candidate-row";
import type { ReflectionCandidateId, ReflectiveResponseId, ThreadId, UserId } from "@/src/shared/types";

const CANDIDATES_TABLE = "reflection_candidates";
const EVIDENCE_TABLE = "reflection_candidate_evidence";

export class SupabaseReflectionCandidateRepository implements ReflectionCandidateRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  private async loadCandidateById(
    candidateId: ReflectionCandidateId,
    userId: UserId,
    includeArchived: boolean,
  ): Promise<ReflectionCandidate | null> {
    let query = this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("id", candidateId)
      .eq("user_id", userId);

    if (!includeArchived) {
      query = query.is("archived_at", null);
    }

    const { data, error } = await query.maybeSingle<ReflectionCandidateRow>();

    if (error) {
      throw new Error(`Failed to load reflection candidate: ${error.message}`);
    }

    return data ? fromReflectionCandidateRow(data) : null;
  }

  async createCandidate(input: CreateReflectionCandidateInput): Promise<ReflectionCandidate> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .insert(toReflectionCandidateInsertRow(input))
      .select("*")
      .single<ReflectionCandidateRow>();

    if (error) {
      throw new Error(`Failed to create reflection candidate: ${error.message}`);
    }

    return fromReflectionCandidateRow(data);
  }

  async getCandidateById(candidateId: ReflectionCandidateId, userId: UserId): Promise<ReflectionCandidate | null> {
    return this.loadCandidateById(candidateId, userId, false);
  }

  async getCandidateByIdIncludingArchived(
    candidateId: ReflectionCandidateId,
    userId: UserId,
  ): Promise<ReflectionCandidate | null> {
    return this.loadCandidateById(candidateId, userId, true);
  }

  async getCandidateBySourceResponse(responseId: ReflectiveResponseId, userId: UserId): Promise<ReflectionCandidate | null> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("source_response_id", responseId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ReflectionCandidateRow>();

    if (error) {
      throw new Error(`Failed to load reflection candidate by source response: ${error.message}`);
    }

    return data ? fromReflectionCandidateRow(data) : null;
  }

  async listCandidatesByThread(threadId: ThreadId, userId: UserId): Promise<ReflectionCandidate[]> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("thread_id", threadId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list reflection candidates by thread: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectionCandidateRow(row as ReflectionCandidateRow));
  }

  async appendEvidence(input: AppendReflectionCandidateEvidenceInput): Promise<ReflectionCandidateEvidence> {
    const { data, error } = await this.client
      .from(EVIDENCE_TABLE)
      .insert(toReflectionCandidateEvidenceInsertRow(input))
      .select("*")
      .single<ReflectionCandidateEvidenceRow>();

    if (error) {
      throw new Error(`Failed to append reflection candidate evidence: ${error.message}`);
    }

    return fromReflectionCandidateEvidenceRow(data);
  }

  async listEvidenceByCandidate(candidateId: ReflectionCandidateId, userId: UserId): Promise<ReflectionCandidateEvidence[]> {
    const { data, error } = await this.client
      .from(EVIDENCE_TABLE)
      .select("*")
      .eq("candidate_id", candidateId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list reflection candidate evidence: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectionCandidateEvidenceRow(row as ReflectionCandidateEvidenceRow));
  }

  async archiveCandidate(candidateId: ReflectionCandidateId, userId: UserId): Promise<boolean> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .update({
        archived_at: now,
      })
      .eq("id", candidateId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to archive reflection candidate: ${error.message}`);
    }

    return Boolean(data?.id);
  }
}
