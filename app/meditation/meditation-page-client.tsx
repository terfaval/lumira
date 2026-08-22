"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import MeditationSpace from "@/src/features/meditation/components/MeditationSpace";
import type { Meditation } from "@/src/features/meditation/lib/meditation-types";
import type { MeditationAudioMap } from "@/src/features/meditation/lib/audio-types";
import styles from "@/src/features/meditation/styles/meditations.module.css";

type Props = {
  meditations: Meditation[];
  audioMap: MeditationAudioMap;
  isAdmin: boolean;
};

export default function MeditationPageClient({ meditations, audioMap, isAdmin }: Props) {
  const router = useRouter();
  const [readerOpen, setReaderOpen] = useState(false);
  const [editorMode, setEditorMode] = useState(false);

  const handleBack = () => {
    if (editorMode) return;
    if (readerOpen) {
      window.dispatchEvent(new CustomEvent("meditation-reader-close-request"));
      return;
    }
    router.push("/");
  };

  return (
    <>
      <button type="button" className={styles.backLink} aria-label="Vissza a meditacios terbe" onClick={handleBack}>
        <span className={styles.backIcon} aria-hidden="true">
          ←
        </span>
        <span className={styles.backLabel}>{readerOpen ? "vissza" : "fooldal"}</span>
      </button>
      <MeditationSpace
        meditations={meditations}
        audioMap={audioMap}
        isAdmin={isAdmin}
        onReaderOpenChange={setReaderOpen}
        onEditorModeChange={setEditorMode}
      />
    </>
  );
}
