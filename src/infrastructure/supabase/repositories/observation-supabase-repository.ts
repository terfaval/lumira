import type { ObservationRepository } from "@/src/domain/observation/contracts";
import type { CreateObservationInput, Observation, ObservationListQuery } from "@/src/domain/observation/types";
import type { ObservationId, UserId } from "@/src/shared/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromObservationRows,
  toObservationFragmentInsertRows,
  toObservationInsertRow,
  type ObservationFragmentRow,
  type ObservationRow,
} from "@/src/infrastructure/supabase/adapters/observation-row";

const OBSERVATIONS_TABLE = "observations";
const FRAGMENTS_TABLE = "observation_fragments";

function groupFragmentsByObservationId(fragmentRows: ObservationFragmentRow[]): Map<string, ObservationFragmentRow[]> {
  const grouped = new Map<string, ObservationFragmentRow[]>();

  for (const fragment of fragmentRows) {
    const list = grouped.get(fragment.observation_id) ?? [];
    list.push(fragment);
    grouped.set(fragment.observation_id, list);
  }

  return grouped;
}

export class SupabaseObservationRepository implements ObservationRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async create(input: CreateObservationInput): Promise<Observation> {
    if (input.semanticPolicyResult === "reject_interpretive" || input.semanticPolicyResult === "defer_insufficient_evidence") {
      throw new Error("Observation semantic policy does not allow durable persistence for this payload.");
    }

    if (input.latentBackflowGuard !== "observation_only") {
      throw new Error("Observation latent backflow guard violation.");
    }

    const { data, error } = await this.client
      .from(OBSERVATIONS_TABLE)
      .insert(toObservationInsertRow(input))
      .select("*")
      .single<ObservationRow>();

    if (error) {
      throw new Error(`Failed to create observation: ${error.message}`);
    }

    const fragmentInsertRows = toObservationFragmentInsertRows(data.id, input);

    if (fragmentInsertRows.length > 0) {
      const { error: fragmentInsertError } = await this.client.from(FRAGMENTS_TABLE).insert(fragmentInsertRows);

      if (fragmentInsertError) {
        throw new Error(`Failed to create observation fragments: ${fragmentInsertError.message}`);
      }
    }

    const loaded = await this.getById(data.id, input.userId);
    if (!loaded) {
      throw new Error("Observation could not be loaded after creation.");
    }

    return loaded;
  }

  async listByReflectiveObject(query: ObservationListQuery): Promise<Observation[]> {
    let request = this.client
      .from(OBSERVATIONS_TABLE)
      .select("*")
      .eq("user_id", query.userId)
      .eq("reflective_object_id", query.reflectiveObjectId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (query.limit && Number.isFinite(query.limit) && query.limit > 0) {
      request = request.limit(Math.floor(query.limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list observations: ${error.message}`);
    }

    const observationRows = (data ?? []) as ObservationRow[];

    if (observationRows.length === 0) {
      return [];
    }

    const observationIds = observationRows.map((row) => row.id);

    const { data: fragmentData, error: fragmentError } = await this.client
      .from(FRAGMENTS_TABLE)
      .select("*")
      .eq("user_id", query.userId)
      .eq("reflective_object_id", query.reflectiveObjectId)
      .in("observation_id", observationIds)
      .order("position", { ascending: true });

    if (fragmentError) {
      throw new Error(`Failed to list observation fragments: ${fragmentError.message}`);
    }

    const groupedFragments = groupFragmentsByObservationId((fragmentData ?? []) as ObservationFragmentRow[]);

    return observationRows.map((row) => fromObservationRows(row, groupedFragments.get(row.id) ?? []));
  }

  async getById(id: ObservationId, userId: UserId): Promise<Observation | null> {
    const { data, error } = await this.client
      .from(OBSERVATIONS_TABLE)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ObservationRow>();

    if (error) {
      throw new Error(`Failed to load observation: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const { data: fragmentData, error: fragmentError } = await this.client
      .from(FRAGMENTS_TABLE)
      .select("*")
      .eq("observation_id", id)
      .eq("user_id", userId)
      .order("position", { ascending: true });

    if (fragmentError) {
      throw new Error(`Failed to load observation fragments: ${fragmentError.message}`);
    }

    return fromObservationRows(data, (fragmentData ?? []) as ObservationFragmentRow[]);
  }
}
