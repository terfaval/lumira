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

  const sceneIndices = node.scene_indices;
  const primarySceneIndices = node.primary_scene_indices;
  const scenePresenceCount = sceneIndices?.length ?? node.scene_presence_count ?? null;
  const primarySceneCount = primarySceneIndices?.length ?? node.primary_scene_count ?? null;
  const coreRate =
    scenePresenceCount != null && primarySceneCount != null
      ? `${primarySceneCount}/${scenePresenceCount}`
      : "-";

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
          <div className={styles.statValue}>{formatNumber(node.scene_presence_count, 0)}</div>
          <div className={styles.statLabel}>Scene jelenlet</div>
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
          <div className={styles.statValue}>{formatNumber(node.primary_scene_count, 0)}</div>
          <div className={styles.statLabel}>Primary scene</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{formatNumber(node.porosity, 2)}</div>
          <div className={styles.statLabel}>Porozitas</div>
        </div>
      </div>

      <div>
        <div className={styles.panelTitle}>Scene footprint</div>
        <div className={styles.detailList}>
          <div className={styles.detailEdge}>
            <span>Scenes</span>
            <span className={styles.badge}>
              {sceneIndices && sceneIndices.length > 0 ? sceneIndices.join(", ") : "-"}
            </span>
          </div>
          {primarySceneIndices !== undefined ? (
            <div className={styles.detailEdge}>
              <span>Core in scenes</span>
              <span className={styles.badge}>
                {primarySceneIndices.length > 0 ? primarySceneIndices.join(", ") : "-"}
              </span>
            </div>
          ) : null}
          <div className={styles.detailEdge}>
            <span>Core rate</span>
            <span className={styles.badge}>{coreRate}</span>
          </div>
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
