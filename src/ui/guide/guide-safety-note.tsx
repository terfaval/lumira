"use client";

import type { SleepDreamGuideCard } from "@/src/content/sleep-dream-guide/search";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideSafetyNoteProps {
  safetyNote: SleepDreamGuideCard["safetyNote"];
}

export function GuideSafetyNote({ safetyNote }: GuideSafetyNoteProps) {
  if (!safetyNote) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Kíméletes jelzés</h3>
      <div className={styles.safetyNote} data-guide-safety={safetyNote.level}>
        <span className={styles.safetyIcon} aria-hidden="true">
          {safetyNote.level === "important" ? "!" : "i"}
        </span>
        <p>{safetyNote.text}</p>
      </div>
    </section>
  );
}
