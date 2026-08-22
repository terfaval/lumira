import { NextResponse } from "next/server";

import { parseFortuneLifecycleRequest } from "@/src/domain/fortune-sessions/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-repository";

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
  const parsed = parseFortuneLifecycleRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await context.params;
  const session = await createFortuneSessionRepository().pauseSession({
    sessionId: id,
    userId: user.userId,
  });

  if (!session) {
    return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}
