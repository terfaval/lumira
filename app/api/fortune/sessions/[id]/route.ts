import { NextResponse } from "next/server";

import { parsePatchFortuneSessionRequest } from "@/src/domain/fortune-sessions/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-repository";
import { createFortuneSessionTurnRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-turn-repository";

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
  const session = await createFortuneSessionRepository().getSessionById(id, user.userId);
  if (!session) {
    return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
  }

  const turns = await createFortuneSessionTurnRepository().listTurnsBySession(id, user.userId);

  return NextResponse.json({ session, turns });
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

  const parsed = parsePatchFortuneSessionRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await context.params;
  const repository = createFortuneSessionRepository();

  if (parsed.value.kind === "focus") {
    const session = await repository.updateSessionFocus({
      sessionId: id,
      userId: user.userId,
      focusText: parsed.value.focusText,
    });

    if (!session) {
      return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
    }

    return NextResponse.json({ session });
  }

  if (parsed.value.kind === "reflection-started") {
    const session = await repository.markReflectionStarted({
      sessionId: id,
      userId: user.userId,
    });

    if (!session) {
      return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
    }

    return NextResponse.json({ session });
  }

  const session = await repository.storeFirstInterpretation({
    sessionId: id,
    userId: user.userId,
    firstInterpretation: parsed.value.firstInterpretation,
  });

  if (!session) {
    return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}
