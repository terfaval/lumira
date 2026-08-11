import Link from "next/link";

import { MeditationSpace, loadMeditationAudioMap, loadMeditations } from "@/src/features/meditation";
import styles from "@/src/features/meditation/styles/meditations.module.css";

export const metadata = {
  title: "Meditáció",
  description: "Lassú, atmoszferikus meditációs tér",
};

export const dynamic = "force-dynamic";

export default async function MeditationPage() {
  const meditations = await loadMeditations();
  const audioMap = await loadMeditationAudioMap();

  return (
    <>
      <Link href="/" className={styles.backLink} aria-label="Vissza a főoldalra">
        <span className={styles.backIcon} aria-hidden="true">
          ‹
        </span>
        <span className={styles.backLabel}>vissza</span>
      </Link>
      <MeditationSpace meditations={meditations} audioMap={audioMap} />
    </>
  );
}
