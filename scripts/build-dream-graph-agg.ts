import { promises as fs } from "fs";
import path from "path";

type NodeType = "character" | "object" | "place";

type GraphNode = {
  id: string;
  label: string;
  type: NodeType;
};

type GraphEdge = {
  from: string;
  to: string;
  weight: number;
  session_id: string;
  scene_index: number;
};

type MoodField = {
  mood: string;
  intensity: number;
  session_id: string;
  scene_index: number;
  coveredNodeIds: string[];
};

type GraphV1 = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  moodFields: MoodField[];
};

type EdgeAgg = {
  from: string;
  to: string;
  weightSum: number;
  sceneSpread: number; // unique (session_id, scene_index) count
};

type NodeAgg = {
  id: string;
  label: string;
  type: NodeType;

  // coverage / frequency
  dreamCount: number; // unique session_id where node appears
  sceneCount: number; // unique (session_id, scene_index) where node appears

  // local-structure proxies (computed from per-scene co-occurrence)
  avgSceneCentrality: number; // average of (neighbors in scene) across scenes where present
  avgSceneWeight: number; // average of sceneWeight across scenes where present

  // convenience combined score (v1)
  motifBaseWeight: number; // v1 heuristic: dreamCount * avgSceneWeight
};

type GraphV1Agg = {
  meta: {
    schema: "graph_v1_agg";
    builtFrom: string;
    builtAtISO: string;
  };
  nodes: GraphNode[]; // original nodes
  edgesAgg: EdgeAgg[];
  nodesAgg: NodeAgg[];
  moodFields: MoodField[]; // keep as-is for now
};

const INPUT_PATH = path.join("data", "dreams", "graph-v1.json");
const OUTPUT_PATH = path.join("data", "dreams", "graph-v1-agg.json");

// v1: same formula as your earlier plan
function sceneWeight(nodeCount: number): number {
  // defensive
  const n = Math.max(0, nodeCount);
  return 1 / Math.log2(2 + n);
}

function makeSceneKey(session_id: string, scene_index: number): string {
  return `${session_id}:${scene_index}`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const graph = JSON.parse(raw) as GraphV1;

  const nodesById = new Map<string, GraphNode>();
  for (const n of graph.nodes ?? []) nodesById.set(n.id, n);

  // --- Build per-scene node sets + neighbor counts
  // We reconstruct scene node sets from edges + moodFields (both include session_id, scene_index).
  // Primary source: edges (since they reflect co-occurrence pairs).
  const sceneNodes = new Map<string, Set<string>>(); // sceneKey -> node ids
  const ensureSceneSet = (sceneKey: string) => {
    let set = sceneNodes.get(sceneKey);
    if (!set) {
      set = new Set<string>();
      sceneNodes.set(sceneKey, set);
    }
    return set;
  };

  for (const e of graph.edges ?? []) {
    const sk = makeSceneKey(e.session_id, e.scene_index);
    const set = ensureSceneSet(sk);
    set.add(e.from);
    set.add(e.to);
  }

  // Also add nodes from moodFields coverage, in case a scene had 1 node (no edges) but mood exists.
  for (const mf of graph.moodFields ?? []) {
    const sk = makeSceneKey(mf.session_id, mf.scene_index);
    const set = ensureSceneSet(sk);
    for (const nid of mf.coveredNodeIds ?? []) set.add(nid);
  }

  // neighborCountInScene: nodeId -> (sceneKey -> neighbors count)
  // We can compute neighbors count per scene by counting unique neighbors from edges.
  const nodeSceneNeighbors = new Map<string, Map<string, Set<string>>>();
  const ensureNodeSceneMap = (nodeId: string) => {
    let m = nodeSceneNeighbors.get(nodeId);
    if (!m) {
      m = new Map<string, Set<string>>();
      nodeSceneNeighbors.set(nodeId, m);
    }
    return m;
  };
  const ensureNeighborSet = (nodeId: string, sceneKey: string) => {
    const m = ensureNodeSceneMap(nodeId);
    let s = m.get(sceneKey);
    if (!s) {
      s = new Set<string>();
      m.set(sceneKey, s);
    }
    return s;
  };

  for (const e of graph.edges ?? []) {
    const sk = makeSceneKey(e.session_id, e.scene_index);
    ensureNeighborSet(e.from, sk).add(e.to);
    ensureNeighborSet(e.to, sk).add(e.from);
  }

  // --- Edge aggregation across scenes (sum weights & scene spread)
  const edgeAggMap = new Map<string, { from: string; to: string; weightSum: number; scenes: Set<string> }>();

  for (const e of graph.edges ?? []) {
    // edges are already stored lexicographically in build-dream-graph.ts, but keep safe:
    const from = e.from < e.to ? e.from : e.to;
    const to = e.from < e.to ? e.to : e.from;

    const key = `${from}__${to}`;
    const sk = makeSceneKey(e.session_id, e.scene_index);

    let agg = edgeAggMap.get(key);
    if (!agg) {
      agg = { from, to, weightSum: 0, scenes: new Set<string>() };
      edgeAggMap.set(key, agg);
    }
    agg.weightSum += Number.isFinite(e.weight) ? e.weight : 0;
    agg.scenes.add(sk);
  }

  const edgesAgg: EdgeAgg[] = Array.from(edgeAggMap.values())
    .map((a) => ({
      from: a.from,
      to: a.to,
      weightSum: a.weightSum,
      sceneSpread: a.scenes.size,
    }))
    .sort((a, b) => b.weightSum - a.weightSum);

  // --- Node aggregation
  // We compute: dreamCount, sceneCount, avgSceneCentrality, avgSceneWeight.
  const nodeDreams = new Map<string, Set<string>>(); // nodeId -> session_ids
  const nodeScenes = new Map<string, Set<string>>(); // nodeId -> sceneKeys

  const addNodePresence = (nodeId: string, session_id: string, scene_index: number) => {
    const sk = makeSceneKey(session_id, scene_index);

    let ds = nodeDreams.get(nodeId);
    if (!ds) {
      ds = new Set<string>();
      nodeDreams.set(nodeId, ds);
    }
    ds.add(session_id);

    let sc = nodeScenes.get(nodeId);
    if (!sc) {
      sc = new Set<string>();
      nodeScenes.set(nodeId, sc);
    }
    sc.add(sk);
  };

  // Use sceneNodes sets to infer node presence even if no edges (singletons).
  for (const [sk, set] of sceneNodes.entries()) {
    const [session_id, sceneIndexStr] = sk.split(":");
    const scene_index = Number(sceneIndexStr);
    for (const nodeId of set) {
      addNodePresence(nodeId, session_id, scene_index);
    }
  }

  const nodesAgg: NodeAgg[] = [];

  for (const node of nodesById.values()) {
    const dreams = nodeDreams.get(node.id) ?? new Set<string>();
    const scenes = nodeScenes.get(node.id) ?? new Set<string>();

    // avgSceneCentrality: average neighbors count across scenes
    let centralitySum = 0;
    let sceneWeightSum = 0;
    let denom = 0;

    const perSceneNeighbors = nodeSceneNeighbors.get(node.id) ?? new Map<string, Set<string>>();

    for (const sk of scenes) {
      const ncount = (sceneNodes.get(sk)?.size ?? 0);
      const w = sceneWeight(ncount);
      const neigh = perSceneNeighbors.get(sk)?.size ?? 0;

      centralitySum += neigh;
      sceneWeightSum += w;
      denom += 1;
    }

    const avgSceneCentrality = denom > 0 ? centralitySum / denom : 0;
    const avgSceneWeight = denom > 0 ? sceneWeightSum / denom : 0;

    // v1 motifBaseWeight: you can refine later (anchors, mood relevance, etc.)
    const motifBaseWeight = dreams.size * (avgSceneWeight || 0);

    nodesAgg.push({
      id: node.id,
      label: node.label,
      type: node.type,

      dreamCount: dreams.size,
      sceneCount: scenes.size,

      avgSceneCentrality,
      avgSceneWeight,

      motifBaseWeight,
    });
  }

  nodesAgg.sort((a, b) => b.motifBaseWeight - a.motifBaseWeight);

  const output: GraphV1Agg = {
    meta: {
      schema: "graph_v1_agg",
      builtFrom: INPUT_PATH,
      builtAtISO: new Date().toISOString(),
    },
    nodes: Array.from(nodesById.values()),
    edgesAgg,
    nodesAgg,
    moodFields: graph.moodFields ?? [],
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");

  console.log(
    [
      `Wrote ${OUTPUT_PATH}`,
      `nodes=${output.nodes.length}`,
      `nodesAgg=${output.nodesAgg.length}`,
      `edgesAgg=${output.edgesAgg.length}`,
      `moodFields=${output.moodFields.length}`,
      `scenes=${sceneNodes.size}`,
    ].join(" | ")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
