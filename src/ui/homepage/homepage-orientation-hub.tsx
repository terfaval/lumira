import Link from "next/link";

import type {
  HomepageOrientationPayload,
  HomepageRecentObjectPreviewItem,
  HomepageDreamJournalPreviewItem,
} from "@/src/reflective-space/composition/compose-homepage-orientation-payload";
import type { HomepageNavigationTargetRef } from "@/src/reflective-space/composition/homepage-route-target-registry";
import styles from "@/src/ui/homepage/homepage-orientation-hub.module.css";

interface HomepageOrientationHubProps {
  payload: HomepageOrientationPayload;
}

function shortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString(undefined, { month: "short", day: "numeric" });
}

function RouteAction({ target, label }: { target: HomepageNavigationTargetRef; label: string }) {
  if (target.routeStatus === "missing") {
    return (
      <span aria-disabled className={styles.statusLabel}>
        {label}
      </span>
    );
  }

  return (
    <Link className={styles.actionLink} href={target.href}>
      {label}
    </Link>
  );
}

function mobileRecentHint(items: HomepageRecentObjectPreviewItem[], fallback: string): string {
  if (!items[0]) {
    return fallback;
  }

  return `${items[0].title} - ${shortDate(items[0].timestamp.iso)}`;
}

function mobileDreamHint(items: HomepageDreamJournalPreviewItem[], fallback: string): string {
  if (!items[0]) {
    return fallback;
  }

  return `${items[0].title} - ${shortDate(items[0].recordedAt.iso)}`;
}

export function HomepageOrientationHub({ payload }: HomepageOrientationHubProps) {
  const glossaryMobileHint = payload.glossaryPreview.items[0]
    ? `${payload.glossaryPreview.items[0].label} and returning motifs`
    : payload.emptyStates.noGlossaryTerms;

  const guideMobileHint = payload.guidePreview.topics[0]?.descriptor ?? payload.emptyStates.guideUnavailable;

  return (
    <section className={styles.hub}>
      <header className={styles.hero}>
        <p className={styles.overline}>Orientation Hub</p>
        <h1 className={styles.title}>A calm threshold into reflective space.</h1>
        <p className={styles.subtitle}>Where you can gently enter now.</p>
      </header>

      <section className={styles.grid}>
        <article className={`${styles.tile} ${styles.capture}`}>
          <h2>{payload.capture.title}</h2>
          <p className={styles.panelLead}>{payload.capture.description}</p>
          <div className={styles.actions}>
            <RouteAction target={payload.capture.target} label="Open capture" />
          </div>
        </article>

        <article className={`${styles.tile} ${styles.journal}`}>
          <h2>{payload.dreamJournalPreview.title}</h2>
          <p className={styles.mobileHint}>{mobileDreamHint(payload.dreamJournalPreview.items, payload.emptyStates.noDreams)}</p>
          <ul className={styles.previewList}>
            {payload.dreamJournalPreview.items.map((item) => (
              <li key={item.dreamObjectId}>
                <Link className={styles.previewLabel} href={item.target.href}>
                  {item.title}
                </Link>
                <span className={styles.previewMeta}>{item.previewText}</span>
              </li>
            ))}
            {payload.dreamJournalPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{payload.emptyStates.noDreams}</span>
              </li>
            ) : null}
          </ul>
          <div className={styles.actions}>
            <RouteAction target={payload.navigation.dreamJournal} label="Open journal" />
          </div>
        </article>

        <article className={`${styles.tile} ${styles.recents}`}>
          <h2>{payload.recentObjectsPreview.title}</h2>
          <p className={styles.mobileHint}>{mobileRecentHint(payload.recentObjectsPreview.items, payload.emptyStates.noRecentObjects)}</p>
          <ul className={styles.previewList}>
            {payload.recentObjectsPreview.items.map((item) => (
              <li key={item.objectId}>
                <Link className={styles.previewLabel} href={item.target.href}>
                  {item.title}
                </Link>
                <span className={styles.previewMeta}>
                  {item.objectType.replace("_", " ")} - {shortDate(item.timestamp.iso)}
                </span>
              </li>
            ))}
            {payload.recentObjectsPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{payload.emptyStates.noRecentObjects}</span>
              </li>
            ) : null}
          </ul>
        </article>

        <article className={`${styles.tile} ${styles.glossary}`}>
          <h2>{payload.glossaryPreview.title}</h2>
          <p className={styles.mobileHint}>{glossaryMobileHint}</p>
          <ul className={styles.previewList}>
            {payload.glossaryPreview.items.map((item) => (
              <li key={item.termId}>
                {item.target.routeStatus === "missing" ? (
                  <span className={styles.previewLabel}>{item.label}</span>
                ) : (
                  <Link className={styles.previewLabel} href={item.target.href}>
                    {item.label}
                  </Link>
                )}
                <span className={styles.previewMeta}>{item.descriptor ?? "Personal motif memory."}</span>
              </li>
            ))}
            {payload.glossaryPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{payload.emptyStates.noGlossaryTerms}</span>
              </li>
            ) : null}
          </ul>
          <div className={styles.actions}>
            <RouteAction target={payload.navigation.glossary} label="Open glossary" />
          </div>
        </article>

        <article className={`${styles.tile} ${styles.guide}`}>
          <h2>{payload.guidePreview.title}</h2>
          <p className={styles.mobileHint}>{guideMobileHint}</p>
          <ul className={styles.topicList}>
            {payload.guidePreview.topics.map((topic) => (
              <li key={topic.key}>
                <span className={styles.previewLabel}>{topic.label}</span>
                <span className={styles.previewMeta}>{topic.descriptor ?? payload.emptyStates.guideUnavailable}</span>
              </li>
            ))}
          </ul>
          <p className={styles.quiet}>{payload.guidePreview.description}</p>
          <div className={styles.actions}>
            <RouteAction target={payload.navigation.guide} label="Open guide" />
          </div>
        </article>
      </section>
    </section>
  );
}
