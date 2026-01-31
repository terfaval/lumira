"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { DreamMapEdge, DreamMapNode } from "@/src/domain/dreammap/types";

type GraphNode = DreamMapNode & { xPos: number; yPos: number };

function hashToUnit(key: string, seed: number) {
  let hash = seed;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function computeLayout(nodes: DreamMapNode[], edges: DreamMapEdge[], width: number, height: number) {
  const count = nodes.length;
  if (count === 0 || width <= 0 || height <= 0) return [];

  const area = width * height;
  const k = Math.sqrt(area / Math.max(1, count));
  const padding = 24;

  const positions = nodes.map((node, idx) => {
    const seed = idx + 17;
    const x = (hashToUnit(node.key, seed) - 0.5) * (width - padding * 2);
    const y = (hashToUnit(node.key, seed * 3) - 0.5) * (height - padding * 2);
    return { key: node.key, x, y, vx: 0, vy: 0 };
  });

  const byKey = new Map(positions.map((p) => [p.key, p]));
  const edgeList = edges.filter((edge) => byKey.has(edge.from) && byKey.has(edge.to));

  const iterations = Math.min(120, 30 + count * 2);
  const damping = 0.85;
  const repulsion = k * k;
  const attraction = 1 / k;

  for (let iter = 0; iter < iterations; iter += 1) {
    for (let i = 0; i < positions.length; i += 1) {
      const a = positions[i];
      let fx = 0;
      let fy = 0;

      for (let j = 0; j < positions.length; j += 1) {
        if (i === j) continue;
        const b = positions[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = repulsion / dist;
        dx /= dist;
        dy /= dist;
        fx += dx * force;
        fy += dy * force;
      }

      for (const edge of edgeList) {
        if (edge.from !== a.key && edge.to !== a.key) continue;
        const other = edge.from === a.key ? byKey.get(edge.to) : byKey.get(edge.from);
        if (!other) continue;
        const dx = other.x - a.x;
        const dy = other.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
        const force = (dist * dist) * attraction * (edge.weight || 0.2);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      const centering = 0.01;
      fx += -a.x * centering;
      fy += -a.y * centering;

      a.vx = (a.vx + fx) * damping;
      a.vy = (a.vy + fy) * damping;
    }

    for (const p of positions) {
      p.x += p.vx * 0.04;
      p.y += p.vy * 0.04;
    }
  }

  const maxX = (width - padding * 2) / 2;
  const maxY = (height - padding * 2) / 2;

  return nodes.map((node) => {
    const p = byKey.get(node.key);
    const x = p ? Math.max(-maxX, Math.min(maxX, p.x)) : 0;
    const y = p ? Math.max(-maxY, Math.min(maxY, p.y)) : 0;
    return {
      ...node,
      xPos: x + width / 2,
      yPos: y + height / 2,
    };
  });
}

export function DreamMapGraph({
  nodes,
  edges,
  selectedKey,
  highlightKeys,
  onSelectNode,
}: {
  nodes: DreamMapNode[];
  edges: DreamMapEdge[];
  selectedKey: string | null;
  highlightKeys: Set<string>;
  onSelectNode: (key: string | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      setSize({ width: rect.width, height: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = useMemo(
    () => computeLayout(nodes, edges, size.width, size.height),
    [nodes, edges, size.width, size.height]
  );

  const neighborKeys = useMemo(() => {
    if (!selectedKey) return new Set<string>();
    const set = new Set<string>();
    for (const edge of edges) {
      if (edge.from === selectedKey) set.add(edge.to);
      if (edge.to === selectedKey) set.add(edge.from);
    }
    return set;
  }, [edges, selectedKey]);

  const nodeByKey = new Map(layout.map((n) => [n.key, n]));
  const activeEdges = edges.filter((edge) => nodeByKey.has(edge.from) && nodeByKey.has(edge.to));

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <svg
        width={size.width}
        height={size.height}
        role="img"
        aria-label="Dream map"
        onClick={() => onSelectNode(null)}
      >
        <g>
          {activeEdges.map((edge, idx) => {
            const from = nodeByKey.get(edge.from) as GraphNode | undefined;
            const to = nodeByKey.get(edge.to) as GraphNode | undefined;
            if (!from || !to) return null;
            const isActive =
              selectedKey && (edge.from === selectedKey || edge.to === selectedKey);
            return (
              <line
                key={`${edge.from}-${edge.to}-${idx}`}
                x1={from.xPos}
                y1={from.yPos}
                x2={to.xPos}
                y2={to.yPos}
                stroke={isActive ? "var(--accent)" : "var(--line-soft)"}
                strokeOpacity={isActive ? 0.8 : 0.35}
                strokeWidth={Math.max(1, edge.weight * 3)}
              />
            );
          })}
        </g>
        <g>
          {layout.map((node) => {
            const isSelected = node.key === selectedKey;
            const isNeighbor = neighborKeys.has(node.key);
            const isHighlight = highlightKeys.has(node.key);
            const radius = 5 + node.z * 10 + (isSelected ? 4 : 0) + (isHighlight ? 3 : 0);
            const fill = isSelected
              ? "var(--accent)"
              : isNeighbor
              ? "var(--accent-2)"
              : "var(--text-muted)";
            const opacity = isSelected || isNeighbor || isHighlight ? 0.95 : 0.7;
            return (
              <circle
                key={node.key}
                cx={node.xPos}
                cy={node.yPos}
                r={radius}
                fill={fill}
                fillOpacity={opacity}
                stroke="var(--bg-layer)"
                strokeWidth={isSelected ? 2 : 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.key);
                }}
                role="button"
                aria-label={node.label}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
