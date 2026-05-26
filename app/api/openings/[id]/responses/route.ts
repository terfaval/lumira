import { NextResponse } from "next/server";

import {
  parseCreateOpeningResponseAssociationInput,
  parseCreateReflectiveResponseInput,
} from "@/src/domain/responses/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
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

function parseResponseAssociationRemovalTarget(payload: unknown): { ok: true; responseId: string } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const record = payload as Record<string, unknown>;
  const responseId = typeof record.responseId === "string" ? record.responseId.trim() : "";
  if (!responseId) {
    return { ok: false, error: "responseId is required." };
  }

  return { ok: true, responseId };
}

export async function GET(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id: openingId } = await context.params;
  const openingRepository = createOpeningRepository();
  const opening = await openingRepository.getOpeningById(openingId, user.userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const responseRepository = createResponseRepository();
  const associations = await responseRepository.listOpeningResponseAssociationsByOpening(openingId, user.userId);

  return NextResponse.json({ associations });
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

  const { id: openingId } = await context.params;

  const openingRepository = createOpeningRepository();
  const opening = await openingRepository.getOpeningById(openingId, user.userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const parsedResponse = parseCreateReflectiveResponseInput(payload, user.userId);
  if (!parsedResponse.ok) {
    return NextResponse.json({ error: parsedResponse.error }, { status: 400 });
  }

  const parsedAssociation = parseCreateOpeningResponseAssociationInput(payload, openingId, user.userId);
  if (!parsedAssociation.ok) {
    return NextResponse.json({ error: parsedAssociation.error }, { status: 400 });
  }

  if (parsedAssociation.value.threadId) {
    const threadRepository = createThreadRepository();
    const thread = await threadRepository.getThreadById(parsedAssociation.value.threadId, user.userId);
    if (!thread) {
      return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
    }
  }

  const responseRepository = createResponseRepository();
  const response = await responseRepository.createResponse(parsedResponse.value);

  const activationEvent = await responseRepository.createOpeningActivationEvent({
    userId: user.userId,
    openingId,
    activationSource: parsedAssociation.value.openingActivationContext,
    activationContext: parsedAssociation.value.openingActivationContext,
    openingResponseContext: "response_authored",
    responseId: response.id,
  });

  const openingResponseAssociation = await responseRepository.createOpeningResponseAssociation({
    ...parsedAssociation.value,
    responseId: response.id,
    activationEventId: activationEvent.id,
  });

  return NextResponse.json({ response, activationEvent, openingResponseAssociation }, { status: 201 });
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

  const parsedTarget = parseResponseAssociationRemovalTarget(payload);
  if (!parsedTarget.ok) {
    return NextResponse.json({ error: parsedTarget.error }, { status: 400 });
  }

  const { id: openingId } = await context.params;

  const openingRepository = createOpeningRepository();
  const opening = await openingRepository.getOpeningById(openingId, user.userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const responseRepository = createResponseRepository();
  const removed = await responseRepository.removeOpeningResponseAssociation(openingId, parsedTarget.responseId, user.userId);

  if (!removed) {
    return NextResponse.json({ error: "Opening-response association not found." }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
