import type { AdminMembership } from "@/src/domain/admin/types";

export interface AdminMembershipRow {
  user_id: string;
  role: "admin";
  granted_by: string | null;
  created_at: string;
}

export function fromAdminMembershipRow(row: AdminMembershipRow): AdminMembership {
  return {
    userId: row.user_id,
    role: row.role,
    grantedBy: row.granted_by,
    createdAt: row.created_at,
  };
}
