import type { AdmitReflectionInput, ReflectionRepository } from "@/src/domain/reflections/contracts";
import type { Reflection } from "@/src/domain/reflections/types";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import { fromReflectionRow, type ReflectionRow } from "@/src/infrastructure/supabase/adapters/reflection-row";
import type { ReflectionId, UserId } from "@/src/shared/types";

const REFLECTIONS_TABLE = "reflections";
const ADMIT_REFLECTION_RPC = "admit_reflection";

export class SupabaseReflectionRepository implements ReflectionRepository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async getReflectionById(reflectionId: ReflectionId, userId: UserId): Promise<Reflection | null> {
    const { data, error } = await this.client
      .from(REFLECTIONS_TABLE)
      .select("*")
      .eq("id", reflectionId)
      .eq("user_id", userId)
      .is("archived_at", null)
      .maybeSingle<ReflectionRow>();

    if (error) {
      throw new Error(`Failed to load reflection: ${error.message}`);
    }

    return data ? fromReflectionRow(data) : null;
  }

  async listReflectionsByUser(userId: UserId, limit?: number): Promise<Reflection[]> {
    let request = this.client
      .from(REFLECTIONS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("admitted_at", { ascending: false });

    if (limit && Number.isFinite(limit) && limit > 0) {
      request = request.limit(Math.floor(limit));
    }

    const { data, error } = await request;

    if (error) {
      throw new Error(`Failed to list reflections: ${error.message}`);
    }

    return (data ?? []).map((row) => fromReflectionRow(row as ReflectionRow));
  }

  async admitReflection(input: AdmitReflectionInput): Promise<Reflection> {
    const { data, error } = await this.client.rpc(ADMIT_REFLECTION_RPC, {
      p_user_id: input.userId,
      p_candidate_id: input.candidateId,
      p_statement: input.statement,
      p_pattern: input.pattern,
    });

    if (error) {
      throw new Error(`Failed to admit reflection: ${error.message}`);
    }

    return fromReflectionRow(data as ReflectionRow);
  }
}
