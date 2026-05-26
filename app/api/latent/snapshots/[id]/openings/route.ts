import { NextResponse } from "next/server";

import { applyOpeningCadencePolicy } from "@/src/cognition/openings/opening-cadence-policy";
import { deriveOpeningCandidatesFromLatent } from "@/src/cognition/openings/derive-opening-candidates-from-latent";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createLatentRepository } from "@/src/infrastructure/supabase/repositories/create-latent-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface OpeningsInvocationPayload {
  userInvocationBoundary?: string;
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

async function readRequestBody(request: Request): Promise<OpeningsInvocationPayload | null> {
  try {
    return (await request.json()) as OpeningsInvocationPayload;
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
  if (!payload || payload.userInvocationBoundary !== "expand_opening_surface") {
    return NextResponse.json(
      {
        error: "Opening generation requires explicit userInvocationBoundary=expand_opening_surface.",
      },
      { status: 400 },
    );
  }

  const { id: snapshotId } = await context.params;
  const latentRepository = createLatentRepository();
  const snapshot = await latentRepository.getSnapshotById(snapshotId, user.userId);
  if (!snapshot) {
    return NextResponse.json({ error: "Latent snapshot not found." }, { status: 404 });
  }

  const openingRepository = createOpeningRepository();
  const existingOpenings = await openingRepository.listOpeningsByLatentSnapshot(snapshotId, user.userId);
  if (existingOpenings.length > 0) {
    return NextResponse.json({ openings: existingOpenings });
  }

  const candidates = deriveOpeningCandidatesFromLatent(snapshot);
  const recentOpenings = await openingRepository.listRecentOpeningsByUser(user.userId);
  const cadenceDecision = applyOpeningCadencePolicy({
    candidates,
    recentOpenings,
  });
  if (cadenceDecision.openings.length === 0) {
    return NextResponse.json({
      openings: [],
      noOpeningReason: cadenceDecision.noOpeningReason,
    });
  }

  const created = await Promise.all(cadenceDecision.openings.map((candidate) => openingRepository.createOpening(candidate)));
  return NextResponse.json(
    {
      openings: created,
      noOpeningReason: null,
    },
    { status: 201 },
  );
}
