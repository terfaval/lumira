import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type {
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  GlossaryTerm,
  GlossaryTermRenameInput,
} from "@/src/domain/glossary/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromGlossaryAssociationRow,
  fromGlossaryCandidateRow,
  fromGlossaryTermRow,
  toGlossaryAssociationInsertRow,
  toGlossaryCandidateInsertRow,
  toGlossaryCandidateLifecycleUpdateRow,
  toGlossaryTermInsertRow,
  type GlossaryAssociationRow,
  type GlossaryCandidateRow,
  type GlossaryTermRow,
} from "@/src/infrastructure/supabase/adapters/glossary-row";
import type { GlossaryCandidateId, GlossaryTermId, ReflectiveObjectId, UserId } from "@/src/shared/types";

const TERMS_TABLE = "glossary_terms";
const CANDIDATES_TABLE = "glossary_candidate_states";
const ASSOCIATIONS_TABLE = "glossary_associations";

export class SupabaseGlossaryRepository implements GlossaryRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async listTerms(userId: UserId, limit?: number): Promise<GlossaryTerm[]> {
    let request = this.client
      .from(TERMS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list glossary terms: ${error.message}`);
    }

    return (data ?? []).map((row) => fromGlossaryTermRow(row as GlossaryTermRow));
  }

  async getTermById(termId: GlossaryTermId, userId: UserId): Promise<GlossaryTerm | null> {
    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .select("*")
      .eq("id", termId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to load glossary term: ${error.message}`);
    }

    return data ? fromGlossaryTermRow(data) : null;
  }

  async renameTerm(input: GlossaryTermRenameInput): Promise<GlossaryTerm | null> {
    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .update({ display_label: input.nextDisplayLabel })
      .eq("id", input.termId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to rename glossary term: ${error.message}`);
    }

    return data ? fromGlossaryTermRow(data) : null;
  }

  async listCandidates(userId: UserId): Promise<GlossaryCandidate[]> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list glossary candidates: ${error.message}`);
    }

    return (data ?? []).map((row) => fromGlossaryCandidateRow(row as GlossaryCandidateRow));
  }

  async listCandidatesByReflectiveObject(userId: UserId, reflectiveObjectId: ReflectiveObjectId): Promise<GlossaryCandidate[]> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("reflective_object_id", reflectiveObjectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list glossary candidates for reflective object: ${error.message}`);
    }

    return (data ?? []).map((row) => fromGlossaryCandidateRow(row as GlossaryCandidateRow));
  }

  async getCandidateById(candidateId: GlossaryCandidateId, userId: UserId): Promise<GlossaryCandidate | null> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("id", candidateId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      throw new Error(`Failed to load glossary candidate: ${error.message}`);
    }

    return data ? fromGlossaryCandidateRow(data) : null;
  }

  async upsertCandidates(inputs: CreateGlossaryCandidateInput[]): Promise<GlossaryCandidate[]> {
    if (inputs.length === 0) {
      return [];
    }

    const now = new Date().toISOString();
    const results: GlossaryCandidate[] = [];

    for (const input of inputs) {
      const existing = await this.loadCandidateByNaturalKey(input);
      const increment = input.recurrenceCount ?? 1;

      if (!existing) {
        const { data, error } = await this.client
          .from(CANDIDATES_TABLE)
          .insert(toGlossaryCandidateInsertRow(input, now))
          .select("*")
          .single<GlossaryCandidateRow>();

        if (error) {
          throw new Error(`Failed to create glossary candidate: ${error.message}`);
        }

        results.push(fromGlossaryCandidateRow(data));
        continue;
      }

      const { data, error } = await this.client
        .from(CANDIDATES_TABLE)
        .update({
          display_label: input.displayLabel,
          source_category: input.sourceCategory,
          source_observation_id: input.sourceObservationId ?? existing.source_observation_id,
          source_observation_fragment_id:
            input.sourceObservationFragmentId ?? existing.source_observation_fragment_id,
          recurrence_count: existing.recurrence_count + increment,
          last_seen_at: now,
        })
        .eq("id", existing.id)
        .eq("user_id", input.userId)
        .is("archived_at", null)
        .select("*")
        .single<GlossaryCandidateRow>();

      if (error) {
        throw new Error(`Failed to update glossary candidate: ${error.message}`);
      }

      results.push(fromGlossaryCandidateRow(data));
    }

    return results;
  }

  async setCandidateLifecycle(input: GlossaryCandidateLifecycleUpdate): Promise<GlossaryCandidate | null> {
    const existing = await this.getCandidateRowById(input.candidateId, input.userId);

    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const patch = toGlossaryCandidateLifecycleUpdateRow(input, now);

    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .update(patch)
      .eq("id", input.candidateId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      throw new Error(`Failed to update glossary candidate lifecycle: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    if (input.nextState === "pinned") {
      const term = await this.ensureGlossaryTermForPinnedCandidate(data);
      await this.createAssociation({
        userId: input.userId,
        glossaryTermId: term.id,
        reflectiveObjectId: data.reflective_object_id,
        observationId: data.source_observation_id,
        observationFragmentId: data.source_observation_fragment_id,
        associationLabel: "Pinned from recurring reflective material.",
      });
    }

    return fromGlossaryCandidateRow(data);
  }

  async createAssociation(input: CreateGlossaryAssociationInput): Promise<GlossaryAssociation> {
    const { data, error } = await this.client
      .from(ASSOCIATIONS_TABLE)
      .insert(toGlossaryAssociationInsertRow(input))
      .select("*")
      .single<GlossaryAssociationRow>();

    if (error) {
      throw new Error(`Failed to create glossary association: ${error.message}`);
    }

    return fromGlossaryAssociationRow(data);
  }

  private async loadCandidateByNaturalKey(input: CreateGlossaryCandidateInput): Promise<GlossaryCandidateRow | null> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("user_id", input.userId)
      .eq("reflective_object_id", input.reflectiveObjectId)
      .eq("normalized_key", input.normalizedKey)
      .is("archived_at", null)
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      throw new Error(`Failed to load glossary candidate by key: ${error.message}`);
    }

    return data;
  }

  private async getCandidateRowById(candidateId: GlossaryCandidateId, userId: UserId): Promise<GlossaryCandidateRow | null> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("id", candidateId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      throw new Error(`Failed to load glossary candidate: ${error.message}`);
    }

    return data;
  }

  private async ensureGlossaryTermForPinnedCandidate(candidate: GlossaryCandidateRow): Promise<GlossaryTerm> {
    const { data: existingData, error: existingError } = await this.client
      .from(TERMS_TABLE)
      .select("*")
      .eq("user_id", candidate.user_id)
      .eq("normalized_key", candidate.normalized_key)
      .is("archived_at", null)
      .maybeSingle<GlossaryTermRow>();

    if (existingError) {
      throw new Error(`Failed to load glossary term for pinned candidate: ${existingError.message}`);
    }

    if (existingData) {
      return fromGlossaryTermRow(existingData);
    }

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .insert(
        toGlossaryTermInsertRow({
          userId: candidate.user_id,
          normalizedKey: candidate.normalized_key,
          displayLabel: candidate.display_label,
          notes: null,
        }),
      )
      .select("*")
      .single<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to create glossary term from pinned candidate: ${error.message}`);
    }

    return fromGlossaryTermRow(data);
  }
}
