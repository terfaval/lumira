import { NextResponse } from "next/server";

import {
  parseCreateOpeningResponseAssociationInput,
  parseCreateReflectiveResponseInput,
} from "@/src/domain/responses/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectionCandidateRepository } from "@/src/infrastructure/supabase/repositories/create-reflection-candidate-repository";
import { createReflectionRepository } from "@/src/infrastructure/supabase/repositories/create-reflection-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { hasObjectLineageOverlap, resolveReusableThreadId } from "@/src/reflective-space/resolve-opening-thread";
import type { ReflectionCandidate } from "@/src/domain/reflection-candidates/types";

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

interface ReflectionAdmissionRequest {
  candidateId: string;
  statement: string;
  pattern: string[];
}

function parseReflectionAdmissionRequest(
  payload: unknown,
): { ok: true; value: ReflectionAdmissionRequest | null } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Request body must be an object." };
  }

  const record = payload as Record<string, unknown>;
  if (record.reflectionAdmission === undefined) {
    return { ok: true, value: null };
  }

  if (
    typeof record.reflectionAdmission !== "object" ||
    record.reflectionAdmission === null ||
    Array.isArray(record.reflectionAdmission)
  ) {
    return { ok: false, error: "reflectionAdmission must be an object." };
  }

  const admission = record.reflectionAdmission as Record<string, unknown>;
  const candidateId = typeof admission.candidateId === "string" ? admission.candidateId.trim() : "";
  if (!candidateId) {
    return { ok: false, error: "reflectionAdmission.candidateId is required." };
  }

  const statement = typeof admission.statement === "string" ? admission.statement.trim() : "";
  if (!statement) {
    return { ok: false, error: "reflectionAdmission.statement is required." };
  }

  if (!Array.isArray(admission.pattern)) {
    return { ok: false, error: "reflectionAdmission.pattern must be an array." };
  }

  const pattern = admission.pattern
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (pattern.length === 0) {
    return { ok: false, error: "reflectionAdmission.pattern must contain at least one item." };
  }

  return {
    ok: true,
    value: {
      candidateId,
      statement,
      pattern,
    },
  };
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
  const parsedReflectionAdmission = parseReflectionAdmissionRequest(payload);
  if (!parsedReflectionAdmission.ok) {
    return NextResponse.json({ error: parsedReflectionAdmission.error }, { status: 400 });
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

  const reflectionCandidateRepository = createReflectionCandidateRepository();
  const reflectionRepository = createReflectionRepository();
  let reflectionCandidate;
  let reflection = null;

  try {
    const existingSourceCandidate = await reflectionCandidateRepository.getCandidateBySourceResponse(response.id, userId);
    if (existingSourceCandidate) {
      reflectionCandidate = existingSourceCandidate;
    } else {
      const threadCandidates = await reflectionCandidateRepository.listCandidatesByThread(resolvedThreadId, userId);
      const provisionalThreadCandidates = threadCandidates.filter((candidate) => candidate.state === "provisional");

      if (provisionalThreadCandidates.length === 1) {
        reflectionCandidate = provisionalThreadCandidates[0];
        await reflectionCandidateRepository.appendEvidence({
          userId,
          candidateId: reflectionCandidate.id,
          responseId: response.id,
          openingId,
        });
      } else {
        // If more than one provisional candidate exists on the thread, this slice does not guess.
        // It falls back to creating a fresh provisional candidate for the new response lineage.
        reflectionCandidate = await reflectionCandidateRepository.createCandidate({
          userId,
          threadId: resolvedThreadId,
          sourceResponseId: response.id,
          sourceOpeningId: openingId,
          sourceReflectiveObjectIds: openingSourceObjectIds,
        });
      }
    }

  } catch {
    return NextResponse.json({ error: "Failed to create reflection candidate." }, { status: 500 });
  }

  if (parsedReflectionAdmission.value) {
    const admission = parsedReflectionAdmission.value;
    const admissionCandidate = await reflectionCandidateRepository.getCandidateById(admission.candidateId, userId);
    if (!admissionCandidate) {
      return NextResponse.json({ error: "Reflection admission candidate not found." }, { status: 404 });
    }
    if (admissionCandidate.threadId !== resolvedThreadId) {
      return NextResponse.json({ error: "Reflection admission candidate does not belong to the resolved thread." }, { status: 400 });
    }
    if (!matchesReflectionCandidate(reflectionCandidate, admissionCandidate.id)) {
      return NextResponse.json(
        { error: "Reflection admission candidate must match the candidate selected for this response." },
        { status: 400 },
      );
    }

    try {
      reflection = await reflectionRepository.admitReflection({
        userId,
        candidateId: admissionCandidate.id,
        statement: admission.statement,
        pattern: admission.pattern,
      });
    } catch {
      return NextResponse.json({ error: "Failed to admit reflection." }, { status: 500 });
    }
  }

  return NextResponse.json(
    {
      response,
      activationEvent,
      openingResponseAssociation,
      reflectionCandidate,
      reflection,
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

function matchesReflectionCandidate(candidate: ReflectionCandidate | undefined, candidateId: string) {
  return Boolean(candidate && candidate.id === candidateId);
}
