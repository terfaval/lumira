import type { LatentRepository } from "@/src/domain/latent/contracts";
import type { CreateLatentSnapshotInput, LatentSnapshot } from "@/src/domain/latent/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromLatentRows,
  toLatentSignalInsertRows,
  toLatentSnapshotInsertRow,
  toLatentSuggestionInsertRows,
  type LatentSignalRow,
  type LatentSnapshotRow,
  type LatentSuggestionRow,
} from "@/src/infrastructure/supabase/adapters/latent-row";
import type { LatentSnapshotId, UserId } from "@/src/shared/types";

const SNAPSHOTS_TABLE = "latent_snapshots";
const SIGNALS_TABLE = "latent_signals";
const SUGGESTIONS_TABLE = "latent_suggestions";

export class SupabaseLatentRepository implements LatentRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async createSnapshot(input: CreateLatentSnapshotInput): Promise<LatentSnapshot> {
    const { data, error } = await this.client
      .from(SNAPSHOTS_TABLE)
      .insert(toLatentSnapshotInsertRow(input))
      .select("*")
      .single<LatentSnapshotRow>();

    if (error) {
      throw new Error(`Failed to create latent snapshot: ${error.message}`);
    }

    const signalRows = toLatentSignalInsertRows(data.id, input);
    if (signalRows.length > 0) {
      const { error: signalInsertError } = await this.client.from(SIGNALS_TABLE).insert(signalRows);
      if (signalInsertError) {
        throw new Error(`Failed to create latent signals: ${signalInsertError.message}`);
      }
    }

    const suggestionRows = toLatentSuggestionInsertRows(data.id, input);
    if (suggestionRows.length > 0) {
      const { error: suggestionInsertError } = await this.client.from(SUGGESTIONS_TABLE).insert(suggestionRows);
      if (suggestionInsertError) {
        throw new Error(`Failed to create latent suggestions: ${suggestionInsertError.message}`);
      }
    }

    const loaded = await this.getSnapshotById(data.id, input.userId);
    if (!loaded) {
      throw new Error("Latent snapshot could not be loaded after creation.");
    }

    return loaded;
  }

  async getSnapshotById(snapshotId: LatentSnapshotId, userId: UserId): Promise<LatentSnapshot | null> {
    const { data, error } = await this.client
      .from(SNAPSHOTS_TABLE)
      .select("*")
      .eq("id", snapshotId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<LatentSnapshotRow>();

    if (error) {
      throw new Error(`Failed to load latent snapshot: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const { data: signalData, error: signalError } = await this.client
      .from(SIGNALS_TABLE)
      .select("*")
      .eq("snapshot_id", snapshotId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (signalError) {
      throw new Error(`Failed to load latent signals: ${signalError.message}`);
    }

    const { data: suggestionData, error: suggestionError } = await this.client
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("snapshot_id", snapshotId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (suggestionError) {
      throw new Error(`Failed to load latent suggestions: ${suggestionError.message}`);
    }

    return fromLatentRows(
      data,
      (signalData ?? []) as LatentSignalRow[],
      (suggestionData ?? []) as LatentSuggestionRow[],
    );
  }

  async listSnapshotsByUser(userId: UserId): Promise<LatentSnapshot[]> {
    const { data, error } = await this.client
      .from(SNAPSHOTS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list latent snapshots: ${error.message}`);
    }

    const snapshotRows = (data ?? []) as LatentSnapshotRow[];
    if (snapshotRows.length === 0) {
      return [];
    }

    const snapshotIds = snapshotRows.map((row) => row.id);

    const { data: signalData, error: signalError } = await this.client
      .from(SIGNALS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .in("snapshot_id", snapshotIds)
      .order("created_at", { ascending: true });

    if (signalError) {
      throw new Error(`Failed to list latent signals: ${signalError.message}`);
    }

    const { data: suggestionData, error: suggestionError } = await this.client
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .in("snapshot_id", snapshotIds)
      .order("created_at", { ascending: true });

    if (suggestionError) {
      throw new Error(`Failed to list latent suggestions: ${suggestionError.message}`);
    }

    const signals = (signalData ?? []) as LatentSignalRow[];
    const suggestions = (suggestionData ?? []) as LatentSuggestionRow[];

    return snapshotRows.map((row) => fromLatentRows(row, signals, suggestions));
  }

  async archiveSnapshot(snapshotId: LatentSnapshotId, userId: UserId): Promise<LatentSnapshot | null> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(SNAPSHOTS_TABLE)
      .update({ archived_at: now })
      .eq("id", snapshotId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<LatentSnapshotRow>();

    if (error) {
      throw new Error(`Failed to archive latent snapshot: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const { data: signalData, error: signalError } = await this.client
      .from(SIGNALS_TABLE)
      .select("*")
      .eq("snapshot_id", snapshotId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (signalError) {
      throw new Error(`Failed to load latent signals after archive: ${signalError.message}`);
    }

    const { data: suggestionData, error: suggestionError } = await this.client
      .from(SUGGESTIONS_TABLE)
      .select("*")
      .eq("snapshot_id", snapshotId)
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (suggestionError) {
      throw new Error(`Failed to load latent suggestions after archive: ${suggestionError.message}`);
    }

    return fromLatentRows(
      data,
      (signalData ?? []) as LatentSignalRow[],
      (suggestionData ?? []) as LatentSuggestionRow[],
    );
  }
}
