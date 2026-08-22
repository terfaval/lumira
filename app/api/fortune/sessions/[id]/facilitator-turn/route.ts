import { NextResponse } from "next/server";

import { getMajorArcanaDeck, getSituationUnfoldingMode } from "@/src/content/fortune-journaling";
import { buildFortuneFacilitatorPacket } from "@/src/features/fortune-journaling/facilitator/fortune-facilitator-packet";
import { generateFortuneFacilitatorTurn } from "@/src/features/fortune-journaling/facilitator/fortune-facilitator-runtime";
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

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const sessionRepository = createFortuneSessionRepository();
  const turnRepository = createFortuneSessionTurnRepository();
  const session = await sessionRepository.getSessionById(id, user.userId);

  if (!session) {
    return NextResponse.json({ error: "Fortune session not found." }, { status: 404 });
  }

  if (!session.firstInterpretation) {
    return NextResponse.json({ error: "First interpretation is required before the facilitator turn." }, { status: 409 });
  }

  if (session.state !== "active") {
    return NextResponse.json({ error: "This Fortune session is not active." }, { status: 409 });
  }

  const existingTurn = await turnRepository.getLatestUnansweredAssistantTurn(id, user.userId);
  if (existingTurn) {
    return NextResponse.json({ turn: existingTurn });
  }

  const mode = getSituationUnfoldingMode();
  const turns = await turnRepository.listTurnsBySession(id, user.userId);
  const packet = buildFortuneFacilitatorPacket({
    session,
    turns,
    mode,
    deck: getMajorArcanaDeck(),
  });

  const result = await generateFortuneFacilitatorTurn({ packet });
  if (result.mode === "failed") {
    return NextResponse.json({ error: "A reflektiv kerdes most nem erheto el. Probald ujra." }, { status: 503 });
  }

  const latestSession = await sessionRepository.getSessionById(id, user.userId);
  if (!latestSession || latestSession.state !== "active") {
    return NextResponse.json(
      {
        error: "This session is no longer active.",
        session: latestSession,
      },
      { status: 409 },
    );
  }

  const roundIndex = await turnRepository.getNextRoundIndex(id, user.userId);
  const turn = await turnRepository.createAssistantPromptTurnOrReadExisting({
    sessionId: id,
    userId: user.userId,
    roundIndex,
    role: "assistant",
    turnKind: "reflective_prompt",
    content: JSON.stringify(result.output),
  });

  return NextResponse.json({ turn }, { status: 201 });
}
