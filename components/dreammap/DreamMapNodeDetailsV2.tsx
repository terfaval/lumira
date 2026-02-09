// components/dreammap/DreamMapNodeDetailsV2.tsx
"use client";

import type { DreamMapV2Edge, DreamMapV2Node } from "@/src/domain/dreammap/types_v2";
import styles from "./DreamMapLayout.module.css";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

export function DreamMapNodeDetailsV2({
  node,
  edges,
  nodesById,
  hoveredEdge,
}: {
  node: DreamMapV2Node | null;
  edges: DreamMapV2Edge[];
  nodesById: Map<string, DreamMapV2Node>;
  hoveredEdge: DreamMapV2Edge | null;
}) {
  if (!node) {
    return <div className={styles.muted}>Valassz egy node-ot a terkeprol.</div>;
  }

  const connected = edges
    .filter((edge) => edge.from === node.id || edge.to === node.id)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);

  const evidence = node.evidence?.slice(0, 5) ?? [];

  return (
    <div className={styles.detailList}>
      <div>
        <div className={styles.panelTitle}>Kivalasztott node</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{node.canonical ?? node.canonical_key ?? node.id}</div>
        <div className={styles.muted} style={{ marginTop: 4 }}>
          {node.canonical_key ?? "-"}
        </div>
      </div>

      <div className={styles.detailList}>
        <div className={styles.detailEdge}>
          <span>archetype_term_id</span>
          <span className={styles.badge}>{node.archetype_term_id ?? "-"}</span>
        </div>
        <div className={styles.detailEdge}>
          <span>axis source</span>
          <span className={styles.badge}>{node.axis_source}</span>
        </div>
        <div className={styles.detailEdge}>
          <span>x / y</span>
          <span className={styles.badge}>
            {formatNumber(node.x, 2)} / {formatNumber(node.y, 2)}
          </span>
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.occurrence, 0)}</div>
          <div className={styles.statLabel}>Elofordulas</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.degree, 2)}</div>
          <div className={styles.statLabel}>Kapcsolati suly</div>
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Node evidence</div>
        {evidence.length === 0 ? (
          <div className={styles.muted}>Nincs evidencia.</div>
        ) : (
          <div className={styles.detailList}>
            {evidence.map((ev, idx) => (
              <div key={`${ev.source}-${idx}`} className={styles.detailEdge}>
                <span>{ev.source}</span>
                <span className={styles.badge}>
                  {ev.source === "highlight" ? ev.highlight_id : ev.session_id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className={styles.panelTitle}>Kapcsolatok</div>
        {connected.length === 0 ? (
          <div className={styles.muted}>Nincs kapcsolodasi el.</div>
        ) : (
          <div className={styles.detailList}>
            {connected.map((edge) => {
              const otherId = edge.from === node.id ? edge.to : edge.from;
              const other = nodesById.get(otherId);
              return (
                <div key={`${edge.from}-${edge.to}`} className={styles.detailEdge}>
                  <span>{other?.canonical ?? other?.canonical_key ?? otherId}</span>
                  <span className={styles.badge}>{formatNumber(edge.weight, 2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {hoveredEdge ? (
        <div>
          <div className={styles.panelTitle}>Edge evidence</div>
          <div className={styles.detailList}>
            {hoveredEdge.evidence.slice(0, 5).map((ev, idx) => (
              <div key={`${ev.source}-${idx}`} className={styles.detailEdge}>
                <span>{ev.source}</span>
                <span className={styles.badge}>
                  {ev.source === "highlight" ? ev.highlight_ids.join(" / ") : ev.session_id}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
