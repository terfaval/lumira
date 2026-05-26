import { NextResponse } from "next/server";

import { parseCreateReflectiveResponseInput } from "@/src/domain/responses/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";

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

export async function GET(request: Request) {
  const user = await resolveRequestUserContext(request.headers);
  if (!user.userId) {
    return unauthorizedResponse();
  }

  const repository = createResponseRepository();
  const responses = await repository.listResponsesByUser(user.userId);

  return NextResponse.json({ responses });
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

  const parsed = parseCreateReflectiveResponseInput(payload, user.userId);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createResponseRepository();
  const response = await repository.createResponse(parsed.value);

  return NextResponse.json({ response }, { status: 201 });
}
