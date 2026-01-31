"use client";

import type { DreamMapNode, DreamMapNodeKind } from "@/src/domain/dreammap/types";
import styles from "./DreamMapLayout.module.css";

type RangeOption = "30d" | "90d" | "all";

const KIND_LABELS: Record<DreamMapNodeKind, string> = {
  people: "Szereplok",
  places: "Helyek",
  objects: "Targyak",
  actions: "Akciok",
  sensations: "Erzetek",
  mood_words: "Hangulat",
  themes_words: "Temak",
};

export function DreamMapFilters({
  range,
  onRangeChange,
  kinds,
  onToggleKind,
  limitNodes,
  onLimitNodesChange,
  searchQuery,
  onSearchChange,
  matches,
  onSelectMatch,
}: {
  range: RangeOption;
  onRangeChange: (range: RangeOption) => void;
  kinds: Record<DreamMapNodeKind, boolean>;
  onToggleKind: (kind: DreamMapNodeKind) => void;
  limitNodes: number;
  onLimitNodesChange: (value: number) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  matches: DreamMapNode[];
  onSelectMatch: (key: string) => void;
}) {
  return (
    <div className={styles.filtersStack}>
      <div>
        <div className={styles.panelTitle}>Idotav</div>
        <div className={styles.rangeButtons}>
          {(["30d", "90d", "all"] as RangeOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              className={`btn ${range === opt ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onRangeChange(opt)}
            >
              {opt === "30d" ? "30 nap" : opt === "90d" ? "90 nap" : "Osszes"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Node tipusa</div>
        <div className={styles.toggleGrid}>
          {(Object.keys(kinds) as DreamMapNodeKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`btn ${kinds[kind] ? "btn-primary" : "btn-secondary"}`}
              onClick={() => onToggleKind(kind)}
            >
              {KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Top N node</div>
        <input
          type="range"
          min={10}
          max={100}
          step={5}
          value={limitNodes}
          onChange={(e) => onLimitNodesChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div className={styles.muted} style={{ marginTop: 6 }}>
          {limitNodes} node
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Kereses cimke szerint</div>
        <input
          type="text"
          className={styles.textInput}
          placeholder="Pl. anya, tenger, haz"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery.trim().length > 0 && (
          <div style={{ marginTop: "var(--space-2)" }}>
            {matches.length === 0 ? (
              <div className={styles.muted}>Nincs talalat.</div>
            ) : (
              <div className={styles.searchList}>
                {matches.map((node) => (
                  <button
                    key={node.key}
                    type="button"
                    className={styles.searchItem}
                    onClick={() => onSelectMatch(node.key)}
                  >
                    <span>{node.label}</span>
                    <span className={styles.badge}>{node.kind}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
