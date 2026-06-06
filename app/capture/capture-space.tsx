"use client";

import { useState } from "react";

import { countCaptureTextMetrics } from "@/app/capture/capture-metrics";
import styles from "@/app/capture/page.module.css";

interface CaptureSpaceProps {
  action: (formData: FormData) => Promise<void>;
}

export function CaptureSpace({ action }: CaptureSpaceProps) {
  const [dreamText, setDreamText] = useState("");
  const metrics = countCaptureTextMetrics(dreamText);

  return (
    <form action={action} className={styles.form}>
      <textarea
        aria-label="Álomleírás"
        name="dreamText"
        className={styles.textarea}
        placeholder="Írd le az álmot úgy, ahogy és amennyire emlékszel rá."
        required
        value={dreamText}
        onChange={(event) => setDreamText(event.target.value)}
      />

      <div className={styles.footer}>
        <p className={styles.metrics}>
          {metrics.wordCount} szó · {metrics.characterCount} karakter
        </p>

        <button type="submit" className={styles.button}>
          Rögzítés
        </button>
      </div>
    </form>
  );
}
