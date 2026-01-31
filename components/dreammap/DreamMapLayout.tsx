"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { GlassCardSurface } from "@/components/GlassCardSurface/GlassCardSurface";
import { FullScreenLoadingOverlay } from "@/components/FullScreenLoadingOverlay";
import { useRequireAuth } from "@/src/hooks/useRequireAuth";
import { fetchWithAuth } from "@/src/lib/api/fetchWithAuth";
import type { DreamMapEdge, DreamMapNode, DreamMapNodeKind } from "@/src/domain/dreammap/types";
import { DreamMapGraph } from "./DreamMapGraph";
import { DreamMapFilters } from "./DreamMapFilters";
import { DreamMapNodeDetails } from "./DreamMapNodeDetails";
import styles from "./DreamMapLayout.module.css";

type RangeOption = "30d" | "90d" | "all";

type AggregateResponse = {
  status: "ok";
  meta: {
    range: string;
    kinds: string[];
    sessions_used: number;
    node_count: number;
    edge_count: number;
    computed_at: string;
  };
  nodes: DreamMapNode[];
  edges: DreamMapEdge[];
};

const KIND_DEFAULTS: DreamMapNodeKind[] = ["people", "places", "objects", "themes_words"];
const ALL_KINDS: DreamMapNodeKind[] = [
  "people",
  "places",
  "objects",
  "actions",
  "sensations",
  "mood_words",
  "themes_words",
];

function buildKindState() {
  const state: Record<DreamMapNodeKind, boolean> = {
    people: false,
    places: false,
    objects: false,
    actions: false,
    sensations: false,
    mood_words: false,
    themes_words: false,
  };
  for (const key of KIND_DEFAULTS) state[key] = true;
  return state;
}

export default function DreamMapLayout() {
  const { loading: authLoading } = useRequireAuth();
  const [range, setRange] = useState<RangeOption>("30d");
  const [kinds, setKinds] = useState<Record<DreamMapNodeKind, boolean>>(buildKindState);
  const [limitNodes, setLimitNodes] = useState(50);
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const activeKinds = useMemo(
    () => ALL_KINDS.filter((kind) => kinds[kind]),
    [kinds]
  );

  useEffect(() => {
    if (authLoading) return;
    let isMounted = true;

    async function loadAggregate() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set("range", range);
      params.set("kinds", activeKinds.join(","));
      params.set("limit_nodes", String(limitNodes));
      params.set("limit_edges", String(Math.min(1000, Math.max(200, limitNodes * 6))));

      try {
        const res = await fetchWithAuth(`/api/dreammap/aggregate?${params.toString()}`, {
          method: "GET",
        });
        if (!isMounted) return;

        if (res.status === 403) {
          setError("Vendegkent az alomter nem elerheto.");
          setData({ status: "ok", meta: { range, kinds: activeKinds, sessions_used: 0, node_count: 0, edge_count: 0, computed_at: new Date().toISOString() }, nodes: [], edges: [] });
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          setError(payload?.error ?? "Nem sikerult betolteni az alomteret.");
          setData({ status: "ok", meta: { range, kinds: activeKinds, sessions_used: 0, node_count: 0, edge_count: 0, computed_at: new Date().toISOString() }, nodes: [], edges: [] });
          setLoading(false);
          return;
        }

        const payload = (await res.json()) as AggregateResponse;
        setData(payload);
        setLoading(false);
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError("Nem sikerult betolteni az alomteret.");
        setData({ status: "ok", meta: { range, kinds: activeKinds, sessions_used: 0, node_count: 0, edge_count: 0, computed_at: new Date().toISOString() }, nodes: [], edges: [] });
        setLoading(false);
      }
    }

    loadAggregate();
    return () => {
      isMounted = false;
    };
  }, [authLoading, range, activeKinds, limitNodes]);

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  const nodesByKey = useMemo(() => new Map(nodes.map((node) => [node.key, node])), [nodes]);

  useEffect(() => {
    if (selectedKey && !nodesByKey.has(selectedKey)) {
      setSelectedKey(null);
    }
  }, [nodesByKey, selectedKey]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter((node) => node.label.toLowerCase().includes(q)).slice(0, 20);
  }, [nodes, searchQuery]);

  useEffect(() => {
    if (!searchQuery.trim()) return;
    if (matches.length === 0) return;
    if (!selectedKey || !matches.some((m) => m.key === selectedKey)) {
      setSelectedKey(matches[0].key);
    }
  }, [matches, searchQuery, selectedKey]);

  const highlightKeys = useMemo(() => new Set(matches.map((m) => m.key)), [matches]);
  const selectedNode = selectedKey ? nodesByKey.get(selectedKey) ?? null : null;

  const meta = data?.meta;
  const emptyState = meta?.sessions_used === 0;

  const toggleKind = (kind: DreamMapNodeKind) => {
    setKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  return (
    <Shell title="Alomter" space="dream">
      <FullScreenLoadingOverlay open={loading && !data} />
      <div className={styles.layout}>
        <div className={styles.panel}>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <DreamMapFilters
              range={range}
              onRangeChange={setRange}
              kinds={kinds}
              onToggleKind={toggleKind}
              limitNodes={limitNodes}
              onLimitNodesChange={setLimitNodes}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              matches={matches}
              onSelectMatch={setSelectedKey}
            />
          </GlassCardSurface>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <div className={styles.panelTitle}>Meta</div>
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.sessions_used ?? 0}</div>
                <div className={styles.statLabel}>Session</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.node_count ?? 0}</div>
                <div className={styles.statLabel}>Node</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{meta?.edge_count ?? 0}</div>
                <div className={styles.statLabel}>El</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{range}</div>
                <div className={styles.statLabel}>Idotav</div>
              </div>
            </div>
          </GlassCardSurface>
        </div>

        <div className={styles.panel}>
          <GlassCardSurface className={styles.graphCard} variant="flat" paper="evening">
            <div className={styles.graphToolbar}>
              <span className={styles.graphLegend}>
                {selectedNode ? `Kijelolve: ${selectedNode.label}` : "Kattints egy node-ra"}
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
                <DreamMapGraph
                  nodes={nodes}
                  edges={edges}
                  selectedKey={selectedKey}
                  highlightKeys={highlightKeys}
                  onSelectNode={setSelectedKey}
                />
              )}
            </div>
          </GlassCardSurface>
        </div>

        <div className={styles.panel}>
          <GlassCardSurface className={styles.panelCard} variant="flat" paper="evening">
            <div className={styles.panelTitle}>Reszletek</div>
            <DreamMapNodeDetails node={selectedNode} edges={edges} nodesByKey={nodesByKey} />
          </GlassCardSurface>
        </div>
      </div>
    </Shell>
  );
}
