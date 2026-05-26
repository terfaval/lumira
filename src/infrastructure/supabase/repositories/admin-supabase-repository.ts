import type { AdminRepository } from "@/src/domain/admin/contracts";
import type { BootstrapAdminResult } from "@/src/domain/admin/types";
import { fromAdminMembershipRow, type AdminMembershipRow } from "@/src/infrastructure/supabase/adapters/admin-row";
import type { SupabaseInfrastructureClient } from "@/src/infrastructure/supabase/client/create-supabase-infrastructure-client";
import type { UserId } from "@/src/shared/types";

const DEFAULT_TABLE_NAME = "user_admin_roles";

export class SupabaseAdminRepository implements AdminRepository {
  constructor(
    private readonly client: SupabaseInfrastructureClient,
    private readonly tableName = DEFAULT_TABLE_NAME,
  ) {}

  async getMembershipByUserId(userId: UserId) {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("user_id, role, granted_by, created_at")
      .eq("user_id", userId)
      .maybeSingle<AdminMembershipRow>();

    if (error) {
      throw new Error(`Failed to load admin membership: ${error.message}`);
    }

    return data ? fromAdminMembershipRow(data) : null;
  }

  async bootstrap(userId: UserId): Promise<BootstrapAdminResult> {
    const existingSelf = await this.getMembershipByUserId(userId);
    if (existingSelf) {
      return {
        membership: existingSelf,
        status: "already_admin",
      };
    }

    const { count, error: countError } = await this.client
      .from(this.tableName)
      .select("user_id", { count: "exact", head: true });

    if (countError) {
      throw new Error(`Failed to inspect admin bootstrap state: ${countError.message}`);
    }

    if ((count ?? 0) > 0) {
      return {
        membership: null,
        status: "bootstrap_locked",
      };
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .insert({
        user_id: userId,
        role: "admin",
        granted_by: userId,
      })
      .select("user_id, role, granted_by, created_at")
      .single<AdminMembershipRow>();

    if (error) {
      throw new Error(`Failed to bootstrap admin membership: ${error.message}`);
    }

    return {
      membership: fromAdminMembershipRow(data),
      status: "bootstrapped",
    };
  }
}
