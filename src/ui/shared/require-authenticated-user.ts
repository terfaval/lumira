import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import type { UserId } from "@/src/shared/types";

export async function requireAuthenticatedUserId(): Promise<UserId> {
  const requestHeaders = await headers();
  const user = await resolveRequestUserContext(requestHeaders);

  if (!user.userId) {
    redirect("/auth");
  }

  return user.userId;
}
