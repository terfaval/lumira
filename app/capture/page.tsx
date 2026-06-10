import { redirect } from "next/navigation";

import { buildLlmObservationExtraction } from "@/src/cognition/observation/llm-observation-extractor";
import { generateDreamTitleSuggestion } from "@/src/cognition/title/llm-dream-title-generator";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";
import { deriveCaptureTitle } from "@/app/capture/capture-metrics";
import { CaptureSpace } from "@/app/capture/capture-space";
import styles from "@/app/capture/page.module.css";

const MIN_CONTENT_LENGTH = 1;

function readField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

async function submitCapture(formData: FormData) {
  "use server";

  const userId = await requireAuthenticatedUserId();
  const dreamText = readField(formData, "dreamText");
  const title = deriveCaptureTitle(dreamText);

  if (dreamText.length < MIN_CONTENT_LENGTH) {
    redirect("/capture?error=validation");
  }

  const reflectiveObjectId = crypto.randomUUID();

  const titleSuggestionPromise = generateDreamTitleSuggestion({ dreamText });
  const extractionPromise = buildLlmObservationExtraction({
    userId,
    reflectiveObjectId,
    dreamText,
  });
  const extraction = await extractionPromise;

  if (extraction.mode !== "validated_llm" || !extraction.payload) {
    console.warn("llm_observation_extraction_failed", {
      reflectiveObjectId,
      reason: extraction.reason,
    });
    return redirect("/capture?error=analysis");
  }

  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const reflectiveObject = await reflectiveObjectRepository.create({
    id: reflectiveObjectId,
    userId,
    objectType: "dream",
    title,
    primaryContent: dreamText,
    sourceContext: "manual",
  });

  try {
    const titleSuggestion = await titleSuggestionPromise;
    if (titleSuggestion.mode === "generated") {
      await reflectiveObjectRepository.update({
        id: reflectiveObject.id,
        userId,
        title: titleSuggestion.title,
      });
    }
  } catch (error) {
    console.warn("dream_title_generation_fallback", {
      reflectiveObjectId,
      error: error instanceof Error ? error.message : "unknown_error",
    });
  }

  const observationRepository = createObservationRepository();
  await observationRepository.create(extraction.payload);

  redirect(`/objects/${encodeURIComponent(reflectiveObject.id)}`);
}

export default async function CapturePage() {
  await requireAuthenticatedUserId();

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Új álom rögzítése</h1>
        </header>

        <CaptureSpace action={submitCapture} />
      </section>
    </main>
  );
}
