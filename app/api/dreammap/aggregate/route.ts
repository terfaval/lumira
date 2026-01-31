import { NextResponse } from "next/server";
import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import type {
  DreamMapEdge,
  DreamMapNode,
  DreamMapNodeKind,
  DreamMapPayloadV0,
} from "@/src/domain/dreammap/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeOption = "30d" | "90d" | "all";

const ALL_KINDS: DreamMapNodeKind[] = [
  "people",
  "places",
  "objects",
  "actions",
  "sensations",
  "mood_words",
  "themes_words",
];

const DEFAULT_RANGE: RangeOption = "30d";
const DEFAULT_LIMIT_NODES = 50;
const DEFAULT_LIMIT_EDGES = 200;
const MAX_LIMIT_NODES = 200;
const MAX_LIMIT_EDGES = 1000;

const W_OCC = 0.6;
const W_CENT = 0.4;

type AggNode = {
  key: string;
  label: string;
  kind: DreamMapNodeKind;
  occurrence: number;
  centralitySum: number;
  centralityCount: number;
  labelOcc: number;
  evidenceKeys: Set<string>;
  evidence: Array<{ source: "observation" | "anchors" | "glossary"; path: string }>;
};

type AggEdge = {
  from: string;
  to: string;
  weightSum: number;
  evidenceKeys: Set<string>;
  evidence: Array<{ source: "observation"; path: string; explicit?: boolean }>;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parseRange(raw: string | null): RangeOption {
  if (raw === "30d" || raw === "90d" || raw === "all") return raw;
  return DEFAULT_RANGE;
}

function parseLimit(raw: string | null, def: number, cap: number) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return def;
  return clamp(Math.round(n), 1, cap);
}

function parseKinds(raw: string | null): DreamMapNodeKind[] {
  if (!raw) return [...ALL_KINDS];
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const set = new Set<DreamMapNodeKind>();
  for (const part of parts) {
    if ((ALL_KINDS as string[]).includes(part)) set.add(part as DreamMapNodeKind);
  }

  return set.size > 0 ? Array.from(set) : [...ALL_KINDS];
}

function rangeStart(range: RangeOption): string | null {
  if (range === "all") return null;
  const days = range === "90d" ? 90 : 30;
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return start.toISOString();
}

function coercePayload(payload: any): DreamMapPayloadV0 | null {
  if (!payload || typeof payload !== "object") return null;
  if (payload.schema_version !== "dream_map_v0") return null;
  if (!Array.isArray(payload.nodes) || !Array.isArray(payload.edges)) return null;
  return payload as DreamMapPayloadV0;
}

function addEvidence<T extends { source: string; path: string }>(
  agg: { evidenceKeys: Set<string>; evidence: T[] },
  item: T
) {
  const key = `${item.source}:${item.path}`;
  if (agg.evidenceKeys.has(key)) return;
  agg.evidenceKeys.add(key);
  agg.evidence.push(item);
}

function aggregateDreamMaps(payloads: DreamMapPayloadV0[], kinds: DreamMapNodeKind[], limitNodes: number, limitEdges: number) {
  const allowedKinds = new Set(kinds);
  const nodeAgg = new Map<string, AggNode>();
  const edgeAgg = new Map<string, AggEdge>();

  for (const payload of payloads) {
    const nodeByKey = new Map<string, DreamMapNode>();
    for (const node of payload.nodes) {
      if (!allowedKinds.has(node.kind)) continue;
      nodeByKey.set(node.key, node);

      const occ = Number(node.occurrence ?? 0);
      const cent = Number(node.centrality ?? 0);
      const entry = nodeAgg.get(node.key);
      if (entry) {
        entry.occurrence += Number.isFinite(occ) ? occ : 0;
        entry.centralitySum += Number.isFinite(cent) ? cent : 0;
        entry.centralityCount += 1;
        if (Number.isFinite(occ) && occ > entry.labelOcc && typeof node.label === "string") {
          entry.label = node.label;
          entry.labelOcc = occ;
        }
        for (const ev of node.evidence ?? []) addEvidence(entry, ev);
      } else {
        const next: AggNode = {
          key: node.key,
          label: typeof node.label === "string" ? node.label : node.key,
          kind: node.kind,
          occurrence: Number.isFinite(occ) ? occ : 0,
          centralitySum: Number.isFinite(cent) ? cent : 0,
          centralityCount: 1,
          labelOcc: Number.isFinite(occ) ? occ : 0,
          evidenceKeys: new Set<string>(),
          evidence: [],
        };
        for (const ev of node.evidence ?? []) addEvidence(next, ev);
        nodeAgg.set(node.key, next);
      }
    }

    for (const edge of payload.edges) {
      if (!nodeByKey.has(edge.from) || !nodeByKey.has(edge.to)) continue;
      const key = `${edge.from}::${edge.to}`;
      const w = Number(edge.weight ?? 0);
      const entry = edgeAgg.get(key);
      if (entry) {
        entry.weightSum += Number.isFinite(w) ? w : 0;
        for (const ev of edge.evidence ?? []) addEvidence(entry, ev);
      } else {
        const next: AggEdge = {
          from: edge.from,
          to: edge.to,
          weightSum: Number.isFinite(w) ? w : 0,
          evidenceKeys: new Set<string>(),
          evidence: [],
        };
        for (const ev of edge.evidence ?? []) addEvidence(next, ev);
        edgeAgg.set(key, next);
      }
    }
  }

  const nodeArray = Array.from(nodeAgg.values()).map((node) => {
    const centrality =
      node.centralityCount > 0 ? node.centralitySum / node.centralityCount : 0;
    return {
      key: node.key,
      label: node.label,
      kind: node.kind,
      occurrence: node.occurrence,
      centrality,
      evidence: node.evidence,
    };
  });

  const maxOccurrence = Math.max(0, ...nodeArray.map((n) => n.occurrence));
  const maxCentrality = Math.max(0, ...nodeArray.map((n) => n.centrality));

  const baseScores = nodeArray.map((node) => {
    const occNorm = maxOccurrence > 0 ? node.occurrence / maxOccurrence : 0;
    const centNorm = maxCentrality > 0 ? node.centrality / maxCentrality : 0;
    return {
      key: node.key,
      baseScore: W_OCC * occNorm + W_CENT * centNorm,
    };
  });
  const maxBaseScore = Math.max(0, ...baseScores.map((b) => b.baseScore));
  const baseByKey = new Map(baseScores.map((b) => [b.key, b.baseScore]));

  const computedNodes: DreamMapNode[] = nodeArray.map((node) => {
    const baseScore = baseByKey.get(node.key) ?? 0;
    const z = maxBaseScore > 0 ? baseScore / maxBaseScore : 0;
    return {
      key: node.key,
      label: node.label,
      kind: node.kind,
      x: null,
      y: null,
      z,
      centrality: node.centrality,
      occurrence: node.occurrence,
      size: z,
      opacity: z,
      porosity: null,
      evidence: node.evidence,
    };
  });

  const limitedNodes = computedNodes
    .sort((a, b) => b.z - a.z)
    .slice(0, limitNodes);

  const allowedNodeKeys = new Set(limitedNodes.map((n) => n.key));

  const filteredEdges = Array.from(edgeAgg.values())
    .filter((edge) => allowedNodeKeys.has(edge.from) && allowedNodeKeys.has(edge.to))
    .sort((a, b) => b.weightSum - a.weightSum)
    .slice(0, limitEdges);

  const maxEdgeWeight = Math.max(0, ...filteredEdges.map((e) => e.weightSum));

  const computedEdges: DreamMapEdge[] = filteredEdges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    weight: maxEdgeWeight > 0 ? edge.weightSum / maxEdgeWeight : 0,
    directed: false,
    evidence: edge.evidence,
  }));

  return { nodes: limitedNodes, edges: computedEdges };
}

export async function GET(req: Request) {
  try {
    const supabase = await supabaseServerAuthed(req);
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = auth.user.id;

    let isGuest = false;
    try {
      const { data: flags } = await supabase
        .from("user_flags")
        .select("is_guest")
        .eq("user_id", user_id)
        .maybeSingle();
      isGuest = !!flags?.is_guest;
    } catch {
      isGuest = false;
    }

    if (isGuest) {
      return NextResponse.json({ error: "guest_forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = parseRange(searchParams.get("range"));
    const kinds = parseKinds(searchParams.get("kinds"));
    const limitNodes = parseLimit(searchParams.get("limit_nodes"), DEFAULT_LIMIT_NODES, MAX_LIMIT_NODES);
    const limitEdges = parseLimit(searchParams.get("limit_edges"), DEFAULT_LIMIT_EDGES, MAX_LIMIT_EDGES);

    const sessionQuery = supabase
      .from("dream_sessions")
      .select("id,created_at")
      .eq("user_id", user_id);

    const start = rangeStart(range);
    if (start) sessionQuery.gte("created_at", start);

    const sessionRes = await sessionQuery;
    if (sessionRes.error) {
      return NextResponse.json({ error: sessionRes.error.message }, { status: 500 });
    }

    const sessionIds = (sessionRes.data ?? []).map((row) => row.id as string);
    if (sessionIds.length === 0) {
      return NextResponse.json({
        status: "ok",
        meta: {
          range,
          kinds,
          sessions_used: 0,
          node_count: 0,
          edge_count: 0,
          computed_at: new Date().toISOString(),
        },
        nodes: [],
        edges: [],
      });
    }

    const latestRes = await supabase
      .from("dream_map_latest")
      .select("session_id,dream_map_version_id")
      .eq("user_id", user_id)
      .in("session_id", sessionIds);

    if (latestRes.error) {
      return NextResponse.json({ error: latestRes.error.message }, { status: 500 });
    }

    const versionIds = (latestRes.data ?? [])
      .map((row) => row.dream_map_version_id as string | null)
      .filter((id): id is string => Boolean(id));

    if (versionIds.length === 0) {
      return NextResponse.json({
        status: "ok",
        meta: {
          range,
          kinds,
          sessions_used: 0,
          node_count: 0,
          edge_count: 0,
          computed_at: new Date().toISOString(),
        },
        nodes: [],
        edges: [],
      });
    }

    const versionsRes = await supabase
      .from("dream_map_versions")
      .select("id,payload,algo_version")
      .eq("user_id", user_id)
      .in("id", versionIds);

    if (versionsRes.error) {
      return NextResponse.json({ error: versionsRes.error.message }, { status: 500 });
    }

    const payloads = (versionsRes.data ?? [])
      .map((row) => coercePayload(row.payload))
      .filter((payload): payload is DreamMapPayloadV0 => Boolean(payload));

    const { nodes, edges } = aggregateDreamMaps(payloads, kinds, limitNodes, limitEdges);

    return NextResponse.json({
      status: "ok",
      meta: {
        range,
        kinds,
        sessions_used: payloads.length,
        node_count: nodes.length,
        edge_count: edges.length,
        computed_at: new Date().toISOString(),
      },
      nodes,
      edges,
    });
  } catch (error: any) {
    console.error("api/dreammap/aggregate failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: error?.message ? String(error.message) : "Unknown error" },
      { status: 500 }
    );
  }
}
