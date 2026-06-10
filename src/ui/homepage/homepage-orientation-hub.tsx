import Link from "next/link";

import type {
  HomepageDreamJournalPreviewItem,
  HomepageOrientationPayload,
  HomepageRecentObjectPreviewItem,
} from "@/src/reflective-space/composition/compose-homepage-orientation-payload";
import type { HomepageNavigationTargetRef } from "@/src/reflective-space/composition/homepage-route-target-registry";
import { buildGuideCardHref } from "@/src/ui/guide/guide-modal-state";
import styles from "@/src/ui/homepage/homepage-orientation-hub.module.css";

interface HomepageOrientationHubProps {
  payload: HomepageOrientationPayload;
}

const FEATURED_GUIDE_ENTRIES = [
  { slug: "nem-tudok-elaludni", label: "Nem tudok elaludni" },
  { slug: "remalom", label: "Rémálmom volt" },
  { slug: "nem-emlekszem-az-almaimra", label: "Nem emlékszem az álmaimra" },
] as const;

function shortDate(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }

  return parsed.toLocaleString("hu-HU", { month: "short", day: "numeric" });
}

function PanelEntryLink({
  target,
  label,
}: {
  target: HomepageNavigationTargetRef;
  label: string;
}) {
  if (target.routeStatus === "missing") {
    return null;
  }

  return <Link className={styles.panelEntryLink} href={target.href} aria-label={label} />;
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

function toObjectTypeLabel(type: string): string {
  switch (type) {
    case "dream":
      return "álom";
    case "memory":
      return "emlék";
    case "journal_entry":
      return "naplóbejegyzés";
    case "reflective_note":
      return "reflexiós jegyzet";
    default:
      return type.replace("_", " ");
  }
}

export function HomepageOrientationHub({ payload }: HomepageOrientationHubProps) {
  const glossaryMobileHint = payload.glossaryPreview.items[0]
    ? `${payload.glossaryPreview.items[0].label} és visszatérő motívumok`
    : "A motívumok idővel térnek vissza.";

  const noDreamsHint = "Még nincs rögzített álom. Kezdheted néhány mondattal is.";
  const noRecentObjectsHint = "Még nincs aktív elem.";
  const noGlossaryHint = "A motívumok idővel térnek vissza.";

  return (
    <section className={styles.hub}>
      <section className={styles.grid}>
        <article className={`${styles.tile} ${styles.capture} ${styles.interactive}`}>
          <PanelEntryLink target={payload.capture.target} label="Új álom rögzítése megnyitása" />
          <div className={styles.captureContent}>
            <div className={styles.captureCtaRow} aria-hidden="true">
              <span className={styles.capturePlusBadge}>+</span>
              <span className={styles.captureCtaLabel}>Új álom rögzítése</span>
            </div>
            <p className={`${styles.panelLead} ${styles.captureLead}`}>Rögzítsd az álmot, amíg még élénken jelen van.</p>
            <p className={`${styles.panelLead} ${styles.captureLead}`}>Néhány mondat is elegendő a kezdéshez.</p>
          </div>
        </article>

        <article className={`${styles.tile} ${styles.journal} ${styles.secondary} ${styles.interactive}`}>
          <PanelEntryLink target={payload.navigation.dreamJournal} label="Álomnapló megnyitása" />
          <h2>Álomnapló</h2>
          <p className={styles.mobileHint}>{mobileDreamHint(payload.dreamJournalPreview.items, noDreamsHint)}</p>
          <ul className={styles.previewList}>
            {payload.dreamJournalPreview.items.map((item) => (
              <li key={item.dreamObjectId}>
                <span className={styles.previewLabel}>{item.title}</span>
                <span className={styles.previewMeta}>{item.previewText}</span>
              </li>
            ))}
            {payload.dreamJournalPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{noDreamsHint}</span>
              </li>
            ) : null}
          </ul>
        </article>

        <article className={`${styles.tile} ${styles.recents} ${styles.tertiary}`}>
          <h2>Legutóbbi elemek</h2>
          <p className={styles.mobileHint}>{mobileRecentHint(payload.recentObjectsPreview.items, noRecentObjectsHint)}</p>
          <ul className={styles.previewList}>
            {payload.recentObjectsPreview.items.map((item) => (
              <li key={item.objectId}>
                <Link className={styles.previewLabel} href={item.target.href}>
                  {item.title}
                </Link>
                <span className={styles.previewMeta}>
                  {toObjectTypeLabel(item.objectType)} - {shortDate(item.timestamp.iso)}
                </span>
              </li>
            ))}
            {payload.recentObjectsPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{noRecentObjectsHint}</span>
              </li>
            ) : null}
          </ul>
        </article>

        <article className={`${styles.tile} ${styles.glossary} ${styles.secondary} ${styles.interactive}`}>
          <PanelEntryLink target={payload.navigation.glossary} label="Álomszótár megnyitása" />
          <h2>Álomszótár</h2>
          <p className={styles.panelSublead}>Visszatérő motívumok és kapcsolataik.</p>
          <p className={styles.mobileHint}>{glossaryMobileHint}</p>
          <ul className={styles.previewList}>
            {payload.glossaryPreview.items.map((item) => (
              <li key={item.termId}>
                <span className={styles.previewLabel}>{item.label}</span>
                <span className={styles.previewMeta}>{item.descriptor ?? "Személyes motívumemlékezet."}</span>
              </li>
            ))}
            {payload.glossaryPreview.items.length === 0 ? (
              <li>
                <span className={styles.previewMeta}>{noGlossaryHint}</span>
              </li>
            ) : null}
          </ul>
        </article>

        <article className={`${styles.tile} ${styles.guide} ${styles.tertiary}`}>
          <h2>Útmutató</h2>
          <p className={styles.guideDescription}>Gyakori alvási és álomhelyzetek.</p>
          <ul className={styles.guideFeaturedList}>
            {FEATURED_GUIDE_ENTRIES.map((entry) => (
              <li key={entry.slug}>
                <Link className={styles.guideFeaturedLink} href={buildGuideCardHref("/guide", "", entry.slug)}>
                  <span>{entry.label}</span>
                  <span className={styles.guideFeaturedArrow} aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className={styles.guideChevronLink} href="/guide" aria-label="Teljes Útmutató megnyitása">
            <span aria-hidden="true">›</span>
          </Link>
        </article>
      </section>
    </section>
  );
}
