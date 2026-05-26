import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Missing authenticated user identity.",
      devFallbackHeader: DEV_FALLBACK_HEADER,
    },
    { status: 401 },
  );
}

export async function GET(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const repository = createLatentRepository();
  const snapshot = await repository.getSnapshotById(id, user.userId);

  if (!snapshot) {
    return NextResponse.json({ error: "Latent snapshot not found." }, { status: 404 });
  }

  return NextResponse.json({ snapshot });
}
