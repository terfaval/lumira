import { NextResponse } from "next/server";

import { parseGlossaryTermCreate } from "@/src/domain/glossary/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";

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

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return unauthorizedResponse();
  }

  const repository = createGlossaryRepository();
  const terms = await repository.listTerms(user.userId);

  return NextResponse.json({ terms });
}

export async function POST(request: Request) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseGlossaryTermCreate(payload, user.userId);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createGlossaryRepository();
  const term = await repository.createTerm(parsed.value);

  return NextResponse.json({ term }, { status: 201 });
}
