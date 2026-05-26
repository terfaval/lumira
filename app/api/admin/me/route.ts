import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createAdminRepository } from "@/src/infrastructure/supabase/repositories/create-admin-repository";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Missing authenticated user identity.",
      devFallbackHeader: DEV_FALLBACK_HEADER,
    },
    { status: 401 },
  );
}

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const adminRepository = createAdminRepository();
  const membership = await adminRepository.getMembershipByUserId(user.userId);

  return NextResponse.json({
    isAdmin: Boolean(membership),
    membership,
  });
}
