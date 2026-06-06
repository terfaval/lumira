"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

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
  { key: "new", label: "Új" },
  { key: "active", label: "Aktív" },
  { key: "all", label: "Mind" },
];

function toStateLabel(view: OrientationStackView): string {
  switch (view) {
    case "new":
      return "Új";
    case "active":
      return "Aktív";
    case "dormant":
      return "Szunnyadó";
    default:
      return "Mind";
  }
}

export function ObjectOrientationLayer({ payload }: ObjectOrientationLayerProps) {
  const [selectedView, setSelectedView] = useState<OrientationStackView>(payload.openingStack.defaultView);
  const [selectedGlossaryItem, setSelectedGlossaryItem] = useState<GlossaryItem | null>(null);
  const [pendingOpeningId, setPendingOpeningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [dreamTitle, setDreamTitle] = useState(payload.dream.title);
  const [titleDraft, setTitleDraft] = useState(payload.dream.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleFeedback, setTitleFeedback] = useState<string | null>(null);
  const [isSavingTitle, startSavingTitle] = useTransition();

  const visibleOpenings = filterOrientationOpenings(payload.openingStack.items, selectedView);

  useEffect(() => {
    setDreamTitle(payload.dream.title);
    setTitleDraft(payload.dream.title);
    setIsEditingTitle(false);
    setTitleFeedback(null);
  }, [payload.dream.title]);

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

  function handleStartTitleEdit() {
    setTitleDraft(dreamTitle);
    setTitleFeedback(null);
    setIsEditingTitle(true);
  }

  function handleCancelTitleEdit() {
    setTitleDraft(dreamTitle);
    setTitleFeedback(null);
    setIsEditingTitle(false);
  }

  async function handleSaveTitle() {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleFeedback("Adj egy rövid címet az álomnak.");
      return;
    }

    setTitleFeedback(null);
    startSavingTitle(async () => {
      try {
        const response = await fetch(`/api/reflective-objects/${payload.dream.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: nextTitle }),
        });

        const body = (await response.json()) as { error?: string; reflectiveObject?: { title?: string } };
        if (!response.ok) {
          throw new Error(body.error ?? "A cím mentése nem sikerült.");
        }

        const savedTitle = body.reflectiveObject?.title?.trim() || nextTitle;
        setDreamTitle(savedTitle);
        setTitleDraft(savedTitle);
        setIsEditingTitle(false);
      } catch (error) {
        setTitleFeedback(error instanceof Error ? error.message : "A cím mentése nem sikerült.");
      }
    });
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      handleCancelTitleEdit();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      void handleSaveTitle();
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.layout}>
        <section className={styles.topRow}>
          <article className={styles.dreamSurface}>
            <div className={styles.dreamFrame}>
              <div className={styles.dreamHeader}>
                <div className={styles.panelTitleBlock}>
                  {isEditingTitle ? (
                    <>
                      <input
                        aria-label="Álom címének szerkesztése"
                        className={styles.titleInput}
                        value={titleDraft}
                        onChange={(event) => setTitleDraft(event.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        autoFocus
                        maxLength={80}
                      />
                      {titleFeedback ? <p className={styles.titleFeedback}>{titleFeedback}</p> : null}
                    </>
                  ) : (
                    <h1>{dreamTitle}</h1>
                  )}
                </div>

                <div className={styles.titleActions}>
                  {isEditingTitle ? (
                    <>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Cím mentése"
                        onClick={() => void handleSaveTitle()}
                        disabled={isSavingTitle}
                      >
                        <span aria-hidden="true">✓</span>
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="Cím szerkesztésének megszakítása"
                        onClick={handleCancelTitleEdit}
                        disabled={isSavingTitle}
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label="Cím szerkesztése"
                      onClick={handleStartTitleEdit}
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.dreamBody}>
                <p className={styles.dreamText}>{payload.dream.preview}</p>
              </div>
            </div>
          </article>

          <div className={styles.signalColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <p className={styles.panelLabel}>Jelzések</p>
              </div>
              <p className={styles.placeholderText}>Hamarosan.</p>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <p className={styles.panelLabel}>Érzelmi tér</p>
              </div>
              <p className={styles.placeholderText}>Hamarosan.</p>
            </section>
          </div>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Álomszótár</p>
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
              <p className={styles.emptyState}>Még nincs visszatérő motívum.</p>
            )}
          </section>
        </section>

        <section className={styles.bottomRow}>
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Szálak</p>
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
                      <span className={styles.stateCopy}>
                        <strong>{toStateLabel(item.state)}</strong>
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
              <p className={styles.panelLabel}>Megnyitások</p>
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
                      {toStateLabel(item.state)} • {item.kind.replaceAll("_", " ")}
                    </span>
                    <button
                      type="button"
                      className={styles.openingAction}
                      disabled={pendingOpeningId === item.id}
                      onClick={() => void handleEnterOpening(item.id, item.href, item.state)}
                    >
                      {pendingOpeningId === item.id ? "Előkészítés..." : item.ctaLabel}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyState}>
                {selectedView === "dormant" ? "Nincs szunnyadó megnyitás." : "Ebben a nézetben nincs megnyitás."}
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <p className={styles.panelLabel}>Jegyzetek</p>
            </div>
            <p className={styles.placeholderText}>Hamarosan.</p>
          </section>
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
            <div className={styles.modalActions}>
              <Link href="/glossary">Álomszótár megnyitása</Link>
              <button type="button" onClick={() => setSelectedGlossaryItem(null)}>
                Bezárás
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
