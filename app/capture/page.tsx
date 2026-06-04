import { redirect } from "next/navigation";

import { buildDescriptiveObservationScaffold } from "@/src/cognition/observation/descriptive-observation-scaffold";
import { createObservationRepository } from "@/src/infrastructure/supabase/repositories/create-observation-repository";
import { createReflectiveObjectRepository } from "@/src/infrastructure/supabase/repositories/create-reflective-object-repository";
import { requireAuthenticatedUserId } from "@/src/ui/shared/require-authenticated-user";
import styles from "@/app/capture/page.module.css";

const MIN_CONTENT_LENGTH = 1;

function readField(formData: FormData, key: string): string {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

async function submitCapture(formData: FormData) {
  "use server";

  const userId = await requireAuthenticatedUserId();
  const title = readField(formData, "title");
  const dreamText = readField(formData, "dreamText");

  if (!title || dreamText.length < MIN_CONTENT_LENGTH) {
    redirect("/capture?error=validation");
  }

  const reflectiveObjectRepository = createReflectiveObjectRepository();
  const reflectiveObject = await reflectiveObjectRepository.create({
    userId,
    objectType: "dream",
    title,
    primaryContent: dreamText,
    sourceContext: "manual",
  });

  const observationInput = buildDescriptiveObservationScaffold({
    userId,
    reflectiveObjectId: reflectiveObject.id,
    sourceText: dreamText,
    source: "system_descriptive_extract",
  });

  const observationRepository = createObservationRepository();
  await observationRepository.create(observationInput);

  redirect(`/objects/${encodeURIComponent(reflectiveObject.id)}`);
}

export default async function CapturePage() {
  await requireAuthenticatedUserId();

  return (
    <main>
      <section className={styles.container}>
        <header className={styles.header}>
          <p className={styles.overline}>Capture</p>
          <h1 className={styles.title}>Write one dream to begin reflection.</h1>
          <p className={styles.subtitle}>A minimal entry path: dream text, observation scaffold, then reflection workspace.</p>
        </header>

        <form action={submitCapture} className={styles.form}>
          <label className={styles.label}>
            Title
            <input
              name="title"
              className={styles.input}
              type="text"
              placeholder="A short dream title"
              required
              maxLength={120}
            />
          </label>

          <label className={styles.label}>
            Dream text
            <textarea
              name="dreamText"
              className={styles.textarea}
              rows={10}
              placeholder="Write the dream as you remember it."
              required
            />
          </label>

          <button type="submit" className={styles.button}>
            Save and continue
          </button>
        </form>
      </section>
    </main>
  );
}
