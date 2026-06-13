import { redirect } from "next/navigation";

import { buildLlmSceneObservationExtraction } from "@/src/cognition/observation/llm-scene-observation-extractor";
import { generateDreamTitleSuggestion } from "@/src/cognition/title/llm-dream-title-generator";
import { createObservationV2WriteStore } from "@/src/infrastructure/persistence/observation-v2-write-store";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { generateGlossaryCandidatesForReflectiveObject } from "@/src/runtime/orchestration/generate-glossary-candidates-for-reflective-object";
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
  const extractionPromise = buildLlmSceneObservationExtraction({
    userId,
    reflectiveObjectId,
    dreamText,
  });
  const extraction = await extractionPromise;

  if (extraction.mode !== "validated_llm" || !extraction.bundle) {
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

  const observationWriteStore = createObservationV2WriteStore();
  await observationWriteStore.createFromBundle(extraction.bundle);
  await generateGlossaryCandidatesForReflectiveObject({
    userId,
    reflectiveObjectId: reflectiveObject.id,
  });

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
