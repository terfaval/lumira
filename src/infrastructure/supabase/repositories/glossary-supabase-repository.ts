import type { GlossaryRepository } from "@/src/domain/glossary/contracts";
import { normalizeGlossaryRecognitionText } from "@/src/domain/glossary/recognition-normalization";
import type {
  CreateGlossaryAppearanceRecordInput,
  CreateGlossaryAssociationInput,
  CreateGlossaryCandidateInput,
  CreateGlossaryTermInput,
  GlossaryCandidateResolution,
  GlossaryAppearanceRecord,
  GlossaryAssociation,
  GlossaryCandidate,
  GlossaryCandidateLifecycleUpdate,
  ResolveGlossaryCandidateInput,
  GlossaryTerm,
  GlossaryTermUpdateInput,
} from "@/src/domain/glossary/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromGlossaryAppearanceRecordRow,
  fromGlossaryAssociationRow,
  fromGlossaryCandidateRow,
  fromGlossaryTermRow,
  normalizeGlossaryCandidateMetadata,
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
  private candidateMetadataColumnsAvailable: boolean | null = null;

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

  async listTermsByReflectiveObject(userId: UserId, reflectiveObjectId: ReflectiveObjectId): Promise<GlossaryTerm[]> {
    const { data: associations, error: associationError } = await this.client
      .from(ASSOCIATIONS_TABLE)
      .select("glossary_term_id, created_at")
      .eq("user_id", userId)
      .eq("reflective_object_id", reflectiveObjectId);

    if (associationError) {
      throw new Error(`Failed to list glossary associations for reflective object: ${associationError.message}`);
    }

    const orderedIds = Array.from(
      new Set(
        (associations ?? [])
          .sort((left, right) => {
            const createdAtComparison = left.created_at.localeCompare(right.created_at);
            if (createdAtComparison !== 0) {
              return createdAtComparison;
            }

            return left.glossary_term_id.localeCompare(right.glossary_term_id);
          })
          .map((row) => row.glossary_term_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    if (orderedIds.length === 0) {
      return [];
    }

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .in("id", orderedIds);

    if (error) {
      throw new Error(`Failed to load glossary terms for reflective object: ${error.message}`);
    }

    const termsById = new Map((data ?? []).map((row) => [row.id, fromGlossaryTermRow(row as GlossaryTermRow)]));

    return orderedIds
      .map((termId) => termsById.get(termId))
      .filter((term): term is GlossaryTerm => term !== undefined);
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

    return [...(data ?? [])]
      .sort((left, right) => {
        const confirmedAtComparison = right.confirmed_at.localeCompare(left.confirmed_at);
        if (confirmedAtComparison !== 0) {
          return confirmedAtComparison;
        }

        const dreamIdComparison = left.dream_id.localeCompare(right.dream_id);
        if (dreamIdComparison !== 0) {
          return dreamIdComparison;
        }

        return left.id.localeCompare(right.id);
      })
      .map((row) => fromGlossaryAppearanceRecordRow(row as GlossaryAppearanceRecordRow));
  }

  async createTerm(input: CreateGlossaryTermInput): Promise<GlossaryTerm> {
    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .insert(toGlossaryTermInsertRow(input))
      .select("*")
      .single<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to create glossary term: ${error.message}`);
    }

    return fromGlossaryTermRow(data);
  }

  async updateTerm(input: GlossaryTermUpdateInput): Promise<GlossaryTerm | null> {
    const existing = await this.getTermRowById(input.termId, input.userId);

    if (!existing) {
      return null;
    }

    const authoritativeGeneralNote =
      input.generalNote === undefined ? existing.general_note ?? existing.notes : input.generalNote;

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .update({
        display_label: input.canonicalLabel,
        canonical_label: input.canonicalLabel,
        type: input.type ?? existing.type,
        aliases: input.aliases ?? existing.aliases,
        general_note: authoritativeGeneralNote,
        notes: authoritativeGeneralNote,
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
        const created = await this.insertCandidateRow(input, now);

        results.push(fromGlossaryCandidateRow(created));
        continue;
      }

      const updated = await this.updateCandidateRow(input, existing, increment, now);
      results.push(fromGlossaryCandidateRow(updated));
    }

    return results;
  }

  private async insertCandidateRow(input: CreateGlossaryCandidateInput, now: string): Promise<GlossaryCandidateRow> {
    const attempts = this.candidateMetadataColumnsAvailable === false ? [false] : [true, false];

    for (const includeMetadata of attempts) {
      const { data, error } = await this.client
        .from(CANDIDATES_TABLE)
        .insert(this.toCandidateInsertPatch(input, now, includeMetadata))
        .select("*")
        .single<GlossaryCandidateRow>();

      if (!error && data) {
        this.candidateMetadataColumnsAvailable = includeMetadata;
        return data;
      }

      if (!this.isMissingCandidateMetadataColumnError(error) || !includeMetadata) {
        throw new Error(`Failed to create glossary candidate: ${error?.message ?? "unknown_error"}`);
      }

      this.candidateMetadataColumnsAvailable = false;
    }

    throw new Error("Failed to create glossary candidate: unknown_error");
  }

  private async updateCandidateRow(
    input: CreateGlossaryCandidateInput,
    existing: GlossaryCandidateRow,
    increment: number,
    now: string,
  ): Promise<GlossaryCandidateRow> {
    const attempts = this.candidateMetadataColumnsAvailable === false ? [false] : [true, false];

    for (const includeMetadata of attempts) {
      const { data, error } = await this.client
        .from(CANDIDATES_TABLE)
        .update(this.toCandidateUpdatePatch(input, existing, increment, now, includeMetadata))
        .eq("id", existing.id)
        .eq("user_id", input.userId)
        .is("archived_at", null)
        .select("*")
        .single<GlossaryCandidateRow>();

      if (!error && data) {
        this.candidateMetadataColumnsAvailable = includeMetadata;
        return data;
      }

      if (!this.isMissingCandidateMetadataColumnError(error) || !includeMetadata) {
        throw new Error(`Failed to update glossary candidate: ${error?.message ?? "unknown_error"}`);
      }

      this.candidateMetadataColumnsAvailable = false;
    }

    throw new Error("Failed to update glossary candidate: unknown_error");
  }

  private toCandidateInsertPatch(
    input: CreateGlossaryCandidateInput,
    now: string,
    includeMetadata: boolean,
  ): Record<string, unknown> {
    const row = toGlossaryCandidateInsertRow(input, now) as unknown as Record<string, unknown>;

    if (!includeMetadata) {
      delete row.identity_key;
      delete row.candidate_class;
      delete row.proposed_entity_ids;
    }

    return row;
  }

  private toCandidateUpdatePatch(
    input: CreateGlossaryCandidateInput,
    existing: GlossaryCandidateRow,
    increment: number,
    now: string,
    includeMetadata: boolean,
  ): Record<string, unknown> {
    const patch: Record<string, unknown> = {
      identity_key: input.identityKey ?? existing.identity_key ?? null,
      display_label: input.displayLabel,
      source_category: input.sourceCategory,
      source_observation_id: input.sourceObservationId ?? existing.source_observation_id,
      source_observation_fragment_id: input.sourceObservationFragmentId ?? existing.source_observation_fragment_id,
      recurrence_count: existing.recurrence_count + increment,
      last_seen_at: now,
    };

    if (includeMetadata) {
      const metadata =
        input.candidateClass === undefined && input.proposedEntityIds === undefined
          ? normalizeGlossaryCandidateMetadata({
              candidateClass: existing.candidate_class ?? "new_candidate",
              proposedEntityIds: existing.proposed_entity_ids ?? [],
            })
          : normalizeGlossaryCandidateMetadata({
              candidateClass: input.candidateClass,
              proposedEntityIds: input.proposedEntityIds,
            });

      patch.candidate_class = metadata.candidateClass;
      patch.proposed_entity_ids = metadata.proposedEntityIds;
    }

    return patch;
  }

  private isMissingCandidateMetadataColumnError(error: { code?: string; message?: string } | null): boolean {
    const message = error?.message?.toLowerCase() ?? "";
    const referencesCandidateMetadata =
      message.includes("identity_key") || message.includes("candidate_class") || message.includes("proposed_entity_ids");

    return (
      referencesCandidateMetadata &&
      (error?.code === "42703" || error?.code === "PGRST204")
    );
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

    return fromGlossaryCandidateRow(data);
  }

  async resolveCandidate(input: ResolveGlossaryCandidateInput): Promise<GlossaryCandidateResolution | null> {
    const candidate = await this.getCandidateRowById(input.candidateId, input.userId);

    if (!candidate) {
      return null;
    }

    const now = new Date().toISOString();
    const term =
      input.resolutionType === "create_new_entity"
        ? await this.createGlossaryTermFromResolution(candidate, input)
        : await this.getResolvedExistingTerm(input.entityId ?? null, input.userId);

    if (!term) {
      return null;
    }

    const resolvedTerm =
      input.resolutionType === "create_new_entity"
        ? term
        : await this.applyOptionalCanonicalRename(term, input);

    if (!resolvedTerm) {
      return null;
    }

    const appearanceRecord = await this.createAppearanceRecord({
      userId: input.userId,
      entityId: resolvedTerm.id,
      dreamId: candidate.reflective_object_id,
      appearanceNote: input.appearanceNote ?? null,
      confirmedAt: now,
    });

    if (!appearanceRecord) {
      return null;
    }

    await this.syncAppearanceCount(resolvedTerm.id, input.userId);
    await this.createAssociation({
      userId: input.userId,
      glossaryTermId: resolvedTerm.id,
      reflectiveObjectId: candidate.reflective_object_id,
      observationId: candidate.source_observation_id,
      observationFragmentId: candidate.source_observation_fragment_id,
      associationLabel: this.buildResolutionAssociationLabel(input.resolutionType),
    });

    const resolvedCandidate = await this.markCandidatePinned(candidate.id, input.userId, now);
    const refreshedTerm = await this.getTermById(resolvedTerm.id, input.userId);

    if (!resolvedCandidate || !refreshedTerm) {
      return null;
    }

    return {
      candidate: resolvedCandidate,
      term: refreshedTerm,
      appearanceRecord,
    };
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
    if (input.identityKey && this.candidateMetadataColumnsAvailable !== false) {
      try {
        const candidate = await this.loadCandidateByIdentityKey(input);

        if (candidate) {
          return candidate;
        }
      } catch (error) {
        if (!this.isMissingCandidateMetadataColumnError(error as { code?: string; message?: string } | null)) {
          throw error;
        }

        this.candidateMetadataColumnsAvailable = false;
      }

      return this.loadCandidateByNormalizedKey(input, this.candidateMetadataColumnsAvailable !== false);
    }

    return this.loadCandidateByNormalizedKey(input, false);
  }

  private async loadCandidateByIdentityKey(input: CreateGlossaryCandidateInput): Promise<GlossaryCandidateRow | null> {
    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("user_id", input.userId)
      .eq("reflective_object_id", input.reflectiveObjectId)
      .eq("source_category", input.sourceCategory)
      .eq("identity_key", input.identityKey)
      .is("archived_at", null)
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      const wrapped = new Error(`Failed to load glossary candidate by key: ${error.message}`) as Error & {
        code?: string;
      };
      wrapped.code = error.code;
      throw wrapped;
    }

    return data;
  }

  private async loadCandidateByNormalizedKey(
    input: CreateGlossaryCandidateInput,
    requireNullIdentityKey: boolean,
  ): Promise<GlossaryCandidateRow | null> {
    let request = this.client
      .from(CANDIDATES_TABLE)
      .select("*")
      .eq("user_id", input.userId)
      .eq("reflective_object_id", input.reflectiveObjectId)
      .eq("normalized_key", input.normalizedKey)
      .eq("source_category", input.sourceCategory);

    if (requireNullIdentityKey) {
      request = request.is("identity_key", null);
    }

    const { data, error } = await request.is("archived_at", null).maybeSingle<GlossaryCandidateRow>();

    if (error && requireNullIdentityKey && this.isMissingCandidateMetadataColumnError(error)) {
      this.candidateMetadataColumnsAvailable = false;
      return this.loadCandidateByNormalizedKey(input, false);
    }

    if (error) {
      const wrapped = new Error(`Failed to load glossary candidate by key: ${error.message}`) as Error & {
        code?: string;
      };
      wrapped.code = error.code;
      throw wrapped;
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
      .is("archived_at", null)
      .maybeSingle<{ id: string }>();

    if (error) {
      throw new Error(`Failed to load reflective object for glossary appearance record: ${error.message}`);
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

  private async getResolvedExistingTerm(termId: GlossaryTermId | null, userId: UserId): Promise<GlossaryTerm | null> {
    if (!termId) {
      return null;
    }

    return this.getTermById(termId, userId);
  }

  private async applyOptionalCanonicalRename(
    term: GlossaryTerm,
    input: ResolveGlossaryCandidateInput,
  ): Promise<GlossaryTerm | null> {
    const nextCanonicalLabel = input.canonicalLabel?.trim();
    if (!nextCanonicalLabel || nextCanonicalLabel === term.canonicalLabel) {
      return term;
    }

    return this.updateTerm({
      termId: term.id,
      userId: input.userId,
      canonicalLabel: nextCanonicalLabel,
      type: term.type,
      aliases: term.aliases,
      generalNote: term.generalNote,
    });
  }

  private async createGlossaryTermFromResolution(
    candidate: GlossaryCandidateRow,
    input: ResolveGlossaryCandidateInput,
  ): Promise<GlossaryTerm> {
    const canonicalLabel = input.canonicalLabel ?? candidate.display_label;
    const type = input.type ?? this.mapCandidateSourceToEntityType(candidate.source_category);
    const normalizedKey = normalizeGlossaryRecognitionText(canonicalLabel);

    const { data, error } = await this.client
      .from(TERMS_TABLE)
      .insert(
        toGlossaryTermInsertRow({
          userId: input.userId,
          normalizedKey,
          displayLabel: canonicalLabel,
          canonicalLabel,
          type,
          aliases: input.aliases ?? [],
          generalNote: input.generalNote ?? null,
          appearanceCount: 0,
          notes: input.generalNote ?? null,
        }),
      )
      .select("*")
      .single<GlossaryTermRow>();

    if (error) {
      throw new Error(`Failed to create glossary term from candidate resolution: ${error.message}`);
    }

    return fromGlossaryTermRow(data);
  }

  private mapCandidateSourceToEntityType(
    sourceCategory: GlossaryCandidateRow["source_category"],
  ): GlossaryTerm["type"] {
    switch (sourceCategory) {
      case "actor":
        return "person";
      case "location":
        return "place";
      case "object":
        return "object";
      default:
        return "concept";
    }
  }

  private buildResolutionAssociationLabel(
    resolutionType: ResolveGlossaryCandidateInput["resolutionType"],
  ): string {
    switch (resolutionType) {
      case "confirm_existing_entity":
        return "Confirmed existing continuity entity from glossary candidate.";
      case "select_existing_entity":
        return "Resolved ambiguous glossary candidate to an existing continuity entity.";
      case "create_new_entity":
        return "Created continuity entity from glossary candidate resolution.";
    }
  }

  private async markCandidatePinned(
    candidateId: GlossaryCandidateId,
    userId: UserId,
    now: string,
  ): Promise<GlossaryCandidate | null> {
    const patch = toGlossaryCandidateLifecycleUpdateRow(
      {
        candidateId,
        userId,
        nextState: "pinned",
      },
      now,
    );

    const { data, error } = await this.client
      .from(CANDIDATES_TABLE)
      .update(patch)
      .eq("id", candidateId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<GlossaryCandidateRow>();

    if (error) {
      throw new Error(`Failed to mark glossary candidate resolved: ${error.message}`);
    }

    return data ? fromGlossaryCandidateRow(data) : null;
  }

}
