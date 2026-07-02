import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { resolveReusableThreadId } from "@/src/reflective-space/resolve-opening-thread";

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

function toThreadTitle(opening: { utterance: string }) {
  const normalized = opening.utterance.trim();
  if (normalized.length <= 72) {
    return normalized;
  }

  return `${normalized.slice(0, 69).trimEnd()}...`;
}

function toSelectionMetadata(opening: {
  state: string;
  suppressionState: string;
  suppressionRevisitEligibility: string;
}) {
  if (
    opening.suppressionState === "suppressed" &&
    opening.suppressionRevisitEligibility !== "hidden"
  ) {
    return {
      source: "manual_revisit" as const,
      centerStatus: "reentered" as const,
      resolution: "reentered" as const,
    };
  }

  if (opening.state === "activated") {
    return {
      source: "reflective_space_surface" as const,
      centerStatus: "continued" as const,
      resolution: "reused" as const,
    };
  }

  return {
    source: "reflective_space_surface" as const,
    centerStatus: "new" as const,
    resolution: "created" as const,
  };
}

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }
  const userId = user.userId;

  const { id } = await context.params;
  const openingRepository = createOpeningRepository();
  const responseRepository = createResponseRepository();
  const threadRepository = createThreadRepository();

  const opening = await openingRepository.getOpeningById(id, user.userId);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const selection = toSelectionMetadata(opening);

  if (opening.suppressionState === "suppressed" && opening.suppressionRevisitEligibility !== "hidden") {
    const reactivated = await openingRepository.reactivateOpening({
      openingId: id,
      userId,
      source: selection.source,
    });

    if (!reactivated) {
      return NextResponse.json({ error: "Opening not found." }, { status: 404 });
    }
  } else if (opening.state === "available") {
    const activated = await openingRepository.activateOpening({
      openingId: id,
      userId,
      source: selection.source,
    });

    if (!activated) {
      return NextResponse.json({ error: "Opening not found." }, { status: 404 });
    }
  }

  if (opening.state !== "activated" || opening.suppressionState === "suppressed") {
    await responseRepository.createOpeningActivationEvent({
      userId,
      openingId: id,
      activationSource: selection.source,
      activationContext: selection.source,
      openingResponseContext: "activation_without_response",
    });
  }

  let threadId = await resolveReusableThreadId({
    opening,
    userId,
    responseRepository,
    threadRepository,
  });

  let createdThread: Awaited<ReturnType<typeof threadRepository.createThread>> | null = null;
  if (!threadId) {
    createdThread = await threadRepository.createThread({
      userId,
      title: toThreadTitle(opening),
      contextNote: opening.provenance.openingContext?.context ?? null,
      state: "active",
      visibility: "ambient",
      continuityCues: [],
    });
    const createdThreadId = createdThread.id;
    threadId = createdThreadId;

    await Promise.all([
      ...(opening.provenance.sourceObjects ?? []).map((reflectiveObjectId) =>
        threadRepository.createObjectAssociation({
          userId,
          threadId: createdThreadId,
          reflectiveObjectId,
        }),
      ),
      ...(opening.provenance.sourceGlossaryTerms ?? []).map((glossaryTermId) =>
        threadRepository.createGlossaryAssociation({
          userId,
          threadId: createdThreadId,
          glossaryTermId,
        }),
      ),
    ]);

    if (openingRepository.attachThreadToOpening) {
      await openingRepository.attachThreadToOpening(id, userId, createdThreadId);
    }
  }

  if (!threadId) {
    return NextResponse.json({ error: "Reflective thread could not be resolved." }, { status: 500 });
  }

  const primaryObjectId = opening.provenance.sourceObjects?.[0];
  if (!primaryObjectId) {
    return NextResponse.json(
      { error: "Opening cannot enter Deep Reflection without a reflective object reference." },
      { status: 400 },
    );
  }

  const resolution = createdThread ? "created" : selection.resolution;
  const href =
    `/objects/${encodeURIComponent(primaryObjectId)}/reflect/${encodeURIComponent(threadId)}` +
    `?centerStatus=${encodeURIComponent(selection.centerStatus)}&resolution=${encodeURIComponent(resolution)}`;

  return NextResponse.json({
    thread: createdThread ?? { id: threadId },
    href,
    centerStatus: selection.centerStatus,
    resolution,
  });
}
