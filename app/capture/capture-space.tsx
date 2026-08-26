"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { countCaptureTextMetrics } from "@/app/capture/capture-metrics";
import styles from "@/app/capture/page.module.css";

interface CaptureSpaceProps {
  action: (formData: FormData) => Promise<void>;
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={styles.button}
      disabled={pending}
      aria-live="polite"
    >
      {pending ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{pending ? "Feldolgozás..." : "Rögzítés"}</span>
    </button>
  );
}

function CaptureFields() {
  const [dreamText, setDreamText] = useState("");
  const metrics = countCaptureTextMetrics(dreamText);
  const { pending } = useFormStatus();

  return (
    <>
      <textarea
        aria-label="Álomleírás"
        name="dreamText"
        className={styles.textarea}
        placeholder="Írd le az álmot úgy, ahogy és amennyire emlékszel rá."
        required
        disabled={pending}
        value={dreamText}
        onChange={(event) => setDreamText(event.target.value)}
      />

      <div className={styles.footer}>
        <p className={styles.metrics}>
          {metrics.wordCount} szó · {metrics.characterCount} karakter
        </p>

        <SubmitButton />
      </div>
    </>
  );
}

export function CaptureSpace({ action }: CaptureSpaceProps) {
  const { pending } = useFormStatus();

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <CaptureFields />
    </form>
  );
}
