import { NextResponse } from "next/server";

import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import {
  composeOpeningDialogueWindow,
  parseOpeningActivationEventCursor,
} from "@/src/reflective-space/composition/compose-opening-dialogue-window";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Missing authenticated user identity.",
      devFallbackHeader: DEV_FALLBACK_HEADER,
    },
    { status: 401 },
  );
}

function parseLimit(raw: string | null): number {
  if (!raw) {
    return DEFAULT_LIMIT;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(parsed, MAX_LIMIT);
}

interface DialogueReadQuery {
  limit: number;
  beforeCreatedAt?: string;
  beforeCursor?: string;
  openingId?: string;
  threadId?: string;
  reflectiveObjectId?: string;
}

function parseReadQuery(url: URL): DialogueReadQuery {
  return {
    limit: parseLimit(url.searchParams.get("limit")),
    beforeCreatedAt: url.searchParams.get("before") ?? undefined,
    beforeCursor: url.searchParams.get("beforeCursor") ?? undefined,
    openingId: url.searchParams.get("openingId") ?? undefined,
    threadId: url.searchParams.get("threadId") ?? undefined,
    reflectiveObjectId: url.searchParams.get("reflectiveObjectId") ?? undefined,
  };
}

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const query = parseReadQuery(new URL(request.url));

  const openingRepository = createOpeningRepository();
  const responseRepository = createResponseRepository();

  const composed = await composeOpeningDialogueWindow({
    userId: user.userId,
    limit: query.limit,
    beforeCreatedAt: query.beforeCreatedAt,
    beforeCursor: parseOpeningActivationEventCursor(query.beforeCursor ?? null),
    openingId: query.openingId,
    threadId: query.threadId,
    reflectiveObjectId: query.reflectiveObjectId,
    openingRepository,
    responseRepository,
  });

  return NextResponse.json({
    dialogues: composed.dialogues,
    window: composed.window,
  });
}
