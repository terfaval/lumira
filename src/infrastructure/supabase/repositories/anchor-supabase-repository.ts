import type { AnchorRepository } from "@/src/domain/anchor-v1/contracts";
import type {
  AnchorIdentity,
  AnchorManifestation,
  AnchorParticipation,
  CreateAnchorIdentityInput,
  CreateAnchorManifestationInput,
  CreateAnchorParticipationInput,
} from "@/src/domain/anchor-v1/types";
import type { AnchorIdentityId, AnchorManifestationId, AnchorParticipationId, UserId } from "@/src/shared/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromAnchorIdentityRow,
  fromAnchorManifestationRow,
  fromAnchorParticipationRow,
  toAnchorIdentityInsertRow,
  toAnchorManifestationInsertRow,
  toAnchorParticipationInsertRow,
  type AnchorIdentityRow,
  type AnchorManifestationRow,
  type AnchorParticipationRow,
} from "@/src/infrastructure/supabase/adapters/anchor-row";

const IDENTITIES_TABLE = "anchor_identities";
const MANIFESTATIONS_TABLE = "anchor_manifestations";
const PARTICIPATIONS_TABLE = "anchor_participations";

export class SupabaseAnchorRepository implements AnchorRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createIdentity(input: CreateAnchorIdentityInput): Promise<AnchorIdentity> {
    const { data, error } = await this.client
      .from(IDENTITIES_TABLE)
      .insert(toAnchorIdentityInsertRow(input))
      .select("*")
      .single<AnchorIdentityRow>();

    if (error) {
      throw new Error(`Failed to create anchor identity: ${error.message}`);
    }

    return fromAnchorIdentityRow(data);
  }

  async deleteIdentity(anchorId: AnchorIdentityId, userId: UserId): Promise<void> {
    const { error } = await this.client
      .from(IDENTITIES_TABLE)
      .delete()
      .eq("id", anchorId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete anchor identity: ${error.message}`);
    }
  }

  async getIdentityById(anchorId: AnchorIdentityId, userId: UserId): Promise<AnchorIdentity | null> {
    const { data, error } = await this.client
      .from(IDENTITIES_TABLE)
      .select("*")
      .eq("id", anchorId)
      .eq("user_id", userId)
      .maybeSingle<AnchorIdentityRow>();

    if (error) {
      throw new Error(`Failed to load anchor identity: ${error.message}`);
    }

    return data ? fromAnchorIdentityRow(data) : null;
  }

  async createManifestation(input: CreateAnchorManifestationInput): Promise<AnchorManifestation> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .insert(toAnchorManifestationInsertRow(input))
      .select("*")
      .single<AnchorManifestationRow>();

    if (error) {
      throw new Error(`Failed to create anchor manifestation: ${error.message}`);
    }

    return fromAnchorManifestationRow(data);
  }

  async getManifestationById(
    anchorManifestationId: AnchorManifestationId,
    userId: UserId,
  ): Promise<AnchorManifestation | null> {
    const { data, error } = await this.client
      .from(MANIFESTATIONS_TABLE)
      .select("*")
      .eq("id", anchorManifestationId)
      .eq("user_id", userId)
      .maybeSingle<AnchorManifestationRow>();

    if (error) {
      throw new Error(`Failed to load anchor manifestation: ${error.message}`);
    }

    return data ? fromAnchorManifestationRow(data) : null;
  }

  async createParticipation(input: CreateAnchorParticipationInput): Promise<AnchorParticipation> {
    const { data, error } = await this.client
      .from(PARTICIPATIONS_TABLE)
      .insert(toAnchorParticipationInsertRow(input))
      .select("*")
      .single<AnchorParticipationRow>();

    if (error) {
      throw new Error(`Failed to create anchor participation: ${error.message}`);
    }

    return fromAnchorParticipationRow(data);
  }

  async getParticipationById(
    anchorParticipationId: AnchorParticipationId,
    userId: UserId,
  ): Promise<AnchorParticipation | null> {
    const { data, error } = await this.client
      .from(PARTICIPATIONS_TABLE)
      .select("*")
      .eq("id", anchorParticipationId)
      .eq("user_id", userId)
      .maybeSingle<AnchorParticipationRow>();

    if (error) {
      throw new Error(`Failed to load anchor participation: ${error.message}`);
    }

    return data ? fromAnchorParticipationRow(data) : null;
  }
}
