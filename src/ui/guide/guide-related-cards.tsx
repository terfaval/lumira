"use client";

import type { SleepDreamGuideCard } from "@/src/content/sleep-dream-guide/search";
import { getGuideSecondaryPreviewLabel } from "@/src/ui/guide/view-model";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideRelatedCardsProps {
  cards: SleepDreamGuideCard[];
  onSelect: (slug: string) => void;
}

export function GuideRelatedCards({ cards, onSelect }: GuideRelatedCardsProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Kapcsolódó kártyák</h3>
      <div className={styles.relatedGrid}>
        {cards.map((card) => {
          const secondaryLabel = getGuideSecondaryPreviewLabel(card);

          return (
            <button
              key={card.slug}
              type="button"
              className={styles.relatedCard}
              onClick={() => onSelect(card.slug)}
            >
              <div className={styles.relatedPills}>
                <span className={styles.pill} data-guide-category={card.displayTags.primary}>
                  {card.displayTags.primary}
                </span>
                {secondaryLabel ? <span className={styles.relatedSecondary}>{secondaryLabel}</span> : null}
              </div>
              <strong className={styles.relatedTitle}>{card.title}</strong>
              <p className={styles.relatedSummary}>{card.summary}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
