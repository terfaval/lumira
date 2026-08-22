import { NextResponse } from "next/server";

import { getMajorArcanaDeck, getTarotModeById } from "@/src/content/fortune-journaling";
import { parseCreateFortuneSessionRequest } from "@/src/domain/fortune-sessions/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createFortuneSessionRepository } from "@/src/infrastructure/supabase/repositories/create-fortune-session-repository";
import {
  createFortuneCardSelections,
  createFortuneCardSelectionsFromSelectedCardIds,
} from "@/src/features/fortune-journaling/session";

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

export async function POST(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);
  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseCreateFortuneSessionRequest(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let mode;
  try {
    mode = getTarotModeById(parsed.value.modeId);
  } catch {
    return NextResponse.json({ error: "The requested Fortune mode is not available." }, { status: 400 });
  }

  const deck = getMajorArcanaDeck();
  let cardSelections;

  try {
    cardSelections = parsed.value.selectedCardIds
      ? createFortuneCardSelectionsFromSelectedCardIds({
          deck,
          mode,
          selectedCardIds: parsed.value.selectedCardIds,
        })
      : createFortuneCardSelections({
          deck,
          mode,
        });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The Fortune card selection is invalid." },
      { status: 400 },
    );
  }

  const session = await createFortuneSessionRepository().createSession({
    userId: user.userId,
    modeId: mode.id,
    focusText: parsed.value.focusText,
    cardSelections,
  });

  return NextResponse.json({ session }, { status: 201 });
}
