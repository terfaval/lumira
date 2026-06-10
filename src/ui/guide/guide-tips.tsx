"use client";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideTipsProps {
  practicalTips: string[];
}

export function GuideTips({ practicalTips }: GuideTipsProps) {
  if (practicalTips.length === 0) {
    return null;
  }

  if (practicalTips.length === 1) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Praktikus lépés</h3>
        <div className={styles.tipSingle}>
          <p>{practicalTips[0]}</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Praktikus lépések</h3>
      <ol className={styles.tipList}>
        {practicalTips.map((tip, index) => (
          <li key={`${tip}-${index}`} className={styles.tipListItem}>
            <span className={styles.tipNumber}>{index + 1}</span>
            <p>{tip}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
