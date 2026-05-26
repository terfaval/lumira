import type { NextRequest } from "next/server";

import { updateAuthSession } from "@/src/infrastructure/supabase/auth/update-auth-session-middleware";

export async function proxy(request: NextRequest) {
  return updateAuthSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
