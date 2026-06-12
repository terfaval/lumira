import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { composeReflectiveSpaceViewport } from "@/src/reflective-space/composition/compose-reflective-space-viewport";
import { parseOpeningActivationEventCursor } from "@/src/reflective-space/composition/compose-opening-dialogue-window";

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Missing authenticated user identity.",
      devFallbackHeader: DEV_FALLBACK_HEADER,
    },
    { status: 401 },
  );
}

function parsePositiveInt(raw: string | null): number | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const url = new URL(request.url);

  const viewport = await composeReflectiveSpaceViewport({
    userId: user.userId,
    centerObjectId: url.searchParams.get("centerObjectId") ?? undefined,
    objectLimit: parsePositiveInt(url.searchParams.get("objectLimit")),
    dialogueLimit: parsePositiveInt(url.searchParams.get("dialogueLimit")),
    dialogueBeforeCreatedAt: url.searchParams.get("dialogueBefore") ?? undefined,
    dialogueBeforeCursor: parseOpeningActivationEventCursor(url.searchParams.get("dialogueCursor")),
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    observationRepository: createObservationRepository(),
    observationV2Repository: createObservationV2Repository(),
    glossaryRepository: createGlossaryRepository(),
    threadRepository: createThreadRepository(),
    openingRepository: createOpeningRepository(),
    responseRepository: createResponseRepository(),
  });

  return NextResponse.json({ viewport });
}
