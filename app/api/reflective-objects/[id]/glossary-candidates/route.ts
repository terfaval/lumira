import { NextResponse } from "next/server";

import { projectGlossaryCandidateContinuityVisibility } from "@/src/domain/glossary/continuity-visibility";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { generateGlossaryCandidatesForReflectiveObject } from "@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object";

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
  const [allCandidates, objectCandidates] = await Promise.all([
    glossaryRepository.listCandidates(user.userId),
    glossaryRepository.listCandidatesByReflectiveObject(user.userId, reflectiveObjectId),
  ]);
  const projectedCandidates = projectGlossaryCandidateContinuityVisibility([
    ...allCandidates.filter((candidate) => candidate.reflectiveObjectId !== reflectiveObjectId),
    ...objectCandidates,
  ]).filter((candidate) => candidate.reflectiveObjectId === reflectiveObjectId);

  return NextResponse.json({ candidates: projectedCandidates });
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

  const candidates = await generateGlossaryCandidatesForReflectiveObject({
    userId: user.userId,
    reflectiveObjectId,
  });

  const glossaryRepository = createGlossaryRepository();
  const allCandidates = await glossaryRepository.listCandidates(user.userId);
  const generatedIds = new Set(candidates.map((candidate) => candidate.id));
  const projectedCandidates = projectGlossaryCandidateContinuityVisibility(allCandidates).filter((candidate) =>
    generatedIds.has(candidate.id),
  );

  return NextResponse.json({ candidates: projectedCandidates }, { status: 201 });
}
