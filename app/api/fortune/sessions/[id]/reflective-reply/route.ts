import { NextResponse } from "next/server";

import { parseCreateFortuneReflectiveReplyRequest } from "@/src/domain/fortune-sessions/http-contract";
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

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCreateFortuneReflectiveReplyRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id } = await context.params;
  const sessionRepository = createFortuneSessionRepository();
  const turnRepository = createFortuneSessionTurnRepository();
  const session = await sessionRepository.getSessionById(id, user.userId);

  if (!session) {
    return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
  }

  if (session.state !== "active") {
    return NextResponse.json({ error: "This Fortune session is not active." }, { status: 409 });
  }

  const assistantTurn = await turnRepository.getLatestUnansweredAssistantTurn(id, user.userId);
  if (!assistantTurn) {
    return NextResponse.json({ error: "Reflective prompt is required before the user reply." }, { status: 409 });
  }

  const turn = await turnRepository.createReflectiveReplyTurnOrReadExisting({
    sessionId: id,
    userId: user.userId,
    roundIndex: assistantTurn.roundIndex,
    role: "user",
    turnKind: "reflective_reply",
    content: parsed.value.content,
  });

  return NextResponse.json({ session, turn });
}
