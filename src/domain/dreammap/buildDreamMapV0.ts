import { anchorKey, stripDiacritics } from "@/src/lib/dream/anchorKey";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";
import type {
  DreamMapBuilderInput,
  DreamMapEdge,
  DreamMapEdgeEvidence,
  DreamMapNode,
  DreamMapNodeKind,
  DreamMapPayloadV0,
} from "@/src/domain/dreammap/types";

const W_CENT = 0.4;

const POROSITY_Z_WEIGHT = 0.7;
const POROSITY_RECURRENCE_WEIGHT = 0.3;

const KIND_WEIGHTS: Record<DreamMapNodeKind, number> = {
  people: 1.0,
  places: 1.0,
  objects: 1.0,
  themes_words: 1.0,
  sensations: 0.7,
  mood_words: 0.7,
  actions: 0.25,
};

type NodeAccumulator = {
  key: string;
  baseKey: string;
  label: string;
  kind: DreamMapNodeKind;
  occurrence: number;
  evidence: Array<{ source: "observation" | "anchors" | "glossary"; path: string }>;
};

type EdgeAccumulator = {
  from: string;
  to: string;
  weight: number;
  evidence: DreamMapEdgeEvidence[];
};

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function normalizeBaseKey(raw: string): string {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return "";
  const fromAnchor = anchorKey(trimmed);
  if (fromAnchor) return fromAnchor;
  return stripDiacritics(trimmed.toLowerCase()).replace(/\s+/g, " ").trim();
}

function addEvidence<T extends { source: string; path: string }>(list: T[], entry: T) {
  if (!entry?.source || !entry?.path) return;
  if (list.some((e) => e.source === entry.source && e.path === entry.path)) return;
  list.push(entry);
}

function addNodeKindEvidence(node: NodeAccumulator, source: "observation" | "anchors" | "glossary", path: string) {
  addEvidence(node.evidence, { source, path });
}

function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t) out.push(t);
  }
  return out;
}

function parseString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t ? t : null;
}

function nodeKeyFor(
  kind: DreamMapNodeKind,
  label: string,
  existingByKindBase: Map<string, string>,
): { key: string; baseKey: string } | null {
  const baseKey = normalizeBaseKey(label);
  if (!baseKey) return null;

  const kindBase = `${kind}::${baseKey}`;
  const existing = existingByKindBase.get(kindBase);
  if (existing) return { key: existing, baseKey };

  // v0 determinisztikus: mindig kind-suffix
  const key = `${baseKey}:${kind}`;

  existingByKindBase.set(kindBase, key);
  return { key, baseKey };
}


function scenePairs(keys: string[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      if (!a || !b || a === b) continue;
      const [from, to] = a < b ? [a, b] : [b, a];
      pairs.push([from, to]);
    }
  }
  return pairs;
}

function buildAnchorMaps(anchorPayload: any | null | undefined): {
  scoreByBaseKey: Map<string, number>;
  occByBaseKey: Map<string, number>;
} {
  const scoreByBaseKey = new Map<string, number>();
  const occByBaseKey = new Map<string, number>();
  const anchors = Array.isArray(anchorPayload?.anchors) ? anchorPayload.anchors : [];

  for (const row of anchors) {
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    if (!name) continue;
    const baseKey = normalizeBaseKey(name);
    if (!baseKey) continue;
    const score = Number(row?.score ?? 0);
    const occ = Number(row?.occurrences ?? 0);
    if (Number.isFinite(score)) scoreByBaseKey.set(baseKey, score);
    if (Number.isFinite(occ)) occByBaseKey.set(baseKey, occ);
  }

  return { scoreByBaseKey, occByBaseKey };
}

function buildGlossaryMap(glossaryOccurrences: Array<{ canonical_key: string; occurrences?: number | null }>) {
  const occByBaseKey = new Map<string, number>();
  for (const row of glossaryOccurrences) {
    const raw = typeof row?.canonical_key === "string" ? row.canonical_key.trim() : "";
    if (!raw) continue;
    const baseKey = normalizeBaseKey(raw);
    if (!baseKey) continue;
    const occ = Number(row?.occurrences ?? 1);
    occByBaseKey.set(baseKey, Number.isFinite(occ) && occ > 0 ? occ : 1);
  }
  return occByBaseKey;
}

export function buildDreamMapV0(input: DreamMapBuilderInput): DreamMapPayloadV0 {
  const observation = input.observationPayloadV0 as ObservationPayloadV0;
  const meta = input.meta;

  const computedAt = meta.computed_at ?? new Date().toISOString();
  const nodes = new Map<string, NodeAccumulator>();
  const existingByKindBase = new Map<string, string>();

  const addNode = (kind: DreamMapNodeKind, label: string, path: string) => {
    const keyInfo = nodeKeyFor(kind, label, existingByKindBase);
    if (!keyInfo) return null;
    const { key, baseKey } = keyInfo;
    const existing = nodes.get(key);
    if (existing) {
      existing.occurrence += 1;
      addNodeKindEvidence(existing, "observation", path);
      return key;
    }

    const node: NodeAccumulator = {
      key,
      baseKey,
      label,
      kind,
      occurrence: 1,
      evidence: [],
    };
    addNodeKindEvidence(node, "observation", path);
    nodes.set(key, node);
    return key;
  };

  const entities = observation?.entities ?? ({} as ObservationPayloadV0["entities"]);
  for (const label of parseStringList(entities.people)) addNode("people", label, "observation.entities.people");
  for (const label of parseStringList(entities.places)) addNode("places", label, "observation.entities.places");
  for (const label of parseStringList(entities.objects)) addNode("objects", label, "observation.entities.objects");
  for (const label of parseStringList(entities.themes_words))
    addNode("themes_words", label, "observation.entities.themes_words");

  const edges = new Map<string, EdgeAccumulator>();
  const scenes = Array.isArray(observation?.scenes) ? observation.scenes : [];
  const scenePresenceByIndex = new Map<number, Set<string>>();
  const sceneCountsByIndex = new Map<number, Map<string, number>>();
  const presentScenesByKey = new Map<string, Set<number>>();
  const primaryScenesByKey = new Map<string, Set<number>>();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] ?? ({} as ObservationPayloadV0["scenes"][number]);
    const sceneKeys = new Set<string>();
    const sceneCounts = new Map<string, number>();
    const pathBase = `observation.scenes[${i}]`;

    const setting = parseString(scene?.setting);
    if (setting) {
      const key = addNode("places", setting, `${pathBase}.setting`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }

    for (const label of parseStringList(scene?.characters)) {
      const key = addNode("people", label, `${pathBase}.characters`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }
    for (const label of parseStringList(scene?.objects)) {
      const key = addNode("objects", label, `${pathBase}.objects`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }
    for (const label of parseStringList(scene?.actions)) {
      const key = addNode("actions", label, `${pathBase}.actions`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }
    for (const label of parseStringList(scene?.sensations)) {
      const key = addNode("sensations", label, `${pathBase}.sensations`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }
    for (const label of parseStringList(scene?.mood_words)) {
      const key = addNode("mood_words", label, `${pathBase}.mood_words`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }
    for (const label of parseStringList(scene?.themes_words)) {
      const key = addNode("themes_words", label, `${pathBase}.themes_words`);
      if (key) {
        sceneKeys.add(key);
        sceneCounts.set(key, (sceneCounts.get(key) ?? 0) + 1);
      }
    }

    const keyList = Array.from(sceneKeys);
    const pairs = scenePairs(keyList);
    for (const [from, to] of pairs) {
      const edgeKey = `${from}::${to}`;
      const existing = edges.get(edgeKey);
      if (existing) {
        existing.weight += 1;
        addEvidence(existing.evidence, { source: "observation", path: pathBase, explicit: false });
      } else {
        edges.set(edgeKey, {
          from,
          to,
          weight: 1,
          evidence: [{ source: "observation", path: pathBase, explicit: false }],
        });
      }
    }

    if (sceneKeys.size > 0) {
      scenePresenceByIndex.set(i, new Set(sceneKeys));
      if (sceneCounts.size > 0) sceneCountsByIndex.set(i, sceneCounts);
    }

    for (const key of sceneKeys) {
      const set = presentScenesByKey.get(key) ?? new Set<number>();
      set.add(i);
      presentScenesByKey.set(key, set);
    }
  }

  // Fallback: mark scene presence using edge evidence paths
  for (const edge of edges.values()) {
    for (const ev of edge.evidence ?? []) {
      const match = /observation\.scenes\[(\d+)\]/.exec(ev.path);
      if (!match) continue;
      const idx = Number(match[1]);
      if (!Number.isFinite(idx)) continue;

      const present = scenePresenceByIndex.get(idx) ?? new Set<string>();
      present.add(edge.from);
      present.add(edge.to);
      scenePresenceByIndex.set(idx, present);

      const fromScenes = presentScenesByKey.get(edge.from) ?? new Set<number>();
      fromScenes.add(idx);
      presentScenesByKey.set(edge.from, fromScenes);
      const toScenes = presentScenesByKey.get(edge.to) ?? new Set<number>();
      toScenes.add(idx);
      presentScenesByKey.set(edge.to, toScenes);

      const counts = sceneCountsByIndex.get(idx) ?? new Map<string, number>();
      if (!counts.has(edge.from)) counts.set(edge.from, 1);
      if (!counts.has(edge.to)) counts.set(edge.to, 1);
      sceneCountsByIndex.set(idx, counts);
    }
  }

  const anchorMaps = buildAnchorMaps(input.anchorPayload ?? null);
  const glossaryProvided = Array.isArray(input.glossaryOccurrences);
  const glossaryMap = glossaryProvided ? buildGlossaryMap(input.glossaryOccurrences ?? []) : new Map<string, number>();

  const occByBaseKey = new Map<string, number>();
  for (const node of nodes.values()) {
    occByBaseKey.set(node.baseKey, (occByBaseKey.get(node.baseKey) ?? 0) + node.occurrence);
  }

  const warnings: DreamMapPayloadV0["meta"]["warnings"] = [];
  if (!input.anchorPayload) warnings.push({ code: "anchors_missing" });
  if (!glossaryProvided) warnings.push({ code: "glossary_missing" });

  for (const [baseKey, anchorOccRaw] of anchorMaps.occByBaseKey.entries()) {
  const computedOcc = occByBaseKey.get(baseKey);
  if (typeof computedOcc !== "number") continue;

  const anchorOcc = Number(anchorOccRaw);
  if (!Number.isFinite(anchorOcc)) continue;

  // v0 compat mode: only flag meaningful drift
  if (anchorOcc < 1 || computedOcc < 1) continue;

  const diff = Math.abs(anchorOcc - computedOcc);
  if (diff < 2) continue;

  warnings.push({
    code: "occurrence_mismatch",
    key: baseKey,
    anchor_occ: anchorOcc,
    computed_occ: computedOcc,
  });
}


  const edgeArray = Array.from(edges.values());
  const maxEdgeWeight = edgeArray.reduce((max, e) => Math.max(max, e.weight), 0);

  const degreeByNode = new Map<string, number>();
  for (const edge of edgeArray) {
    degreeByNode.set(edge.from, (degreeByNode.get(edge.from) ?? 0) + edge.weight);
    degreeByNode.set(edge.to, (degreeByNode.get(edge.to) ?? 0) + edge.weight);
  }

  const maxDegree = Math.max(0, ...Array.from(degreeByNode.values()));
  const maxGlossaryOcc = Math.max(0, ...Array.from(glossaryMap.values()));

  const scenePresenceCount = new Map<string, number>();
  const primarySceneCount = new Map<string, number>();

  for (let i = 0; i < scenes.length; i++) {
    const present = scenePresenceByIndex.get(i);
    if (!present || present.size === 0) continue;
    const counts = sceneCountsByIndex.get(i) ?? new Map<string, number>();

    let primaryKey: string | null = null;
    const pickPrimary = (kind: DreamMapNodeKind) => {
      let best: { key: string; count: number } | null = null;
      for (const key of present) {
        const node = nodes.get(key);
        if (!node || node.kind !== kind) continue;
        const count = counts.get(key) ?? 1;
        if (!best || count > best.count) best = { key, count };
      }
      if (best) primaryKey = best.key;
    };

    pickPrimary("people");
    if (!primaryKey) pickPrimary("places");
    if (!primaryKey) pickPrimary("objects");
    if (!primaryKey) pickPrimary("mood_words");
    if (!primaryKey) pickPrimary("sensations");

    for (const key of present) {
      scenePresenceCount.set(key, (scenePresenceCount.get(key) ?? 0) + 1);
    }

    if (primaryKey) {
      primarySceneCount.set(primaryKey, (primarySceneCount.get(primaryKey) ?? 0) + 1);
      const set = primaryScenesByKey.get(primaryKey) ?? new Set<number>();
      set.add(i);
      primaryScenesByKey.set(primaryKey, set);
    }
  }

  const nodeArray: DreamMapNode[] = [];
  const zRawByKey = new Map<string, number>();
  const glossaryNormByKey = new Map<string, number>();
  for (const node of nodes.values()) {
    const centrality = maxDegree > 0 ? (degreeByNode.get(node.key) ?? 0) / maxDegree : 0;
    const anchorScore = anchorMaps.scoreByBaseKey.get(node.baseKey) ?? 0;
    const glossaryOcc = glossaryMap.get(node.baseKey) ?? 0;
    const glossaryNorm = maxGlossaryOcc > 0 ? glossaryOcc / maxGlossaryOcc : 0;
    glossaryNormByKey.set(node.key, glossaryNorm);

    if (anchorScore > 0) {
      addNodeKindEvidence(node, "anchors", "anchors.payload.anchors");
    }
    if (glossaryOcc > 0) {
      addNodeKindEvidence(node, "glossary", "glossary_occurrences");
    }

    const presenceCount = scenePresenceCount.get(node.key) ?? 0;
    const primaryCount = primarySceneCount.get(node.key) ?? 0;
    const kindWeight = KIND_WEIGHTS[node.kind] ?? 1;
    const base = node.occurrence + presenceCount;
    const sceneEmphasis = 1.5 * primaryCount;
    const zRaw = kindWeight * (base + sceneEmphasis) + W_CENT * centrality;
    zRawByKey.set(node.key, zRaw);

    const x = null;
    const y = null;

    const sceneIndices = Array.from(presentScenesByKey.get(node.key) ?? []).sort((a, b) => a - b);
    const primarySceneIndices = Array.from(primaryScenesByKey.get(node.key) ?? []).sort((a, b) => a - b);

    nodeArray.push({
      key: node.key,
      label: node.label,
      kind: node.kind,
      x,
      y,
      z: 0,
      centrality,
      occurrence: node.occurrence,
      size: 0,
      opacity: 0,
      porosity: null,
      scene_presence_count: presenceCount,
      primary_scene_count: primaryCount,
      scene_indices: sceneIndices,
      primary_scene_indices: primarySceneIndices.length > 0 ? primarySceneIndices : undefined,
      evidence: node.evidence,
    });
  }

  const maxZRaw = Math.max(0, ...Array.from(zRawByKey.values()));
  for (const node of nodeArray) {
    const zRaw = zRawByKey.get(node.key) ?? 0;
    const z = maxZRaw > 0 ? zRaw / maxZRaw : 0;
    node.z = z;
    node.size = z;
    node.opacity = Math.min(Math.max(z, 0.15), 1.0);
    if (glossaryProvided) {
      const glossaryNorm = glossaryNormByKey.get(node.key) ?? 0;
      const stability = clamp01(POROSITY_Z_WEIGHT * z + POROSITY_RECURRENCE_WEIGHT * glossaryNorm);
      node.porosity = 1 - stability;
    }
  }

  const edgesOut: DreamMapEdge[] = edgeArray.map((edge) => ({
    from: edge.from,
    to: edge.to,
    weight: maxEdgeWeight > 0 ? edge.weight / maxEdgeWeight : 0,
    directed: false,
    evidence: edge.evidence,
  }));

  return {
    schema_version: "dream_map_v0",
    algo_version: meta.algo_version,
    nodes: nodeArray,
    edges: edgesOut,
    meta: {
      session_id: meta.session_id,
      user_id: meta.user_id,
      computed_at: computedAt,
      source_version_ids: {
        observation_version_id: meta.observation_version_id,
        anchor_version_id: meta.anchor_version_id,
        session_index_version_id: meta.session_index_version_id,
      },
      counts: {
        node_count: nodeArray.length,
        edge_count: edgesOut.length,
        scene_count: scenes.length,
        primary_nodes_count: Array.from(primarySceneCount.values()).filter((c) => c > 0).length,
      },
      warnings,
      weights: {
        w_cent: W_CENT,
        w_kind_people: KIND_WEIGHTS.people,
        w_kind_places: KIND_WEIGHTS.places,
        w_kind_objects: KIND_WEIGHTS.objects,
        w_kind_themes: KIND_WEIGHTS.themes_words,
        w_kind_sensations: KIND_WEIGHTS.sensations,
        w_kind_mood_words: KIND_WEIGHTS.mood_words,
        w_kind_actions: KIND_WEIGHTS.actions,
        porosity_z: POROSITY_Z_WEIGHT,
        porosity_recurrence: POROSITY_RECURRENCE_WEIGHT,
      },
    },
  };
}
