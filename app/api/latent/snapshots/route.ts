import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";

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

  const repository = createLatentRepository();
  const snapshots = await repository.listSnapshotsByUser(user.userId);

  return NextResponse.json({ snapshots });
}
