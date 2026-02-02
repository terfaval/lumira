import { anchorKey, stripDiacritics } from "@/src/lib/dream/anchorKey";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";
import type {
  DreamMapBuilderInput,
  DreamMapEdge,
  DreamMapEdgeEvidence,
  DreamMapNode,
  DreamMapNodeKind,
  DreamMapPayloadV0,
  DreamMapSceneAxis,
} from "@/src/domain/dreammap/types";

import { computeSceneAxisFromTokens } from "@/src/domain/dreammap/axis/computeSceneAxis";
import { AXIS_LEXICON_V1 } from "@/src/domain/dreammap/axis/axis_lexicon_v1";

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

const HIGHLIGHT_OCC_BOOST = 2;

type NodeAccumulator = {
  key: string;
  baseKey: string;
  label: string;
  kind: DreamMapNodeKind;
  occurrence: number;
  evidence: Array<{ source: "observation" | "anchors" | "glossary" | "highlight"; path: string }>;
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

function clampSigned(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= -1) return -1;
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

function addNodeKindEvidence(
  node: NodeAccumulator,
  source: "observation" | "anchors" | "glossary" | "highlight",
  path: string
) {
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

function normalizeHighlightLabel(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.replace(/\s+/g, " ").trim();
  return t ? t : null;
}

function highlightKindFromCategory(category: unknown, label: string): DreamMapNodeKind {
  const raw = typeof category === "string" ? category.trim().toLowerCase() : "";
  switch (raw) {
    case "character":
    case "person":
      return "people";
    case "place":
      return "places";
    case "object":
      return "objects";
    case "beat":
    case "theme":
      return "themes_words";
    case "felt_word":
    case "feeling":
      return "sensations";
    case "action":
      return "actions";
    case "direction":
      return "themes_words";
    default: {
      const hasSpace = label.includes(" ");
      return hasSpace ? "themes_words" : "objects";
    }
  }
}

function isHighlightPrimary(row: { category?: string | null; note?: string | null }): boolean {
  const hay = `${row?.category ?? ""} ${row?.note ?? ""}`.toLowerCase();
  return hay.includes("core") || hay.includes("very important") || hay.includes("very_important");
}

function nodeKeyFor(
  kind: DreamMapNodeKind,
  label: string,
  existingByKindBase: Map<string, string>
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

  const addHighlightNode = (kind: DreamMapNodeKind, label: string, path: string) => {
    const keyInfo = nodeKeyFor(kind, label, existingByKindBase);
    if (!keyInfo) return null;
    const { key, baseKey } = keyInfo;
    const existing = nodes.get(key);
    if (existing) {
      existing.occurrence += HIGHLIGHT_OCC_BOOST;
      addNodeKindEvidence(existing, "highlight", path);
      return key;
    }

    const node: NodeAccumulator = {
      key,
      baseKey,
      label,
      kind,
      occurrence: HIGHLIGHT_OCC_BOOST,
      evidence: [],
    };
    addNodeKindEvidence(node, "highlight", path);
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

  // --- NEW: scene axis (X1 lexicon) ---
  const sceneAxisByIndex = new Map<
    number,
    { x: number | null; y: number | null; confidence: number; lexicon_version: string; evidence: any[] }
  >();
  const sceneAxisOut: DreamMapSceneAxis[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] ?? ({} as ObservationPayloadV0["scenes"][number]);

    // --- NEW: compute scene axis from tokens ---
    const axis = computeSceneAxisFromTokens({
      mood_words: parseStringList(scene?.mood_words),
      sensations: parseStringList(scene?.sensations),
      themes_words: parseStringList((scene as any)?.themes_words),
      lexicon: AXIS_LEXICON_V1,
    });

    sceneAxisByIndex.set(i, {
      x: axis.x,
      y: axis.y,
      confidence: axis.confidence,
      lexicon_version: axis.lexicon_version,
      evidence: axis.evidence,
    });

    sceneAxisOut.push({
      scene_index: i,
      x: axis.x,
      y: axis.y,
      confidence: axis.confidence,
      lexicon_version: axis.lexicon_version,
      evidence: axis.evidence,
    });

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
    for (const label of parseStringList((scene as any)?.themes_words)) {
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

  const highlightRows = Array.isArray(input.highlights) ? input.highlights : [];
  const highlightPrimaryKeys = new Set<string>();
  for (const row of highlightRows) {
    const label = normalizeHighlightLabel(row?.text);
    if (!label) continue;
    const kind = highlightKindFromCategory(row?.category, label);
    const path = typeof row?.id === "string" && row.id ? `highlights[${row.id}]` : "highlights[unknown]";
    const key = addHighlightNode(kind, label, path);
    if (key && isHighlightPrimary(row)) highlightPrimaryKeys.add(key);
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

  if (highlightPrimaryKeys.size > 0) {
    for (const key of highlightPrimaryKeys) {
      const present = presentScenesByKey.get(key);
      if (!present || present.size === 0) continue;

      let bestIndex: number | null = null;
      let bestCount = -1;
      for (const idx of present) {
        const counts = sceneCountsByIndex.get(idx);
        const count = counts?.get(key) ?? 1;
        if (count > bestCount) {
          bestCount = count;
          bestIndex = idx;
        }
      }

      if (bestIndex === null) continue;
      const set = primaryScenesByKey.get(key) ?? new Set<number>();
      if (set.has(bestIndex)) continue;
      set.add(bestIndex);
      primaryScenesByKey.set(key, set);
      primarySceneCount.set(key, (primarySceneCount.get(key) ?? 0) + 1);
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

    // --- NEW: compute inherited axis from scenes ---
    const sceneIndices = Array.from(presentScenesByKey.get(node.key) ?? []).sort((a, b) => a - b);
    const primarySceneIndices = Array.from(primaryScenesByKey.get(node.key) ?? []).sort((a, b) => a - b);

    let sumWX = 0;
    let sumX = 0;
    let sumWY = 0;
    let sumY = 0;

    const addAxis = (idx: number, w: number) => {
      const ax = sceneAxisByIndex.get(idx);
      if (!ax) return;

      if (ax.x !== null) {
        sumWX += w;
        sumX += w * ax.x;
      }
      if (ax.y !== null) {
        sumWY += w;
        sumY += w * ax.y;
      }
    };

    for (const idx of sceneIndices) addAxis(idx, 1.0);
    for (const idx of primarySceneIndices) addAxis(idx, 1.8);

    const x = sumWX > 0 ? clampSigned(sumX / sumWX) : null;
    const y = sumWY > 0 ? clampSigned(sumY / sumWY) : null;

    const axisEvidenceSceneIndex =
      primarySceneIndices.length > 0 ? primarySceneIndices[0] : sceneIndices.length > 0 ? sceneIndices[0] : null;

    nodeArray.push({
      key: node.key,
      label: node.label,
      kind: node.kind,
      x,
      y,
      axis_source: sumWX > 0 || sumWY > 0 ? "scene_inherited" : "none",
      axis_evidence_scene_index: axisEvidenceSceneIndex,

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

      // --- NEW: axis meta ---
      axis: {
        lexicon_version: AXIS_LEXICON_V1.version,
        scene_axis: sceneAxisOut,
      },

      weights: {
        w_cent: W_CENT,
        highlight_occ_boost: HIGHLIGHT_OCC_BOOST,
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
