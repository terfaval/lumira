import type { UserId } from "@/src/shared/types";

export type AdminRole = "admin";

export interface AdminMembership {
  userId: UserId;
  role: AdminRole;
  grantedBy: UserId | null;
  createdAt: string;
}

export interface BootstrapAdminResult {
  membership: AdminMembership | null;
  status: "bootstrapped" | "already_admin" | "bootstrap_locked";
}
