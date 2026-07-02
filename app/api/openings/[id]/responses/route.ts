import { NextResponse } from "next/server";

import {
  parseCreateOpeningResponseAssociationInput,
  parseCreateReflectiveResponseInput,
} from "@/src/domain/responses/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { hasObjectLineageOverlap, resolveReusableThreadId } from "@/src/reflective-space/resolve-opening-thread";

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
  const userId = user.userId;

  const { id: openingId } = await context.params;
  const openingRepository = createOpeningRepository();
  const opening = await openingRepository.getOpeningById(openingId, userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const responseRepository = createResponseRepository();
  const associations = await responseRepository.listOpeningResponseAssociationsByOpening(openingId, userId);

  return NextResponse.json({ associations });
}

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }
  const userId = user.userId;

  const payload = await readRequestBody(request);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id: openingId } = await context.params;

  const openingRepository = createOpeningRepository();
  const opening = await openingRepository.getOpeningById(openingId, userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const parsedResponse = parseCreateReflectiveResponseInput(payload, userId);
  if (!parsedResponse.ok) {
    return NextResponse.json({ error: parsedResponse.error }, { status: 400 });
  }

  const parsedAssociation = parseCreateOpeningResponseAssociationInput(payload, openingId, userId);
  if (!parsedAssociation.ok) {
    return NextResponse.json({ error: parsedAssociation.error }, { status: 400 });
  }

  const threadRepository = createThreadRepository();
  const responseRepository = createResponseRepository();
  const openingSourceObjectIds = opening.provenance.sourceObjects;

  if (parsedAssociation.value.threadId) {
    const thread = await threadRepository.getThreadById(parsedAssociation.value.threadId, userId);
    if (!thread) {
      return NextResponse.json({ error: "Reflective thread not found." }, { status: 404 });
    }

    const threadAssociations = await threadRepository.listAssociationsByThread(parsedAssociation.value.threadId, userId);
    if (!hasObjectLineageOverlap(threadAssociations, openingSourceObjectIds)) {
      return NextResponse.json({ error: "Reflective thread does not match opening object lineage." }, { status: 400 });
    }
  }

  let resolvedThreadId = parsedAssociation.value.threadId ?? null;
  if (!resolvedThreadId) {
    resolvedThreadId = await resolveReusableThreadId({
      opening,
      userId,
      responseRepository,
      threadRepository,
    });
  }

  const response = await responseRepository.createResponse(parsedResponse.value);

  await Promise.all(
    openingSourceObjectIds.map((reflectiveObjectId) =>
      responseRepository.createObjectAssociation({
        userId,
        responseId: response.id,
        reflectiveObjectId,
      }),
    ),
  );

  let createdThread: Awaited<ReturnType<ReturnType<typeof createThreadRepository>["createThread"]>> | null = null;
  let createdThreadObjectAssociations: Awaited<ReturnType<ReturnType<typeof createThreadRepository>["createObjectAssociation"]>>[] = [];
  let createdResponseThreadAssociation: Awaited<ReturnType<typeof responseRepository.createThreadAssociation>> | null = null;

  if (!resolvedThreadId) {
    createdThread = await threadRepository.createThread({
      userId,
      title: parsedResponse.value.title,
      contextNote: null,
      state: "active",
      visibility: "ambient",
      continuityCues: [],
    });
    const createdThreadId = createdThread.id;
    resolvedThreadId = createdThreadId;

    createdThreadObjectAssociations = await Promise.all(
      openingSourceObjectIds.map((reflectiveObjectId) =>
        threadRepository.createObjectAssociation({
          userId,
          threadId: createdThreadId,
          reflectiveObjectId,
        }),
      ),
    );

  }

  createdResponseThreadAssociation = await responseRepository.createThreadAssociation({
    userId,
    responseId: response.id,
    threadId: resolvedThreadId,
  });

  const activationEvent = await responseRepository.createOpeningActivationEvent({
    userId,
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
    threadId: resolvedThreadId,
  });

  return NextResponse.json(
    {
      response,
      activationEvent,
      openingResponseAssociation,
      createdThread,
      createdThreadObjectAssociations,
      createdResponseThreadAssociation,
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }
  const userId = user.userId;

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
  const opening = await openingRepository.getOpeningById(openingId, userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const responseRepository = createResponseRepository();
  const removed = await responseRepository.removeOpeningResponseAssociation(openingId, parsedTarget.responseId, userId);

  if (!removed) {
    return NextResponse.json({ error: "Opening-response association not found." }, { status: 404 });
  }

  return NextResponse.json({ removed: true });
}
