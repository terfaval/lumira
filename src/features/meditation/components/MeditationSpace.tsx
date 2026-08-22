"use client";

import { useEffect, useMemo, useState } from "react";
import type { Meditation, MeditationEndBehavior } from "../lib/meditation-types";
import MeditationCenterFocus from "./MeditationCenterFocus";
import MeditationRing from "./MeditationRing";
import MeditationPreviewPanel from "./MeditationPreviewPanel";
import MeditationReader from "./MeditationReader";
import styles from "../styles/meditations.module.css";
import type { MeditationAudioMap } from "../lib/audio-types";
import { replaceMeditationReaderBlocks } from "../lib/meditation-utils";

type Props = {
  meditations: Meditation[];
  audioMap: MeditationAudioMap;
  isAdmin?: boolean;
  onReaderOpenChange?: (readerOpen: boolean) => void;
  onEditorModeChange?: (editorMode: boolean) => void;
};

export default function MeditationSpace({
  meditations: initialMeditations,
  audioMap,
  isAdmin,
  onReaderOpenChange,
  onEditorModeChange,
}: Props) {
  const [meditations, setMeditations] = useState(initialMeditations);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [readerId, setReaderId] = useState<string | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerCompleted, setReaderCompleted] = useState(false);

  useEffect(() => {
    setMeditations(initialMeditations);
  }, [initialMeditations]);

  useEffect(() => {
    const body = document.body;
    const previous = {
      backgroundImage: body.style.backgroundImage,
      backgroundColor: body.style.backgroundColor,
      backgroundRepeat: body.style.backgroundRepeat,
      backgroundSize: body.style.backgroundSize,
      backgroundPosition: body.style.backgroundPosition,
      backgroundBlendMode: body.style.backgroundBlendMode,
    };

    body.style.backgroundImage = 'url("/backgrounds/meditations_background.png")';
    body.style.backgroundColor = "#05080e";
    body.style.backgroundRepeat = "no-repeat";
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";
    body.style.backgroundBlendMode = "normal";

    return () => {
      body.style.backgroundImage = previous.backgroundImage;
      body.style.backgroundColor = previous.backgroundColor;
      body.style.backgroundRepeat = previous.backgroundRepeat;
      body.style.backgroundSize = previous.backgroundSize;
      body.style.backgroundPosition = previous.backgroundPosition;
      body.style.backgroundBlendMode = previous.backgroundBlendMode;
    };
  }, []);

  const hovered = useMemo(
    () => meditations.find((meditation) => meditation.id === hoveredId) ?? null,
    [meditations, hoveredId]
  );

  const selected = useMemo(
    () => meditations.find((meditation) => meditation.id === selectedId) ?? null,
    [meditations, selectedId]
  );

  const focused = hovered ?? selected;

  const readerMeditation = useMemo(
    () => meditations.find((meditation) => meditation.id === readerId) ?? null,
    [meditations, readerId]
  );
  const readerAudioConfig = useMemo(() => {
    if (!readerMeditation) return null;
    return audioMap.items[readerMeditation.id]?.audio ?? null;
  }, [audioMap, readerMeditation]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setHoveredId(id);
  };

  const closePreview = () => {
    setSelectedId(null);
    setHoveredId(null);
  };

  const openReader = () => {
    if (!selected) return;
    setReaderId(selected.id);
    setReaderCompleted(false);
    setReaderOpen(true);
  };

  const closeReader = () => {
    setReaderOpen(false);
    setReaderId(null);
    onEditorModeChange?.(false);
  };

  const handleReaderComplete = (behavior: MeditationEndBehavior) => {
    if (behavior !== "fade_out") {
      setReaderCompleted(true);
    }
  };

  const handleReaderBlocksSaved = (meditationId: string, blocks: Meditation["reader"]["blocks"]) => {
    setMeditations((current) => replaceMeditationReaderBlocks(current, meditationId, blocks));
  };

  useEffect(() => {
    onReaderOpenChange?.(readerOpen);
  }, [onReaderOpenChange, readerOpen]);

  useEffect(() => {
    const onReaderCloseRequest = () => {
      closeReader();
    };
    window.addEventListener("meditation-reader-close-request", onReaderCloseRequest);
    return () => window.removeEventListener("meditation-reader-close-request", onReaderCloseRequest);
  }, [onEditorModeChange]);

  useEffect(() => {
    if (!selected || readerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePreview();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readerOpen, selected]);

  return (
    <section className={`${styles.space} ${readerOpen ? styles.spaceReaderOpen : ""}`}>
      <div className={styles.spaceInner}>
        {!readerOpen && <MeditationCenterFocus meditation={focused} />}
        <MeditationRing
          meditations={meditations}
          hoveredId={hoveredId}
          selectedId={selectedId}
          onHover={setHoveredId}
          onSelect={handleSelect}
        />
        {selected && !readerOpen && (
          <div className={styles.previewBackdrop} onClick={closePreview}>
            <MeditationPreviewPanel
              meditation={selected}
              onEnter={() => {
                openReader();
              }}
              onClose={closePreview}
            />
          </div>
        )}
        {readerCompleted && !readerOpen && (
          <div className={styles.readerReturnHint}>A csend marad. Válassz újra.</div>
        )}
      </div>
      {readerOpen && readerMeditation && (
        <MeditationReader
          meditation={readerMeditation}
          audioConfig={readerAudioConfig}
          onExit={closeReader}
          onComplete={handleReaderComplete}
          onEditorModeChange={onEditorModeChange}
          onReaderBlocksSaved={handleReaderBlocksSaved}
          isAdmin={isAdmin}
        />
      )}
    </section>
  );
}
