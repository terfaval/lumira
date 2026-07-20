import { createGlossaryRepository } from "@/src/infrastructure/supabase/repositories/create-glossary-repository";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createObservationV2Repository } from "@/src/infrastructure/supabase/repositories/create-observation-v2-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { composeHomepageOrientationPayload } from "@/src/reflective-space/composition/compose-homepage-orientation-payload";
import { SessionControls } from "@/src/ui/auth/session-controls";
import { HomepageOrientationHub } from "@/src/ui/homepage/homepage-orientation-hub";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";
import styles from "@/app/page.module.css";

export default async function HomePage() {
  const userId = await requireAuthenticatedUserId();
  const payload = await composeHomepageOrientationPayload({
    userId,
    reflectiveObjectRepository: createReflectiveObjectRepository(),
    glossaryRepository: createGlossaryRepository(),
    observationRepository: createObservationRepository(),
    observationV2Repository: createObservationV2Repository(),
  });

  return (
    <main className={styles.page}>
      <HomepageOrientationHub payload={payload} />
      <details className={styles.sessionUtility}>
        <summary aria-label="Munkamenet eszközök">
          <span className={styles.utilityGlyph} aria-hidden="true" />
        </summary>
        <div className={styles.sessionPopover}>
          <SessionControls />
        </div>
      </details>
    </main>
  );
}
