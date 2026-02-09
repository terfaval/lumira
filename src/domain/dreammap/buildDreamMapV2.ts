// src/domain/dreammap/buildDreamMapV2.ts
import { materialHashFromPayload, sha256 } from "@/src/orchestration/idempotency/materialHash";
import { computeXYForTerm } from "@/src/domain/dreammap/axis/computeTermAxisV2";
import type { DreamMapV2Edge, DreamMapV2Node, DreamMapV2Payload } from "@/src/domain/dreammap/types_v2";

type GlossaryTermRow = {
  id: string;
  canonical: string | null;
  canonical_key: string | null;
  category: string | null;
  archetype_term_id: string | null;
};

type EntryHighlightRow = {
  id: string;
  session_id: string;
  entry_id: string;
  start_offset: number;
  end_offset: number;
  text: string;
  category: string | null;
  note?: string | null;
  glossary_term_id: string | null;
};

type GlossaryOccurrenceRow = {
  term_id: string;
  session_id: string;
  count?: number | null;
};

type ArchetypeTermRow = {
  id: string;
  canonical_key: string;
};

type BuilderInput = {
  user_id: string;
  glossary_terms: GlossaryTermRow[];
  entry_highlights: EntryHighlightRow[];
  glossary_occurrences: GlossaryOccurrenceRow[];
  archetype_terms: ArchetypeTermRow[];
  computed_at?: string;
};

type EdgeAccumulator = {
  from: string;
  to: string;
  weight_raw: number;
  bucket: DreamMapV2Edge["bucket"];
  evidence: DreamMapV2Edge["evidence"];
};

const ALGO_VERSION = "dream_map_v2_span_cooc_mvp";
const SPAN_WINDOW = 64;
const MAX_NODES = 200;
const MAX_EDGES = 400;

const BUCKET_WEIGHT: Record<DreamMapV2Edge["bucket"], number> = {
  same_span_window: 1.0,
  same_entry: 0.6,
  same_session: 0.3,
  occurrence: 0.2,
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function snippetFromText(raw: string | null | undefined, maxLen = 80): string | null {
  const text = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 3)}...`;
}

function determinismHash(input: BuilderInput): string {
  return sha256(
    materialHashFromPayload({
      glossary_terms: input.glossary_terms
        .map((t) => ({
          id: t.id,
          canonical_key: t.canonical_key ?? null,
          archetype_term_id: t.archetype_term_id ?? null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      entry_highlights: input.entry_highlights
        .map((h) => ({
          id: h.id,
          session_id: h.session_id,
          entry_id: h.entry_id,
          start_offset: h.start_offset,
          end_offset: h.end_offset,
          glossary_term_id: h.glossary_term_id ?? null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      glossary_occurrences: input.glossary_occurrences
        .map((o) => ({
          term_id: o.term_id,
          session_id: o.session_id,
          count: o.count ?? null,
        }))
        .sort((a, b) => {
          if (a.term_id !== b.term_id) return a.term_id.localeCompare(b.term_id);
          return a.session_id.localeCompare(b.session_id);
        }),
      archetype_terms: input.archetype_terms
        .map((a) => ({ id: a.id, canonical_key: a.canonical_key }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    })
  );
}

export function buildDreamMapV2(input: BuilderInput): DreamMapV2Payload {
  const computedAt = input.computed_at ?? new Date().toISOString();

  const termById = new Map(input.glossary_terms.map((t) => [t.id, t]));
  const archetypeKeyById = new Map(input.archetype_terms.map((t) => [t.id, t.canonical_key]));

  const nodeEvidence = new Map<string, DreamMapV2Node["evidence"]>();
  const occurrenceCounts = new Map<string, number>();

  const highlights = input.entry_highlights
    .filter((h) => h.glossary_term_id && termById.has(h.glossary_term_id))
    .slice()
    .sort((a, b) => {
      if (a.session_id !== b.session_id) return a.session_id.localeCompare(b.session_id);
      if (a.entry_id !== b.entry_id) return a.entry_id.localeCompare(b.entry_id);
      if (a.start_offset !== b.start_offset) return a.start_offset - b.start_offset;
      return a.id.localeCompare(b.id);
    });

  for (const h of highlights) {
    const termId = h.glossary_term_id as string;
    const list = nodeEvidence.get(termId) ?? [];
    if (list.length < 6) {
      list.push({
        source: "highlight",
        highlight_id: h.id,
        session_id: h.session_id,
        entry_id: h.entry_id,
        snippet: snippetFromText(h.text),
      });
    }
    nodeEvidence.set(termId, list);
    occurrenceCounts.set(termId, (occurrenceCounts.get(termId) ?? 0) + 1);
  }

  const occurrences = input.glossary_occurrences
    .filter((o) => termById.has(o.term_id))
    .slice()
    .sort((a, b) => {
      if (a.session_id !== b.session_id) return a.session_id.localeCompare(b.session_id);
      return a.term_id.localeCompare(b.term_id);
    });

  for (const o of occurrences) {
    const list = nodeEvidence.get(o.term_id) ?? [];
    if (list.length < 6) {
      list.push({ source: "occurrence", session_id: o.session_id });
    }
    nodeEvidence.set(o.term_id, list);
    const inc = Number(o.count ?? 1);
    occurrenceCounts.set(o.term_id, (occurrenceCounts.get(o.term_id) ?? 0) + (Number.isFinite(inc) ? inc : 1));
  }

  const candidateTermIds = Array.from(nodeEvidence.keys()).sort((a, b) => a.localeCompare(b));

  const highlightTermSet = new Set<string>(highlights.map((h) => h.glossary_term_id as string));
  const insufficientEvidence = highlightTermSet.size < 2;

  const edges = new Map<string, EdgeAccumulator>();

  if (!insufficientEvidence) {
    const entryGroups = new Map<string, EntryHighlightRow[]>();
    for (const h of highlights) {
      const key = `${h.session_id}::${h.entry_id}`;
      const group = entryGroups.get(key) ?? [];
      group.push(h);
      entryGroups.set(key, group);
    }

    for (const group of entryGroups.values()) {
      const ordered = group.slice().sort((a, b) => a.start_offset - b.start_offset);
      for (let i = 0; i < ordered.length; i += 1) {
        const a = ordered[i];
        const aTerm = a.glossary_term_id as string;
        for (let j = i + 1; j < ordered.length; j += 1) {
          const b = ordered[j];
          const bTerm = b.glossary_term_id as string;
          if (aTerm === bTerm) continue;

          const dist = Math.max(0, Math.max(a.start_offset, b.start_offset) - Math.min(a.end_offset, b.end_offset));
          const bucket: DreamMapV2Edge["bucket"] = dist <= SPAN_WINDOW ? "same_span_window" : "same_entry";
          const key = edgeKey(aTerm, bTerm);
          const existing = edges.get(key);
          const weight = BUCKET_WEIGHT[bucket];
          const evidence: DreamMapV2Edge["evidence"][number] = {
            source: "highlight",
            session_id: a.session_id,
            entry_id: a.entry_id,
            highlight_ids: [a.id, b.id],
            snippets: [snippetFromText(a.text), snippetFromText(b.text)],
            proximity: bucket === "same_span_window" ? "same_span_window" : "same_entry",
          };

          if (existing) {
            existing.weight_raw += weight;
            if (existing.evidence.length < 6) existing.evidence.push(evidence);
          } else {
            edges.set(key, {
              from: aTerm < bTerm ? aTerm : bTerm,
              to: aTerm < bTerm ? bTerm : aTerm,
              weight_raw: weight,
              bucket,
              evidence: [evidence],
            });
          }
        }
      }
    }

    const sessionGroups = new Map<string, Map<string, EntryHighlightRow>>();
    for (const h of highlights) {
      const termId = h.glossary_term_id as string;
      const map = sessionGroups.get(h.session_id) ?? new Map<string, EntryHighlightRow>();
      if (!map.has(termId)) map.set(termId, h);
      sessionGroups.set(h.session_id, map);
    }

    for (const [sessionId, termMap] of sessionGroups.entries()) {
      const termIds = Array.from(termMap.keys()).sort((a, b) => a.localeCompare(b));
      for (let i = 0; i < termIds.length; i += 1) {
        for (let j = i + 1; j < termIds.length; j += 1) {
          const aTerm = termIds[i];
          const bTerm = termIds[j];
          const key = edgeKey(aTerm, bTerm);
          const existing = edges.get(key);
          const weight = BUCKET_WEIGHT.same_session;
          const aHighlight = termMap.get(aTerm);
          const bHighlight = termMap.get(bTerm);
          if (!aHighlight || !bHighlight) continue;
          const evidence: DreamMapV2Edge["evidence"][number] = {
            source: "highlight",
            session_id: sessionId,
            entry_id: null,
            entry_ids: [aHighlight.entry_id, bHighlight.entry_id],
            highlight_ids: [aHighlight.id, bHighlight.id],
            snippets: [snippetFromText(aHighlight.text), snippetFromText(bHighlight.text)],
            proximity: "same_session",
          };

          if (existing) {
            existing.weight_raw += weight;
            if (existing.evidence.length < 6) existing.evidence.push(evidence);
          } else {
            edges.set(key, {
              from: aTerm < bTerm ? aTerm : bTerm,
              to: aTerm < bTerm ? bTerm : aTerm,
              weight_raw: weight,
              bucket: "same_session",
              evidence: [evidence],
            });
          }
        }
      }
    }

    if (occurrences.length > 0) {
      const occBySession = new Map<string, Set<string>>();
      for (const occ of occurrences) {
        const set = occBySession.get(occ.session_id) ?? new Set<string>();
        set.add(occ.term_id);
        occBySession.set(occ.session_id, set);
      }

      for (const [sessionId, set] of occBySession.entries()) {
        const termIds = Array.from(set).sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < termIds.length; i += 1) {
          for (let j = i + 1; j < termIds.length; j += 1) {
            const aTerm = termIds[i];
            const bTerm = termIds[j];
            const key = edgeKey(aTerm, bTerm);
            if (edges.has(key)) continue;
            edges.set(key, {
              from: aTerm,
              to: bTerm,
              weight_raw: BUCKET_WEIGHT.occurrence,
              bucket: "occurrence",
              evidence: [{ source: "occurrence", session_id: sessionId, term_ids: [aTerm, bTerm] }],
            });
          }
        }
      }
    }
  }

  const edgeArray = Array.from(edges.values()).sort((a, b) => {
    if (b.weight_raw !== a.weight_raw) return b.weight_raw - a.weight_raw;
    return `${a.from}::${a.to}`.localeCompare(`${b.from}::${b.to}`);
  });

  const degreeByNode = new Map<string, number>();
  for (const edge of edgeArray) {
    degreeByNode.set(edge.from, (degreeByNode.get(edge.from) ?? 0) + edge.weight_raw);
    degreeByNode.set(edge.to, (degreeByNode.get(edge.to) ?? 0) + edge.weight_raw);
  }

  const nodes: DreamMapV2Node[] = [];
  const unmapped: string[] = [];
  for (const termId of candidateTermIds) {
    const term = termById.get(termId);
    if (!term) continue;
    const familyKey = term.archetype_term_id ? archetypeKeyById.get(term.archetype_term_id) ?? null : null;
    const axis = computeXYForTerm({ canonical_key: term.canonical_key, archetype_family_key: familyKey });
    if (axis.source === "default_unmapped") {
      const key = String(term.canonical_key ?? "").trim();
      if (key) unmapped.push(key);
    }
    nodes.push({
      id: termId,
      term_id: termId,
      canonical: term.canonical ?? null,
      canonical_key: term.canonical_key ?? null,
      category: term.category ?? null,
      archetype_term_id: term.archetype_term_id ?? null,
      x: axis.x,
      y: axis.y,
      axis_source: axis.source,
      occurrence: occurrenceCounts.get(termId) ?? 0,
      degree: degreeByNode.get(termId) ?? 0,
      evidence: nodeEvidence.get(termId) ?? [],
    });
  }

  const sortedNodes = nodes.sort((a, b) => {
    const scoreA = a.degree + a.occurrence;
    const scoreB = b.degree + b.occurrence;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });

  const selectedNodes = sortedNodes.slice(0, MAX_NODES);
  const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));

  const filteredEdges = edgeArray.filter((e) => selectedNodeIds.has(e.from) && selectedNodeIds.has(e.to));
  const prunedEdges = filteredEdges.slice(0, MAX_EDGES);
  const maxWeight = Math.max(0, ...prunedEdges.map((e) => e.weight_raw));

  const outEdges: DreamMapV2Edge[] = prunedEdges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    weight: maxWeight > 0 ? clamp01(edge.weight_raw / maxWeight) : 0,
    weight_raw: edge.weight_raw,
    bucket: edge.bucket,
    evidence: edge.evidence,
  }));

  const determinism_hash = determinismHash(input);
  const input_hash = sha256(`${determinism_hash}:${ALGO_VERSION}`);

  return {
    schema_version: "dream_map_v2",
    algo_version: ALGO_VERSION,
    nodes: selectedNodes,
    edges: insufficientEvidence ? [] : outEdges,
    meta: {
      user_id: input.user_id,
      computed_at: computedAt,
      input_hash,
      counts: {
        node_count: selectedNodes.length,
        edge_count: insufficientEvidence ? 0 : outEdges.length,
      },
      reason: insufficientEvidence ? "insufficient_evidence" : undefined,
      debug: {
        unmapped_keys: Array.from(new Set(unmapped)).sort((a, b) => a.localeCompare(b)),
        determinism_hash,
        evidence_stats: {
          highlight_terms: highlightTermSet.size,
          occurrence_terms: occurrenceCounts.size,
          highlight_edges: edgeArray.filter((e) => e.bucket !== "occurrence").length,
          occurrence_edges: edgeArray.filter((e) => e.bucket === "occurrence").length,
        },
      },
    },
  };
}
