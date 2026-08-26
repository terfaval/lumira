"use client";

import Image from "next/image";

import { getFortuneCardArtworkPath } from "@/src/features/fortune-journaling/artwork";
import type {
  FortuneJournalEntry,
  FortuneJournalSort,
  FortuneJournalStatusFilter,
} from "@/src/features/fortune-journaling/journal";
import styles from "@/src/features/fortune-journaling/fortune-journaling-page-client.module.css";

interface FortuneJournalViewProps {
  entries: FortuneJournalEntry[];
  modeOptions: Array<{ id: string; name: string }>;
  selectedModeId: string | null;
  selectedSort: FortuneJournalSort;
  selectedStatus: FortuneJournalStatusFilter | null;
  onModeChange: (modeId: string | null) => void;
  onSortChange: (sort: FortuneJournalSort) => void;
  onStatusChange: (status: FortuneJournalStatusFilter | null) => void;
  onBackToLibrary: () => void;
}

function getStatusOptionLabel(status: FortuneJournalStatusFilter): string {
  if (status === "active") {
    return "Aktív";
  }

  if (status === "paused") {
    return "Szünetel";
  }

  return "Lezárt";
}

export default function FortuneJournalView({
  entries,
  modeOptions,
  selectedModeId,
  selectedSort,
  selectedStatus,
  onModeChange,
  onSortChange,
  onStatusChange,
  onBackToLibrary,
}: FortuneJournalViewProps) {
  return (
    <section className={styles.journalSurface}>
      <header className={styles.journalHeader}>
        <div className={styles.journalHeadingBlock}>
          <h1 className={styles.journalTitle}>Korábbi vetések és reflexiók</h1>
          <p className={styles.journalLead}>Itt jelennek meg azok a vetések, amelyekben már elkezdtél reflektálni.</p>
        </div>

        <div className={styles.journalFilters}>
          <label className={styles.journalFilter}>
            <span>Rendezés</span>
            <select value={selectedSort} onChange={(event) => onSortChange(event.target.value as FortuneJournalSort)}>
              <option value="latest">Legutóbbi</option>
              <option value="oldest">Legrégebbi</option>
            </select>
          </label>

          <label className={styles.journalFilter}>
            <span>Vetés</span>
            <select value={selectedModeId ?? ""} onChange={(event) => onModeChange(event.target.value || null)}>
              <option value="">Összes</option>
              {modeOptions.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.journalFilter}>
            <span>Állapot</span>
            <select value={selectedStatus ?? ""} onChange={(event) => onStatusChange((event.target.value as FortuneJournalStatusFilter) || null)}>
              <option value="">Összes</option>
              <option value="active">Aktív</option>
              <option value="paused">Szünetel</option>
              <option value="completed">Lezárt</option>
            </select>
          </label>
        </div>
      </header>

      {entries.length > 0 ? (
        <div className={styles.journalList}>
          {entries.map((entry) => (
            <a className={styles.journalRow} key={entry.sessionId} href={`/fortune?session=${encodeURIComponent(entry.sessionId)}`}>
              <div className={styles.journalCardsColumn}>
                <div className={styles.journalCardStrip} data-card-count={entry.cardCount}>
                  {entry.cards.map((card) => (
                    <span className={styles.journalCardThumb} key={card.id}>
                      <Image
                        className={styles.journalCardThumbImage}
                        src={getFortuneCardArtworkPath(card)}
                        alt={card.name_hu}
                        width={140}
                        height={196}
                        unoptimized
                      />
                    </span>
                  ))}
                </div>
              </div>

              <div className={styles.journalModeColumn}>
                <p className={styles.journalModeName}>{entry.modeName}</p>
                <p className={styles.journalModeMeta}>
                  {entry.cardCount} lap · {getStatusOptionLabel(entry.status)}
                </p>
              </div>

              <div className={styles.journalContextColumn}>
                <p className={styles.journalPreview}>{entry.preview}</p>
                <p className={styles.journalDate}>{entry.lastActivityLabel}</p>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className={styles.journalEmptyState}>
          <p>Itt jelennek majd meg azok a vetések, amelyekben már elkezdtél reflektálni.</p>
          <button className={styles.secondaryButton} type="button" onClick={onBackToLibrary}>
            Vissza a Fortune könyvtárhoz
          </button>
        </div>
      )}
    </section>
  );
}
