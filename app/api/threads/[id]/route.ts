import { NextResponse } from "next/server";

import { parseUpdateReflectiveThreadInput } from "@/src/domain/threads/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
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

export async function GET(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const repository = createThreadRepository();
  const thread = await repository.getThreadById(id, user.userId);

  if (!thread) {
    return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
  }

  const associations = await repository.listAssociationsByThread(id, user.userId);
  return NextResponse.json({ thread, associations });
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

  const { id } = await context.params;
  const parsed = parseUpdateReflectiveThreadInput(payload, id, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createThreadRepository();
  const thread = await repository.updateThread(parsed.value);

  if (!thread) {
    return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
  }

  return NextResponse.json({ thread });
}

export async function DELETE(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const repository = createThreadRepository();
  const thread = await repository.archiveThread(id, user.userId);

  if (!thread) {
    return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
  }

  return NextResponse.json({ thread });
}
