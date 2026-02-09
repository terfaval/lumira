// components/dreammap/DreamMapLayoutV2.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import type { DreamMapV2Edge, DreamMapV2Node } from "@/src/domain/dreammap/types_v2";
import { DreamMapGraphV2 } from "./DreamMapGraphV2";
import { DreamMapNodeDetailsV2 } from "./DreamMapNodeDetailsV2";
import styles from "./DreamMapLayout.module.css";

type AggregateResponse = {
  status: "ok" | "missing";
  meta: {
    computed_at: string;
    node_count?: number;
    edge_count?: number;
    reason?: string | null;
  };
  nodes: DreamMapV2Node[];
  edges: DreamMapV2Edge[];
};

export default function DreamMapLayoutV2() {
  const { loading: authLoading } = useRequireAuth();
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<DreamMapV2Edge | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAggregate = async () => {
    const res = await fetchWithAuth("/api/dreammap/v2/aggregate", { method: "GET" });
    if (res.status === 403) {
      setError("Vendegkent az alomter nem elerheto.");
      return { status: "missing", meta: { computed_at: new Date().toISOString() }, nodes: [], edges: [] } as AggregateResponse;
    }
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      setError(payload?.error ?? "Nem sikerult betolteni az alomteret.");
      return { status: "missing", meta: { computed_at: new Date().toISOString() }, nodes: [], edges: [] } as AggregateResponse;
    }
    return (await res.json()) as AggregateResponse;
  };

  const runBuild = async () => {
    setBuilding(true);
    try {
      const res = await fetchWithAuth("/api/dreammap/v2/build", { method: "POST" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error ?? "Nem sikerult felepiteni az alomteret.");
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerult felepiteni az alomteret.");
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      const payload = await fetchAggregate();
      if (!isMounted) return;
      setData(payload);

      if (payload.status === "missing" && !building) {
        await runBuild();
        const after = await fetchAggregate();
        if (!isMounted) return;
        setData(after);
      }

      setLoading(false);
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [authLoading]);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  useEffect(() => {
    if (selectedId && !nodesById.has(selectedId)) setSelectedId(null);
  }, [nodesById, selectedId]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes
      .filter((node) => (node.canonical ?? node.canonical_key ?? "").toLowerCase().includes(q))
      .slice(0, 20);
  }, [nodes, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    if (matches.length === 0) return;
    if (!selectedId || !matches.some((m) => m.id === selectedId)) {
      setSelectedId(matches[0].id);
    }
  }, [matches, searchQuery, selectedId]);

  const highlightIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const selectedNode = selectedId ? nodesById.get(selectedId) ?? null : null;

  const meta = data?.meta;
  const emptyState = nodes.length === 0;

  return (
    <Shell title="Alomter" space="dream">
      <FullScreenLoadingOverlay open={loading && !data} />
      <div className={styles.layout}>
        <div className={styles.panel}>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <div className={styles.panelTitle}>Kereses</div>
            <input
              className={styles.textInput}
              placeholder="Kereses canonical / key alapjan"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {matches.length > 0 ? (
              <div className={styles.searchList} style={{ marginTop: "var(--space-2)" }}>
                {matches.map((match) => (
                  <button
                    key={match.id}
                    className={styles.searchItem}
                    onClick={() => setSelectedId(match.id)}
                  >
                    <span>{match.canonical ?? match.canonical_key ?? match.id}</span>
                    <span className={styles.badge}>{match.axis_source}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </GlassCardSurface>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <div className={styles.panelTitle}>Meta</div>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.node_count ?? nodes.length}</div>
                <div className={styles.statLabel}>Node</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.edge_count ?? edges.length}</div>
                <div className={styles.statLabel}>El</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.reason ?? "-"}</div>
                <div className={styles.statLabel}>Allapot</div>
              </div>
            </div>
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-primary" disabled={building} onClick={runBuild}>
                {building ? "Epit..." : "V2 build"}
              </button>
            </div>
          </GlassCardSurface>
        </div>

        <div className={styles.panel}>
          <GlassCardSurface className={styles.graphCard} variant="flat" paper="evening">
            <div className={styles.graphToolbar}>
              <span className={styles.graphLegend}>
                {selectedNode ? `Kijelolve: ${selectedNode.canonical ?? selectedNode.canonical_key ?? selectedNode.id}` : "Kattints egy node-ra"}
              </span>
              {error ? <span style={{ color: "var(--danger)" }}>{error}</span> : null}
            </div>
            <div className={styles.graphWrap}>
              {emptyState ? (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    padding: "var(--space-3)",
                    textAlign: "center",
                  }}
                >
                  Meg nincs eleg adat az Alomterhez.
                </div>
              ) : (
                <DreamMapGraphV2
                  nodes={nodes}
                  edges={edges}
                  selectedId={selectedId}
                  highlightIds={highlightIds}
                  onSelectNode={setSelectedId}
                  onHoverEdge={setHoveredEdge}
                />
              )}
            </div>
          </GlassCardSurface>
        </div>

        <div className={styles.panel}>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <div className={styles.panelTitle}>Reszletek</div>
            <DreamMapNodeDetailsV2 node={selectedNode} edges={edges} nodesById={nodesById} hoveredEdge={hoveredEdge} />
          </GlassCardSurface>
        </div>
      </div>
    </Shell>
  );
}
