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

type AggEdge = {
  from: string;
  to: string;
  weight: number; // global aggregated weight (count)
};

type MoodField = {
  mood: string;
  intensity: number;
  session_id: string;
  scene_index: number;
  coveredNodeIds: string[];
};

type GraphOutput = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  moodFields: MoodField[];
};

type GraphAggOutput = {
  nodes: GraphNode[]; // same node list, for convenience
  edgesAgg: AggEdge[];
};

const INPUT_PATH = path.join("data", "dreams", "supabase-export.json");
const OUTPUT_PATH = path.join("data", "dreams", "graph-v1.json");
const OUTPUT_AGG_PATH = path.join("data", "dreams", "graph-v1-agg.json");

function slugify(value: string): string {
  const noDiacritics = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const slug = noDiacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug;
}

function normalizeLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNodeId(type: NodeType, label: string): string {
  return `${type}:${slugify(label)}`;
}

function getSessionId(session: Record<string, unknown>, fallback: number): string {
  const candidate =
    session.id ??
    session.session_id ??
    session.sessionId ??
    session.uuid ??
    session.uid;
  if (candidate === undefined || candidate === null) return String(fallback);
  return String(candidate);
}

function makePairKey(a: string, b: string): { from: string; to: string; key: string } {
  const from = a < b ? a : b;
  const to = a < b ? b : a;
  return { from, to, key: `${from}__${to}` };
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  // support either: single object with {sessions:[...]} OR array of such objects
  const exportRoot = Array.isArray(parsed) ? parsed : [parsed];

  const nodesById = new Map<string, GraphNode>();

  // scene-level edges (event log style)
  const edges: GraphEdge[] = [];

  // global aggregated edges
  const edgesAggByKey = new Map<string, AggEdge>();

  const moodFields: MoodField[] = [];

  exportRoot.forEach((root, rootIndex) => {
    if (!root || typeof root !== "object") return;
    const sessions = (root as Record<string, unknown>).sessions;
    if (!Array.isArray(sessions)) return;

    sessions.forEach((session, sessionIndex) => {
      if (!session || typeof session !== "object") return;

      const observation = (session as Record<string, unknown>).observation;
      const scenes = (observation as Record<string, unknown>)?.scenes;
      if (!Array.isArray(scenes)) return;

      const sessionId = getSessionId(
        session as Record<string, unknown>,
        rootIndex * 100000 + sessionIndex
      );

      scenes.forEach((scene, sceneIndex) => {
        if (!scene || typeof scene !== "object") return;
        const sceneRecord = scene as Record<string, unknown>;

        // IMPORTANT: de-dupe nodes inside a scene to avoid self-edges & duplicate pairs
        const nodeIdSet = new Set<string>();

        const addNode = (type: NodeType, label: string) => {
          const id = getNodeId(type, label);
          if (!nodesById.has(id)) {
            nodesById.set(id, { id, label, type });
          }
          nodeIdSet.add(id);
        };

        // characters[]
        const characters = sceneRecord.characters;
        if (Array.isArray(characters)) {
          characters
            .map(normalizeLabel)
            .filter((label): label is string => Boolean(label))
            .forEach((label) => addNode("character", label));
        }

        // objects[]
        const objects = sceneRecord.objects;
        if (Array.isArray(objects)) {
          objects
            .map(normalizeLabel)
            .filter((label): label is string => Boolean(label))
            .forEach((label) => addNode("object", label));
        }

        // setting (kept as "place" for now, as per your current decision)
        const place = normalizeLabel(sceneRecord.setting);
        if (place) {
          addNode("place", place);
        }

        const nodeIds = Array.from(nodeIdSet);

        // edges: fully connected within the scene
        for (let i = 0; i < nodeIds.length; i += 1) {
          for (let j = i + 1; j < nodeIds.length; j += 1) {
            const a = nodeIds[i];
            const b = nodeIds[j];

            const { from, to, key } = makePairKey(a, b);

            // scene edge (log)
            edges.push({
              from,
              to,
              weight: 1.0,
              session_id: sessionId,
              scene_index: sceneIndex,
            });

            // global aggregated edge
            const prev = edgesAggByKey.get(key);
            if (!prev) {
              edgesAggByKey.set(key, { from, to, weight: 1.0 });
            } else {
              prev.weight += 1.0;
            }
          }
        }

        // mood fields: cover all nodes present in this scene (as you requested)
        const moodWords = sceneRecord.mood_words;
        if (Array.isArray(moodWords)) {
          moodWords
            .map(normalizeLabel)
            .filter((mood): mood is string => Boolean(mood))
            .forEach((mood) => {
              moodFields.push({
                mood,
                intensity: 1.0,
                session_id: sessionId,
                scene_index: sceneIndex,
                coveredNodeIds: [...nodeIds],
              });
            });
        }
      });
    });
  });

  const nodes = Array.from(nodesById.values());

  const output: GraphOutput = {
    nodes,
    edges,
    moodFields,
  };

  const outputAgg: GraphAggOutput = {
    nodes,
    edgesAgg: Array.from(edgesAggByKey.values()).sort((a, b) => b.weight - a.weight),
  };

  await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf8");
  await fs.writeFile(OUTPUT_AGG_PATH, JSON.stringify(outputAgg, null, 2), "utf8");

  console.log(
    `graph-v1.json: nodes=${output.nodes.length} edges=${output.edges.length} moodFields=${output.moodFields.length}`
  );
  console.log(
    `graph-v1-agg.json: nodes=${outputAgg.nodes.length} edgesAgg=${outputAgg.edgesAgg.length}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
