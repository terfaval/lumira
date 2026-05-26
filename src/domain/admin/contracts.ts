import type { AdminMembership, BootstrapAdminResult } from "@/src/domain/admin/types";
import type { UserId } from "@/src/shared/types";

export interface AdminRepository {
  getMembershipByUserId(userId: UserId): Promise<AdminMembership | null>;
  bootstrap(userId: UserId): Promise<BootstrapAdminResult>;
}
