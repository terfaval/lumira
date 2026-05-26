import { NextResponse } from "next/server";

import { parseOpeningActivationInput } from "@/src/domain/openings/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";

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

  const { id } = await context.params;
  const parsed = parseOpeningActivationInput(payload, id, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createOpeningRepository();
  const opening = await repository.activateOpening(parsed.value);
  if (!opening) {
    return NextResponse.json({ error: "Opening not found." }, { status: 404 });
  }

  const responseRepository = createResponseRepository();
  const activationEvent = await responseRepository.createOpeningActivationEvent({
    userId: user.userId,
    openingId: id,
    activationSource: parsed.value.source,
    activationContext: parsed.value.source,
    openingResponseContext: "activation_without_response",
  });

  return NextResponse.json({ opening, activationEvent });
}
