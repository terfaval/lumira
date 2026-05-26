import { NextResponse } from "next/server";

import { parseGlossaryCandidateLifecycleUpdate } from "@/src/domain/glossary/http-contract";
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

async function readRequestBody(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function PATCH(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id: candidateId } = await context.params;
  const parsed = parseGlossaryCandidateLifecycleUpdate(payload, candidateId, user.userId);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createGlossaryRepository();
  const candidate = await repository.setCandidateLifecycle(parsed.value);

  if (!candidate) {
    return NextResponse.json({ error: "Glossary candidate not found." }, { status: 404 });
  }

  return NextResponse.json({ candidate });
}
