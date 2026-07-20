import type { ObservationV2GetOptions, ObservationV2Repository } from "@/src/domain/observation/contracts";
import { buildObservationV2Bundle, type ObservationV2Bundle } from "@/src/domain/observation/v2-runtime";
import type { UserId } from "@/src/shared/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromObservationV2Rows,
  toObservationV2BundleInsertRow,
  toObservationV2SceneInsertRows,
  toObservationV2SceneObservationInsertRows,
  type ObservationV2BundleRow,
  type ObservationV2SceneObservationRow,
  type ObservationV2SceneRow,
} from "@/src/infrastructure/supabase/adapters/observation-v2-row";

const BUNDLES_TABLE = "observation_v2_bundles";
const SCENES_TABLE = "observation_v2_scenes";
const SCENE_OBSERVATIONS_TABLE = "observation_v2_scene_observations";
const ARCHIVE_BUNDLE_RPC = "archive_observation_v2_bundle";

export class SupabaseObservationV2Repository implements ObservationV2Repository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async create(bundle: ObservationV2Bundle): Promise<ObservationV2Bundle> {
    const hardenedBundle = buildObservationV2Bundle(bundle);

    const { data, error } = await this.client
      .from(BUNDLES_TABLE)
      .insert(toObservationV2BundleInsertRow(hardenedBundle))
      .select("*")
      .single<ObservationV2BundleRow>();

    if (error) {
      throw new Error(`Failed to create observation v2 bundle: ${error.message}`);
    }

    const sceneRows = toObservationV2SceneInsertRows(hardenedBundle);
    if (sceneRows.length > 0) {
      const { error: sceneError } = await this.client.from(SCENES_TABLE).insert(sceneRows);
      if (sceneError) {
        throw new Error(`Failed to create observation v2 scenes: ${sceneError.message}`);
      }
    }

    const observationRows = toObservationV2SceneObservationInsertRows(hardenedBundle);
    if (observationRows.length > 0) {
      const { error: observationError } = await this.client.from(SCENE_OBSERVATIONS_TABLE).insert(observationRows);
      if (observationError) {
        throw new Error(`Failed to create observation v2 scene observations: ${observationError.message}`);
      }
    }

    const loaded = await this.getByBundleId(data.id, hardenedBundle.userId);
    if (!loaded) {
      throw new Error("Observation v2 bundle could not be loaded after creation.");
    }

    return loaded;
  }

  async getByBundleId(
    bundleId: string,
    userId: UserId,
    options?: ObservationV2GetOptions,
  ): Promise<ObservationV2Bundle | null> {
    const { data, error } = await this.queryBundleByColumn("id", bundleId, userId, options);

    if (error) {
      throw new Error(`Failed to load observation v2 bundle: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.loadBundleGraph(data);
  }

  async getByReflectiveObjectId(
    reflectiveObjectId: string,
    userId: UserId,
    options?: ObservationV2GetOptions,
  ): Promise<ObservationV2Bundle | null> {
    const { data, error } = await this.queryBundleByColumn("reflective_object_id", reflectiveObjectId, userId, options);

    if (error) {
      throw new Error(`Failed to load observation v2 bundle by reflective object: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.loadBundleGraph(data);
  }

  async archive(bundleId: string, userId: UserId): Promise<ObservationV2Bundle | null> {
    const { data, error } = await this.client.rpc(ARCHIVE_BUNDLE_RPC, {
      p_bundle_id: bundleId,
      p_user_id: userId,
    });

    if (error) {
      throw new Error(`Failed to archive observation v2 bundle: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.loadBundleGraph(data as ObservationV2BundleRow);
  }

  private queryBundleByColumn(
    column: "id" | "reflective_object_id",
    value: string,
    userId: UserId,
    options?: ObservationV2GetOptions,
  ) {
    let query = this.client
      .from(BUNDLES_TABLE)
      .select("*")
      .eq(column, value)
      .eq("user_id", userId);

    if (!options?.includeArchived) {
      query = query.is("archived_at", null);
    }

    return query.maybeSingle<ObservationV2BundleRow>();
  }

  private async loadBundleGraph(bundleRow: ObservationV2BundleRow): Promise<ObservationV2Bundle> {
    const { data: sceneData, error: sceneError } = await this.client
      .from(SCENES_TABLE)
      .select("*")
      .eq("bundle_id", bundleRow.id)
      .eq("user_id", bundleRow.user_id)
      .order("position", { ascending: true });

    if (sceneError) {
      throw new Error(`Failed to load observation v2 scenes: ${sceneError.message}`);
    }

    const { data: observationData, error: observationError } = await this.client
      .from(SCENE_OBSERVATIONS_TABLE)
      .select("*")
      .eq("bundle_id", bundleRow.id)
      .eq("user_id", bundleRow.user_id)
      .order("position", { ascending: true });

    if (observationError) {
      throw new Error(`Failed to load observation v2 scene observations: ${observationError.message}`);
    }

    return fromObservationV2Rows(
      bundleRow,
      (sceneData ?? []) as ObservationV2SceneRow[],
      (observationData ?? []) as ObservationV2SceneObservationRow[],
    );
  }
}
