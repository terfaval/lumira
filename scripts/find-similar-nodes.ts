import { promises as fs } from "fs";
import path from "path";

const GRAPH_PATH = path.join("data", "dreams", "graph-v1.json");

// mit keresünk (részsztring)
const CONTAINS = "lift"; // próbáld: "felvono", "elevator", "teher", stb.

type Node = { id: string; label: string; type: string };

async function main() {
  const raw = await fs.readFile(GRAPH_PATH, "utf8");
  const graph = JSON.parse(raw) as { nodes: Node[] };

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];

  const hits = nodes
    .filter((n) => typeof n.id === "string" && n.id.toLowerCase().includes(CONTAINS))
    .sort((a, b) => a.id.localeCompare(b.id));

  console.log(`Nodes matching "${CONTAINS}"`);
  console.log("—".repeat(60));
  hits.forEach((n) => console.log(`${n.id} | label="${n.label}" | type=${n.type}`));
  console.log(`\ncount=${hits.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
