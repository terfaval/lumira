"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import styles from "@/src/ui/homepage/homepage-orientation-hub.module.css";
import {
  FEATURE_CAROUSEL_AUTOPLAY_MS,
  getNextFeatureIndex,
  getPreviousFeatureIndex,
} from "@/src/ui/homepage/homepage-feature-carousel";

const HOMEPAGE_FEATURE_SLIDES = [
  {
    key: "meditation",
    href: "/meditation",
    ariaLabel: "Meditálj",
    content: (
      <div className={`${styles.featureCarouselContentGroup} ${styles.meditationContent}`}>
        <h2>Üveggyöngyök</h2>
        <p className={styles.panelLead}>Lépj be egy lassabb, csendesebb térbe.</p>
        <Link className={styles.meditationCta} href="/meditation">
          Meditálj
        </Link>
      </div>
    ),
  },
  {
    key: "fortune",
    href: "/fortune",
    ariaLabel: "Fortune Journaling megnyitása",
    content: (
      <div className={`${styles.featureCarouselContentGroup} ${styles.featureCarouselFortuneContent}`}>
        <h2>Fortune Journaling</h2>
        <p className={styles.panelSublead}>Tarot-alapú önreflexió</p>
        <Link className={styles.fortuneCarouselCta} href="/fortune">
          Próbáld ki
        </Link>
      </div>
    ),
  },
] as const;

export function HomepageFeatureCarouselTile() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => getNextFeatureIndex(currentIndex, HOMEPAGE_FEATURE_SLIDES.length));
    }, FEATURE_CAROUSEL_AUTOPLAY_MS);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  const activeSlide = HOMEPAGE_FEATURE_SLIDES[activeIndex];

  return (
    <div
      className={styles.featureCarousel}
      data-homepage-feature-carousel="true"
      data-active-feature={activeSlide.key}
      onPointerEnter={() => setIsPaused(true)}
      onPointerLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div className={styles.featureCarouselViewport}>
        {HOMEPAGE_FEATURE_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;

          return (
            <section
              className={styles.featureCarouselSlide}
              data-active={isActive ? "true" : "false"}
              key={slide.key}
              aria-hidden={isActive ? "false" : "true"}
            >
              {slide.content}
            </section>
          );
        })}
      </div>

      <div className={styles.featureCarouselControls}>
        <button
          className={styles.featureCarouselArrow}
          type="button"
          aria-label="Előző panel"
          onClick={() => setActiveIndex((currentIndex) => getPreviousFeatureIndex(currentIndex, HOMEPAGE_FEATURE_SLIDES.length))}
        >
          ‹
        </button>
        <button
          className={styles.featureCarouselArrow}
          type="button"
          aria-label="Következő panel"
          onClick={() => setActiveIndex((currentIndex) => getNextFeatureIndex(currentIndex, HOMEPAGE_FEATURE_SLIDES.length))}
        >
          ›
        </button>
      </div>
    </div>
  );
}
