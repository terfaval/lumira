import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";

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

  const { id: termId } = await context.params;
  const repository = createGlossaryRepository();
  const term = await repository.getTermById(termId, user.userId);

  if (!term) {
    return NextResponse.json({ error: "Glossary term not found." }, { status: 404 });
  }

  const appearances = await repository.listAppearanceRecordsByTerm(termId, user.userId);
  return NextResponse.json({ appearances });
}
