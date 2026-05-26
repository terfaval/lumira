import { NextResponse } from "next/server";

import { parseCreateThreadGlossaryAssociationInput } from "@/src/domain/threads/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";

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

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id: threadId } = await context.params;
  const parsed = parseCreateThreadGlossaryAssociationInput(payload, threadId, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const threadRepository = createThreadRepository();
  const thread = await threadRepository.getThreadById(threadId, user.userId);
  if (!thread) {
    return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
  }

  const glossaryRepository = createGlossaryRepository();
  const term = await glossaryRepository.getTermById(parsed.value.glossaryTermId, user.userId);
  if (!term) {
    return NextResponse.json({ error: "Glossary term not found." }, { status: 404 });
  }

  const association = await threadRepository.createGlossaryAssociation(parsed.value);
  return NextResponse.json({ association }, { status: 201 });
}
