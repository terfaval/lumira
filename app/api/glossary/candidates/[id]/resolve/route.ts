import { NextResponse } from "next/server";

import { parseGlossaryCandidateResolution } from "@/src/domain/glossary/http-contract";
import type { GlossaryCandidate, ResolveGlossaryCandidateInput } from "@/src/domain/glossary/types";
import { DEV_FALLBACK_HEADER, resolveRequestUserContext } from "@/src/infrastructure/supabase/auth/resolve-request-user-context";
import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";

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

function validateResolutionAgainstCandidate(
  candidate: GlossaryCandidate,
  input: ResolveGlossaryCandidateInput,
): string | null {
  switch (input.resolutionType) {
    case "confirm_existing_entity":
      if (candidate.candidateClass !== "match_candidate") {
        return "confirm_existing_entity requires a match_candidate.";
      }
      if (!input.entityId || !candidate.proposedEntityIds.includes(input.entityId)) {
        return "Resolved entity must match the proposed continuity entity.";
      }
      return null;
    case "select_existing_entity":
      if (candidate.candidateClass !== "ambiguous_match_candidate") {
        return "select_existing_entity requires an ambiguous_match_candidate.";
      }
      if (!input.entityId || !candidate.proposedEntityIds.includes(input.entityId)) {
        return "Resolved entity must be one of the proposed continuity entities.";
      }
      return null;
    case "create_new_entity":
      if (candidate.candidateClass !== "new_candidate") {
        return "create_new_entity requires a new_candidate.";
      }
      return null;
  }
}

export async function POST(request: Request, context: { params: Promise<unknown> }) {
  const user = await resolveRequestUserContext(request.headers);

  if (!user.userId) {
    return unauthorizedResponse();
  }

  const payload = await readRequestBody(request);

  if (payload === null) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { id: candidateId } = (await context.params) as { id: string };
  const parsed = parseGlossaryCandidateResolution(payload, candidateId, user.userId);

  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const repository = createGlossaryRepository();
  const candidate = await repository.getCandidateById(candidateId, user.userId);

  if (!candidate) {
    return NextResponse.json({ error: "Glossary candidate not found." }, { status: 404 });
  }

  const resolutionError = validateResolutionAgainstCandidate(candidate, parsed.value);
  if (resolutionError) {
    return NextResponse.json({ error: resolutionError }, { status: 400 });
  }

  const resolved = await repository.resolveCandidate(parsed.value);

  if (!resolved) {
    return NextResponse.json({ error: "Glossary candidate resolution failed." }, { status: 404 });
  }

  return NextResponse.json(resolved);
}
