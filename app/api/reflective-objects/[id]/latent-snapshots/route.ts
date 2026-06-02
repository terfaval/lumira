import { NextResponse } from "next/server";

import { buildLatentSnapshotScaffold } from "@/src/cognition/latent/latent-engine";
import { toPublicLatentSnapshot } from "@/src/domain/latent/transport";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SNAPSHOT_OBSERVATION_WINDOW = 24;

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
    limit: SNAPSHOT_OBSERVATION_WINDOW,
  });

  const glossaryRepository = createGlossaryRepository();
  const glossaryTerms = await glossaryRepository.listTerms(user.userId);

  const threadRepository = createThreadRepository();
  const threads = await threadRepository.listThreadsByUser(user.userId);

  const responseRepository = createResponseRepository();
  const responses = responseRepository.listResponsesByReflectiveObject
    ? await responseRepository.listResponsesByReflectiveObject(user.userId, reflectiveObjectId, 80)
    : await responseRepository.listResponsesByUser(user.userId, 80);

  const openingRepository = createOpeningRepository();
  const recentOpenings = await openingRepository.listRecentOpeningsByUser(user.userId, 40);

  const latentRepository = createLatentRepository();
  const recentSnapshots = (await latentRepository.listSnapshotsByUser(user.userId)).slice(0, 20);

  const snapshotScaffold = buildLatentSnapshotScaffold({
    userId: user.userId,
    reflectiveObjectId,
    observations,
    glossaryTerms,
    threads,
    responses,
    reflectiveObjectMetadata: reflectiveObject.metadata,
    recentSnapshots,
    recentOpenings,
  });

  const latentSnapshot = await latentRepository.createSnapshot(snapshotScaffold);

  return NextResponse.json({ latentSnapshot: toPublicLatentSnapshot(latentSnapshot) }, { status: 201 });
}
