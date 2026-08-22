"use client";

import { ChevronLeft, Info, X } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import type { FortuneCard, TarotModeDefinition } from "@/src/content/fortune-journaling";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { FortuneSession } from "@/src/domain/fortune-sessions/types";
import { getFortuneCardArtworkPath } from "@/src/features/fortune-journaling/artwork";
import {
  createPersistedFortuneSessionSnapshot,
  hydrateLocalFortuneSession,
  type LocalFortuneCompletedSession,
  type LocalFortuneSession,
} from "@/src/features/fortune-journaling/session";
import {
  getDrawInstruction,
  getHeaderLeftControl,
  toggleDrawCardSelection,
  type FortuneHeaderLeftStage,
} from "@/src/features/fortune-journaling/draw-state";
import styles from "@/src/features/fortune-journaling/fortune-journaling-page-client.module.css";

interface FortuneJournalingPageClientProps {
  deck: FortuneCard[];
  modes: TarotModeDefinition[];
  initialMode: TarotModeDefinition | null;
  initialSession: FortuneSession | null;
  initialTurns: FortuneSessionTurn[];
  recoveryError: string | null;
}

type SessionState = LocalFortuneSession | LocalFortuneCompletedSession | null;

type ModeGroup = {
  cardCount: number;
  modes: TarotModeDefinition[];
};

type ModeInfoPlacement = "to-left" | "to-right";

const PAGE_INFO_TITLE = "Mi az a Fortune Journaling?";

const PAGE_INFO_COPY = {
  intro:
    "A tarotot hagyományosan gyakran jóslásra használják: a lapoktól valamiféle választ, iránymutatást vagy előrejelzést várnak.",
  contrast: "A Fortune Journalingban más szerepet kap.",
  reflectiveOne:
    "Itt a kártyák nem mondják meg, mi történik veled, és nem adnak kész értelmezést. Inkább képeket, helyzeteket és nézőpontokat tesznek eléd, amelyek új asszociációkat indíthatnak el.",
  reflectiveTwo:
    "Egy lapban észrevehetsz valamit, ami elsőre nem jutott volna eszedbe. Egy vetés két külön oldalát mutathatja meg ugyanannak a helyzetnek. Egy szokatlan kép pedig segíthet egy kicsit másképp ránézni arra, amin már régóta gondolkodsz.",
  quote:
    "Nem az a kérdés, hogy „mit mondanak a lapok?”, hanem hogy „mit veszek észre én, amikor rájuk nézek?”",
  nextOne:
    "Válassz egy vetést ahhoz, amire most szeretnél ránézni, húzd ki a lapokat, majd figyeld meg, milyen gondolatokat, érzéseket vagy kapcsolatokat indítanak el benned.",
  nextTwo: "A Lumira később kérdésekkel segít továbbvinni azt, amit te kezdtél el észrevenni.",
} as const;

function deriveInitialSession(
  initialSession: FortuneSession | null,
  initialTurns: FortuneSessionTurn[],
  deck: FortuneCard[],
  initialMode: TarotModeDefinition | null,
): { session: SessionState; error: string | null; interpretation: string; reflectiveReply: string } {
  if (!initialSession || !initialMode) {
    return { session: null, error: null, interpretation: "", reflectiveReply: "" };
  }

  try {
    const hydrated = hydrateLocalFortuneSession({
      persistedSession: initialSession,
      persistedTurns: initialTurns,
      deck,
      mode: initialMode,
    });

    return {
      session: hydrated,
      error: null,
      interpretation: hydrated.interpretation ?? "",
      reflectiveReply: hydrated.reflectiveReply ?? "",
    };
  } catch {
    return {
      session: null,
      error: "A Fortune session mentett állapota nem tölthető vissza biztonságosan.",
      interpretation: "",
      reflectiveReply: "",
    };
  }
}

function getModeGroupTitle(cardCount: number): string {
  return `${cardCount} LAPOS`;
}

function toFanCardStyle(index: number, total: number): CSSProperties {
  const midpoint = (total - 1) / 2;
  const delta = index - midpoint;
  const spread = delta * 1.08;
  const rotation = delta * 4.9;
  const lift = Math.pow(Math.abs(delta), 1.42) * 4.8;

  return {
    "--fan-offset": `${spread}rem`,
    "--fan-rotation": `${rotation}deg`,
    "--fan-lift": `${lift}px`,
    zIndex: total - index,
  } as CSSProperties;
}

function getDesktopGroupColumns(cardCount: number): 1 | 2 {
  return cardCount === 3 ? 2 : 1;
}

function getModeInfoPlacement(cardCount: number, index: number): ModeInfoPlacement {
  if (cardCount === 2) {
    return "to-right";
  }

  if (cardCount === 4) {
    return "to-left";
  }

  return index % 2 === 0 ? "to-right" : "to-left";
}

function FortuneTopControls({
  leftControlLabel,
  onLeftControl,
  isPageInfoOpen,
  onPageInfoToggle,
  onPageInfoClose,
}: {
  leftControlLabel: string;
  onLeftControl: () => void;
  isPageInfoOpen: boolean;
  onPageInfoToggle: () => void;
  onPageInfoClose: () => void;
}) {
  return (
    <div className={styles.topControls}>
      <button className={styles.backLink} type="button" aria-label={leftControlLabel} onClick={onLeftControl}>
        <ChevronLeft className={styles.backIcon} aria-hidden="true" strokeWidth={1.9} />
      </button>

      <div className={styles.pageInfoWrap}>
        <button
          className={styles.pageInfoButton}
          type="button"
          aria-label={PAGE_INFO_TITLE}
          aria-expanded={isPageInfoOpen}
          onClick={onPageInfoToggle}
        >
          <Info className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.9} />
        </button>

        {isPageInfoOpen ? (
          <section className={styles.pageInfoPanel} role="dialog" aria-label={PAGE_INFO_TITLE}>
            <div className={styles.infoPanelHeader}>
              <h2>{PAGE_INFO_TITLE}</h2>
              <button className={styles.infoCloseButton} type="button" aria-label="Bezárás" onClick={onPageInfoClose}>
                <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.pageInfoContent}>
              <section className={styles.pageInfoSection}>
                <p>{PAGE_INFO_COPY.intro}</p>
                <p className={styles.pageInfoStatement}>{PAGE_INFO_COPY.contrast}</p>
              </section>

              <section className={styles.pageInfoSection}>
                <p>{PAGE_INFO_COPY.reflectiveOne}</p>
                <p>{PAGE_INFO_COPY.reflectiveTwo}</p>
              </section>

              <blockquote className={styles.pageInfoQuote}>{PAGE_INFO_COPY.quote}</blockquote>

              <section className={styles.pageInfoSection}>
                <p>{PAGE_INFO_COPY.nextOne}</p>
                <p>{PAGE_INFO_COPY.nextTwo}</p>
              </section>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function FortuneStepHeader({
  step,
  instruction,
  supportingCopy,
}: {
  step: string;
  instruction: string;
  supportingCopy?: string | null;
}) {
  return (
    <header className={styles.stepHeader}>
      <div className={styles.stepHeaderCenter}>
        <p className={styles.stepLabel}>{step}</p>
        <h2 className={styles.stepInstruction}>{instruction}</h2>
        {supportingCopy ? <p className={styles.stepSupportingCopy}>{supportingCopy}</p> : null}
      </div>
    </header>
  );
}

export default function FortuneJournalingPageClient({
  deck,
  modes,
  initialMode,
  initialSession,
  initialTurns,
  recoveryError,
}: FortuneJournalingPageClientProps) {
  const initialState = deriveInitialSession(initialSession, initialTurns, deck, initialMode);
  const [session, setSession] = useState<SessionState>(initialState.session);
  const [drawMode, setDrawMode] = useState<TarotModeDefinition | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [openInfoModeId, setOpenInfoModeId] = useState<string | null>(null);
  const [isPageInfoOpen, setIsPageInfoOpen] = useState(false);
  const [reflectiveReply, setReflectiveReply] = useState(initialState.reflectiveReply);
  const [reflectiveReplyError, setReflectiveReplyError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(recoveryError ?? initialState.error);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuingFromRestingPoint, setIsContinuingFromRestingPoint] = useState(false);
  const [artworkFailures, setArtworkFailures] = useState<Record<string, true>>({});

  const groupedModes = useMemo<ModeGroup[]>(() => {
    const grouped = new Map<number, TarotModeDefinition[]>();

    for (const mode of modes) {
      const current = grouped.get(mode.card_count) ?? [];
      current.push(mode);
      grouped.set(mode.card_count, current);
    }

    return [2, 3, 4]
      .map((cardCount) => ({
        cardCount,
        modes: grouped.get(cardCount) ?? [],
      }))
      .filter((entry) => entry.modes.length > 0);
  }, [modes]);

  const openModeInfo = useMemo(() => {
    if (!openInfoModeId) {
      return null;
    }

    for (const group of groupedModes) {
      const index = group.modes.findIndex((mode) => mode.id === openInfoModeId);
      if (index !== -1) {
        return {
          mode: group.modes[index],
          placement: getModeInfoPlacement(group.cardCount, index),
        };
      }
    }

    return null;
  }, [groupedModes, openInfoModeId]);

  const isLibraryState = !session && !drawMode;
  const isDrawState = !session && Boolean(drawMode);

  function clearLocalDrawState() {
    setDrawMode(null);
    setSelectedCardIds([]);
    setRequestError(null);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
  }

  async function requestAssistantTurn(baseSession: LocalFortuneSession): Promise<void> {
    if (!baseSession.sessionId) {
      return;
    }

    const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(baseSession.sessionId)}/facilitator-turn`, {
      method: "POST",
    });
    const payload = (await response.json()) as {
      error?: string;
      session?: FortuneSession | null;
      turn?: FortuneSessionTurn;
    };

    if (!response.ok || !payload.turn) {
      if (payload.session) {
        setSession(
          hydrateLocalFortuneSession({
            persistedSession: payload.session,
            persistedTurns: baseSession.turns,
            deck,
            mode: baseSession.mode,
          }),
        );
      } else {
        setSession(baseSession);
      }

      throw new Error(payload.error ?? "A reflektív kérdés most nem érhető el. Próbáld újra.");
    }

    setSession(
      hydrateLocalFortuneSession({
        persistedSession: createPersistedFortuneSessionSnapshot(baseSession, baseSession.mode.id),
        persistedTurns: [...baseSession.turns, payload.turn],
        deck,
        mode: baseSession.mode,
      }),
    );
    setReflectiveReply("");
    setIsContinuingFromRestingPoint(false);
  }

  async function persistSelectedSpread(mode: TarotModeDefinition, nextSelectedCardIds: string[]) {
    const response = await fetch("/api/fortune/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modeId: mode.id,
        selectedCardIds: nextSelectedCardIds,
      }),
    });

    const payload = (await response.json()) as { error?: string; session?: FortuneSession };
    if (!response.ok || !payload.session) {
      throw new Error(payload.error ?? "A Fortune session nem indítható el most.");
    }

    const nextSession = hydrateLocalFortuneSession({
      persistedSession: payload.session,
      persistedTurns: [],
      deck,
      mode,
    });

    setSession(nextSession);
    setDrawMode(null);
    setSelectedCardIds([]);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/fortune?session=${encodeURIComponent(payload.session.id)}`);
    }
  }

  function handleModeStart(mode: TarotModeDefinition) {
    setDrawMode(mode);
    setSelectedCardIds([]);
    setSession(null);
    setRequestError(null);
    setReflectiveReply("");
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
  }

  function handleHeaderLeftAction() {
    if (isLibraryState) {
      window.location.assign("/");
      return;
    }

    if (isDrawState) {
      clearLocalDrawState();
      return;
    }

    setSession(null);
    setDrawMode(null);
    setSelectedCardIds([]);
    setReflectiveReply("");
    setReflectiveReplyError(null);
    setRequestError(null);
    setIsContinuingFromRestingPoint(false);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    window.history.replaceState(null, "", "/fortune");
  }

  async function handleDrawCardSelect(cardId: string) {
    if (!drawMode || isSubmitting) {
      return;
    }

    const nextSelection = toggleDrawCardSelection({
      selectedCardIds,
      cardId,
      cardCount: drawMode.card_count,
    });

    if (!nextSelection.didChange) {
      return;
    }

    setSelectedCardIds(nextSelection.selectedCardIds);
    setRequestError(null);

    if (!nextSelection.shouldPersist) {
      return;
    }

    setIsSubmitting(true);

    try {
      await persistSelectedSpread(drawMode, nextSelection.selectedCardIds);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A Fortune session nem indítható el most.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestFacilitatorTurn() {
    if (!session || session.stage !== "ready-for-next-round" || !session.sessionId) {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      await requestAssistantTurn(session);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A reflektív kérdés most nem érhető el. Próbáld újra.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReflectiveReplySubmit() {
    if (
      !session ||
      !session.sessionId ||
      (session.stage !== "awaiting-reply" &&
        !(session.stage === "awaiting-resting-choice" && isContinuingFromRestingPoint))
    ) {
      return;
    }

    setReflectiveReplyError(null);
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const content = reflectiveReply.trim();
      if (!content) {
        setReflectiveReplyError("A reflective reply is required.");
        return;
      }

      const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(session.sessionId)}/reflective-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const payload = (await response.json()) as { error?: string; session?: FortuneSession; turn?: FortuneSessionTurn };
      if (!response.ok || !payload.session || !payload.turn) {
        throw new Error(payload.error ?? "A válasz most nem menthető.");
      }

      const afterReply = hydrateLocalFortuneSession({
        persistedSession: payload.session,
        persistedTurns: [...session.turns, payload.turn],
        deck,
        mode: session.mode,
      });

      setSession(afterReply);
      setReflectiveReply(content);

      if (afterReply.stage === "ready-for-next-round") {
        await requestAssistantTurn(afterReply);
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A válasz most nem menthető.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePause() {
    if (!session || !session.sessionId || session.stage === "complete") {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(session.sessionId)}/pause`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; session?: FortuneSession };
      if (!response.ok || !payload.session) {
        throw new Error(payload.error ?? "A session most nem állítható meg.");
      }

      setSession(
        hydrateLocalFortuneSession({
          persistedSession: payload.session,
          persistedTurns: session.turns,
          deck,
          mode: session.mode,
        }),
      );
      setIsContinuingFromRestingPoint(false);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A session most nem állítható meg.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResume() {
    if (!session || !session.sessionId || session.stage !== "paused") {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(session.sessionId)}/resume`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; session?: FortuneSession };
      if (!response.ok || !payload.session) {
        throw new Error(payload.error ?? "A session most nem folytatható.");
      }

      setSession(
        hydrateLocalFortuneSession({
          persistedSession: payload.session,
          persistedTurns: session.turns,
          deck,
          mode: session.mode,
        }),
      );
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A session most nem folytatható.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleComplete() {
    if (!session || !session.sessionId || session.stage === "complete") {
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(session.sessionId)}/complete`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string; session?: FortuneSession };
      if (!response.ok || !payload.session) {
        throw new Error(payload.error ?? "A session most nem zárható le.");
      }

      setSession(
        hydrateLocalFortuneSession({
          persistedSession: payload.session,
          persistedTurns: session.turns,
          deck,
          mode: session.mode,
        }),
      );
      setIsContinuingFromRestingPoint(false);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A session most nem zárható le.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const latestAssistantQuestion =
    session?.latestAssistantTurn?.mode === "question" ? session.latestAssistantTurn.question : null;

  const activeHeader = isLibraryState
    ? { step: "I. LÉPÉS", instruction: "Válaszd ki a vetés célját!", supportingCopy: null }
    : isDrawState && drawMode
      ? {
          step: "II. LÉPÉS",
          instruction: getDrawInstruction(drawMode.card_count, selectedCardIds.length),
          supportingCopy: drawMode.library.orientation,
        }
      : session
        ? { step: "III. LÉPÉS", instruction: "Nézd meg, mi került eléd", supportingCopy: null }
        : null;
  const headerLeftStage: FortuneHeaderLeftStage = isLibraryState
    ? "library"
    : isDrawState
      ? "draw"
      : session?.stage ?? "spread";
  const headerLeftControl = getHeaderLeftControl(headerLeftStage);

  return (
    <main
      className={`${styles.page} ${isLibraryState ? styles.pageLibraryLocked : ""}`}
      data-layout-mode={isDrawState ? "draw" : "default"}
    >
      <div className={styles.shell}>
        {activeHeader ? (
          <>
            <FortuneTopControls
              leftControlLabel={headerLeftControl.ariaLabel}
              onLeftControl={handleHeaderLeftAction}
              isPageInfoOpen={isPageInfoOpen}
              onPageInfoToggle={() => {
                setOpenInfoModeId(null);
                setIsPageInfoOpen((current) => !current);
              }}
              onPageInfoClose={() => setIsPageInfoOpen(false)}
            />
            <FortuneStepHeader
              step={activeHeader.step}
              instruction={activeHeader.instruction}
              supportingCopy={activeHeader.supportingCopy}
            />
          </>
        ) : null}

        {isLibraryState ? (
          <section className={styles.librarySurface} data-mode-info-surface={openInfoModeId ? "open" : "closed"}>
            {requestError ? <p className={styles.error}>{requestError}</p> : null}

            <div className={styles.libraryViewport}>
              <div className={styles.libraryGroups}>
                {groupedModes.map((group) => (
                  <section
                    className={`${styles.libraryGroup} ${styles[`group${group.cardCount}` as const]}`}
                    data-card-count={group.cardCount}
                    key={group.cardCount}
                  >
                    <div className={styles.libraryGroupHeader}>
                      <h2>{getModeGroupTitle(group.cardCount)}</h2>
                    </div>

                    <div
                      className={styles.libraryTileGrid}
                      style={{ "--group-columns": getDesktopGroupColumns(group.cardCount) } as CSSProperties}
                    >
                      {group.modes.map((mode) => {
                        const isInfoOpen = openInfoModeId === mode.id;

                        return (
                          <article className={styles.libraryTile} key={mode.id}>
                            <button className={styles.libraryTileButton} type="button" onClick={() => handleModeStart(mode)}>
                              <span className={styles.libraryCount} aria-hidden="true">
                                {Array.from({ length: mode.card_count }).map((_, countIndex) => (
                                  <span className={styles.libraryCountCard} key={`${mode.id}-count-${countIndex}`} />
                                ))}
                              </span>
                              <h3>{mode.name}</h3>
                            </button>

                            <button
                              className={styles.infoIconButton}
                              type="button"
                              aria-label={`${mode.name} információ`}
                              aria-expanded={isInfoOpen}
                              onClick={(event) => {
                                event.stopPropagation();
                                setIsPageInfoOpen(false);
                                setOpenInfoModeId((current) => (current === mode.id ? null : mode.id));
                              }}
                            >
                              <Info className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.9} />
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              {openModeInfo ? (
                <section
                  className={`${styles.modeInfoPanel} ${
                    openModeInfo.placement === "to-right" ? styles.modeInfoPanelRight : styles.modeInfoPanelLeft
                  }`}
                  role="dialog"
                  aria-label={`${openModeInfo.mode.name} részletek`}
                >
                  <div className={styles.modeInfoContent}>
                    <div className={styles.infoPanelHeader}>
                      <h2>{openModeInfo.mode.name}</h2>
                      <button
                        className={styles.infoCloseButton}
                        type="button"
                        aria-label="Bezárás"
                        onClick={() => setOpenInfoModeId(null)}
                      >
                        <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
                      </button>
                    </div>
                    <p>{openModeInfo.mode.library.description}</p>
                    <div className={styles.infoUseWhen}>
                      <p className={styles.infoUseWhenTitle}>Akkor lehet hasznos, ha…</p>
                      <ul className={styles.infoList}>
                        {openModeInfo.mode.library.use_when.map((entry) => (
                          <li key={entry}>{entry}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={styles.modeInfoSpacer} aria-hidden="true" />
                  <button className={styles.primaryButton} type="button" onClick={() => handleModeStart(openModeInfo.mode)}>
                    Vetés indítása
                  </button>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        {!session && drawMode ? (
          <section className={styles.drawSurface}>
            <div className={styles.drawDeck} data-card-count={drawMode.card_count}>
              {deck.map((card, index) => {
                const isSelected = selectedCardIds.includes(card.id);

                return (
                  <button
                    className={styles.drawCard}
                    data-selected={isSelected ? "true" : "false"}
                    key={card.id}
                    type="button"
                    onClick={() => void handleDrawCardSelect(card.id)}
                    disabled={isSubmitting}
                    style={toFanCardStyle(index, deck.length)}
                    aria-label="Lefordított kártya"
                  >
                    <span className={styles.drawCardBack} aria-hidden="true">
                      <Image
                        className={styles.drawCardBackImage}
                        src="/fortune-journaling/card-back.png"
                        alt=""
                        width={500}
                        height={700}
                        unoptimized
                      />
                    </span>
                  </button>
                );
              })}
            </div>

            {requestError ? <p className={styles.error}>{requestError}</p> : null}
          </section>
        ) : null}

        {session?.stage === "spread" ? (
          <section className={styles.spreadSurface}>
            <div className={styles.spreadGrid} data-card-count={session.cards.length}>
              {session.cards.map((entry) => (
                <article className={styles.spreadCard} key={`${entry.position.key}-${entry.card.id}`}>
                  <span className={styles.positionLabel}>{entry.position.label}</span>
                  <div className={styles.spreadArtworkFrame}>
                    {artworkFailures[entry.card.id] ? (
                      <div className={styles.cardPlaceholder}>
                        <span className={styles.cardPlaceholderGlyph}>◵</span>
                        <span className={styles.cardPlaceholderText}>Illusztráció hamarosan</span>
                      </div>
                    ) : (
                      <Image
                        className={styles.spreadArtwork}
                        src={getFortuneCardArtworkPath(entry.card)}
                        alt={entry.card.name_hu}
                        width={500}
                        height={700}
                        unoptimized
                        onError={() =>
                          setArtworkFailures((current) =>
                            current[entry.card.id] ? current : { ...current, [entry.card.id]: true },
                          )
                        }
                      />
                    )}
                  </div>
                  <h3 className={styles.spreadCardName}>{entry.card.name_hu}</h3>
                </article>
              ))}
            </div>

            <div className={styles.transitionCta}>
              <button className={styles.primaryButton} type="button">
                Mondd el, mit látsz benne
              </button>
            </div>
          </section>
        ) : null}

        {session?.stage === "ready-for-next-round" ? (
          <section className={styles.panel}>
            <h2>Reflektív kérdés</h2>
            <p className={styles.subtle}>A saját első értésed után innen kérhetsz új mélyítő visszatükrözést.</p>
            {session.reflectiveReply ? <p className={styles.subtle}>Legutóbbi válaszod: {session.reflectiveReply}</p> : null}
            {requestError ? <p className={styles.error}>{requestError}</p> : null}
            <div className={styles.ctaRow}>
              <button className={styles.primaryButton} type="button" onClick={handleRequestFacilitatorTurn} disabled={isSubmitting}>
                Reflektív kérdés kérése
              </button>
              <button className={styles.secondaryButton} type="button" onClick={handlePause} disabled={isSubmitting}>
                Pause
              </button>
              <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                Complete
              </button>
            </div>
          </section>
        ) : null}

        {session?.stage === "awaiting-reply" && session.latestAssistantTurn?.mode === "question" ? (
          <section className={styles.panel}>
            <h2>Reflektív mélyítés</h2>
            <p>{session.latestAssistantTurn.reflection}</p>
            <p>{session.latestAssistantTurn.question}</p>
            <div className={styles.interpretationForm}>
              <textarea
                className={styles.textarea}
                name="fortune-reflective-reply"
                value={reflectiveReply}
                onChange={(event) => setReflectiveReply(event.target.value)}
                placeholder="Írj néhány mondatot arról, mi mozdul most benned."
                disabled={isSubmitting}
              />
              {reflectiveReplyError ? <p className={styles.error}>{reflectiveReplyError}</p> : null}
              {requestError ? <p className={styles.error}>{requestError}</p> : null}
              <div className={styles.ctaRow}>
                <button className={styles.primaryButton} type="button" onClick={handleReflectiveReplySubmit} disabled={isSubmitting}>
                  Válasz mentése
                </button>
                <button className={styles.secondaryButton} type="button" onClick={handlePause} disabled={isSubmitting}>
                  Pause
                </button>
                <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                  Complete
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {session?.stage === "awaiting-resting-choice" && session.latestAssistantTurn?.mode === "resting_point" ? (
          <section className={styles.panel}>
            <h2>Természetes megpihenés</h2>
            <p>{session.latestAssistantTurn.reflection}</p>
            <p className={styles.subtle}>
              Itt megállhatsz, visszatérhetsz később, vagy továbbviheted, ha van még benned valami.
            </p>
            {isContinuingFromRestingPoint ? (
              <div className={styles.interpretationForm}>
                <textarea
                  className={styles.textarea}
                  name="fortune-resting-continue"
                  value={reflectiveReply}
                  onChange={(event) => setReflectiveReply(event.target.value)}
                  placeholder="Van még valami, ami most feljön benned?"
                  disabled={isSubmitting}
                />
                {reflectiveReplyError ? <p className={styles.error}>{reflectiveReplyError}</p> : null}
                {requestError ? <p className={styles.error}>{requestError}</p> : null}
                <div className={styles.ctaRow}>
                  <button className={styles.primaryButton} type="button" onClick={handleReflectiveReplySubmit} disabled={isSubmitting}>
                    Tovább a beszélgetésben
                  </button>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => setIsContinuingFromRestingPoint(false)}
                    disabled={isSubmitting}
                  >
                    Mégse
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.ctaRow}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => {
                    setReflectiveReply("");
                    setIsContinuingFromRestingPoint(true);
                  }}
                  disabled={isSubmitting}
                >
                  Continue
                </button>
                <button className={styles.secondaryButton} type="button" onClick={handlePause} disabled={isSubmitting}>
                  Pause
                </button>
                <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                  Complete
                </button>
              </div>
            )}
          </section>
        ) : null}

        {session?.stage === "paused" ? (
          <section className={styles.panel}>
            <h2>A session szünetel</h2>
            <p className={styles.subtle}>A mentett állapot megmarad. Innen ugyanebből a pontból folytathatod.</p>
            {session.latestAssistantTurn ? <p>{session.latestAssistantTurn.reflection}</p> : null}
            {latestAssistantQuestion ? <p>{latestAssistantQuestion}</p> : null}
            {requestError ? <p className={styles.error}>{requestError}</p> : null}
            <div className={styles.ctaRow}>
              <button className={styles.primaryButton} type="button" onClick={handleResume} disabled={isSubmitting}>
                Resume
              </button>
              <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                Complete
              </button>
            </div>
          </section>
        ) : null}

        {session?.stage === "complete" ? (
          <section className={styles.completion}>
            <h2>A Fortune session lezárult</h2>
            {session.latestAssistantTurn ? <p>{session.latestAssistantTurn.reflection}</p> : null}
            {session.latestAssistantTurn?.mode === "question" ? <p>{session.latestAssistantTurn.question}</p> : null}
            {session.reflectiveReply ? <p>{session.reflectiveReply}</p> : null}
            <p className={styles.subtle}>A session lezárása kifejezett user döntéssel történt.</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
