import type { UserId } from "@/src/shared/types";
import {
  assertObservationV3AuthorityRecordCanPersist,
  type ObservationV3AuthorityRecord,
} from "@/src/domain/observation/v3-authority";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import {
  fromObservationV3AuthorityRow,
  toObservationV3AuthorityInsertRow,
  type ObservationV3AuthorityRow,
} from "@/src/infrastructure/supabase/adapters/observation-v3-row";

const AUTHORITIES_TABLE = "observation_v3_authorities";

export class SupabaseObservationV3Repository {
  constructor(private readonly client: SupabaseInfrastructureClient) {}

  async create(record: ObservationV3AuthorityRecord): Promise<ObservationV3AuthorityRecord> {
    assertObservationV3AuthorityRecordCanPersist(record);

    const { data, error } = await this.client
      .from(AUTHORITIES_TABLE)
      .insert(toObservationV3AuthorityInsertRow(record))
      .select("*")
      .single<ObservationV3AuthorityRow>();

    if (error) {
      throw new Error(`Failed to create observation v3 authority: ${error.message}`);
    }

    return fromObservationV3AuthorityRow(data);
  }

  async getByAuthorityId(authorityId: string, userId: UserId): Promise<ObservationV3AuthorityRecord | null> {
    const { data, error } = await this.client
      .from(AUTHORITIES_TABLE)
      .select("*")
      .eq("authority_id", authorityId)
      .eq("user_id", userId)
      .maybeSingle<ObservationV3AuthorityRow>();

    if (error) {
      throw new Error(`Failed to load observation v3 authority: ${error.message}`);
    }

    return data ? fromObservationV3AuthorityRow(data) : null;
  }

  async getByReflectiveObjectId(
    reflectiveObjectId: string,
    userId: UserId,
  ): Promise<ObservationV3AuthorityRecord | null> {
    const { data, error } = await this.client
      .from(AUTHORITIES_TABLE)
      .select("*")
      .eq("reflective_object_id", reflectiveObjectId)
      .eq("user_id", userId)
      .maybeSingle<ObservationV3AuthorityRow>();

    if (error) {
      throw new Error(`Failed to load observation v3 authority by reflective object: ${error.message}`);
    }

    return data ? fromObservationV3AuthorityRow(data) : null;
  }
}
