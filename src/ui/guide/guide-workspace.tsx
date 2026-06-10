"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";

import { getSleepDreamGuideCardBySlug } from "@/src/content/sleep-dream-guide/search";
import { GuideCard } from "@/src/ui/guide/guide-card";
import { buildGuideCardHref, resolveGuideModalSlug } from "@/src/ui/guide/guide-modal-state";
import { GuideModal } from "@/src/ui/guide/guide-modal";
import {
  GUIDE_ALL_FILTER,
  getGuidePrimaryOptions,
  getGuideRelatedCards,
  getGuideVisibleCards,
  type GuidePrimaryFilter,
} from "@/src/ui/guide/view-model";

import styles from "@/src/ui/guide/guide-workspace.module.css";

interface GuideWorkspaceProps {
  initialCardSlug?: string | null;
}

export function GuideWorkspace({ initialCardSlug = null }: GuideWorkspaceProps) {
  const [query, setQuery] = useState("");
  const [selectedPrimary, setSelectedPrimary] = useState<GuidePrimaryFilter>(GUIDE_ALL_FILTER);
  const [activeSlug, setActiveSlug] = useState<string | null>(() => resolveGuideModalSlug(initialCardSlug));
  const deferredQuery = useDeferredValue(query);

  const primaryOptions = getGuidePrimaryOptions();
  const visibleCards = getGuideVisibleCards({
    query: deferredQuery,
    selectedPrimary,
  });
  const activeCard = activeSlug ? getSleepDreamGuideCardBySlug(activeSlug) ?? null : null;
  const relatedCards = activeCard ? getGuideRelatedCards(activeCard.slug) : [];

  useEffect(() => {
    setActiveSlug(resolveGuideModalSlug(initialCardSlug));
  }, [initialCardSlug]);

  function updateGuideLocation(nextSlug: string | null) {
    if (typeof window === "undefined") {
      return;
    }

    const nextHref = buildGuideCardHref(window.location.pathname, window.location.search, nextSlug);
    window.history.replaceState(window.history.state, "", nextHref);
  }

  function handleOpenCard(slug: string) {
    setActiveSlug(slug);
    updateGuideLocation(slug);
  }

  function handleCloseCard() {
    setActiveSlug(null);
    updateGuideLocation(null);
  }

  return (
    <section className={styles.workspace}>
      <header className={styles.pageHeader}>
        <Link href="/" className={styles.backLink} aria-label="Vissza a kezdőlapra">
          <span className={styles.backIcon} aria-hidden="true">
            ‹
          </span>
        </Link>

        <div className={styles.headingBlock}>
          <h1 className={styles.title}>Útmutató alváshoz és álmokhoz</h1>
          <p className={styles.subtitle}>Gyakorlati tájékozódás gyakori alvási és álomhelyzetekben.</p>
        </div>
      </header>

      <section className={styles.controls}>
        <div className={styles.searchBlock}>
          <label htmlFor="guide-search" className={styles.searchLabel}>
            Keresés a kártyák között
          </label>
          <input
            id="guide-search"
            type="search"
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Például: rémálom, visszaalvás, alvási bénulás"
          />
        </div>

        <div className={styles.filterSection}>
          <p className={styles.filterLabel}>Főkategóriák</p>
          <div className={styles.filterRow}>
            {primaryOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={styles.filterButton}
                data-active={selectedPrimary === option ? "true" : "false"}
                data-guide-category={option === GUIDE_ALL_FILTER ? "all" : option}
                onClick={() => setSelectedPrimary(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      {visibleCards.length === 0 ? (
        <section className={styles.emptyState}>
          <p>
            Nem találtunk pontos kártyát. Próbáld meg egyszerűbb szavakkal, például: rémálom, visszaalvás,
            alvási bénulás.
          </p>
        </section>
      ) : (
        <section className={styles.grid} aria-label="Sleep and dream guide cards">
          {visibleCards.map((card) => (
            <GuideCard key={card.slug} card={card} onOpen={handleOpenCard} />
          ))}
        </section>
      )}

      {activeCard ? (
        <GuideModal
          activeCard={activeCard}
          relatedCards={relatedCards}
          onClose={handleCloseCard}
          onSelectRelated={handleOpenCard}
        />
      ) : null}
    </section>
  );
}
