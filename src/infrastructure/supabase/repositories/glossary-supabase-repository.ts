import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import type {
  CreateGlossaryAppearanceRecordInput,
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  GlossaryAppearanceRecord,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  GlossaryTerm,
  GlossaryTermUpdateInput,
} from "@/src/domain/glossary/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromGlossaryAppearanceRecordRow,
  fromGlossaryAssociationRow,
  fromGlossaryCandidateRow,
  fromGlossaryTermRow,
  toGlossaryAppearanceRecordInsertRow,
  toGlossaryAssociationInsertRow,
  toGlossaryCandidateInsertRow,
  toGlossaryCandidateLifecycleUpdateRow,
  toGlossaryTermInsertRow,
  type GlossaryAssociationRow,
  type GlossaryAppearanceRecordRow,
  type GlossaryCandidateRow,
  type GlossaryTermRow,
} from "@/src/infrastructure/supabase/adapters/glossary-row";
import type { GlossaryCandidateId, GlossaryTermId, ReflectiveObjectId, UserId } from "@/src/shared/types";

const TERMS_TABLE = "glossary_terms";
const CANDIDATES_TABLE = "glossary_candidate_states";
const ASSOCIATIONS_TABLE = "glossary_associations";
const APPEARANCES_TABLE = "glossary_appearance_records";
const REFLECTIVE_OBJECTS_TABLE = "reflective_objects";

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

  async listAppearanceRecordsByTerm(termId: GlossaryTermId, userId: UserId): Promise<GlossaryAppearanceRecord[]> {
    const { data, error } = await this.client
      .from(APPEARANCES_TABLE)
      .select("*")
      .eq("entity_id", termId)
      .eq("user_id", userId)
      .order("confirmed_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list glossary appearance records: ${error.message}`);
    }

    return (data ?? []).map((row) => fromGlossaryAppearanceRecordRow(row as GlossaryAppearanceRecordRow));
  }

  async updateTerm(input: GlossaryTermUpdateInput): Promise<GlossaryTerm | null> {
    const existing = await this.getTermRowById(input.termId, input.userId);

    if (!existing) {
      return null;
    }

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .update({
        display_label: input.canonicalLabel,
        canonical_label: input.canonicalLabel,
        type: input.type ?? existing.type,
        aliases: input.aliases ?? existing.aliases,
        general_note: input.generalNote === undefined ? existing.general_note : input.generalNote,
        notes: input.generalNote === undefined ? existing.notes : input.generalNote,
      })
      .eq("id", input.termId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to update glossary term: ${error.message}`);
    }

    return data ? fromGlossaryTermRow(data) : null;
  }

  async renameTerm(input: GlossaryTermUpdateInput): Promise<GlossaryTerm | null> {
    return this.updateTerm(input);
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
          candidate_class: input.candidateClass ?? existing.candidate_class,
          proposed_entity_ids: input.proposedEntityIds ?? existing.proposed_entity_ids,
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
      await this.createAppearanceRecord({
        userId: input.userId,
        entityId: term.id,
        dreamId: data.reflective_object_id,
        appearanceNote: input.appearanceNote ?? null,
        confirmedAt: now,
      });
      await this.syncAppearanceCount(term.id, input.userId);
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

  async createAppearanceRecord(input: CreateGlossaryAppearanceRecordInput): Promise<GlossaryAppearanceRecord | null> {
    const dream = await this.getDreamById(input.dreamId, input.userId);
    if (!dream) {
      return null;
    }

    const existing = await this.getAppearanceRecordByNaturalKey(input.entityId, input.dreamId, input.userId);
    if (existing) {
      if (input.appearanceNote !== undefined && input.appearanceNote !== existing.appearance_note) {
        const { data, error } = await this.client
          .from(APPEARANCES_TABLE)
          .update({
            appearance_note: input.appearanceNote,
          })
          .eq("id", existing.id)
          .eq("user_id", input.userId)
          .select("*")
          .single<GlossaryAppearanceRecordRow>();

        if (error) {
          throw new Error(`Failed to update glossary appearance record: ${error.message}`);
        }

        return fromGlossaryAppearanceRecordRow(data);
      }

      return fromGlossaryAppearanceRecordRow(existing);
    }

    const { data, error } = await this.client
      .from(APPEARANCES_TABLE)
      .insert(toGlossaryAppearanceRecordInsertRow(input))
      .select("*")
      .single<GlossaryAppearanceRecordRow>();

    if (error) {
      throw new Error(`Failed to create glossary appearance record: ${error.message}`);
    }

    return fromGlossaryAppearanceRecordRow(data);
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

  private async getAppearanceRecordByNaturalKey(
    entityId: GlossaryTermId,
    dreamId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<GlossaryAppearanceRecordRow | null> {
    const { data, error } = await this.client
      .from(APPEARANCES_TABLE)
      .select("*")
      .eq("entity_id", entityId)
      .eq("dream_id", dreamId)
      .eq("user_id", userId)
      .maybeSingle<GlossaryAppearanceRecordRow>();

    if (error) {
      throw new Error(`Failed to load glossary appearance record: ${error.message}`);
    }

    return data;
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

  private async getTermRowById(termId: GlossaryTermId, userId: UserId): Promise<GlossaryTermRow | null> {
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

    return data;
  }

  private async getDreamById(dreamId: ReflectiveObjectId, userId: UserId): Promise<{ id: string } | null> {
    const { data, error } = await this.client
      .from(REFLECTIVE_OBJECTS_TABLE)
      .select("id")
      .eq("id", dreamId)
      .eq("user_id", userId)
      .eq("object_type", "dream")
      .is("archived_at", null)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to load dream for glossary appearance record: ${error.message}`);
    }

    return data;
  }

  private async syncAppearanceCount(termId: GlossaryTermId, userId: UserId): Promise<void> {
    const { count, error } = await this.client
      .from(APPEARANCES_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("entity_id", termId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to count glossary appearance records: ${error.message}`);
    }

    const { error: updateError } = await this.client
      .from(TERMS_TABLE)
      .update({
        appearance_count: count ?? 0,
      })
      .eq("id", termId)
      .eq("user_id", userId)
      .is("archived_at", null);

    if (updateError) {
      throw new Error(`Failed to sync glossary appearance count: ${updateError.message}`);
    }
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
      const { data, error } = await this.client
        .from(TERMS_TABLE)
        .update({
          appearance_count: existingData.appearance_count + 1,
        })
        .eq("id", existingData.id)
        .eq("user_id", existingData.user_id)
        .is("archived_at", null)
        .select("*")
        .single<GlossaryTermRow>();

      if (error) {
        throw new Error(`Failed to increment glossary appearance count: ${error.message}`);
      }

      return fromGlossaryTermRow(data);
    }

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .insert(
        toGlossaryTermInsertRow({
          userId: candidate.user_id,
          normalizedKey: candidate.normalized_key,
          displayLabel: candidate.display_label,
          canonicalLabel: candidate.display_label,
          type: "concept",
          aliases: [],
          generalNote: null,
          appearanceCount: 0,
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
