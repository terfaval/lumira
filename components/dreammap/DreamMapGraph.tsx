"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { DreamMapEdge, DreamMapNode } from "@/src/domain/dreammap/types";

type GraphNode = DreamMapNode & { xPos: number; yPos: number };

function isFiniteNumber(value: number) {
  return Number.isFinite(value);
}

function hashToUnit(key: string, seed: number) {
  let hash = seed;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

function fallbackLayout(nodes: DreamMapNode[], width: number, height: number): GraphNode[] {
  const count = nodes.length;
  if (count === 0) return [];

  const safeWidth = Number.isFinite(width) && width > 0 ? width : 0;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 0;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const spacing = 48;
  const startX = safeWidth / 2 - ((cols - 1) * spacing) / 2;
  const startY = safeHeight / 2 - ((rows - 1) * spacing) / 2;

  return nodes.map((node, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return {
      ...node,
      xPos: startX + col * spacing,
      yPos: startY + row * spacing,
    };
  });
}

function collectSceneIndices(nodes: DreamMapNode[]) {
  const set = new Set<number>();
  for (const node of nodes) {
    if (Array.isArray(node.scene_indices)) {
      for (const idx of node.scene_indices) {
        if (Number.isFinite(idx)) set.add(idx);
      }
    }
    if (Array.isArray(node.primary_scene_indices)) {
      for (const idx of node.primary_scene_indices) {
        if (Number.isFinite(idx)) set.add(idx);
      }
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

function buildSceneAnchors(nodes: DreamMapNode[], width: number, height: number, padding: number) {
  const indices = collectSceneIndices(nodes);
  if (indices.length === 0) return new Map<number, { x: number; y: number }>();

  const maxRadius = Math.min(width, height) / 2 - padding * 2;
  const baseRadius = Math.min(width, height) * 0.35;
  const radius = Math.max(40, Math.min(maxRadius, baseRadius));
  const angleOffset = (hashToUnit("scene", indices.length) * 2 - 1) * Math.PI;

  const anchors = new Map<number, { x: number; y: number }>();
  if (indices.length === 1) {
    anchors.set(indices[0], { x: 0, y: 0 });
    return anchors;
  }

  const step = (Math.PI * 2) / indices.length;
  for (let i = 0; i < indices.length; i += 1) {
    const angle = angleOffset + i * step;
    anchors.set(indices[i], { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return anchors;
}

function computeLayout(nodes: DreamMapNode[], edges: DreamMapEdge[], width: number, height: number) {
  const count = nodes.length;
  if (count === 0) return [];
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return fallbackLayout(nodes, width, height);
  }

  const area = width * height;
  const k = Math.sqrt(area / Math.max(1, count));
  const padding = 24;

  const sceneAnchors = buildSceneAnchors(nodes, width, height, padding);
  const nodeByKey = new Map(nodes.map((node) => [node.key, node]));

  const positions = nodes.map((node, idx) => {
    const seed = idx + 17;
    const jitter = Math.max(12, k * 0.3);
    let anchorX = 0;
    let anchorY = 0;
    let anchorWeight = 0;

    if (sceneAnchors.size > 0) {
      const seen = new Set<number>();
      if (Array.isArray(node.scene_indices)) {
        for (const idxScene of node.scene_indices) {
          if (seen.has(idxScene)) continue;
          const anchor = sceneAnchors.get(idxScene);
          if (anchor) {
            anchorX += anchor.x;
            anchorY += anchor.y;
            anchorWeight += 1;
            seen.add(idxScene);
          }
        }
      }
      if (Array.isArray(node.primary_scene_indices)) {
        for (const idxScene of node.primary_scene_indices) {
          if (seen.has(idxScene)) continue;
          const anchor = sceneAnchors.get(idxScene);
          if (anchor) {
            anchorX += anchor.x * 1.8;
            anchorY += anchor.y * 1.8;
            anchorWeight += 1.8;
            seen.add(idxScene);
          }
        }
      }
    }

    let x = (hashToUnit(node.key, seed) - 0.5) * (width - padding * 2);
    let y = (hashToUnit(node.key, seed * 3) - 0.5) * (height - padding * 2);
    if (anchorWeight > 0) {
      x = anchorX / anchorWeight;
      y = anchorY / anchorWeight;
      x += (hashToUnit(node.key, seed * 5) - 0.5) * jitter;
      y += (hashToUnit(node.key, seed * 11) - 0.5) * jitter;
    }
    return { key: node.key, x, y, vx: 0, vy: 0 };
  });

  const byKey = new Map(positions.map((p) => [p.key, p]));
  const edgeList = edges
    .filter((edge) => byKey.has(edge.from) && byKey.has(edge.to))
    .map((edge) => ({
      ...edge,
      weight: isFiniteNumber(edge.weight) ? edge.weight : 0,
    }));

  const iterations = Math.min(120, 30 + count * 2);
  const damping = 0.85;
  const repulsion = k * k;
  const attraction = 1 / k;
  const sceneSpring = 0.02;
  const primarySceneSpring = 0.05;

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
        const force = dist * dist * attraction * (edge.weight ?? 0);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      if (sceneAnchors.size > 0) {
        const node = nodeByKey.get(a.key);
        if (node) {
          if (Array.isArray(node.scene_indices)) {
            for (const idxScene of node.scene_indices) {
              const anchor = sceneAnchors.get(idxScene);
              if (!anchor) continue;
              fx += (anchor.x - a.x) * sceneSpring;
              fy += (anchor.y - a.y) * sceneSpring;
            }
          }
          if (Array.isArray(node.primary_scene_indices)) {
            for (const idxScene of node.primary_scene_indices) {
              const anchor = sceneAnchors.get(idxScene);
              if (!anchor) continue;
              fx += (anchor.x - a.x) * primarySceneSpring;
              fy += (anchor.y - a.y) * primarySceneSpring;
            }
          }
        }
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

    const hasNonFinite = positions.some(
      (p) => !isFiniteNumber(p.x) || !isFiniteNumber(p.y) || !isFiniteNumber(p.vx) || !isFiniteNumber(p.vy)
    );
    if (hasNonFinite) {
      return fallbackLayout(nodes, width, height);
    }
  }

  const maxX = (width - padding * 2) / 2;
  const maxY = (height - padding * 2) / 2;

  return nodes.map((node) => {
    const p = byKey.get(node.key);
    if (!p || !isFiniteNumber(p.x) || !isFiniteNumber(p.y)) {
      return {
        ...node,
        xPos: width / 2,
        yPos: height / 2,
      };
    }
    const x = Math.max(-maxX, Math.min(maxX, p.x));
    const y = Math.max(-maxY, Math.min(maxY, p.y));
    return {
      ...node,
      xPos: x + width / 2,
      yPos: y + height / 2,
    };
  });
}

const AXIS_LENGTH = 520;
const AXIS_PADDING = 24;

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
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const axisHalfX = Math.min(AXIS_LENGTH / 2, Math.max(0, centerX - AXIS_PADDING));
  const axisHalfY = Math.min(AXIS_LENGTH / 2, Math.max(0, centerY - AXIS_PADDING));

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
          <line
            x1={centerX - axisHalfX}
            y1={centerY}
            x2={centerX + axisHalfX}
            y2={centerY}
            stroke="var(--line-soft)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
          <line
            x1={centerX}
            y1={centerY - axisHalfY}
            x2={centerX}
            y2={centerY + axisHalfY}
            stroke="var(--line-soft)"
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        </g>
        <g>
          {activeEdges.map((edge, idx) => {
            const from = nodeByKey.get(edge.from) as GraphNode | undefined;
            const to = nodeByKey.get(edge.to) as GraphNode | undefined;
            if (
              !from ||
              !to ||
              !isFiniteNumber(from.xPos) ||
              !isFiniteNumber(from.yPos) ||
              !isFiniteNumber(to.xPos) ||
              !isFiniteNumber(to.yPos)
            )
              return null;
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
            if (!isFiniteNumber(node.xPos) || !isFiniteNumber(node.yPos)) return null;
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
