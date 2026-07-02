import type { LatentOpportunityRepository } from "@/src/domain/latent-v2/contracts";
import type {
  CreateLatentOpportunityIdentityInput,
  CreateLatentOpportunityManifestationInput,
  LatentOpportunityIdentity,
  LatentOpportunityManifestation,
} from "@/src/domain/latent-v2/types";
import type {
  LatentOpportunityIdentityId,
  LatentOpportunityManifestationId,
  ReflectiveObjectId,
  UserId,
} from "@/src/shared/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromLatentOpportunityRows,
  toLatentOpportunityEvidenceBlockInsertRows,
  toLatentOpportunityEvidenceObservationInsertRows,
  toLatentOpportunityGlossaryLinkInsertRows,
  toLatentOpportunityIdentityInsertRow,
  toLatentOpportunityManifestationInsertRow,
  type LatentOpportunityEvidenceBlockRow,
  type LatentOpportunityEvidenceObservationRow,
  type LatentOpportunityGlossaryLinkRow,
  type LatentOpportunityIdentityRow,
  type LatentOpportunityManifestationRow,
} from "@/src/infrastructure/supabase/adapters/latent-opportunity-row";

const IDENTITIES_TABLE = "latent_opportunity_identities";
const MANIFESTATIONS_TABLE = "latent_opportunity_manifestations";
const EVIDENCE_BLOCKS_TABLE = "latent_opportunity_evidence_blocks";
const EVIDENCE_OBSERVATIONS_TABLE = "latent_opportunity_evidence_observations";
const GLOSSARY_LINKS_TABLE = "latent_opportunity_glossary_links";

export class SupabaseLatentOpportunityRepository implements LatentOpportunityRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createIdentity(input: CreateLatentOpportunityIdentityInput): Promise<LatentOpportunityIdentity> {
    const { data, error } = await this.client
      .from(IDENTITIES_TABLE)
      .insert(toLatentOpportunityIdentityInsertRow(input))
      .select("*")
      .single<LatentOpportunityIdentityRow>();

    if (error) {
      throw new Error(`Failed to create latent opportunity identity: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      primaryCategory: data.primary_category as LatentOpportunityIdentity["primaryCategory"],
      secondaryCategories: data.secondary_categories as LatentOpportunityIdentity["secondaryCategories"],
      lifecycleState: data.lifecycle_state as LatentOpportunityIdentity["lifecycleState"],
      status: data.status as LatentOpportunityIdentity["status"],
      archivedAt: data.archived_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async createManifestation(input: CreateLatentOpportunityManifestationInput): Promise<LatentOpportunityManifestation> {
    const manifestationRow = toLatentOpportunityManifestationInsertRow(input);
    const { error: manifestationError } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .insert(manifestationRow)
      .select("*")
      .single<LatentOpportunityManifestationRow>();

    if (manifestationError) {
      throw new Error(`Failed to create latent opportunity manifestation: ${manifestationError.message}`);
    }

    try {
      const evidenceBlockRows = toLatentOpportunityEvidenceBlockInsertRows(manifestationRow.id, input);
      if (evidenceBlockRows.length > 0) {
        const { error } = await this.client.from(EVIDENCE_BLOCKS_TABLE).insert(evidenceBlockRows);
        if (error) {
          throw new Error(`Failed to create latent opportunity evidence blocks: ${error.message}`);
        }
      }

      const evidenceObservationRows = toLatentOpportunityEvidenceObservationInsertRows(evidenceBlockRows, input);
      if (evidenceObservationRows.length > 0) {
        const { error } = await this.client.from(EVIDENCE_OBSERVATIONS_TABLE).insert(evidenceObservationRows);
        if (error) {
          throw new Error(`Failed to create latent opportunity evidence observations: ${error.message}`);
        }
      }

      const glossaryLinkRows = toLatentOpportunityGlossaryLinkInsertRows(manifestationRow.id, input);
      if (glossaryLinkRows.length > 0) {
        const { error } = await this.client.from(GLOSSARY_LINKS_TABLE).insert(glossaryLinkRows);
        if (error) {
          throw new Error(`Failed to create latent opportunity glossary links: ${error.message}`);
        }
      }

      const loaded = await this.getManifestationById(manifestationRow.id, input.userId);
      if (!loaded) {
        throw new Error("Latent opportunity manifestation could not be loaded after creation.");
      }

      return loaded;
    } catch (error) {
      await this.deleteManifestationAfterFailure(manifestationRow.id, input.userId);
      throw error;
    }
  }

  async deleteIdentity(identityId: LatentOpportunityIdentityId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from(IDENTITIES_TABLE)
      .delete()
      .eq("id", identityId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete latent opportunity identity: ${error.message}`);
    }
  }

  async deleteManifestation(manifestationId: LatentOpportunityManifestationId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .delete()
      .eq("id", manifestationId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete latent opportunity manifestation: ${error.message}`);
    }
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

    return fromLatentOpportunityRows(
      identity,
      manifestationRow,
      evidenceBlockRows,
      evidenceObservationRows,
      (glossaryLinkData ?? []) as LatentOpportunityGlossaryLinkRow[],
    );
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

  private async deleteManifestationAfterFailure(
    manifestationId: LatentOpportunityManifestationId,
    userId: UserId,
  ): Promise<void> {
    try {
      await this.deleteManifestation(manifestationId, userId);
    } catch (cleanupError) {
      console.error("latent_opportunity_manifestation_cleanup_failed", {
        manifestationId,
        userId,
        error: cleanupError instanceof Error ? cleanupError.message : "unknown_error",
      });
    }
  }
}
