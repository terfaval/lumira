import { NextResponse } from "next/server";

import { parseCreateReflectiveThreadInput } from "@/src/domain/threads/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";

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

  const repository = createThreadRepository();
  const threads = await repository.listThreadsByUser(user.userId);

  return NextResponse.json({ threads });
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

  const parsed = parseCreateReflectiveThreadInput(payload, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createThreadRepository();
  const thread = await repository.createThread(parsed.value);

  return NextResponse.json({ thread }, { status: 201 });
}
