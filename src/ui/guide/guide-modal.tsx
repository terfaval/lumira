"use client";

import { useEffect } from "react";

import type { SleepDreamGuideCard } from "@/src/content/sleep-dream-guide/search";
import { GuideRelatedCards } from "@/src/ui/guide/guide-related-cards";
import { GuideSafetyNote } from "@/src/ui/guide/guide-safety-note";
import { GuideTips } from "@/src/ui/guide/guide-tips";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideModalProps {
  activeCard: SleepDreamGuideCard;
  relatedCards: SleepDreamGuideCard[];
  onClose: () => void;
  onSelectRelated: (slug: string) => void;
}

export function GuideModal({ activeCard, relatedCards, onClose, onSelectRelated }: GuideModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modalShell}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Bezárás">
          <span aria-hidden="true">×</span>
        </button>

        <div className={styles.modalScroll}>
          <header className={styles.modalHeader}>
            <div className={styles.modalPills}>
              <span className={styles.pill} data-guide-category={activeCard.displayTags.primary}>
                {activeCard.displayTags.primary}
              </span>
              {activeCard.displayTags.secondary.map((tag) => (
                <span key={tag} className={styles.pillSecondary}>
                  {tag}
                </span>
              ))}
            </div>
            <h2 id="guide-modal-title" className={styles.modalTitle}>
              {activeCard.title}
            </h2>
            <p className={styles.modalIntro}>{activeCard.summary}</p>
          </header>

          <div className={styles.modalBody}>
            <p>{activeCard.content.join(" ")}</p>
          </div>

          <GuideTips practicalTips={activeCard.practicalTips} />
          <GuideSafetyNote safetyNote={activeCard.safetyNote} />
          <GuideRelatedCards cards={relatedCards} onSelect={onSelectRelated} />
        </div>
      </div>
    </div>
  );
}
