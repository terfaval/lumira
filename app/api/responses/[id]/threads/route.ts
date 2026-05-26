import { NextResponse } from "next/server";

import {
  parseCreateResponseThreadAssociationInput,
  parseDeleteAssociationTarget,
} from "@/src/domain/responses/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
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

  const { id: responseId } = await context.params;
  const parsed = parseCreateResponseThreadAssociationInput(payload, responseId, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const responseRepository = createResponseRepository();
  const response = await responseRepository.getResponseById(responseId, user.userId);
  if (!response) {
    return NextResponse.json({ error: "Reflective response not found." }, { status: 404 });
  }

  const threadRepository = createThreadRepository();
  const thread = await threadRepository.getThreadById(parsed.value.threadId, user.userId);
  if (!thread) {
    return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
  }

  const association = await responseRepository.createThreadAssociation(parsed.value);
  return NextResponse.json({ association }, { status: 201 });
}

export async function DELETE(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedTarget = parseDeleteAssociationTarget(payload, "threadId");
  if (!parsedTarget.ok) {
    return NextResponse.json({ error: parsedTarget.error }, { status: 400 });
  }

  const { id: responseId } = await context.params;
  const responseRepository = createResponseRepository();
  const response = await responseRepository.getResponseById(responseId, user.userId);
  if (!response) {
    return NextResponse.json({ error: "Reflective response not found." }, { status: 404 });
  }

  const removed = await responseRepository.removeThreadAssociation(responseId, parsedTarget.value, user.userId);
  if (!removed) {
    return NextResponse.json({ error: "Response-thread association not found." }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
