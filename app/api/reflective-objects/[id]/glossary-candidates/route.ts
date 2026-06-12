import { NextResponse } from "next/server";

import {
  extractGlossaryCandidatesFromObservationV2Bundle,
  extractGlossaryCandidatesFromObservations,
} from "@/src/cognition/glossary/extract-glossary-candidates-from-observations";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
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

  const observationV2Repository = createObservationV2Repository();
  const observationBundle = await observationV2Repository.getByReflectiveObjectId(reflectiveObjectId, user.userId);

  const candidateInputs = observationBundle
    ? extractGlossaryCandidatesFromObservationV2Bundle({
        userId: user.userId,
        reflectiveObjectId,
        bundle: observationBundle,
      })
    : extractGlossaryCandidatesFromObservations({
        userId: user.userId,
        reflectiveObjectId,
        observations: await createObservationRepository().listByReflectiveObject({
          userId: user.userId,
          reflectiveObjectId,
        }),
      });

  if (candidateInputs.length === 0) {
    return NextResponse.json({ candidates: [] });
  }

  const glossaryRepository = createGlossaryRepository();
  const candidates = await glossaryRepository.upsertCandidates(candidateInputs);

  return NextResponse.json({ candidates }, { status: 201 });
}
