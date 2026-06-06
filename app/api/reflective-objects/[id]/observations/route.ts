import { NextResponse } from "next/server";

import { parseCreateObservationInput } from "@/src/domain/observation/http-contract";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";

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

  const { id: reflectiveObjectId } = await context.params;
  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const reflectiveObject = await reflectiveObjectRepository.getById(reflectiveObjectId, user.userId);

  if (!reflectiveObject) {
    return NextResponse.json({ error: "Reflective object not found." }, { status: 404 });
  }

  const repository = createObservationRepository();
  const observations = await repository.listByReflectiveObject({
    userId: user.userId,
    reflectiveObjectId,
  });

  return NextResponse.json({ observations });
}

export async function POST(request: Request, context: RouteParams) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return unauthorizedResponse();
  }

  const { id: reflectiveObjectId } = await context.params;

  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const reflectiveObject = await reflectiveObjectRepository.getById(reflectiveObjectId, user.userId);

  if (!reflectiveObject) {
    return NextResponse.json({ error: "Reflective object not found." }, { status: 404 });
  }

  const payload = await readRequestBody(request);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Manual/API compatibility ingress: this route still accepts the legacy
  // CreateObservationInput write shape directly. Cognition generation paths
  // should continue to use discovery plus projection before persistence.
  const parsed = parseCreateObservationInput(payload, user.userId, reflectiveObjectId);

  if (!parsed.ok) {
    const status = parsed.semanticPolicyResult ? 422 : 400;
    return NextResponse.json(
      {
        error: parsed.error,
        semanticPolicyResult: parsed.semanticPolicyResult ?? null,
        reasons: parsed.reasons ?? [],
      },
      { status },
    );
  }

  const repository = createObservationRepository();
  const observation = await repository.create(parsed.value);

  return NextResponse.json({ observation }, { status: 201 });
}
