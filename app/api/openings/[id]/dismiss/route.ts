import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";

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

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const repository = createOpeningRepository();
  const opening = await repository.dismissOpening(id, user.userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  return NextResponse.json({ opening });
}
