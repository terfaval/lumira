// components/dreammap/DreamMapGraphV2.tsx
"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { DreamMapV2Edge, DreamMapV2Node } from "@/src/domain/dreammap/types_v2";

type GraphNode = DreamMapV2Node & { xPos: number; yPos: number };

function clampSigned(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= -1) return -1;
  if (value >= 1) return 1;
  return value;
}

const AXIS_LENGTH = 520;
const AXIS_PADDING = 24;

export function DreamMapGraphV2({
  nodes,
  edges,
  selectedId,
  highlightIds,
  onSelectNode,
  onHoverEdge,
}: {
  nodes: DreamMapV2Node[];
  edges: DreamMapV2Edge[];
  selectedId: string | null;
  highlightIds: Set<string>;
  onSelectNode: (id: string | null) => void;
  onHoverEdge: (edge: DreamMapV2Edge | null) => void;
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

  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const axisHalfX = Math.min(AXIS_LENGTH / 2, Math.max(0, centerX - AXIS_PADDING));
  const axisHalfY = Math.min(AXIS_LENGTH / 2, Math.max(0, centerY - AXIS_PADDING));

  const layout = useMemo(() => {
    return nodes.map((node) => {
      const x = clampSigned(node.x ?? 0);
      const y = clampSigned(node.y ?? 0);
      return {
        ...node,
        xPos: centerX + x * axisHalfX,
        yPos: centerY - y * axisHalfY,
      } as GraphNode;
    });
  }, [nodes, centerX, centerY, axisHalfX, axisHalfY]);

  const nodeById = new Map(layout.map((n) => [n.id, n]));
  const activeEdges = edges.filter((edge) => nodeById.has(edge.from) && nodeById.has(edge.to));

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <svg
        width={size.width}
        height={size.height}
        role="img"
        aria-label="Dream map v2"
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
          {activeEdges.map((edge) => {
            const from = nodeById.get(edge.from);
            const to = nodeById.get(edge.to);
            if (!from || !to) return null;
            const isActive = selectedId && (edge.from === selectedId || edge.to === selectedId);
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.xPos}
                y1={from.yPos}
                x2={to.xPos}
                y2={to.yPos}
                stroke={isActive ? "var(--accent)" : "var(--line-soft)"}
                strokeOpacity={isActive ? 0.8 : 0.35}
                strokeWidth={Math.max(1, edge.weight * 3)}
                onMouseEnter={() => onHoverEdge(edge)}
                onMouseLeave={() => onHoverEdge(null)}
              />
            );
          })}
        </g>
        <g>
          {layout.map((node) => {
            const isSelected = node.id === selectedId;
            const isHighlight = highlightIds.has(node.id);
            const radius = 5 + Math.min(1, node.occurrence / 6) * 8 + (isSelected ? 4 : 0) + (isHighlight ? 3 : 0);
            const fill = isSelected ? "var(--accent)" : "var(--text-muted)";
            const opacity = isSelected || isHighlight ? 0.95 : 0.7;
            return (
              <circle
                key={node.id}
                cx={node.xPos}
                cy={node.yPos}
                r={radius}
                fill={fill}
                fillOpacity={opacity}
                stroke="var(--bg-layer)"
                strokeWidth={isSelected ? 2 : 1}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(node.id);
                }}
                role="button"
                aria-label={node.canonical ?? node.canonical_key ?? node.id}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}
