import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import { projectHistoryDerivedLifecycleState } from "@/src/domain/latent-v2/lifecycle";
import {
  LatentGenerationRunRollbackDeletionConflictError,
  LatentGenerationRunTransitionConflictError,
} from "@/src/domain/latent-v2/errors";
import type {
  AcceptLatentGenerationRunSuccessorAtomicallyInput,
  AcceptedAuthorityEvidence,
  AcceptedOpportunityStaleGround,
  AcceptedOpportunityStalenessResult,
  AcceptedOpportunityStalenessTarget,
  AcceptedGenerationReuseResolution,
  AuthorityEvaluationResult,
  CandidateAuthorityEvidence,
  CreateLatentGenerationRunInput,
  CreateLatentGenerationRunInvalidationEventInput,
  CreateLatentOpportunityIdentityRelationshipInput,
  CreateLatentOpportunityLifecycleEventInput,
  LatentGenerationRun,
  LatentGenerationRunInvalidationEvent,
  LatentOpportunityIdentityRelationship,
  LatentOpportunityLifecycleEvent,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type {
  LatentGenerationRunId,
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  buildAuthorityFingerprint,
  canonicalizeAuthorityProvenance,
} from "@/src/domain/latent-v2/authority-provenance";
import {
  fromLatentGenerationRunRow,
  fromLatentGenerationRunInvalidationEventRow,
  fromLatentOpportunityIdentityRelationshipRow,
  fromLatentOpportunityLifecycleEventRow,
  fromLatentOpportunityRows,
  toLatentGenerationRunInsertRow,
  toLatentGenerationRunInvalidationEventInsertRow,
  toLatentOpportunityEvidenceBlockInsertRows,
  toLatentOpportunityEvidenceObservationInsertRows,
  toLatentOpportunityGlossaryLinkInsertRows,
  toLatentOpportunityIdentityRelationshipInsertRow,
  toLatentOpportunityIdentityInsertRow,
  toLatentOpportunityLifecycleEventInsertRow,
  toLatentOpportunityManifestationInsertRow,
  type LatentGenerationRunRow,
  type LatentGenerationRunInvalidationEventRow,
  type LatentOpportunityEvidenceBlockRow,
  type LatentOpportunityEvidenceObservationRow,
  type LatentOpportunityGlossaryLinkRow,
  type LatentOpportunityIdentityRelationshipRow,
  type LatentOpportunityIdentityRow,
  type LatentOpportunityLifecycleEventRow,
  type LatentOpportunityManifestationRow,
} from "@/src/infrastructure/supabase/adapters/latent-opportunity-row";

const GENERATION_RUNS_TABLE = "latent_opportunity_generation_runs";
const IDENTITIES_TABLE = "latent_opportunity_identities";
const MANIFESTATIONS_TABLE = "latent_opportunity_manifestations";
const EVIDENCE_BLOCKS_TABLE = "latent_opportunity_evidence_blocks";
const EVIDENCE_OBSERVATIONS_TABLE = "latent_opportunity_evidence_observations";
const GLOSSARY_LINKS_TABLE = "latent_opportunity_glossary_links";
const INVALIDATION_EVENTS_TABLE = "latent_generation_run_invalidation_events";
const LIFECYCLE_EVENTS_TABLE = "latent_opportunity_lifecycle_events";
const IDENTITY_RELATIONSHIPS_TABLE = "latent_opportunity_identity_relationships";
const ACCEPT_SUCCESSOR_RPC = "accept_latent_generation_run_successor";

type AcceptedOpportunityBasisEvidence = {
  generationRun: LatentGenerationRun;
};

type AcceptedOpportunitySurfaceEvidence = {
  manifestations: LatentOpportunityManifestation[];
};

type AcceptedOpportunitySurfaceIntegrityEvidence = {
  coherent: boolean;
};

export function projectAcceptedAuthorityEvidence(
  selectedGenerationRun: LatentGenerationRun,
): AcceptedAuthorityEvidence {
  if (selectedGenerationRun.authorityProvenance == null) {
    throw new Error("Accepted generation run does not contain authority provenance.");
  }

  return {
    authorityProvenance: selectedGenerationRun.authorityProvenance,
    authorityFingerprint: selectedGenerationRun.authorityFingerprint ?? undefined,
  };
}

export class SupabaseLatentOpportunityRepository implements LatentOpportunityRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async evaluateAuthoritySameness(
    accepted: AcceptedAuthorityEvidence,
    candidate: CandidateAuthorityEvidence,
  ): Promise<AuthorityEvaluationResult> {
    const acceptedEvidence = this.canonicalizeAuthorityEvidence(accepted);
    const candidateEvidence = this.canonicalizeAuthorityEvidence(candidate);

    return {
      outcome:
        acceptedEvidence.canonicalAuthority === candidateEvidence.canonicalAuthority
          ? "constitutionally_identical"
          : "materially_changed",
      acceptedFingerprint: acceptedEvidence.fingerprint,
      candidateFingerprint: candidateEvidence.fingerprint,
    };
  }

  async determineAcceptedOpportunityStaleness(
    target: AcceptedOpportunityStalenessTarget,
    options?: {
      authorityEvaluation?: AuthorityEvaluationResult;
    },
  ): Promise<AcceptedOpportunityStalenessResult> {
    const basis = await this.resolveAcceptedOpportunityBasisEvidence(target);
    const surface = await this.resolveAcceptedOpportunitySurfaceEvidence(
      basis,
      target.userId,
    );
    const invalidations = await this.listGenerationRunInvalidations(
      basis.generationRun.id,
      target.userId,
    );
    const surfaceIntegrity =
      this.deriveAcceptedOpportunitySurfaceIntegrityEvidence(target, basis, surface);

    return this.applyAcceptedOpportunityStaleGrounds({
      authorityEvaluation: options?.authorityEvaluation,
      invalidations,
      surfaceIntegrity,
    });
  }

  async createGenerationRun(input: CreateLatentGenerationRunInput): Promise<LatentGenerationRun> {
    const { data, error } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .insert(toLatentGenerationRunInsertRow(input))
      .select("*")
      .single<LatentGenerationRunRow>();

    if (error) {
      throw new Error(`Failed to create latent generation run: ${error.message}`);
    }

    return fromLatentGenerationRunRow(data);
  }

  async deleteGenerationRun(generationRunId: LatentGenerationRunId, userId: UserId): Promise<void> {
    const { error, count } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .delete({ count: "exact" })
      .eq("id", generationRunId)
      .eq("user_id", userId)
      .eq("status", "pending");

    if (error) {
      throw new Error(`Failed to delete latent generation run: ${error.message}`);
    }

    if (count === 1) {
      return;
    }

    if (count != null && count > 1) {
      throw new Error(
        `Latent generation run rollback deletion integrity failure: expected 1 row, received ${count}.`,
      );
    }

    if ((count ?? 0) === 0) {
      const current = await this.getGenerationRunById(generationRunId, userId);
      throw new LatentGenerationRunRollbackDeletionConflictError({
        generationRunId,
        userId,
        actualStatus: current?.status ?? "missing",
      });
    }

    throw new Error("Latent generation run rollback deletion could not be confirmed.");
  }

  async getGenerationRunById(
    generationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentGenerationRun | null> {
    const { data, error } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .select("*")
      .eq("id", generationRunId)
      .eq("user_id", userId)
      .maybeSingle<LatentGenerationRunRow>();

    if (error) {
      throw new Error(`Failed to load latent generation run: ${error.message}`);
    }

    return data ? fromLatentGenerationRunRow(data) : null;
  }

  async createGenerationRunInvalidationIfAbsent(
    input: CreateLatentGenerationRunInvalidationEventInput,
  ): Promise<LatentGenerationRunInvalidationEvent | null> {
    const { data, error } = await this.client
      .from(INVALIDATION_EVENTS_TABLE)
      .upsert([toLatentGenerationRunInvalidationEventInsertRow(input)], {
        onConflict: "target_generation_run_id,source_layer,source_entity_type,source_revision",
        ignoreDuplicates: true,
      })
      .select("*")
      .maybeSingle<LatentGenerationRunInvalidationEventRow>();

    if (error) {
      throw new Error(`Failed to create latent generation run invalidation event: ${error.message}`);
    }

    return data ? fromLatentGenerationRunInvalidationEventRow(data) : null;
  }

  async resolveReusableAcceptedGenerationRun(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<AcceptedGenerationReuseResolution> {
    const generationRun =
      (await this.getCurrentGenerationRunForReflectiveObject(priorityReflectiveObjectId, userId)) ??
      this.selectLatestEligibleEmptyGenerationRun(
        await this.listGenerationRunsForReflectiveObject(priorityReflectiveObjectId, userId),
      ) ??
      null;

    if (!generationRun) {
      return {
        reusable: false,
        generationRun: null,
        invalidation: null,
      };
    }

    const invalidation = (await this.listGenerationRunInvalidations(generationRun.id, userId))[0] ?? null;

    return {
      reusable: invalidation == null,
      generationRun,
      invalidation,
    };
  }

  async getCurrentGenerationRunForReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentGenerationRun | null> {
    const { data, error } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .select("*")
      .eq("priority_reflective_object_id", priorityReflectiveObjectId)
      .eq("user_id", userId)
      .eq("status", "current")
      .is("superseded_at", null)
      .maybeSingle<LatentGenerationRunRow>();

    if (error) {
      throw new Error(`Failed to load current latent generation run: ${error.message}`);
    }

    return data ? fromLatentGenerationRunRow(data) : null;
  }

  async getManifestationById(
    manifestationId: LatentOpportunityManifestationId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation | null> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("id", manifestationId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<LatentOpportunityManifestationRow>();

    if (error) {
      throw new Error(`Failed to load latent opportunity manifestation: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.loadManifestationGraph(data);
  }

  async listGenerationRunsForReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentGenerationRun[]> {
    const { data, error } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .select("*")
      .eq("priority_reflective_object_id", priorityReflectiveObjectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent generation runs: ${error.message}`);
    }

    return ((data ?? []) as LatentGenerationRunRow[]).map(fromLatentGenerationRunRow);
  }

  async listGenerationRunInvalidations(
    targetGenerationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentGenerationRunInvalidationEvent[]> {
    const { data, error } = await this.client
      .from(INVALIDATION_EVENTS_TABLE)
      .select("*")
      .eq("target_generation_run_id", targetGenerationRunId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent generation run invalidation events: ${error.message}`);
    }

    return ((data ?? []) as LatentGenerationRunInvalidationEventRow[]).map(
      fromLatentGenerationRunInvalidationEventRow,
    );
  }

  async listManifestationsByGenerationRun(
    generationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("generation_run_id", generationRunId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent opportunity manifestations by generation run: ${error.message}`);
    }

    const manifestationRows = (data ?? []) as LatentOpportunityManifestationRow[];
    return Promise.all(manifestationRows.map((row) => this.loadManifestationGraph(row)));
  }

  async listManifestationsByPriorityReflectiveObject(
    priorityReflectiveObjectId: ReflectiveObjectId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("priority_reflective_object_id", priorityReflectiveObjectId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent opportunity manifestations by priority object: ${error.message}`);
    }

    const manifestationRows = (data ?? []) as LatentOpportunityManifestationRow[];
    return Promise.all(manifestationRows.map((row) => this.loadManifestationGraph(row)));
  }

  async listManifestationsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityManifestation[]> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("identity_id", identityId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent opportunity manifestations by identity: ${error.message}`);
    }

    const manifestationRows = (data ?? []) as LatentOpportunityManifestationRow[];
    return Promise.all(manifestationRows.map((row) => this.loadManifestationGraph(row)));
  }

  async createLifecycleEvent(
    input: CreateLatentOpportunityLifecycleEventInput,
  ): Promise<LatentOpportunityLifecycleEvent> {
    const { data, error } = await this.client
      .from(LIFECYCLE_EVENTS_TABLE)
      .insert(toLatentOpportunityLifecycleEventInsertRow(input))
      .select("*")
      .single<LatentOpportunityLifecycleEventRow>();

    if (error) {
      throw new Error(`Failed to create latent opportunity lifecycle event: ${error.message}`);
    }

    return fromLatentOpportunityLifecycleEventRow(data);
  }

  async createIdentityRelationship(
    input: CreateLatentOpportunityIdentityRelationshipInput,
  ): Promise<LatentOpportunityIdentityRelationship> {
    const { data, error } = await this.client
      .from(IDENTITY_RELATIONSHIPS_TABLE)
      .insert(toLatentOpportunityIdentityRelationshipInsertRow(input))
      .select("*")
      .single<LatentOpportunityIdentityRelationshipRow>();

    if (error) {
      throw new Error(`Failed to create latent opportunity identity relationship: ${error.message}`);
    }

    return fromLatentOpportunityIdentityRelationshipRow(data);
  }

  async listLifecycleEventsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityLifecycleEvent[]> {
    const { data, error } = await this.client
      .from(LIFECYCLE_EVENTS_TABLE)
      .select("*")
      .eq("identity_id", identityId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to list latent opportunity lifecycle events: ${error.message}`);
    }

    return ((data ?? []) as LatentOpportunityLifecycleEventRow[]).map(
      fromLatentOpportunityLifecycleEventRow,
    );
  }

  async listIdentityRelationshipsByIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityIdentityRelationship[]> {
    const { data, error } = await this.client
      .from(IDENTITY_RELATIONSHIPS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .or(`source_identity_id.eq.${identityId},target_identity_id.eq.${identityId}`)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`Failed to list latent opportunity identity relationships: ${error.message}`);
    }

    return ((data ?? []) as LatentOpportunityIdentityRelationshipRow[]).map(
      fromLatentOpportunityIdentityRelationshipRow,
    );
  }

  async acceptGenerationRunSuccessorAtomically(
    input: AcceptLatentGenerationRunSuccessorAtomicallyInput,
  ): Promise<LatentGenerationRun> {
    const identityRows = (input.identities ?? []).map(toLatentOpportunityIdentityInsertRow);
    const manifestationRows = input.manifestations.map((manifestationInput) => {
      const manifestationRow = toLatentOpportunityManifestationInsertRow(manifestationInput);
      const evidenceBlockRows = toLatentOpportunityEvidenceBlockInsertRows(
        manifestationRow.id,
        manifestationInput,
      );
      const evidenceObservationRows = toLatentOpportunityEvidenceObservationInsertRows(
        evidenceBlockRows,
        manifestationInput,
      );
      const glossaryLinkRows = toLatentOpportunityGlossaryLinkInsertRows(
        manifestationRow.id,
        manifestationInput,
      );

      return {
        ...manifestationRow,
        evidence_blocks: evidenceBlockRows.map((blockRow) => ({
          ...blockRow,
          observations: evidenceObservationRows.filter(
            (observationRow) => observationRow.evidence_block_id === blockRow.id,
          ),
        })),
        glossary_links: glossaryLinkRows,
      };
    });
    const lifecycleEventRows = input.lifecycleEvents.map(toLatentOpportunityLifecycleEventInsertRow);
    const identityRelationshipRows = input.identityRelationships.map(
      toLatentOpportunityIdentityRelationshipInsertRow,
    );

    const { data, error } = await this.client.rpc(ACCEPT_SUCCESSOR_RPC, {
      p_user_id: input.userId,
      p_predecessor_run_id: input.predecessorRunId,
      p_successor_run_id: input.successorRunId,
      p_identities: identityRows,
      p_manifestations: manifestationRows,
      p_lifecycle_events: lifecycleEventRows,
      p_identity_relationships: identityRelationshipRows,
    });

    if (error) {
      throw new Error(`Failed to accept latent generation run successor atomically: ${error.message}`);
    }

    return fromLatentGenerationRunRow(data as LatentGenerationRunRow);
  }

  async listRecentManifestationsByUser(userId: UserId, limit = 12): Promise<LatentOpportunityManifestation[]> {
    let request = this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list recent latent opportunity manifestations: ${error.message}`);
    }

    const manifestationRows = (data ?? []) as LatentOpportunityManifestationRow[];
    return Promise.all(manifestationRows.map((row) => this.loadManifestationGraph(row)));
  }

  async markGenerationRunCurrent(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["pending"],
      nextStatus: "current",
      patch: {
        status: "current",
        accepted_at: new Date().toISOString(),
      },
    });
  }

  async markGenerationRunFailed(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["pending"],
      nextStatus: "failed",
      patch: {
        status: "failed",
      },
    });
  }

  async markGenerationRunRejected(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["pending"],
      nextStatus: "rejected",
      patch: {
        status: "rejected",
      },
    });
  }

  async markGenerationRunEmpty(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["pending"],
      nextStatus: "empty",
      patch: {
        status: "empty",
      },
    });
  }

  async markGenerationRunNoChange(generationRunId: LatentGenerationRunId, userId: UserId): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["pending"],
      nextStatus: "no_change",
      patch: {
        status: "no_change",
      },
    });
  }

  async markGenerationRunSuperseded(
    generationRunId: LatentGenerationRunId,
    userId: UserId,
  ): Promise<LatentGenerationRun> {
    return this.transitionGenerationRun({
      generationRunId,
      userId,
      allowedFrom: ["current"],
      nextStatus: "superseded",
      patch: {
        status: "superseded",
        superseded_at: new Date().toISOString(),
      },
    });
  }

  private async loadManifestationGraph(
    manifestationRow: LatentOpportunityManifestationRow,
  ): Promise<LatentOpportunityManifestation> {
    const identity = await this.loadIdentity(manifestationRow.identity_id, manifestationRow.user_id);
    if (!identity) {
      throw new Error(`Latent opportunity identity not found for manifestation ${manifestationRow.id}.`);
    }

    const { data: evidenceBlockData, error: evidenceBlockError } = await this.client
      .from(EVIDENCE_BLOCKS_TABLE)
      .select("*")
      .eq("manifestation_id", manifestationRow.id)
      .eq("user_id", manifestationRow.user_id)
      .order("position", { ascending: true });

    if (evidenceBlockError) {
      throw new Error(`Failed to load latent opportunity evidence blocks: ${evidenceBlockError.message}`);
    }

    const evidenceBlockRows = (evidenceBlockData ?? []) as LatentOpportunityEvidenceBlockRow[];
    const evidenceObservationRows: LatentOpportunityEvidenceObservationRow[] = [];

    for (const blockRow of evidenceBlockRows) {
      const { data, error } = await this.client
        .from(EVIDENCE_OBSERVATIONS_TABLE)
        .select("*")
        .eq("evidence_block_id", blockRow.id)
        .eq("user_id", manifestationRow.user_id)
        .order("created_at", { ascending: true });

      if (error) {
        throw new Error(`Failed to load latent opportunity evidence observations: ${error.message}`);
      }

      evidenceObservationRows.push(...((data ?? []) as LatentOpportunityEvidenceObservationRow[]));
    }

    const { data: glossaryLinkData, error: glossaryLinkError } = await this.client
      .from(GLOSSARY_LINKS_TABLE)
      .select("*")
      .eq("manifestation_id", manifestationRow.id)
      .eq("user_id", manifestationRow.user_id)
      .order("created_at", { ascending: true });

    if (glossaryLinkError) {
      throw new Error(`Failed to load latent opportunity glossary links: ${glossaryLinkError.message}`);
    }

    const manifestation = fromLatentOpportunityRows(
      identity,
      manifestationRow,
      evidenceBlockRows,
      evidenceObservationRows,
      (glossaryLinkData ?? []) as LatentOpportunityGlossaryLinkRow[],
    );
    const projection = projectHistoryDerivedLifecycleState({
      identityId: manifestation.identity.id,
      events: await this.listLifecycleEventsByIdentity(manifestation.identity.id, manifestation.userId),
      expectedPersistedLifecycleState: manifestation.identity.lifecycleState,
    });

    return {
      ...manifestation,
      identity: {
        ...manifestation.identity,
        lifecycleState: projection.lifecycleState,
      },
    };
  }

  private async loadIdentity(
    identityId: LatentOpportunityIdentityId,
    userId: UserId,
  ): Promise<LatentOpportunityIdentityRow | null> {
    const { data, error } = await this.client
      .from(IDENTITIES_TABLE)
      .select("*")
      .eq("id", identityId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<LatentOpportunityIdentityRow>();

    if (error) {
      throw new Error(`Failed to load latent opportunity identity: ${error.message}`);
    }

    return data;
  }

  private async resolveAcceptedOpportunityBasisEvidence(
    target: AcceptedOpportunityStalenessTarget,
  ): Promise<AcceptedOpportunityBasisEvidence> {
    const generationRun = await this.getCurrentGenerationRunForReflectiveObject(
      target.priorityReflectiveObjectId,
      target.userId,
    );

    if (generationRun == null) {
      const fallbackEmpty = this.selectLatestEligibleEmptyGenerationRun(
        await this.listGenerationRunsForReflectiveObject(
          target.priorityReflectiveObjectId,
          target.userId,
        ),
      );
      if (fallbackEmpty != null) {
        throw new Error("No Accepted Opportunity exists for the target.");
      }

      throw new Error("Accepted Opportunity basis could not be resolved.");
    }

    if (generationRun.authorityProvenance == null) {
      throw new Error("Accepted Opportunity basis could not be resolved.");
    }

    return { generationRun };
  }

  private async resolveAcceptedOpportunitySurfaceEvidence(
    basis: AcceptedOpportunityBasisEvidence,
    userId: UserId,
  ): Promise<AcceptedOpportunitySurfaceEvidence> {
    const manifestations = await this.listManifestationsByGenerationRun(
      basis.generationRun.id,
      userId,
    );

    if (manifestations.length === 0) {
      throw new Error("Accepted Opportunity surface could not be resolved.");
    }

    return { manifestations };
  }

  private deriveAcceptedOpportunitySurfaceIntegrityEvidence(
    target: AcceptedOpportunityStalenessTarget,
    basis: AcceptedOpportunityBasisEvidence,
    surface: AcceptedOpportunitySurfaceEvidence,
  ): AcceptedOpportunitySurfaceIntegrityEvidence {
    return {
      coherent: surface.manifestations.every(
        (manifestation) =>
          manifestation.generationRunId === basis.generationRun.id &&
          manifestation.userId === basis.generationRun.userId &&
          manifestation.priorityReflectiveObjectId === target.priorityReflectiveObjectId,
      ),
    };
  }

  private selectLatestEligibleEmptyGenerationRun(
    runs: LatentGenerationRun[],
  ): LatentGenerationRun | null {
    return (
      [...runs]
        .filter((run) => run.status === "empty" && run.supersededAt === null)
        .sort((left, right) => {
          const createdAtDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
          if (createdAtDelta !== 0) {
            return createdAtDelta;
          }

          return right.id.localeCompare(left.id);
        })[0] ?? null
    );
  }

  projectHistoryDerivedLifecycleState = projectHistoryDerivedLifecycleState;

  private canonicalizeAuthorityEvidence(
    evidence: AcceptedAuthorityEvidence | CandidateAuthorityEvidence,
  ): {
    canonicalAuthority: string;
    fingerprint: string;
  } {
    const canonicalAuthority = canonicalizeAuthorityProvenance(evidence.authorityProvenance);
    const fingerprint = buildAuthorityFingerprint(evidence.authorityProvenance);

    if (
      evidence.authorityFingerprint != null &&
      evidence.authorityFingerprint !== fingerprint
    ) {
      throw new Error("Authority fingerprint evidence mismatch.");
    }

    return {
      canonicalAuthority,
      fingerprint,
    };
  }

  private applyAcceptedOpportunityStaleGrounds(input: {
    authorityEvaluation?: AuthorityEvaluationResult;
    invalidations: LatentGenerationRunInvalidationEvent[];
    surfaceIntegrity: AcceptedOpportunitySurfaceIntegrityEvidence;
  }): AcceptedOpportunityStalenessResult {
    const grounds: AcceptedOpportunityStaleGround[] = [];

    if (input.authorityEvaluation?.outcome === "materially_changed") {
      grounds.push("authority_divergence");
    }

    if (input.invalidations.length > 0) {
      grounds.push("invalidation_currentness_failure");
    }

    if (!input.surfaceIntegrity.coherent) {
      grounds.push("accepted_surface_divergence");
    }

    return {
      outcome: grounds.length > 0 ? "stale" : "current",
      grounds,
    };
  }

  private async transitionGenerationRun(input: {
    generationRunId: LatentGenerationRunId;
    userId: UserId;
    allowedFrom: LatentGenerationRun["status"][];
    nextStatus: LatentGenerationRun["status"];
    patch: Record<string, unknown>;
  }): Promise<LatentGenerationRun> {
    const current = await this.getGenerationRunById(input.generationRunId, input.userId);
    if (!current) {
      throw new Error(`Latent generation run not found: ${input.generationRunId}`);
    }

    if (!input.allowedFrom.includes(current.status)) {
      throw new Error(`Invalid latent generation run transition: ${current.status} -> ${input.nextStatus}`);
    }

    const expectedStatus = current.status;
    const { data, error } = await this.client
      .from(GENERATION_RUNS_TABLE)
      .update(input.patch)
      .eq("id", input.generationRunId)
      .eq("user_id", input.userId)
      .eq("status", expectedStatus)
      .select("*")
      .maybeSingle<LatentGenerationRunRow>();

    if (error) {
      throw new Error(`Failed to transition latent generation run to ${input.nextStatus}: ${error.message}`);
    }

    if (!data) {
      const actual = await this.getGenerationRunById(input.generationRunId, input.userId);
      throw new LatentGenerationRunTransitionConflictError({
        generationRunId: input.generationRunId,
        userId: input.userId,
        expectedStatus,
        targetStatus: input.nextStatus,
        actualStatus: actual?.status ?? "missing",
      });
    }

    return fromLatentGenerationRunRow(data);
  }
}
