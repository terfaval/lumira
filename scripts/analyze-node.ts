import { promises as fs } from "fs";
import path from "path";

const GRAPH_PATH = path.join("data", "dreams", "graph-v1-agg.json");
const TARGET_NODE = "object:lift";

function typeOf(nodeId: string): string {
  const idx = nodeId.indexOf(":");
  return idx === -1 ? "unknown" : nodeId.slice(0, idx);
}

async function main() {
  const raw = await fs.readFile(GRAPH_PATH, "utf8");
  const graph = JSON.parse(raw);

  const edges = graph.edgesAgg as {
    from: string;
    to: string;
    weight: number;
  }[];

  const related = edges
    .filter(e => e.from === TARGET_NODE || e.to === TARGET_NODE)
    .map(e => ({
      other: e.from === TARGET_NODE ? e.to : e.from,
      weight: e.weight
    }))
    .sort((a, b) => b.weight - a.weight);

  console.log(`Kapcsolatok ehhez: ${TARGET_NODE}`);
  console.log("—".repeat(40));

  related.forEach(r => {
    console.log(`${r.other}  (weight=${r.weight})`);
  });

  // --- type breakdown ---
  const typeCounts = new Map<string, number>();
  const typeSet = new Set<string>();
  const neighborSet = new Set<string>();

  related.forEach(r => {
    const t = typeOf(r.other);
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    typeSet.add(t);
    neighborSet.add(r.other);
  });

  console.log("\nTípus bontás:");
  console.log("—".repeat(40));

  Array.from(typeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });

  // --- Global Bridge score ---
  const typeCount = typeSet.size;
  const uniqueNeighbors = neighborSet.size;

  const bridgeScoreGlobal = (typeCount * 10) + uniqueNeighbors;

  console.log("\nGlobal Bridge score:");
  console.log("—".repeat(40));
  console.log(`typeCount=${typeCount} uniqueNeighbors=${uniqueNeighbors}`);
  console.log(`bridgeScoreGlobal=${bridgeScoreGlobal}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
