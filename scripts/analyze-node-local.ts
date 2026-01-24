import { promises as fs } from "fs";
import path from "path";

const GRAPH_PATH = path.join("data", "dreams", "graph-v1.json");

// állítsd át erre, amit vizsgálni akarsz
const TARGET_NODE = "object:lift";

type EdgeV1 = {
  from: string;
  to: string;
  weight: number;
  session_id: string;
  scene_index: number;
};

function typeOf(nodeId: string): string {
  const idx = nodeId.indexOf(":");
  return idx === -1 ? "unknown" : nodeId.slice(0, idx);
}

async function main() {
  const raw = await fs.readFile(GRAPH_PATH, "utf8");
  const graph = JSON.parse(raw) as {
    edges: EdgeV1[];
    nodes?: { id: string; label: string; type: string }[];
  };

  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  // 1) kapcsolatok TARGET_NODE-hoz, de megtartjuk scene_key-t is
  const relatedRaw = edges
    .filter((e) => e.from === TARGET_NODE || e.to === TARGET_NODE)
    .map((e) => ({
      other: e.from === TARGET_NODE ? e.to : e.from,
      weight: typeof e.weight === "number" ? e.weight : 1,
      session_id: String(e.session_id),
      scene_index: Number(e.scene_index),
      scene_key: `${String(e.session_id)}:${Number(e.scene_index)}`,
    }));

  // 2) aggregálás szomszédonként (összsúly) + scene spread szomszédonként
  const byOther = new Map<
    string,
    {
      other: string;
      weightSum: number;
      scenes: Set<string>;
      types: Set<string>;
    }
  >();

  for (const r of relatedRaw) {
    const prev =
      byOther.get(r.other) ??
      { other: r.other, weightSum: 0, scenes: new Set<string>(), types: new Set<string>() };

    prev.weightSum += r.weight;
    prev.scenes.add(r.scene_key);
    prev.types.add(typeOf(r.other));

    byOther.set(r.other, prev);
  }

  const relatedAgg = Array.from(byOther.values())
    .map((x) => ({
      other: x.other,
      weightSum: x.weightSum,
      sceneSpreadToThisNeighbor: x.scenes.size,
      type: typeOf(x.other),
    }))
    .sort((a, b) => b.weightSum - a.weightSum);

  // 3) Globális lokális metrikák a TARGET_NODE-ra
  const neighborSet = new Set<string>();
  const sceneSet = new Set<string>();
  const typeSet = new Set<string>();

  for (const r of relatedRaw) {
    neighborSet.add(r.other);
    sceneSet.add(r.scene_key);
    typeSet.add(typeOf(r.other));
  }

  const typeCount = typeSet.size;
  const uniqueNeighbors = neighborSet.size;
  const sceneSpread = sceneSet.size;

  // egyszerű lokális bridge score (finomhangoljuk később)
  const bridgeScoreLocal = (typeCount * 10) + uniqueNeighbors + (sceneSpread * 2);

  // 4) Típus bontás (szomszédok típusa)
  const typeCounts = new Map<string, number>();
  for (const n of neighborSet) {
    const t = typeOf(n);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }

  // --- kiírás ---
  console.log(`Kapcsolatok (LOCAL) ehhez: ${TARGET_NODE}`);
  console.log("—".repeat(60));
  console.log(`uniqueNeighbors=${uniqueNeighbors} | typeCount=${typeCount} | sceneSpread=${sceneSpread}`);
  console.log(`bridgeScoreLocal=${bridgeScoreLocal}`);

  console.log("\nTípus bontás (szomszédok):");
  console.log("—".repeat(60));
  Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([t, c]) => console.log(`${t}: ${c}`));

  console.log("\nTop szomszédok (összsúly + scene spread):");
  console.log("—".repeat(60));
  for (const r of relatedAgg.slice(0, 30)) {
    console.log(
      `${r.other}  (weightSum=${r.weightSum}, sceneSpreadToThisNeighbor=${r.sceneSpreadToThisNeighbor}, type=${r.type})`
    );
  }

  // 5) Extra: mely jelenetekben szerepel a TARGET_NODE (gyors lista)
  const scenesSorted = Array.from(sceneSet.values()).sort();
  console.log("\nJelenetek ahol előfordul:");
  console.log("—".repeat(60));
  scenesSorted.forEach((sk) => console.log(sk));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
