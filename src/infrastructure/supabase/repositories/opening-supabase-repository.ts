import type { OpeningRepository } from "@/src/domain/openings/contracts";
import type {
  CreateOpeningInput,
  Opening,
  OpeningActivationInput,
  OpeningReactivationInput,
  OpeningSuppressionInput,
  OpeningSurface,
  OpeningSurfaceEvent,
} from "@/src/domain/openings/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromOpeningRow,
  fromOpeningSurfaceEventRow,
  toOpeningActivationUpdate,
  toOpeningDismissalUpdate,
  toOpeningInsertRow,
  toOpeningReactivationSuppressionInput,
  toOpeningReactivationUpdate,
  toOpeningSuppressionRow,
  toOpeningSuppressionUpdate,
  toOpeningSurface,
  toOpeningSurfaceEventInsertRow,
  type OpeningRow,
  type OpeningSurfaceEventRow,
} from "@/src/infrastructure/supabase/adapters/opening-row";
import type { LatentSnapshotId, OpeningId, UserId } from "@/src/shared/types";

const OPENINGS_TABLE = "openings";
const SUPPRESSIONS_TABLE = "opening_suppressions";
const SURFACE_EVENTS_TABLE = "opening_surface_events";
const DEFAULT_SURFACE_LIMIT = 3;
const DEFAULT_RECENT_OPENINGS_LIMIT = 40;

export class SupabaseOpeningRepository implements OpeningRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createOpening(input: CreateOpeningInput): Promise<Opening> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .insert(toOpeningInsertRow(input))
      .select("*")
      .single<OpeningRow>();

    if (error) {
      throw new Error(`Failed to create opening: ${error.message}`);
    }

    return fromOpeningRow(data);
  }

  async getOpeningById(openingId: OpeningId, userId: UserId): Promise<Opening | null> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("id", openingId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to load opening: ${error.message}`);
    }

    return data ? fromOpeningRow(data) : null;
  }

  async getOpeningByIdIncludingArchived(openingId: OpeningId, userId: UserId): Promise<Opening | null> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("id", openingId)
      .eq("user_id", userId)
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to load opening including archived state: ${error.message}`);
    }

    return data ? fromOpeningRow(data) : null;
  }

  async listOpeningSurfacesByUser(userId: UserId, limit = DEFAULT_SURFACE_LIMIT): Promise<OpeningSurface[]> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.floor(limit)));

    if (error) {
      throw new Error(`Failed to list opening surfaces: ${error.message}`);
    }

    return (data ?? [])
      .map((row) => toOpeningSurface(row as OpeningRow))
      .filter((surface) => surface.suppressionState === "none");
  }

  async listRecentOpeningsByUser(userId: UserId, limit = DEFAULT_RECENT_OPENINGS_LIMIT): Promise<Opening[]> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list recent openings: ${error.message}`);
    }

    return (data ?? []).map((row) => fromOpeningRow(row as OpeningRow));
  }

  async listDormantSuppressedOpeningsByUser(userId: UserId): Promise<Opening[]> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .eq("suppression_state", "suppressed")
      .neq("suppression_revisit_eligibility", "hidden")
      .is("archived_at", null)
      .order("updated_at", { ascending: false })
      .limit(DEFAULT_RECENT_OPENINGS_LIMIT);

    if (error) {
      throw new Error(`Failed to list dormant suppressed openings: ${error.message}`);
    }

    return (data ?? []).map((row) => fromOpeningRow(row as OpeningRow));
  }

  async listOpeningsByLatentSnapshot(snapshotId: LatentSnapshotId, userId: UserId): Promise<Opening[]> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .select("*")
      .eq("latent_snapshot_id", snapshotId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list openings by latent snapshot: ${error.message}`);
    }

    return (data ?? []).map((row) => fromOpeningRow(row as OpeningRow));
  }

  async activateOpening(input: OpeningActivationInput): Promise<Opening | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .update(toOpeningActivationUpdate(now))
      .eq("id", input.openingId)
      .eq("user_id", input.userId)
      .eq("suppression_state", "none")
      .is("archived_at", null)
      .select("*")
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to activate opening: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    await this.recordSurfaceEvent({
      openingId: input.openingId,
      userId: input.userId,
      eventType: "activated",
      source: input.source,
    });

    return fromOpeningRow(data);
  }

  async dismissOpening(openingId: OpeningId, userId: UserId): Promise<Opening | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .update(toOpeningDismissalUpdate(now))
      .eq("id", openingId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to dismiss opening: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    await this.recordSurfaceEvent({
      openingId,
      userId,
      eventType: "dismissed",
      source: "reflective_space_surface",
    });

    return fromOpeningRow(data);
  }

  async reactivateOpening(input: OpeningReactivationInput): Promise<Opening | null> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .update(toOpeningReactivationUpdate())
      .eq("id", input.openingId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to reactivate opening: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const suppressionRow = toOpeningSuppressionRow(toOpeningReactivationSuppressionInput(input));
    const { error: upsertError } = await this.client.from(SUPPRESSIONS_TABLE).upsert(suppressionRow, {
      onConflict: "opening_id,user_id",
      ignoreDuplicates: false,
    });
    if (upsertError) {
      throw new Error(`Failed to persist opening reactivation state: ${upsertError.message}`);
    }

    await this.recordSurfaceEvent({
      openingId: input.openingId,
      userId: input.userId,
      eventType: "reactivated",
      source: input.source,
    });

    return fromOpeningRow(data);
  }

  async setSuppression(input: OpeningSuppressionInput): Promise<Opening | null> {
    const { data, error } = await this.client
      .from(OPENINGS_TABLE)
      .update(toOpeningSuppressionUpdate(input))
      .eq("id", input.openingId)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<OpeningRow>();

    if (error) {
      throw new Error(`Failed to update opening suppression: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const suppressionRow = toOpeningSuppressionRow(input);
    const { error: upsertError } = await this.client.from(SUPPRESSIONS_TABLE).upsert(suppressionRow, {
      onConflict: "opening_id,user_id",
      ignoreDuplicates: false,
    });
    if (upsertError) {
      throw new Error(`Failed to persist opening suppression state: ${upsertError.message}`);
    }

    await this.recordSurfaceEvent({
      openingId: input.openingId,
      userId: input.userId,
      eventType: "suppressed",
      source: "reflective_space_surface",
    });

    return fromOpeningRow(data);
  }

  async recordSurfaceEvent(event: Omit<OpeningSurfaceEvent, "id" | "createdAt" | "updatedAt">): Promise<OpeningSurfaceEvent> {
    const { data, error } = await this.client
      .from(SURFACE_EVENTS_TABLE)
      .insert(toOpeningSurfaceEventInsertRow(event))
      .select("*")
      .single<OpeningSurfaceEventRow>();

    if (error) {
      throw new Error(`Failed to record opening surface event: ${error.message}`);
    }

    return fromOpeningSurfaceEventRow(data);
  }
}
