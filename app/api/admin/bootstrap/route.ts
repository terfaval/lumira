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

export async function POST(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const adminRepository = createAdminRepository();
  const result = await adminRepository.bootstrap(user.userId);

  if (result.status === "bootstrap_locked") {
    return NextResponse.json(
      {
        error: "Admin bootstrap is already initialized for another account.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json({
    status: result.status,
    membership: result.membership,
  });
}
