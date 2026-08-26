"use client";

import { ArrowUp, ChevronLeft, History, Info, X } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FortuneCard, TarotModeDefinition } from "@/src/content/fortune-journaling";
import type { FortuneSessionTurn } from "@/src/domain/fortune-sessions/turn-types";
import type { FortuneJournalSessionRecord, FortuneSession } from "@/src/domain/fortune-sessions/types";
import { getFortuneCardArtworkPath } from "@/src/features/fortune-journaling/artwork";
import { getFortuneCardInspectInfo } from "@/src/features/fortune-journaling/card-info";
import FortuneJournalView from "@/src/features/fortune-journaling/FortuneJournalView";
import {
  createPersistedFortuneSessionSnapshot,
  hydrateLocalFortuneSession,
  type LocalFortuneCompletedSession,
  type LocalFortuneSession,
  type LocalFortuneSessionCard,
} from "@/src/features/fortune-journaling/session";
import {
  createInitialReflectionFocusSurface,
  deriveReflectionWorkspaceView,
  isReflectionWorkspaceStage,
  openReflectionCardInspect,
  openReflectionHistory,
} from "@/src/features/fortune-journaling/reflection-workspace";
import {
  deriveSpreadTransitionState,
  isFocusLedRoundZeroSession,
  shouldOpenSpreadReflectionWorkspace,
  shouldStartRoundZeroPreGeneration,
} from "@/src/features/fortune-journaling/round-zero-pre-generation";
import {
  getDrawInstruction,
  getHeaderLeftControl,
  toggleDrawCardSelection,
  type FortuneHeaderLeftStage,
} from "@/src/features/fortune-journaling/draw-state";
import { getModeWatermark } from "@/src/features/fortune-journaling/fortune-visuals";
import {
  beginFortunePreSession,
  continueFortunePreSessionToDraw,
  normalizeFortuneFocusDraft,
  returnFortuneDrawToFocus,
  skipFortuneFocusStep,
  type FortunePreSessionState,
} from "@/src/features/fortune-journaling/pre-session-state";
import {
  buildFortuneJournalEntries,
  type FortuneJournalSort,
  type FortuneJournalStatusFilter,
} from "@/src/features/fortune-journaling/journal";
import styles from "@/src/features/fortune-journaling/fortune-journaling-page-client.module.css";

interface FortuneJournalingPageClientProps {
  deck: FortuneCard[];
  modes: TarotModeDefinition[];
  initialLandingView: "library" | "journal";
  initialJournalSessions: FortuneJournalSessionRecord[];
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

export function toFanCardStyle(index: number, total: number): CSSProperties {
  const midpoint = (total - 1) / 2;
  const delta = index - midpoint;
  const direction = Math.sign(delta);
  const normalizedDistance = midpoint === 0 ? 0 : Math.abs(delta) / midpoint;
  const spread = direction * Math.pow(normalizedDistance, 1.04) * 0.34;
  const rotation = direction * Math.pow(normalizedDistance, 1.12) * 26.5;
  const lift = Math.pow(normalizedDistance, 1.42) * 0.34;

  return {
    "--fan-offset": String(spread),
    "--fan-rotation": `${rotation}deg`,
    "--fan-lift": String(lift),
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
  isReflectionWorkspace,
  onReflectionClose,
}: {
  leftControlLabel: string;
  onLeftControl: () => void;
  isPageInfoOpen: boolean;
  onPageInfoToggle: () => void;
  onPageInfoClose: () => void;
  isReflectionWorkspace: boolean;
  onReflectionClose: () => void;
}) {
  return (
    <div className={styles.topControls}>
      {isReflectionWorkspace ? (
        <div className={styles.topControlsSpacer} aria-hidden="true" />
      ) : (
        <button className={styles.backLink} type="button" aria-label={leftControlLabel} onClick={onLeftControl}>
          <ChevronLeft className={styles.backIcon} aria-hidden="true" strokeWidth={1.9} />
        </button>
      )}

      <div className={styles.pageInfoWrap}>
        {isReflectionWorkspace ? (
          <button
            className={styles.workspaceCloseButton}
            type="button"
            aria-label="Fortune Reflection Workspace bezárása"
            onClick={onReflectionClose}
          >
            <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
          </button>
        ) : (
          <button
            className={styles.pageInfoButton}
            type="button"
            aria-label={PAGE_INFO_TITLE}
            aria-expanded={isPageInfoOpen}
            onClick={onPageInfoToggle}
          >
            <Info className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.9} />
          </button>
        )}

        {!isReflectionWorkspace && isPageInfoOpen ? (
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

function formatCardNumber(number: number): string {
  if (number === 0) {
    return "0.";
  }

  const numerals: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];

  let remaining = number;
  let label = "";

  for (const [value, numeral] of numerals) {
    while (remaining >= value) {
      label += numeral;
      remaining -= value;
    }
  }

  return `${label}.`;
}

function parseTranscriptPrompt(content: string): { reflection: string; question: string | null } | null {
  try {
    const parsed = JSON.parse(content) as { reflection?: string; question?: string | null };

    if (typeof parsed.reflection !== "string" || parsed.reflection.trim().length === 0) {
      return null;
    }

    return {
      reflection: parsed.reflection.trim(),
      question: typeof parsed.question === "string" && parsed.question.trim().length > 0 ? parsed.question.trim() : null,
    };
  } catch {
    return null;
  }
}

function FortuneCardInspectOverlay({
  card,
  cardInfo,
  isArtworkMissing,
  isOpen,
  onClose,
  onArtworkError,
}: {
  card: FortuneCard | null;
  cardInfo: ReturnType<typeof getFortuneCardInspectInfo> | null;
  isArtworkMissing: boolean;
  isOpen: boolean;
  onClose: () => void;
  onArtworkError: () => void;
}) {
  return (
    <div className={styles.cardInspectOverlay} data-open={isOpen ? "true" : "false"} aria-hidden={isOpen ? "false" : "true"}>
      <button className={styles.cardInspectBackdrop} type="button" aria-label="Bezárás" onClick={onClose} />

      {card && cardInfo ? (
        <section className={styles.cardInspectDialog} role="dialog" aria-modal="true" aria-label={`${card.name_hu} információ`}>
          <div className={styles.cardInspectCardColumn}>
            <div className={styles.cardInspectArtworkFrame}>
              {isArtworkMissing ? (
                <div className={styles.cardPlaceholder}>
                  <span className={styles.cardPlaceholderGlyph}>◵</span>
                  <span className={styles.cardPlaceholderText}>Illusztráció hamarosan</span>
                </div>
              ) : (
                <Image
                  className={styles.cardInspectArtwork}
                  src={getFortuneCardArtworkPath(card)}
                  alt={card.name_hu}
                  width={500}
                  height={700}
                  unoptimized
                  onError={onArtworkError}
                />
              )}
            </div>
            <h3 className={styles.cardInspectName}>{card.name_hu}</h3>
          </div>

          <section className={styles.cardInspectPanel}>
            <div className={styles.cardInspectPanelHeader}>
              <button className={styles.infoCloseButton} type="button" aria-label="Bezárás" onClick={onClose}>
                <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
              </button>
            </div>

            <div className={styles.cardInspectPanelContent}>
              <div className={styles.cardInspectPanelGroup}>
                <div className={styles.cardInspectPills}>
                  {cardInfo.archetypePills.map((pill) => (
                    <span
                      className={styles.cardInspectPill}
                      key={pill}
                      style={{ "--card-pill-color": cardInfo.tensionTransformHex } as CSSProperties}
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                <p className={styles.cardInspectSummary}>{cardInfo.summary}</p>

                <ul className={styles.cardInspectReadings}>
                  {cardInfo.possibleReadings.map((reading) => (
                    <li key={reading}>{reading}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </section>
      ) : null}
    </div>
  );
}

export default function FortuneJournalingPageClient({
  deck,
  modes,
  initialLandingView,
  initialJournalSessions,
  initialMode,
  initialSession,
  initialTurns,
  recoveryError,
}: FortuneJournalingPageClientProps) {
  const initialState = deriveInitialSession(initialSession, initialTurns, deck, initialMode);
  const initialSpreadSession = initialState.session?.stage === "spread" ? initialState.session : null;
  const [session, setSession] = useState<SessionState>(initialState.session);
  const [landingView, setLandingView] = useState<"library" | "journal">(initialLandingView);
  const [preSession, setPreSession] = useState<FortunePreSessionState | null>(null);
  const [journalSort, setJournalSort] = useState<FortuneJournalSort>("latest");
  const [journalModeFilter, setJournalModeFilter] = useState<string | null>(null);
  const [journalStatusFilter, setJournalStatusFilter] = useState<FortuneJournalStatusFilter | null>(null);
  const [openInfoModeId, setOpenInfoModeId] = useState<string | null>(null);
  const [isPageInfoOpen, setIsPageInfoOpen] = useState(false);
  const [firstInterpretationDraft, setFirstInterpretationDraft] = useState(initialState.interpretation);
  const [firstInterpretationError, setFirstInterpretationError] = useState<string | null>(null);
  const [reflectiveReply, setReflectiveReply] = useState(initialState.reflectiveReply);
  const [reflectiveReplyError, setReflectiveReplyError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(recoveryError ?? initialState.error);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isContinuingFromRestingPoint, setIsContinuingFromRestingPoint] = useState(false);
  const [artworkFailures, setArtworkFailures] = useState<Record<string, true>>({});
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [isCardInfoOpen, setIsCardInfoOpen] = useState(false);
  const [reflectionFocusSurface, setReflectionFocusSurface] = useState(createInitialReflectionFocusSurface);
  const [isSpreadReflectionWorkspaceOpen, setIsSpreadReflectionWorkspaceOpen] = useState(false);
  const [roundZeroPendingSessionId, setRoundZeroPendingSessionId] = useState<string | null>(() =>
    initialSpreadSession && isFocusLedRoundZeroSession(initialSpreadSession) ? initialSpreadSession.sessionId : null,
  );
  const [roundZeroFailedSessionId, setRoundZeroFailedSessionId] = useState<string | null>(null);
  const [roundZeroNavigationIntentSessionId, setRoundZeroNavigationIntentSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(initialState.session?.sessionId ?? null);
  const roundZeroRequestedSessionIdRef = useRef<string | null>(null);
  const reflectionStartedRequestSessionIdRef = useRef<string | null>(null);

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

  const isLibraryState = !session && !preSession && landingView === "library";
  const isJournalState = !session && !preSession && landingView === "journal";
  const isFocusState = !session && preSession?.stage === "focus";
  const isDrawState = !session && preSession?.stage === "draw";
  const selectedCardIds = preSession?.selectedCardIds ?? [];
  const openSpreadReflectionStage =
    session?.stage === "spread" && isSpreadReflectionWorkspaceOpen
      ? session.latestAssistantTurn?.mode === "resting_point"
        ? "awaiting-resting-choice"
        : session.latestAssistantTurn?.mode === "question"
          ? "awaiting-reply"
          : "interpretation"
      : null;
  const reflectionStage =
    openSpreadReflectionStage ??
    (session && isReflectionWorkspaceStage(session.stage)
        ? session.stage
        : null);
  const isReflectionWorkspace = reflectionStage !== null;
  const reflectionSession = session && reflectionStage ? session : null;
  const spreadSession = session?.stage === "spread" ? session : null;
  const reflectionView = reflectionSession && reflectionStage
    ? deriveReflectionWorkspaceView({
        stage: reflectionStage,
        latestAssistantMode: reflectionSession.latestAssistantTurn?.mode ?? null,
        isContinuingFromRestingPoint,
      })
    : null;
  const sessionEntryByCardId = useMemo(() => {
    if (!session) {
      return new Map<string, LocalFortuneSessionCard>();
    }

    return new Map(session.cards.map((entry) => [entry.card.id, entry] as const));
  }, [session]);
  const inspectedSpreadEntry = inspectedCardId ? sessionEntryByCardId.get(inspectedCardId) ?? null : null;
  const inspectedCardInfo = inspectedSpreadEntry ? getFortuneCardInspectInfo(inspectedSpreadEntry.card) : null;
  const reflectionInspectedEntry = reflectionFocusSurface.inspectedCardId
    ? sessionEntryByCardId.get(reflectionFocusSurface.inspectedCardId) ?? null
    : null;
  const reflectionInspectedCardInfo = reflectionInspectedEntry
    ? getFortuneCardInspectInfo(reflectionInspectedEntry.card)
    : null;
  const spreadTransitionState = deriveSpreadTransitionState({
    session: spreadSession,
    sessionIdInFlight: roundZeroPendingSessionId,
    failedSessionId: roundZeroFailedSessionId,
    navigationIntentSessionId: roundZeroNavigationIntentSessionId,
  });
  const journalEntries = useMemo(
    () =>
      buildFortuneJournalEntries({
        sessions: initialJournalSessions,
        modes,
        deck,
        sort: journalSort,
        modeFilter: journalModeFilter,
        statusFilter: journalStatusFilter,
      }),
    [deck, initialJournalSessions, journalModeFilter, journalSort, journalStatusFilter, modes],
  );
  const journalModeOptions = useMemo(
    () => modes.map((mode) => ({ id: mode.id, name: mode.name })),
    [modes],
  );

  useEffect(() => {
    activeSessionIdRef.current = session?.sessionId ?? null;
  }, [session?.sessionId]);

  useEffect(() => {
    if (session?.stage === "spread") {
      return;
    }

    setIsCardInfoOpen(false);
    setInspectedCardId(null);
    setRoundZeroNavigationIntentSessionId(null);
  }, [session?.stage]);

  useEffect(() => {
    if (
      !shouldOpenSpreadReflectionWorkspace({
        session: spreadSession,
        navigationIntentSessionId: roundZeroNavigationIntentSessionId,
      })
    ) {
      return;
    }

    setIsSpreadReflectionWorkspaceOpen(true);
    setRoundZeroNavigationIntentSessionId(null);
  }, [roundZeroNavigationIntentSessionId, spreadSession]);

  useEffect(() => {
    if (isReflectionWorkspace) {
      return;
    }

    setReflectionFocusSurface(createInitialReflectionFocusSurface());
  }, [isReflectionWorkspace]);

  useEffect(() => {
    if (!inspectedCardId) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCardInfoOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectedCardId]);

  useEffect(() => {
    if (isCardInfoOpen || !inspectedCardId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setInspectedCardId(null);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [inspectedCardId, isCardInfoOpen]);

  useEffect(() => {
    if (!isReflectionWorkspace || (!reflectionFocusSurface.historyOpen && !reflectionFocusSurface.isCardInfoOpen)) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setReflectionFocusSurface(createInitialReflectionFocusSurface());
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReflectionWorkspace, reflectionFocusSurface.historyOpen, reflectionFocusSurface.isCardInfoOpen]);

  useEffect(() => {
    if (!isReflectionWorkspace || !session?.sessionId || session.stage === "complete" || session.reflectionStartedAt) {
      return;
    }

    if (reflectionStartedRequestSessionIdRef.current === session.sessionId) {
      return;
    }

    reflectionStartedRequestSessionIdRef.current = session.sessionId;
    let cancelled = false;
    const activeReflectionSessionId = session.sessionId;

    async function markReflectionStarted() {
      try {
        const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(activeReflectionSessionId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reflectionStarted: true }),
        });
        const payload = (await response.json()) as { error?: string; session?: FortuneSession };

        if (!response.ok || !payload.session || cancelled || activeSessionIdRef.current !== activeReflectionSessionId) {
          return;
        }

        setSession((current) => {
          if (!current || current.sessionId !== activeReflectionSessionId || current.stage === "complete") {
            return current;
          }

          return {
            ...current,
            reflectionStartedAt: payload.session?.reflectionStartedAt ?? current.reflectionStartedAt,
          };
        });
      } finally {
        if (reflectionStartedRequestSessionIdRef.current === activeReflectionSessionId) {
          reflectionStartedRequestSessionIdRef.current = null;
        }
      }
    }

    void markReflectionStarted();

    return () => {
      cancelled = true;
    };
  }, [isReflectionWorkspace, session]);

  useEffect(() => {
    if (!spreadSession?.sessionId || roundZeroPendingSessionId !== spreadSession.sessionId) {
      return;
    }

    const pendingSpreadSession = spreadSession;
    let cancelled = false;

    async function preGenerateRoundZero() {
      if (roundZeroRequestedSessionIdRef.current === pendingSpreadSession.sessionId) {
        return;
      }

      roundZeroRequestedSessionIdRef.current = pendingSpreadSession.sessionId;

      try {
        await requestAssistantTurn(pendingSpreadSession);
        if (!cancelled && activeSessionIdRef.current === pendingSpreadSession.sessionId) {
          setRoundZeroFailedSessionId((current) => (current === pendingSpreadSession.sessionId ? null : current));
        }
      } catch (error) {
        if (!cancelled && activeSessionIdRef.current === pendingSpreadSession.sessionId) {
          setRoundZeroFailedSessionId(pendingSpreadSession.sessionId);
          setRequestError(error instanceof Error ? error.message : "A reflektív kérdés most nem érhető el. Próbáld újra.");
        }
      } finally {
        roundZeroRequestedSessionIdRef.current = null;
        if (!cancelled && activeSessionIdRef.current === pendingSpreadSession.sessionId) {
          setRoundZeroPendingSessionId((current) => (current === pendingSpreadSession.sessionId ? null : current));
        }
      }
    }

    void preGenerateRoundZero();

    return () => {
      cancelled = true;
    };
  }, [roundZeroPendingSessionId, spreadSession]);

  function clearLocalPreSessionState() {
    setPreSession(null);
    setRequestError(null);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    setFirstInterpretationDraft("");
    setFirstInterpretationError(null);
    setReflectionFocusSurface(createInitialReflectionFocusSurface());
    setIsSpreadReflectionWorkspaceOpen(false);
    setRoundZeroNavigationIntentSessionId(null);
  }

  function returnToLibrary() {
    activeSessionIdRef.current = null;
    roundZeroRequestedSessionIdRef.current = null;
    setRoundZeroPendingSessionId(null);
    setRoundZeroFailedSessionId(null);
    setRoundZeroNavigationIntentSessionId(null);
    setLandingView("library");
    setSession(null);
    setPreSession(null);
    setFirstInterpretationDraft("");
    setFirstInterpretationError(null);
    setReflectiveReply("");
    setReflectiveReplyError(null);
    setRequestError(null);
    setIsContinuingFromRestingPoint(false);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    setReflectionFocusSurface(createInitialReflectionFocusSurface());
    setIsSpreadReflectionWorkspaceOpen(false);
    window.history.replaceState(null, "", "/fortune");
  }

  function openJournalIndex() {
    window.location.assign("/fortune?view=journal");
  }

  function closeJournalIndex() {
    setLandingView("library");
    window.history.replaceState(null, "", "/fortune");
  }

  function queueRoundZeroPreGeneration(baseSession: LocalFortuneSession) {
    if (!baseSession.sessionId) {
      return;
    }

    const shouldQueue = shouldStartRoundZeroPreGeneration({
      session: baseSession,
      sessionIdInFlight: roundZeroPendingSessionId,
      failedSessionId: roundZeroFailedSessionId,
      hasRequestedForSessionId: roundZeroRequestedSessionIdRef.current,
    });

    if (!shouldQueue && roundZeroFailedSessionId !== baseSession.sessionId && roundZeroPendingSessionId !== baseSession.sessionId) {
      return;
    }

    setRoundZeroFailedSessionId((current) => (current === baseSession.sessionId ? null : current));
    setRoundZeroPendingSessionId(baseSession.sessionId);
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
        if (activeSessionIdRef.current !== baseSession.sessionId) {
          throw new Error(payload.error ?? "A reflektív kérdés most nem érhető el. Próbáld újra.");
        }

        setSession(
          hydrateLocalFortuneSession({
            persistedSession: payload.session,
            persistedTurns: baseSession.turns,
            deck,
            mode: baseSession.mode,
          }),
        );
      } else if (activeSessionIdRef.current === baseSession.sessionId) {
        setSession(baseSession);
      }

      throw new Error(payload.error ?? "A reflektív kérdés most nem érhető el. Próbáld újra.");
    }

    if (activeSessionIdRef.current !== baseSession.sessionId) {
      return;
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
    setRequestError(null);
  }

  async function persistSelectedSpread(mode: TarotModeDefinition, focusDraft: string, nextSelectedCardIds: string[]) {
    const response = await fetch("/api/fortune/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modeId: mode.id,
        focusText: normalizeFortuneFocusDraft(focusDraft),
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

    activeSessionIdRef.current = nextSession.sessionId;
    setSession(nextSession);
    setPreSession(null);
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    setRoundZeroFailedSessionId(null);
    if (nextSession.stage === "spread" && isFocusLedRoundZeroSession(nextSession)) {
      queueRoundZeroPreGeneration(nextSession);
    }
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/fortune?session=${encodeURIComponent(payload.session.id)}`);
    }
  }

  function handleModeStart(mode: TarotModeDefinition) {
    setPreSession(beginFortunePreSession(mode));
    setSession(null);
    setRequestError(null);
    setFirstInterpretationDraft("");
    setFirstInterpretationError(null);
    setReflectiveReply("");
    setOpenInfoModeId(null);
    setIsPageInfoOpen(false);
    setIsSpreadReflectionWorkspaceOpen(false);
    setRoundZeroNavigationIntentSessionId(null);
  }

  function openCardInfo(cardId: string) {
    setInspectedCardId(cardId);
    setIsCardInfoOpen(true);
  }

  function closeCardInfo() {
    setIsCardInfoOpen(false);
  }

  function openReflectionHistorySurface() {
    setReflectionFocusSurface((current) => openReflectionHistory(current));
  }

  function closeReflectionHistorySurface() {
    setReflectionFocusSurface((current) => ({ ...current, historyOpen: false }));
  }

  function openReflectionCardInfo(cardId: string) {
    setReflectionFocusSurface((current) => openReflectionCardInspect(current, cardId));
  }

  function closeReflectionCardInfo() {
    setReflectionFocusSurface((current) => ({
      ...current,
      inspectedCardId: null,
      isCardInfoOpen: false,
    }));
  }

  function handleHeaderLeftAction() {
    if (isJournalState) {
      closeJournalIndex();
      return;
    }

    if (isLibraryState) {
      window.location.assign("/");
      return;
    }

    if (isFocusState) {
      clearLocalPreSessionState();
      return;
    }

    if (isDrawState && preSession) {
      setPreSession(returnFortuneDrawToFocus(preSession));
      setRequestError(null);
      return;
    }

    returnToLibrary();
  }

  function handleEnterReflectionWorkspace() {
    if (!session || session.stage !== "spread") {
      return;
    }

    setRequestError(null);
    setFirstInterpretationError(null);

    if (isFocusLedRoundZeroSession(session)) {
      if (session.latestAssistantTurn) {
        setIsSpreadReflectionWorkspaceOpen(true);
        return;
      }

      setRoundZeroNavigationIntentSessionId(session.sessionId);
      queueRoundZeroPreGeneration(session);
      return;
    }

    setFirstInterpretationDraft(session.interpretation ?? "");
    setIsSpreadReflectionWorkspaceOpen(true);
  }

  function handleFocusContinue() {
    if (!preSession || preSession.stage !== "focus" || !normalizeFortuneFocusDraft(preSession.focusDraft)) {
      return;
    }

    setPreSession(continueFortunePreSessionToDraw(preSession));
    setRequestError(null);
  }

  function handleFocusSkip() {
    if (!preSession || preSession.stage !== "focus") {
      return;
    }

    setPreSession(skipFortuneFocusStep(preSession));
    setRequestError(null);
  }

  async function handleDrawCardSelect(cardId: string) {
    if (!preSession || preSession.stage !== "draw" || isSubmitting) {
      return;
    }

    const nextSelection = toggleDrawCardSelection({
      selectedCardIds,
      cardId,
      cardCount: preSession.mode.card_count,
    });

    if (!nextSelection.didChange) {
      return;
    }

    setPreSession({
      ...preSession,
      selectedCardIds: nextSelection.selectedCardIds,
    });
    setRequestError(null);

    if (!nextSelection.shouldPersist) {
      return;
    }

    setIsSubmitting(true);

    try {
      await persistSelectedSpread(preSession.mode, preSession.focusDraft, nextSelection.selectedCardIds);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "A Fortune session nem indítható el most.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRequestFacilitatorTurn() {
    if (!session || !session.sessionId) {
      return;
    }

    const isBootstrapRetry = session.stage === "spread" && isSpreadReflectionWorkspaceOpen && Boolean(session.focus);
    if (session.stage !== "ready-for-next-round" && !isBootstrapRetry) {
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

  async function handleFirstInterpretationSubmit() {
    if (!session || session.stage !== "spread" || !session.sessionId) {
      return;
    }

    setFirstInterpretationError(null);
    setRequestError(null);
    setIsSubmitting(true);

    try {
      const content = firstInterpretationDraft.trim();
      if (!content) {
        setFirstInterpretationError("Az első benyomás megadása szükséges.");
        return;
      }

      const response = await fetch(`/api/fortune/sessions/${encodeURIComponent(session.sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstInterpretation: content }),
      });
      const payload = (await response.json()) as { error?: string; session?: FortuneSession };

      if (!response.ok || !payload.session) {
        throw new Error(payload.error ?? "Az első benyomás most nem menthető.");
      }

      setSession(
        hydrateLocalFortuneSession({
          persistedSession: payload.session,
          persistedTurns: session.turns,
          deck,
          mode: session.mode,
        }),
      );
      setFirstInterpretationDraft(content);
      setIsSpreadReflectionWorkspaceOpen(false);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Az első benyomás most nem menthető.");
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
  const sessionFocusSnippet =
    session?.focus && session.focus.length > 96 ? `${session.focus.slice(0, 93).trimEnd()}…` : session?.focus ?? null;
  const historyTranscript =
    session?.turns.map((turn) => {
      const promptContent = turn.role === "assistant" ? parseTranscriptPrompt(turn.content) : null;

      return {
        id: turn.id,
        roleLabel: turn.role === "user" ? "TE" : "LUMIRA",
        reflection: turn.role === "assistant" ? promptContent?.reflection ?? turn.content : turn.content,
        question: turn.role === "assistant" ? promptContent?.question ?? null : null,
      };
    }) ?? [];
  const layoutMode = isDrawState
    ? "draw"
    : isFocusState
      ? "focus"
      : isJournalState
        ? "journal"
      : session?.stage === "spread"
        ? "spread"
        : isReflectionWorkspace
          ? "reflection"
          : "default";

  const activeHeader = isLibraryState
    ? { step: "I. LÉPÉS", instruction: "Válaszd ki a vetés célját!", supportingCopy: null }
    : isFocusState
      ? { step: "II. LÉPÉS", instruction: "Mi foglalkoztat most?", supportingCopy: null }
      : isDrawState && preSession
      ? {
          step: "II. LÉPÉS",
          instruction: getDrawInstruction(preSession.mode.card_count, selectedCardIds.length),
          supportingCopy: preSession.mode.library.orientation,
        }
      : session && !isReflectionWorkspace
        ? { step: "III. LÉPÉS", instruction: "Nézd meg, mi került eléd", supportingCopy: null }
        : null;
  const resolvedActiveHeader = isLibraryState
    ? { step: "I. LÉPÉS", instruction: "Válaszd ki a vetés célját!", supportingCopy: null }
    : isFocusState
      ? { step: "II. LÉPÉS", instruction: "Mi foglalkoztat most?", supportingCopy: null }
      : isDrawState && preSession
        ? {
            step: "III. LÉPÉS",
            instruction: getDrawInstruction(preSession.mode.card_count, selectedCardIds.length),
            supportingCopy: preSession.mode.library.orientation,
          }
        : session && !isReflectionWorkspace
          ? { step: "IV. LÉPÉS", instruction: "Nézd meg, mi került eléd", supportingCopy: null }
          : null;
  const showTopControls = Boolean(resolvedActiveHeader ?? activeHeader) || isReflectionWorkspace || isJournalState;
  const showStepHeader = !isJournalState && Boolean(resolvedActiveHeader ?? activeHeader);
  const headerLeftControl = isJournalState
    ? { ariaLabel: "Vissza a Fortune könyvtárhoz" }
    : getHeaderLeftControl(
        isFocusState
          ? "focus"
          : ((isLibraryState ? "library" : isDrawState ? "draw" : session?.stage ?? "spread") as FortuneHeaderLeftStage),
      );

  return (
    <main
      className={`${styles.page} ${isLibraryState ? styles.pageLibraryLocked : ""}`}
      data-layout-mode={layoutMode}
    >
      <div className={styles.shell}>
        {showTopControls ? (
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
              isReflectionWorkspace={isReflectionWorkspace}
              onReflectionClose={returnToLibrary}
            />
            {showStepHeader && resolvedActiveHeader ? (
              <FortuneStepHeader
                step={resolvedActiveHeader.step}
                instruction={resolvedActiveHeader.instruction}
                supportingCopy={resolvedActiveHeader.supportingCopy}
              />
            ) : null}
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
                        const watermark = getModeWatermark(mode.id);
                        const tileStyle = watermark
                          ? ({
                              "--library-watermark-image": `url("${watermark.assetPath}")`,
                              "--library-watermark-color": watermark.color,
                              "--library-watermark-scale": String(watermark.scale),
                            } as CSSProperties)
                          : undefined;

                        return (
                          <article className={styles.libraryTile} key={mode.id}>
                            <button
                              className={styles.libraryTileButton}
                              type="button"
                              onClick={() => handleModeStart(mode)}
                              data-mode-watermark={watermark?.assetPath}
                              style={tileStyle}
                            >
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

              <div className={styles.libraryFooter}>
                <button className={styles.libraryJournalButton} type="button" onClick={openJournalIndex}>
                  Korábbi vetések megtekintése
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isJournalState ? (
          <FortuneJournalView
            entries={journalEntries}
            modeOptions={journalModeOptions}
            selectedModeId={journalModeFilter}
            selectedSort={journalSort}
            selectedStatus={journalStatusFilter}
            onModeChange={setJournalModeFilter}
            onSortChange={setJournalSort}
            onStatusChange={setJournalStatusFilter}
            onBackToLibrary={closeJournalIndex}
          />
        ) : null}

        {isFocusState && preSession ? (
          <section className={styles.focusSurface}>
            <div className={styles.focusBody}>
              <p>Írd le röviden, hogy miért ezt választottad.</p>
              <p>
                Ez segít, hogy a későbbi kérdések jobban kapcsolódjanak a helyzetedhez. Ha most nem szeretnéd
                megfogalmazni, kihagyhatod.
              </p>
            </div>

            <div className={styles.interpretationForm}>
              <textarea
                className={styles.textarea}
                name="fortune-focus"
                value={preSession.focusDraft}
                onChange={(event) =>
                  setPreSession({
                    ...preSession,
                    focusDraft: event.target.value,
                  })
                }
                placeholder="Pár mondat is elég…"
                disabled={isSubmitting}
              />
              {requestError ? <p className={styles.error}>{requestError}</p> : null}
              <div className={`${styles.ctaRow} ${styles.focusActions}`}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handleFocusContinue}
                  disabled={!normalizeFortuneFocusDraft(preSession.focusDraft) || isSubmitting}
                >
                  Tovább
                </button>
                <button className={styles.secondaryButton} type="button" onClick={handleFocusSkip} disabled={isSubmitting}>
                  Kihagyom
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {isDrawState && preSession ? (
          <section className={styles.drawSurface}>
            <div className={styles.drawDeck} data-card-count={preSession.mode.card_count}>
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

        {session?.stage === "spread" && !isSpreadReflectionWorkspaceOpen ? (
          <section className={styles.spreadSurface}>
            <div className={styles.spreadGrid} data-card-count={session.cards.length}>
              {session.cards.map((entry) => (
                <article className={styles.spreadCard} key={`${entry.position.key}-${entry.card.id}`}>
                  <span className={styles.positionLabel}>{entry.position.label}</span>
                  <div className={styles.spreadArtworkFrame}>
                    <button
                      className={styles.spreadCardInfoButton}
                      type="button"
                      aria-label={`${entry.card.name_hu} információ`}
                      onClick={() => openCardInfo(entry.card.id)}
                    >
                      <Info className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.9} />
                    </button>
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
              <button className={styles.primaryButton} type="button" onClick={handleEnterReflectionWorkspace}>
                Mondd el, mit látsz benne
              </button>
              {spreadTransitionState === "preparing_first_question" ? (
                <div className={styles.transitionLoading} role="status" aria-live="polite">
                  <span>Előkészítem az első kérdést…</span>
                  <span className={styles.loadingDots} aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              ) : null}
            </div>
            <div
              className={styles.cardInspectOverlay}
              data-open={isCardInfoOpen && inspectedSpreadEntry ? "true" : "false"}
              aria-hidden={isCardInfoOpen && inspectedSpreadEntry ? "false" : "true"}
            >
              <button className={styles.cardInspectBackdrop} type="button" aria-label="Bezárás" onClick={closeCardInfo} />

              {inspectedSpreadEntry && inspectedCardInfo ? (
                <section
                  className={styles.cardInspectDialog}
                  role="dialog"
                  aria-modal="true"
                  aria-label={`${inspectedSpreadEntry.card.name_hu} információ`}
                >
                  <div className={styles.cardInspectCardColumn}>
                    <div className={styles.cardInspectArtworkFrame}>
                      {artworkFailures[inspectedSpreadEntry.card.id] ? (
                        <div className={styles.cardPlaceholder}>
                          <span className={styles.cardPlaceholderGlyph}>â—µ</span>
                          <span className={styles.cardPlaceholderText}>Illusztráció hamarosan</span>
                        </div>
                      ) : (
                        <Image
                          className={styles.cardInspectArtwork}
                          src={getFortuneCardArtworkPath(inspectedSpreadEntry.card)}
                          alt={inspectedSpreadEntry.card.name_hu}
                          width={500}
                          height={700}
                          unoptimized
                          onError={() =>
                            setArtworkFailures((current) =>
                              current[inspectedSpreadEntry.card.id]
                                ? current
                                : { ...current, [inspectedSpreadEntry.card.id]: true },
                            )
                          }
                        />
                      )}
                    </div>
                    <h3 className={styles.cardInspectName}>{inspectedSpreadEntry.card.name_hu}</h3>
                  </div>

                  <section className={styles.cardInspectPanel}>
                    <div className={styles.cardInspectPanelHeader}>
                      <button className={styles.infoCloseButton} type="button" aria-label="Bezárás" onClick={closeCardInfo}>
                        <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
                      </button>
                    </div>

                    <div className={styles.cardInspectPanelContent}>
                      <div className={styles.cardInspectPanelGroup}>
                        <div className={styles.cardInspectPills}>
                          {inspectedCardInfo.archetypePills.map((pill) => (
                            <span
                              className={styles.cardInspectPill}
                              key={pill}
                              style={{ "--card-pill-color": inspectedCardInfo.tensionTransformHex } as CSSProperties}
                            >
                              {pill}
                            </span>
                          ))}
                        </div>

                        <p className={styles.cardInspectSummary}>{inspectedCardInfo.summary}</p>

                        <ul className={styles.cardInspectReadings}>
                          {inspectedCardInfo.possibleReadings.map((reading) => (
                            <li key={reading}>{reading}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </section>
                </section>
              ) : null}
            </div>
          </section>
        ) : null}

        {session && isReflectionWorkspace && reflectionView ? (
          <section className={styles.reflectionWorkspace} data-reflection-workspace="true">
            <aside className={styles.reflectionRail} data-card-count={session.cards.length}>
              {session.cards.map((entry) => {
                const railCardInfo = getFortuneCardInspectInfo(entry.card);

                return (
                  <button
                    className={styles.reflectionRailCard}
                    key={entry.card.id}
                    type="button"
                    aria-label={`${entry.card.name_hu} információ`}
                    onClick={() => openReflectionCardInfo(entry.card.id)}
                    style={{ "--card-pill-color": railCardInfo.tensionTransformHex } as CSSProperties}
                  >
                    <span className={styles.reflectionRailMeta}>
                      <span className={styles.reflectionRailNumber}>{formatCardNumber(entry.card.number)}</span>
                      <span className={styles.reflectionRailName}>{entry.card.name_hu}</span>
                    </span>
                    <span className={styles.reflectionRailArtworkFrame}>
                      {artworkFailures[entry.card.id] ? (
                        <div className={styles.cardPlaceholder}>
                          <span className={styles.cardPlaceholderGlyph}>◵</span>
                          <span className={styles.cardPlaceholderText}>Illusztráció hamarosan</span>
                        </div>
                      ) : (
                        <Image
                          className={styles.reflectionRailArtwork}
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
                    </span>
                  </button>
                );
              })}
            </aside>

            <div className={styles.reflectionWorkspaceZone}>
              <section className={styles.reflectionWorkspaceSurface}>
                <div className={styles.reflectionContextStrip}>
                  <p className={styles.reflectionContextLabel}>
                    {session.mode.name.toUpperCase()} · {session.cards.length} LAP
                  </p>
                  {sessionFocusSnippet ? <p className={styles.reflectionContextFocus}>Fókusz: {sessionFocusSnippet}</p> : null}
                  <button
                    className={styles.historyToggle}
                    type="button"
                    aria-label="Előzmények"
                    aria-expanded={reflectionFocusSurface.historyOpen}
                    onClick={openReflectionHistorySurface}
                  >
                    <History className={styles.historyToggleIcon} aria-hidden="true" strokeWidth={1.8} />
                  </button>
                </div>

                <div className={styles.reflectionCenter} data-reflection-center={reflectionView.centerKind}>
                  {reflectionView.centerKind === "interpretation" ? (
                    <>
                      <p className={styles.reflectionLead}>
                        Itt rögzítheted az első benyomásodat arról, mi rajzolódik ki most ebből a vetésből.
                      </p>
                      <p className={styles.reflectionSupport}>Ez lesz a további reflektív kérdések kiindulópontja.</p>
                    </>
                  ) : null}

                  {reflectionView.centerKind === "ready-for-next-round" ? (
                    <>
                      <p className={styles.reflectionLead}>
                        Kérhetsz egy újabb reflektív kérdést, vagy megállhatsz itt most.
                      </p>
                      <p className={styles.reflectionSupport}>A folytatás egy lehetőség, nem kötelező következő lépés.</p>
                      {session.reflectiveReply ? (
                        <p className={styles.reflectionSupport}>Legutóbbi válaszod: {session.reflectiveReply}</p>
                      ) : null}
                      {requestError ? <p className={styles.error}>{requestError}</p> : null}
                      <div className={styles.ctaRow}>
                        <button
                          className={styles.primaryButton}
                          type="button"
                          onClick={handleRequestFacilitatorTurn}
                          disabled={isSubmitting}
                        >
                          Reflektív kérdés kérése
                        </button>
                        <button className={styles.secondaryButton} type="button" onClick={handlePause} disabled={isSubmitting}>
                          Pause
                        </button>
                        <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                          Complete
                        </button>
                      </div>
                    </>
                  ) : null}

                  {reflectionView.centerKind === "awaiting-reply" && session.latestAssistantTurn?.mode === "question" ? (
                    <>
                      <p className={styles.reflectionLead}>{session.latestAssistantTurn.reflection}</p>
                      <h2 className={styles.reflectionQuestion}>{session.latestAssistantTurn.question}</h2>
                    </>
                  ) : null}

                  {(reflectionView.centerKind === "awaiting-resting-choice" ||
                    reflectionView.centerKind === "awaiting-resting-compose") &&
                  session.latestAssistantTurn?.mode === "resting_point" ? (
                    <>
                      <p className={styles.reflectionLead}>{session.latestAssistantTurn.reflection}</p>
                      <p className={styles.reflectionSupport}>
                        Itt megállhatsz, későbbre teheted, vagy továbbviheted, ha maradt még benned valami.
                      </p>
                      {!reflectionView.showComposer ? (
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
                          <button
                            className={styles.tertiaryButton}
                            type="button"
                            onClick={handleComplete}
                            disabled={isSubmitting}
                          >
                            Complete
                          </button>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {reflectionView.centerKind === "paused" ? (
                    <>
                      <p className={styles.reflectionLead}>Ez a beszélgetés most szünetel. Ugyanebből a pontból térhetsz vissza hozzá.</p>
                      {session.latestAssistantTurn ? (
                        <p className={styles.reflectionSupport}>{session.latestAssistantTurn.reflection}</p>
                      ) : null}
                      {requestError ? <p className={styles.error}>{requestError}</p> : null}
                      <div className={styles.ctaRow}>
                        <button className={styles.primaryButton} type="button" onClick={handleResume} disabled={isSubmitting}>
                          Resume
                        </button>
                        <button className={styles.tertiaryButton} type="button" onClick={handleComplete} disabled={isSubmitting}>
                          Complete
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className={styles.reflectionComposerRegion}>
                  {reflectionView.centerKind === "interpretation" ? (
                    <div className={styles.interpretationForm}>
                      <textarea
                        className={styles.textarea}
                        name="fortune-first-interpretation"
                        value={firstInterpretationDraft}
                        onChange={(event) => setFirstInterpretationDraft(event.target.value)}
                        placeholder="Mi az, amit először észreveszel, együtt látsz, vagy megmozdul benned a lapok között?"
                        disabled={isSubmitting}
                      />
                      {firstInterpretationError ? <p className={styles.error}>{firstInterpretationError}</p> : null}
                      {requestError ? <p className={styles.error}>{requestError}</p> : null}
                      <div className={styles.ctaRow}>
                        <button
                          className={styles.primaryButton}
                          type="button"
                          onClick={handleFirstInterpretationSubmit}
                          disabled={isSubmitting}
                        >
                          Első benyomás mentése
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {reflectionView.centerKind === "awaiting-reply" ? (
                    <div className={styles.interpretationForm}>
                      <div className={styles.inlineComposer}>
                        <textarea
                          className={`${styles.textarea} ${styles.inlineComposerTextarea}`}
                          name="fortune-reflective-reply"
                          value={reflectiveReply}
                          onChange={(event) => setReflectiveReply(event.target.value)}
                          placeholder="Írj néhány mondatot arról, mi mozdul most benned."
                          disabled={isSubmitting}
                        />
                        <button
                          className={styles.inlineComposerButton}
                          type="button"
                          aria-label="Rögzítés"
                          onClick={handleReflectiveReplySubmit}
                          disabled={isSubmitting}
                        >
                          <ArrowUp className={styles.inlineComposerIcon} aria-hidden="true" strokeWidth={2} />
                        </button>
                      </div>
                      {reflectiveReplyError ? <p className={styles.error}>{reflectiveReplyError}</p> : null}
                      {requestError ? <p className={styles.error}>{requestError}</p> : null}
                    </div>
                  ) : null}

                  {reflectionView.centerKind === "awaiting-resting-compose" ? (
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
                        <button
                          className={styles.primaryButton}
                          type="button"
                          onClick={handleReflectiveReplySubmit}
                          disabled={isSubmitting}
                        >
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
                  ) : null}
                </div>

                <div className={styles.historyDrawer} data-open={reflectionFocusSurface.historyOpen ? "true" : "false"}>
                  <button className={styles.historyBackdrop} type="button" aria-label="Bezárás" onClick={closeReflectionHistorySurface} />
                  <section className={styles.historyPanel} role="dialog" aria-label="Előzmények">
                    <div className={styles.historyPanelHeader}>
                      <h2>Előzmények</h2>
                      <button className={styles.infoCloseButton} type="button" aria-label="Bezárás" onClick={closeReflectionHistorySurface}>
                        <X className={styles.infoGlyph} aria-hidden="true" strokeWidth={1.8} />
                      </button>
                    </div>

                    <div className={styles.historyPanelContent}>
                      <section className={styles.historySection}>
                        <p className={styles.historySectionLabel}>A vetés</p>
                        <p className={styles.reflectionSupport}>
                          {session.mode.name} · {session.cards.length} lap
                        </p>
                        {session.focus ? <p className={styles.historyFocus}>Fókusz: {session.focus}</p> : null}
                        <ul className={styles.historyCardList}>
                          {session.cards.map((entry) => (
                            <li key={entry.card.id}>
                              {formatCardNumber(entry.card.number)} · {entry.card.name_hu}
                            </li>
                          ))}
                        </ul>
                        {session.interpretation ? <p className={styles.historyInterpretation}>{session.interpretation}</p> : null}
                      </section>

                      <section className={styles.historySection}>
                        <p className={styles.historySectionLabel}>Beszélgetés</p>
                        {historyTranscript.length > 0 ? (
                          <div className={styles.historyTranscript}>
                            {historyTranscript.map((turn) => (
                              <article className={styles.historyTurn} key={turn.id}>
                                <p className={styles.historyTurnRole}>{turn.roleLabel}</p>
                                <p>{turn.reflection}</p>
                                {turn.question ? <p className={styles.historyTurnQuestion}>{turn.question}</p> : null}
                              </article>
                            ))}
                          </div>
                        ) : (
                          <p className={styles.reflectionSupport}>Itt még nem volt folytatott beszélgetés.</p>
                        )}
                      </section>
                    </div>
                  </section>
                </div>
              </section>
            </div>

            <FortuneCardInspectOverlay
              card={reflectionInspectedEntry?.card ?? null}
              cardInfo={reflectionInspectedCardInfo}
              isArtworkMissing={Boolean(reflectionInspectedEntry && artworkFailures[reflectionInspectedEntry.card.id])}
              isOpen={reflectionFocusSurface.isCardInfoOpen && Boolean(reflectionInspectedEntry)}
              onClose={closeReflectionCardInfo}
              onArtworkError={() =>
                reflectionInspectedEntry
                  ? setArtworkFailures((current) =>
                      current[reflectionInspectedEntry.card.id]
                        ? current
                        : { ...current, [reflectionInspectedEntry.card.id]: true },
                    )
                  : undefined
              }
            />
          </section>
        ) : null}

        {/* Legacy reflection panel retained as unreachable during workspace transition.
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
        */}

        {/* Legacy reflection panel retained as unreachable during workspace transition.
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
        */}

        {/* Legacy reflection panel retained as unreachable during workspace transition.
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
        */}

        {/* Legacy reflection panel retained as unreachable during workspace transition.
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
        */}

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
