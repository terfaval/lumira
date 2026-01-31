"use client";

import type { DreamMapEdge, DreamMapNode } from "@/src/domain/dreammap/types";
import styles from "./DreamMapLayout.module.css";

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "-";
  return value.toFixed(digits);
}

export function DreamMapNodeDetails({
  node,
  edges,
  nodesByKey,
}: {
  node: DreamMapNode | null;
  edges: DreamMapEdge[];
  nodesByKey: Map<string, DreamMapNode>;
}) {
  if (!node) {
    return <div className={styles.muted}>Valassz egy node-ot a terkeprol.</div>;
  }

  const connected = edges
    .filter((edge) => edge.from === node.key || edge.to === node.key)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 12);

  return (
    <div className={styles.detailList}>
      <div>
        <div className={styles.panelTitle}>Kivalasztott node</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{node.label}</div>
        <div className={styles.muted} style={{ marginTop: 4 }}>
          {node.kind}
        </div>
      </div>

      <div className={styles.statGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.occurrence, 0)}</div>
          <div className={styles.statLabel}>Eloszorul</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.z, 2)}</div>
          <div className={styles.statLabel}>Relevancia (z)</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.centrality, 2)}</div>
          <div className={styles.statLabel}>Centralitas</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.porosity, 2)}</div>
          <div className={styles.statLabel}>Porozitas</div>
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Kapcsolatok</div>
        {connected.length === 0 ? (
          <div className={styles.muted}>Nincs kapcsolodasi el.</div>
        ) : (
          <div className={styles.detailList}>
            {connected.map((edge) => {
              const otherKey = edge.from === node.key ? edge.to : edge.from;
              const other = nodesByKey.get(otherKey);
              return (
                <div key={`${edge.from}-${edge.to}`} className={styles.detailEdge}>
                  <span>{other?.label ?? otherKey}</span>
                  <span className={styles.badge}>{formatNumber(edge.weight, 2)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
