import { notFound } from "next/navigation";

import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationNativeReadStore } from "@/src/infrastructure/persistence/observation-native-read-store";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createOpeningRepository } from "@/src/infrastructure/supabase/repositories/create-opening-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { createThreadRepository } from "@/src/infrastructure/supabase/repositories/create-thread-repository";
import { prepareLatentOpeningForReflection } from "@/src/runtime/orchestration/prepare-latent-opening-for-reflection";
import { composeObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";
import { ObjectOrientationLayer } from "@/src/ui/object-orientation/object-orientation-layer";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

interface ObjectOrientationPageProps {
  params: Promise<{ objectId: string }>;
}

export default async function ObjectOrientationPage({ params }: ObjectOrientationPageProps) {
  const userId = await requireAuthenticatedUserId();
  const { objectId } = await params;

  try {
    await prepareLatentOpeningForReflection({
      userId,
      reflectiveObjectId: objectId,
    });
  } catch (error) {
    console.error("Orientation preparation failed; continuing with available reflective material.", error);
  }

  const payload = await composeObjectOrientationPayload({
    userId,
    reflectiveObjectId: objectId,
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    observationRepository: createObservationRepository(),
    observationNativeReadRepository: createObservationNativeReadStore(),
    glossaryRepository: createGlossaryRepository(),
    threadRepository: createThreadRepository(),
    openingRepository: createOpeningRepository(),
  });

  if (!payload) {
    notFound();
  }

  return (
    <ObjectOrientationLayer payload={payload} />
  );
}
