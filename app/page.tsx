import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { composeHomepageOrientationPayload } from "@/src/reflective-space/composition/compose-homepage-orientation-payload";
import { SessionControls } from "@/src/ui/auth/session-controls";
import { HomepageOrientationHub } from "@/src/ui/homepage/homepage-orientation-hub";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";

export default async function HomePage() {
  const userId = await requireAuthenticatedUserId();
  const payload = await composeHomepageOrientationPayload({
    userId,
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    glossaryRepository: createGlossaryRepository(),
    observationRepository: createObservationRepository(),
  });

  return (
    <main>
      <SessionControls />
      <HomepageOrientationHub payload={payload} />
    </main>
  );
}
