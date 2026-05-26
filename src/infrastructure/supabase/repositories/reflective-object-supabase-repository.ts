import type { ReflectiveObjectRepository } from "@/src/domain/reflective-objects/contracts";
import type {
  CreateReflectiveObjectInput,
  ReflectiveObject,
  UpdateReflectiveObjectInput,
} from "@/src/domain/reflective-objects/types";
import { type SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromReflectiveObjectRow,
  toReflectiveObjectInsertRow,
  toReflectiveObjectUpdateRow,
  type ReflectiveObjectRow,
} from "@/src/infrastructure/supabase/adapters/reflective-object-row";
import type { ReflectiveObjectId, UserId } from "@/src/shared/types";

const DEFAULT_TABLE_NAME = "reflective_objects";

export class SupabaseReflectiveObjectRepository implements ReflectiveObjectRepository {
  constructor(
    private readonly client: SupabaseInfrastructureClient,
    private readonly tableName = DEFAULT_TABLE_NAME,
  ) {}

  async create(input: CreateReflectiveObjectInput): Promise<ReflectiveObject> {
    const { data, error } = await this.client
      .from(this.tableName)
      .insert(toReflectiveObjectInsertRow(input))
      .select("*")
      .single<ReflectiveObjectRow>();

    if (error) {
      throw new Error(`Failed to create reflective object: ${error.message}`);
    }

    return fromReflectiveObjectRow(data);
  }

  async getById(id: ReflectiveObjectId, userId: UserId): Promise<ReflectiveObject | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ReflectiveObjectRow>();

    if (error) {
      throw new Error(`Failed to load reflective object: ${error.message}`);
    }

    return data ? fromReflectiveObjectRow(data) : null;
  }

  async listByUser(userId: UserId, limit?: number): Promise<ReflectiveObject[]> {
    let request = this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list reflective objects: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectiveObjectRow(row as ReflectiveObjectRow));
  }

  async update(input: UpdateReflectiveObjectInput): Promise<ReflectiveObject | null> {
    const patch = toReflectiveObjectUpdateRow(input);

    if (Object.keys(patch).length === 0) {
      return this.getById(input.id, input.userId);
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(patch)
      .eq("id", input.id)
      .eq("user_id", input.userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveObjectRow>();

    if (error) {
      throw new Error(`Failed to update reflective object: ${error.message}`);
    }

    return data ? fromReflectiveObjectRow(data) : null;
  }

  async archive(id: ReflectiveObjectId, userId: UserId): Promise<ReflectiveObject | null> {
    const now = new Date().toISOString();

    const { data, error } = await this.client
      .from(this.tableName)
      .update({ state: "archived", archived_at: now })
      .eq("id", id)
      .eq("user_id", userId)
      .is("archived_at", null)
      .select("*")
      .maybeSingle<ReflectiveObjectRow>();

    if (error) {
      throw new Error(`Failed to archive reflective object: ${error.message}`);
    }

    return data ? fromReflectiveObjectRow(data) : null;
  }
}
