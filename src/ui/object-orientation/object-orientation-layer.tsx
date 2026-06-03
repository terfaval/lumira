"use client";

import Link from "next/link";
import { useState } from "react";

import type { ObjectOrientationPayload } from "@/src/reflective-space/composition/compose-object-orientation-payload";
import {
  filterOrientationOpenings,
  type OrientationStackView,
} from "@/src/ui/object-orientation/view-model";

import styles from "@/src/ui/object-orientation/object-orientation-layer.module.css";

interface ObjectOrientationLayerProps {
  payload: ObjectOrientationPayload;
}

type GlossaryItem = ObjectOrientationPayload["glossary"]["items"][number];

const STACK_TABS: Array<{ key: Exclude<OrientationStackView, "dormant">; label: string }> = [
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
];

function toStateLabel(view: OrientationStackView): string {
  switch (view) {
    case "new":
      return "New";
    case "active":
      return "Active";
    case "dormant":
      return "Dormant";
    default:
      return "All";
  }
}

export function ObjectOrientationLayer({ payload }: ObjectOrientationLayerProps) {
  const [selectedView, setSelectedView] = useState<OrientationStackView>(payload.openingStack.defaultView);
  const [selectedGlossaryItem, setSelectedGlossaryItem] = useState<GlossaryItem | null>(null);
  const [pendingOpeningId, setPendingOpeningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleOpenings = filterOrientationOpenings(payload.openingStack.items, selectedView);

  async function handleEnterOpening(openingId: string, href: string, state: OrientationStackView) {
    setPendingOpeningId(openingId);
    setFeedback(null);

    try {
      if (state === "new") {
        const response = await fetch(`/api/openings/${openingId}/activate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "reflective_space_surface" }),
        });

        if (!response.ok) {
          throw new Error("Opening activation failed.");
        }
      }

      if (state === "dormant") {
        const response = await fetch(`/api/openings/${openingId}/reactivate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ source: "reflective_space_surface" }),
        });

        if (!response.ok) {
          throw new Error("Opening reactivation failed.");
        }
      }

      window.location.assign(href);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "This opening could not be entered yet.");
      setPendingOpeningId(null);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.layout}>
        <article className={styles.dreamSurface}>
          <p className={styles.eyebrow}>Orientation Layer</p>
          <div className={styles.dreamHeading}>
            <h1>{payload.dream.title}</h1>
            <Link className={styles.dreamLink} href={payload.dream.editHref}>
              Edit in Deep Reflection
            </Link>
          </div>
          <p className={styles.dreamText}>{payload.dream.preview}</p>
          <p className={styles.dreamNote}>
            Stay with the dream first. The openings and continuity surfaces remain nearby until you decide to deepen.
          </p>
        </article>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Glossary</h2>
            <p>Recognized elements already present in this dream.</p>
          </div>
          {payload.glossary.items.length > 0 ? (
            <ul className={styles.glossaryList}>
              {payload.glossary.items.map((item) => (
                <li key={`${item.category}-${item.label}`}>
                  <button type="button" className={styles.glossaryButton} onClick={() => setSelectedGlossaryItem(item)}>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>Recognized elements will gather here as the dream is observed.</p>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Thread Overview</h2>
            <p>Continuity state at a glance.</p>
          </div>
          <ul className={styles.stateList}>
            {payload.threadOverview.map((item) => {
              const active = selectedView === item.state;

              return (
                <li key={item.state}>
                  <button
                    type="button"
                    className={`${styles.stateButton} ${active ? styles.stateButtonActive : ""}`}
                    onClick={() => setSelectedView(item.state)}
                  >
                    <span>
                      <strong>{toStateLabel(item.state)}</strong>
                      <span>Filter openings through this continuity state.</span>
                    </span>
                    <span className={styles.countBadge}>{item.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel}>
          <div className={styles.stackHeader}>
            <h2>Opening Stack</h2>
            <p>Available reflective directions before deeper work begins.</p>
            <ul className={styles.tabList}>
              {STACK_TABS.map((tab) => (
                <li key={tab.key}>
                  <button
                    type="button"
                    className={`${styles.tabButton} ${selectedView === tab.key ? styles.tabButtonActive : ""}`}
                    aria-pressed={selectedView === tab.key}
                    onClick={() => setSelectedView(tab.key)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {feedback ? <p className={styles.feedback}>{feedback}</p> : null}

          {visibleOpenings.length > 0 ? (
            <ul className={styles.openingList}>
              {visibleOpenings.map((item) => (
                <li key={item.id} className={styles.openingCard}>
                  <strong>{item.title}</strong>
                  <span className={styles.openingMeta}>
                    {toStateLabel(item.state)} • {item.kind.replaceAll("_", " ")} • {item.tone} tone
                  </span>
                  <p className={styles.openingBody}>{item.title}</p>
                  <button
                    type="button"
                    className={styles.openingAction}
                    disabled={pendingOpeningId === item.id}
                    onClick={() => void handleEnterOpening(item.id, item.href, item.state)}
                  >
                    {pendingOpeningId === item.id ? "Preparing..." : item.ctaLabel}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyState}>
              {selectedView === "dormant"
                ? "No dormant openings are waiting right now."
                : "No openings are visible in this view right now."}
            </p>
          )}
        </section>
      </div>

      {selectedGlossaryItem ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setSelectedGlossaryItem(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="orientation-glossary-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id="orientation-glossary-title">{selectedGlossaryItem.label}</h3>
            <p>{selectedGlossaryItem.detail}</p>
            <p>This glossary surface is intentionally light here. Deeper editing remains in the broader glossary flow.</p>
            <div className={styles.modalActions}>
              <Link href="/glossary">Open Glossary</Link>
              <button type="button" onClick={() => setSelectedGlossaryItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
