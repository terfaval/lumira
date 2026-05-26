import { NextResponse } from "next/server";

import { extractGlossaryCandidatesFromObservations } from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
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

  const glossaryRepository = createGlossaryRepository();
  const candidates = await glossaryRepository.listCandidatesByReflectiveObject(user.userId, reflectiveObjectId);

  return NextResponse.json({ candidates });
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

  const observationRepository = createObservationRepository();
  const observations = await observationRepository.listByReflectiveObject({
    userId: user.userId,
    reflectiveObjectId,
  });

  const candidateInputs = extractGlossaryCandidatesFromObservations({
    userId: user.userId,
    reflectiveObjectId,
    observations,
  });

  if (candidateInputs.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  const glossaryRepository = createGlossaryRepository();
  const candidates = await glossaryRepository.upsertCandidates(candidateInputs);

  return NextResponse.json({ candidates }, { status: 201 });
}
