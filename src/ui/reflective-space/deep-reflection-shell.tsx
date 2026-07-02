"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";

import type { DeepReflectionPayload } from "@/src/reflective-space/composition/compose-deep-reflection-payload";

import styles from "@/src/ui/reflective-space/deep-reflection-shell.module.css";

interface DeepReflectionShellProps {
  payload: DeepReflectionPayload;
  reflectiveObjectId: string;
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleString("hu-HU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function localizeEntryRole(role: "opening" | "user" | "assistant") {
  if (role === "opening") {
    return "Megnyitás";
  }

  if (role === "assistant") {
    return "Reflexió";
  }

  return "Te";
}

function localizeSupportCardTitle(kind: DeepReflectionPayload["nearbyContext"]["cards"][number]["kind"], fallback: string) {
  switch (kind) {
    case "supporting_fragment":
      return "Kapcsolódó részlet";
    case "opportunity_structure":
      return "Szerkezeti szál";
    case "motif":
      return "Motívum";
    default:
      return fallback;
  }
}

function localizeOpeningKind(kind: DeepReflectionPayload["alternateOpenings"]["items"][number]["kind"]) {
  switch (kind) {
    case "reflective_question":
      return "Reflektív kérdés";
    case "continuity_noticing":
      return "Folytonossági észlelés";
    case "reflective_recall":
      return "Reflektív felidézés";
    case "atmospheric_reflection":
      return "Hangulati visszhang";
    case "juxtaposition":
      return "Egymás mellé helyezés";
  }
}

export function DeepReflectionShell({ payload, reflectiveObjectId }: DeepReflectionShellProps) {
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAlternateOpeningId, setPendingAlternateOpeningId] = useState<string | null>(null);
  const [isContextOpen, setIsContextOpen] = useState(false);

  const hasNearbyContext = payload.nearbyContext.cards.length > 0;
  const hasAlternateOpenings = payload.alternateOpenings.items.length > 0;
  const hasSupportContext = hasNearbyContext || hasAlternateOpenings;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const responseText = draft.trim();
    if (!responseText || !payload.openingContext.openingId) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/openings/${payload.openingContext.openingId}/responses`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: payload.thread.title,
          responseText,
          threadId: payload.thread.id,
          openingActivationContext: payload.openingContext.activationContext,
          openingResponseContext: "response_authored",
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Ezt most nem sikerült elküldeni.");
      }

      setDraft("");
      window.location.reload();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Ezt most nem sikerült elküldeni.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleOpenAlternate(openingId: string) {
    setPendingAlternateOpeningId(openingId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/openings/${openingId}/select`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: string; href?: string };
      if (!response.ok || !body.href) {
        throw new Error(body.error ?? "Ezt most nem sikerült megnyitni.");
      }

      window.location.assign(body.href);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Ezt most nem sikerült megnyitni.");
      setPendingAlternateOpeningId(null);
    }
  }

  function renderSupportSections() {
    return (
      <>
        {hasNearbyContext ? (
          <section className={styles.railSection}>
            <h2 className={styles.railTitle}>Közeli kontextus</h2>
            <div className={styles.cardList}>
              {payload.nearbyContext.cards.map((card) => (
                <article key={card.id} className={styles.card}>
                  <h3>{localizeSupportCardTitle(card.kind, card.title)}</h3>
                  <p>{card.summary}</p>
                  {card.details.length > 0 ? (
                    <ul className={styles.detailList}>
                      {card.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {hasAlternateOpenings ? (
          <section className={styles.railSection}>
            <h2 className={styles.railTitle}>További megnyitások</h2>
            <div className={styles.cardList}>
              {payload.alternateOpenings.items.map((opening) => (
                <article key={opening.id} className={styles.alternateCard}>
                  <h3>{opening.title}</h3>
                  <p>{localizeOpeningKind(opening.kind)}</p>
                  <button
                    className={styles.alternateButton}
                    type="button"
                    disabled={pendingAlternateOpeningId === opening.id}
                    onClick={() => void handleOpenAlternate(opening.id)}
                  >
                    {pendingAlternateOpeningId === opening.id ? "Megnyitás..." : "Szál megnyitása"}
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={`${styles.frame} ${!hasSupportContext ? styles.frameNoRail : ""}`}>
        <section className={`${styles.workspace} ${!hasSupportContext ? styles.workspaceNoRail : ""}`}>
          <div className={`${styles.surface} ${!hasSupportContext ? styles.surfaceNoRail : ""}`}>
            <Link href={`/objects/${encodeURIComponent(reflectiveObjectId)}`} className={styles.backLink} aria-label="Vissza az orientációhoz">
              <ChevronLeft className={styles.backIcon} aria-hidden="true" strokeWidth={1.9} />
            </Link>

            <div className={`${styles.threadColumn} ${!hasSupportContext ? styles.threadColumnCentered : ""}`}>
              <div className={styles.threadMain}>
                <div className={styles.laneViewport}>
                  <div className={styles.lane}>
                    {payload.dialogue.entries.map((entry) => (
                      <article
                        key={entry.id}
                        className={`${styles.entry} ${
                          entry.role === "opening"
                            ? `${styles.entryOpening} ${styles.entryOpeningLayer} ${styles.entryLead}`
                            : entry.role === "assistant"
                              ? styles.entryAssistant
                              : `${styles.entryUser} ${styles.entryUserLayer} ${styles.entryReply}`
                        }`}
                      >
                        <div className={styles.entryMeta}>
                          <span>{localizeEntryRole(entry.role)}</span>
                          <span>{formatDate(entry.createdAt)}</span>
                        </div>
                        <p className={styles.entryBody}>{entry.text}</p>
                      </article>
                    ))}
                  </div>
                </div>

              {hasSupportContext ? (
                <>
                  <button
                    className={styles.contextToggle}
                    type="button"
                    aria-expanded={isContextOpen}
                    aria-controls="deep-reflection-mobile-context"
                    onClick={() => setIsContextOpen((current) => !current)}
                  >
                    Kontextus
                  </button>
                  <section
                    id="deep-reflection-mobile-context"
                    className={styles.mobileContextPanel}
                    data-open={isContextOpen ? "true" : "false"}
                  >
                    {renderSupportSections()}
                  </section>
                </>
              ) : null}

              <form className={styles.composer} onSubmit={handleSubmit}>
                <div className={styles.composerField}>
                  <textarea
                    id="deep-reflection-response"
                    className={styles.textarea}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Írd le, amit gondolsz..."
                  />
                  <button className={styles.submit} type="submit" aria-label="Küldés" disabled={isSaving || !draft.trim()}>
                    ↑
                  </button>
                </div>
                {feedback ? <p className={styles.feedback}>{feedback}</p> : null}
              </form>
              </div>
            </div>
          </div>
        </section>

        {hasSupportContext ? <aside className={styles.rail}>{renderSupportSections()}</aside> : null}
      </div>
    </main>
  );
}
