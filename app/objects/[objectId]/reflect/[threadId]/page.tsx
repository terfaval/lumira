import { notFound } from "next/navigation";

import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createLatentOpportunityRepository } from "@/src/infrastructure/supabase/repositories/create-latent-opportunity-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectionRepository } from "@/src/infrastructure/supabase/repositories/create-reflection-repository";
import { createResponseRepository } from "@/src/infrastructure/supabase/repositories/create-response-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { prepareLatentOpeningForReflection } from "@/src/runtime/orchestration/prepare-latent-opening-for-reflection";
import {
  composeDeepReflectionPayload,
  type DeepReflectionCenterStatus,
  type DeepReflectionThreadResolution,
} from "@/src/reflective-space/composition/compose-deep-reflection-payload";
import { DeepReflectionShell } from "@/src/ui/reflective-space/deep-reflection-shell";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

interface DeepReflectionPageProps {
  params: Promise<{ objectId: string; threadId: string }>;
  searchParams?: Promise<{ centerStatus?: string; resolution?: string }>;
}

function parseCenterStatus(value: string | undefined): DeepReflectionCenterStatus | undefined {
  if (value === "new" || value === "continued" || value === "reentered") {
    return value;
  }

  return undefined;
}

function parseResolution(value: string | undefined): DeepReflectionThreadResolution | undefined {
  if (value === "created" || value === "reused" || value === "reentered") {
    return value;
  }

  return undefined;
}

export default async function DeepReflectionPage({ params, searchParams }: DeepReflectionPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { objectId, threadId } = await params;
  const query = (await searchParams) ?? {};

  try {
    await prepareLatentOpeningForReflection({
      userId,
      reflectiveObjectId: objectId,
    });
  } catch (error) {
    console.error("Deep Reflection preparation failed; continuing with current thread payload.", error);
  }

  const payload = await composeDeepReflectionPayload({
    userId,
    reflectiveObjectId: objectId,
    threadId,
    centerStatus: parseCenterStatus(query.centerStatus),
    resolution: parseResolution(query.resolution),
    threadRepository: createThreadRepository(),
    openingRepository: createOpeningRepository(),
    responseRepository: createResponseRepository(),
    glossaryRepository: createGlossaryRepository(),
    latentOpportunityRepository: createLatentOpportunityRepository(),
    reflectionRepository: createReflectionRepository(),
  });

  if (!payload) {
    notFound();
  }

  return <DeepReflectionShell payload={payload} reflectiveObjectId={objectId} />;
}
