"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type {
  Meditation,
  MeditationEndBehavior,
  ReaderBlock,
  ReaderTextBlock,
  ReaderTone,
} from "../lib/meditation-types";
import { useReaderEngine } from "../hooks/useReaderEngine";
import { useAudioEngine } from "../audio/use-audio-engine";
import type { MeditationAudioConfig } from "../lib/audio-types";
import {
  getEditorPreviewStartBlockIndex,
  getEditorTextPositionForBlockIndex,
  getFollowingPauseDuration,
  getNextEditorTextPosition,
  getTextBlockIndices,
  shouldHandleEditorArrowNavigation,
  shouldStopEditorPreviewOnInteraction,
  shouldToggleEditorPreviewOnSpace,
} from "../lib/editor-preview";
import ReaderStage from "./ReaderStage";
import styles from "../styles/meditations.module.css";

type Props = {
  meditation: Meditation;
  audioConfig: MeditationAudioConfig | null;
  onExit: () => void;
  onComplete: (behavior: MeditationEndBehavior) => void;
  onEditorModeChange?: (editorMode: boolean) => void;
  onReaderBlocksSaved?: (meditationId: string, blocks: ReaderBlock[]) => void;
  isAdmin?: boolean;
};

const TONE_OPTIONS: ReaderTone[] = ["soft", "neutral", "deep"];
const DRAFT_STORAGE_KEY_PREFIX = "meditation-reader-draft:";

function formatDurationMs(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "0 mp";
  const seconds = durationMs / 1000;
  if (Number.isInteger(seconds)) return `${seconds} mp`;
  return `${seconds.toFixed(1)} mp`;
}

export default function MeditationReader({
  meditation,
  audioConfig,
  onExit,
  onComplete,
  onEditorModeChange,
  onReaderBlocksSaved,
  isAdmin,
}: Props) {
  const [savedBlocks, setSavedBlocks] = useState<ReaderBlock[]>(meditation.reader.blocks);
  const engineMeditation = useMemo(
    () => ({
      ...meditation,
      reader: {
        ...meditation.reader,
        blocks: savedBlocks,
      },
    }),
    [meditation, savedBlocks]
  );
  const { status, currentText, currentBlockIndex, start, restart, stop } = useReaderEngine(engineMeditation);
  const {
    start: startAudio,
    stop: stopAudio,
    fadeOut: fadeOutAudio,
    updateBlockIndex: updateAudioBlockIndex,
    setMuted,
    isMuted,
  } = useAudioEngine();
  const [closing, setClosing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [editorBlocks, setEditorBlocks] = useState<ReaderBlock[]>(savedBlocks);
  const [editorTextPosition, setEditorTextPosition] = useState(0);
  const [editorPreviewRunning, setEditorPreviewRunning] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "draft" | "saving" | "error">("idle");
  const [showEditorExitDialog, setShowEditorExitDialog] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const draftSaveTimerRef = useRef<number | null>(null);
  const draftStorageKey = `${DRAFT_STORAGE_KEY_PREFIX}${meditation.id}`;
  const savedSnapshot = useMemo(() => JSON.stringify(savedBlocks), [savedBlocks]);
  const draftSnapshot = useMemo(() => JSON.stringify(editorBlocks), [editorBlocks]);
  const hasUnsavedDraft = draftSnapshot !== savedSnapshot;

  const endBehavior = useMemo(() => meditation.reader.end_behavior, [meditation.reader.end_behavior]);
  const textBlockIndices = useMemo(() => getTextBlockIndices(editorBlocks), [editorBlocks]);
  const hasTextBlocks = textBlockIndices.length > 0;
  const currentEditorTextIndex = textBlockIndices[editorTextPosition] ?? null;
  const editorCurrentBlock = useMemo(() => {
    if (currentEditorTextIndex === null) return null;
    const block = editorBlocks[currentEditorTextIndex];
    return block?.type === "text" ? block : null;
  }, [currentEditorTextIndex, editorBlocks]);
  const editorDurationMs = useMemo(() => {
    if (currentEditorTextIndex === null) return 0;
    return getFollowingPauseDuration(editorBlocks, currentEditorTextIndex);
  }, [currentEditorTextIndex, editorBlocks]);

  useEffect(() => {
    setSavedBlocks(meditation.reader.blocks);
    setEditorBlocks(meditation.reader.blocks);
    setEditorTextPosition(0);
    setEditorPreviewRunning(false);
    setSaveState("idle");
    setShowEditorExitDialog(false);
    setDraftLoaded(false);
  }, [meditation.id, meditation.reader.blocks]);

  useEffect(() => {
    onEditorModeChange?.(editorMode);
  }, [editorMode, onEditorModeChange]);

  useEffect(() => {
    if (editorMode) return;
    start();
  }, [editorMode, start, meditation.id]);

  useEffect(() => {
    if (!editorMode) return;
    stopAudio();
    stop();
    setEditorPreviewRunning(false);
  }, [editorMode, stop, stopAudio]);

  useEffect(() => {
    if (editorTextPosition < textBlockIndices.length) return;
    setEditorTextPosition(Math.max(0, textBlockIndices.length - 1));
  }, [editorTextPosition, textBlockIndices.length]);

  useEffect(() => {
    if (typeof window === "undefined" || draftLoaded) return;
    try {
      const storedDraft = window.localStorage.getItem(draftStorageKey);
      if (!storedDraft) return;
      const parsed = JSON.parse(storedDraft);
      if (!Array.isArray(parsed)) return;
      setEditorBlocks(parsed as ReaderBlock[]);
      setSaveState("draft");
    } catch (error) {
      console.error("[meditations] Draft load failed", error);
    } finally {
      setDraftLoaded(true);
    }
  }, [draftLoaded, draftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined" || !draftLoaded) return;
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
    }
    draftSaveTimerRef.current = window.setTimeout(() => {
      try {
        if (hasUnsavedDraft) {
          window.localStorage.setItem(draftStorageKey, draftSnapshot);
          setSaveState("draft");
        } else {
          window.localStorage.removeItem(draftStorageKey);
          setSaveState("idle");
        }
      } catch (error) {
        console.error("[meditations] Draft save failed", error);
        setSaveState("error");
      }
    }, 400);
    return () => {
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
    };
  }, [draftLoaded, draftSnapshot, draftStorageKey, hasUnsavedDraft]);

  useEffect(() => {
    if (editorMode) return;
    if (status !== "running") return;
    startAudio(audioConfig);
  }, [audioConfig, editorMode, startAudio, status]);

  useEffect(() => {
    if (status !== "running" || currentBlockIndex === null) return;
    updateAudioBlockIndex(currentBlockIndex);
  }, [currentBlockIndex, status, updateAudioBlockIndex]);

  useEffect(() => {
    if (!editorMode || !editorPreviewRunning) return;
    if (status !== "ended") return;
    stop();
    setEditorPreviewRunning(false);
  }, [editorMode, editorPreviewRunning, status, stop]);

  useEffect(() => {
    if (editorMode) return;
    if (status !== "ended" || completed) return;
    if (endBehavior === "soft_end") {
      fadeOutAudio(5);
    }
    if (endBehavior === "fade_out") {
      fadeOutAudio(10);
    }
    if (endBehavior === "complete") {
      stopAudio();
    }
    setCompleted(true);
    onComplete(endBehavior);

    if (endBehavior === "fade_out") {
      setClosing(true);
      const timer = window.setTimeout(() => {
        onExit();
      }, 2000);
      return () => window.clearTimeout(timer);
    }
  }, [completed, editorMode, endBehavior, fadeOutAudio, onComplete, onExit, status, stopAudio]);

  const handleExit = useCallback(() => {
    stopAudio();
    stop();
    onExit();
  }, [onExit, stop, stopAudio]);

  const requestEditorExit = useCallback(() => {
    if (editorPreviewRunning) {
      if (currentBlockIndex !== null) {
        const syncedPosition = getEditorTextPositionForBlockIndex(editorBlocks, currentBlockIndex);
        if (syncedPosition !== null) {
          setEditorTextPosition(syncedPosition);
        }
      }
      stop();
      setEditorPreviewRunning(false);
    }
    setShowEditorExitDialog(true);
  }, [currentBlockIndex, editorBlocks, editorPreviewRunning, stop]);

  const showEndPanel = !editorMode && status === "ended" && endBehavior !== "fade_out";
  const endCopy = endBehavior === "complete" ? "Meditacio befejezve." : "Lassan terj vissza.";
  const displayBlock = editorMode
    ? editorPreviewRunning
      ? currentText ?? editorCurrentBlock
      : editorCurrentBlock
    : currentText;
  const durationInputValue = editorDurationMs > 0 ? Number((editorDurationMs / 1000).toFixed(1)) : 0;
  const displayPosition = hasTextBlocks ? editorTextPosition + 1 : 0;

  const stopEditorPreview = useCallback(() => {
    if (currentBlockIndex !== null) {
      const syncedPosition = getEditorTextPositionForBlockIndex(editorBlocks, currentBlockIndex);
      if (syncedPosition !== null) {
        setEditorTextPosition(syncedPosition);
      }
    }
    stop();
    setEditorPreviewRunning(false);
  }, [currentBlockIndex, editorBlocks, stop]);

  const startEditorPreview = useCallback(() => {
    const startIndex = getEditorPreviewStartBlockIndex(editorBlocks, editorTextPosition);
    if (startIndex === null) return;
    setClosing(false);
    setCompleted(false);
    setEditorPreviewRunning(true);
    start(startIndex);
  }, [editorBlocks, editorTextPosition, start]);

  const handleEditorFieldInteraction = useCallback(
    (interaction: "content" | "tone" | "duration") => {
      if (!editorPreviewRunning) return;
      if (!shouldStopEditorPreviewOnInteraction(interaction)) return;
      stopEditorPreview();
    },
    [editorPreviewRunning, stopEditorPreview]
  );

  const saveEditorDraft = useCallback(async () => {
    if (!isAdmin) return false;
    setSaveState("saving");
    try {
      const response = await fetch("/api/admin/meditations/reader-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: meditation.id, blocks: editorBlocks }),
      });
      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`Save failed (${response.status}): ${detail}`);
      }
      setSavedBlocks(editorBlocks);
      onReaderBlocksSaved?.(meditation.id, editorBlocks);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      setSaveState("idle");
      setShowEditorExitDialog(false);
      setEditorMode(false);
      return true;
    } catch (error) {
      console.error("[meditations] Save failed", error);
      setSaveState("error");
      return false;
    }
  }, [draftStorageKey, editorBlocks, isAdmin, meditation.id, onReaderBlocksSaved]);

  const discardEditorDraft = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey);
    }
    setEditorBlocks(savedBlocks);
    setEditorTextPosition(0);
    setSaveState("idle");
    setShowEditorExitDialog(false);
    setEditorMode(false);
  }, [draftStorageKey, savedBlocks]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !editorMode) {
        handleExit();
        return;
      }

      if (
        shouldToggleEditorPreviewOnSpace({
          editorMode,
          key: event.key,
          targetTagName: event.target instanceof HTMLElement ? event.target.tagName : null,
          isContentEditable: event.target instanceof HTMLElement ? event.target.isContentEditable : false,
        })
      ) {
        event.preventDefault();
        if (editorPreviewRunning) {
          stopEditorPreview();
          return;
        }
        startEditorPreview();
        return;
      }

      if (
        shouldHandleEditorArrowNavigation({
          editorMode,
          key: event.key,
          targetTagName: event.target instanceof HTMLElement ? event.target.tagName : null,
          isContentEditable: event.target instanceof HTMLElement ? event.target.isContentEditable : false,
        })
      ) {
        event.preventDefault();
        if (!hasTextBlocks) return;
        if (editorPreviewRunning) {
          stopEditorPreview();
        }
        setEditorTextPosition((currentPosition) =>
          getNextEditorTextPosition({
            currentPosition,
            key: event.key,
            totalPositions: textBlockIndices.length,
          })
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    editorMode,
    editorPreviewRunning,
    handleExit,
    hasTextBlocks,
    startEditorPreview,
    stopEditorPreview,
    textBlockIndices.length,
  ]);

  const updateEditorBlock = useCallback(
    (updater: (block: ReaderTextBlock) => ReaderTextBlock) => {
      if (currentEditorTextIndex === null) return;
      setEditorBlocks((prev) => {
        const next = [...prev];
        const block = next[currentEditorTextIndex];
        if (!block || block.type !== "text") return prev;
        next[currentEditorTextIndex] = updater(block);
        return next;
      });
    },
    [currentEditorTextIndex]
  );

  const updateEditorDuration = useCallback(
    (durationSeconds: number) => {
      if (currentEditorTextIndex === null) return;
      const durationMs = Math.max(0, Math.round(durationSeconds * 1000));
      setEditorBlocks((prev) => {
        const next = [...prev];
        const pauseIndex = currentEditorTextIndex + 1;
        const existing = next[pauseIndex];
        if (durationMs === 0) {
          if (existing?.type === "pause") {
            next.splice(pauseIndex, 1);
          }
          return next;
        }
        if (existing?.type === "pause") {
          next[pauseIndex] = { ...existing, duration_ms: durationMs };
          return next;
        }
        next.splice(pauseIndex, 0, { type: "pause", duration_ms: durationMs });
        return next;
      });
    },
    [currentEditorTextIndex]
  );

  return (
    <div
      className={`${styles.readerOverlay} ${closing ? styles.readerOverlayClosing : ""}`}
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (!editorMode) {
          handleExit();
        }
      }}
    >
      <div
        className={`${styles.readerPanel} ${editorMode ? styles.readerPanelEditor : ""}`}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.readerExit}
          onClick={editorMode ? requestEditorExit : handleExit}
          aria-label="Kilépés"
        >
          ×
        </button>
        {isAdmin && (
          <button
            type="button"
            className={styles.readerAdminToggle}
            onClick={() => {
              if (editorMode) {
                requestEditorExit();
                return;
              }
              setEditorMode(true);
            }}
          >
            {editorMode ? "Olvaso mod" : "Szerkeszto mod"}
          </button>
        )}
        <ReaderStage block={displayBlock} isClosing={closing && !editorMode} />
        {editorMode && (
          <div className={styles.readerEditorPanel}>
            <div className={styles.readerEditorHeader}>
              <div>
                <p className={styles.readerEditorTitle}>Szerkeszto mod</p>
                <p className={styles.readerEditorMeta}>
                  Szoveg {displayPosition} / {textBlockIndices.length}
                </p>
                <p className={styles.readerEditorSaveState}>
                  {saveState === "draft" && "Piszkozat mentve"}
                  {saveState === "saving" && "Mentes..."}
                  {saveState === "error" && "Mentes hiba"}
                </p>
              </div>
              <div className={styles.readerEditorDuration}>
                Idotartam: {formatDurationMs(editorDurationMs)}
              </div>
            </div>
            <div className={styles.readerEditorControls}>
              <button
                type="button"
                className={styles.readerEditorNavButton}
                onClick={() =>
                  hasTextBlocks && setEditorTextPosition((pos) => Math.max(0, pos - 1))
                }
                disabled={!hasTextBlocks || editorTextPosition <= 0}
              >
                Elozo
              </button>
              <button
                type="button"
                className={styles.readerEditorNavButton}
                onClick={() =>
                  hasTextBlocks &&
                  setEditorTextPosition((pos) => Math.min(textBlockIndices.length - 1, pos + 1))
                }
                disabled={!hasTextBlocks || editorTextPosition >= textBlockIndices.length - 1}
              >
                Kovetkezo
              </button>
              <select
                aria-label="Blokk valasztasa"
                className={styles.readerEditorSelect}
                value={editorTextPosition}
                onChange={(event) => setEditorTextPosition(Number(event.target.value))}
                disabled={!hasTextBlocks}
              >
                {textBlockIndices.map((blockIndex, listIndex) => {
                  const block = editorBlocks[blockIndex] as ReaderTextBlock;
                  const durationLabel = formatDurationMs(
                    getFollowingPauseDuration(editorBlocks, blockIndex)
                  );
                  const trimmed =
                    block.content.length > 40 ? `${block.content.slice(0, 40)}…` : block.content;
                  return (
                    <option key={`${meditation.id}-editor-${blockIndex}`} value={listIndex}>
                      {`${listIndex + 1}. ${durationLabel} - ${trimmed}`}
                    </option>
                  );
                })}
              </select>
            </div>
            <label className={styles.readerEditorLabel} htmlFor="editor-text-content">
              Szoveg
            </label>
            <textarea
              id="editor-text-content"
              aria-label="Szoveg"
              className={styles.readerEditorTextarea}
              value={editorCurrentBlock?.content ?? ""}
              rows={6}
              onPointerDown={() => handleEditorFieldInteraction("content")}
              onFocus={() => handleEditorFieldInteraction("content")}
              onChange={(event) =>
                updateEditorBlock((block) => ({ ...block, content: event.target.value }))
              }
            />
            <label className={styles.readerEditorLabel} htmlFor="editor-text-tone">
              Hangulat
            </label>
            <select
              id="editor-text-tone"
              aria-label="Hangulat"
              className={styles.readerEditorSelect}
              value={editorCurrentBlock?.tone ?? "soft"}
              onPointerDown={() => handleEditorFieldInteraction("tone")}
              onFocus={() => handleEditorFieldInteraction("tone")}
              onChange={(event) =>
                updateEditorBlock((block) => ({ ...block, tone: event.target.value as ReaderTone }))
              }
            >
              {TONE_OPTIONS.map((tone) => (
                <option key={`tone-${tone}`} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
            <label className={styles.readerEditorLabel} htmlFor="editor-text-duration">
              Idotartam (mp)
            </label>
            <input
              id="editor-text-duration"
              aria-label="Idotartam"
              className={styles.readerEditorInput}
              type="number"
              min={0}
              step={0.5}
              value={durationInputValue}
              onPointerDown={() => handleEditorFieldInteraction("duration")}
              onFocus={() => handleEditorFieldInteraction("duration")}
              onChange={(event) => updateEditorDuration(Number(event.target.value))}
            />
            <p className={styles.readerEditorNote}>
              {editorPreviewRunning
                ? "A preview fut. Space: megallitas."
                : "Space: preview az aktualis blokktol. Az idotartam a kovetkezo szunet hossza."}
            </p>
          </div>
        )}
        {showEditorExitDialog && (
          <div className={styles.readerEditorConfirmOverlay}>
            <div className={styles.readerEditorConfirm} role="alertdialog" aria-modal="true">
              <p className={styles.readerEditorConfirmTitle}>Szerkesztes lezarasa?</p>
              <p className={styles.readerEditorConfirmText}>
                {hasUnsavedDraft
                  ? "A piszkozat kulon van mentve. Döntsd el, hogy veglegesited vagy eldobod."
                  : "Nincs uj modositas. Mentessel vagy torlessel lephetsz vissza az olvasoba."}
              </p>
              <div className={styles.readerEditorConfirmActions}>
                <button
                  type="button"
                  className={styles.readerEditorConfirmCancel}
                  onClick={() => setShowEditorExitDialog(false)}
                  disabled={saveState === "saving"}
                >
                  Megse
                </button>
                <button
                  type="button"
                  className={styles.readerEditorConfirmSave}
                  onClick={() => {
                    void saveEditorDraft();
                  }}
                  disabled={saveState === "saving"}
                >
                  Mentes
                </button>
                <button
                  type="button"
                  className={styles.readerEditorConfirmDelete}
                  onClick={discardEditorDraft}
                  disabled={saveState === "saving"}
                >
                  Torles
                </button>
              </div>
            </div>
          </div>
        )}
        {showEndPanel && (
          <div className={styles.readerEndPanel}>
            <p>{endCopy}</p>
            <div className={styles.readerEndActions}>
              <button type="button" className="btn btn--ghost" onClick={restart}>
                Ujrainditas
              </button>
              <button type="button" className="btn btn--primary" onClick={handleExit}>
                Vissza a terbe
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        className={styles.readerMuteFab}
        aria-label={isMuted ? "Hang visszakapcsolasa" : "Hang elnemitasa"}
        onClick={(event) => {
          event.stopPropagation();
          setMuted(!isMuted);
        }}
      >
        {isMuted ? <VolumeX /> : <Volume2 />}
      </button>
    </div>
  );
}

