"use client";

import type { SleepDreamGuideCard } from "@/src/content/sleep-dream-guide/search";
import { getGuideSecondaryPreviewLabel } from "@/src/ui/guide/view-model";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideCardProps {
  card: SleepDreamGuideCard;
  onOpen: (slug: string) => void;
}

export function GuideCard({ card, onOpen }: GuideCardProps) {
  const secondaryLabel = getGuideSecondaryPreviewLabel(card);

  return (
    <button type="button" className={styles.card} onClick={() => onOpen(card.slug)}>
      <div className={styles.cardPills}>
        <span className={styles.pill} data-guide-category={card.displayTags.primary}>
          {card.displayTags.primary}
        </span>
        {secondaryLabel ? <span className={styles.pillSecondary}>{secondaryLabel}</span> : null}
      </div>
      <h2 className={styles.cardTitle}>{card.title}</h2>
      <p className={styles.cardSummary}>{card.summary}</p>
    </button>
  );
}
