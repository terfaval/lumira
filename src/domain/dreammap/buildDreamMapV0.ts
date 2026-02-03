import { anchorKey, stripDiacritics } from "@/src/lib/dream/anchorKey";
import type { ObservationPayloadV0 } from "@/src/domain/observe/types";
import type {
  DreamMapArchetypeDomain,
  DreamMapArchetypeTerm,
  DreamMapBuilderInput,
  DreamMapCoocEvent,
  DreamMapEdge,
  DreamMapEdgeEvidence,
  DreamMapEdgeTrace,
  DreamMapEntryHighlight,
  DreamMapEntrySpan,
  DreamMapGlossaryRecurrence,
  DreamMapNode,
  DreamMapNodeKind,
  DreamMapNodeEvidenceSpan,
  DreamMapPayloadV0,
  DreamMapSessionEntry,
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

type LabelSource = "archetype" | "anchors" | "highlight" | "glossary" | "raw";

const LABEL_SOURCE_RANK: Record<LabelSource, number> = {
  archetype: 0,
  anchors: 1,
  highlight: 2,
  glossary: 3,
  raw: 4,
};

const DOMAIN_BY_KIND: Record<DreamMapNodeKind, DreamMapArchetypeDomain> = {
  people: "people",
  places: "places",
  objects: "objects",
  actions: "actions",
  sensations: "sensations",
  mood_words: "mood_words",
  themes_words: "themes_words",
};

const HIGHLIGHT_OCC_BOOST = 2;

const COOC_WEIGHT_BY_BUCKET: Record<"same_span" | "same_sentence" | "same_paragraph", number> = {
  same_span: 1.0,
  same_sentence: 0.7,
  same_paragraph: 0.35,
};

const COOC_MAX_EDGES = 250;
const COOC_MAX_UNIT_NODES = 16;
const COOC_MAX_SENTENCES = 200;
const COOC_MAX_PARAGRAPHS = 120;

const CANDIDATE_ANCHORS_MAX = 60;
const CANDIDATE_GLOSSARY_MAX = 40;
const CANDIDATE_HIGHLIGHT_MAX = 40;
const OCCURRENCE_BOOST = 1.0;

const NODE_EVIDENCE_SPAN_LIMIT = 5;
const EDGE_TRACE_LIMIT = 3;
const TRACE_SAMPLE_LIMIT = 10;
const CANONICALIZER_PROPOSAL_LIMIT = 20;
const CANONICALIZER_EVIDENCE_LIMIT = 3;

type NodeAccumulator = {
  key: string;
  baseKey: string;
  label: string;
  label_rank?: number;
  kind: DreamMapNodeKind;
  canonical?: DreamMapNode["canonical"];
  occurrence: number;
  evidence: Array<{ source: "observation" | "anchors" | "glossary" | "highlight"; path: string }>;
};

type EdgeAccumulator = {
  from: string;
  to: string;
  weight: number;
  evidence: DreamMapEdgeEvidence[];
};

type MaterializedSession = {
  full_text: string;
  entry_spans: DreamMapEntrySpan[];
  entries_count_by_kind: Record<string, number>;
};

type CandidateInfo = {
  baseKey: string;
  label: string;
  kind: DreamMapNodeKind;
  baseScore: number;
  normKey: string;
  sources: Array<"anchors" | "glossary" | "highlight">;
};

type UnitCandidate = {
  baseKey: string;
  label: string;
  kind: DreamMapNodeKind;
  occ: number;
  score: number;
};

type CoocNodeAccumulator = {
  key: string;
  baseKey: string;
  label: string;
  label_rank?: number;
  kind: DreamMapNodeKind;
  canonical?: DreamMapNode["canonical"];
  occurrence: number;
  evidence: Array<{ source: "anchors" | "glossary" | "highlight" | "observation"; path: string }>;
  evidence_spans: DreamMapNodeEvidenceSpan[];
};

type CoocEdgeAccumulator = {
  from: string;
  to: string;
  weight_raw: number;
  trace: DreamMapEdgeTrace[];
};

type CanonicalizerStat = {
  domain: DreamMapArchetypeDomain;
  baseKey: string;
  label: string;
  label_rank: number;
  occurrence: number;
  match_source: "archetype" | "glossary" | "raw";
  evidence_spans: DreamMapNodeEvidenceSpan[];
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

function pickFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function normalizeForMatch(raw: string): string {
  const cleaned = stripDiacritics(String(raw ?? "").toLowerCase());
  return cleaned.replace(/[^a-z0-9]+/gi, " ").replace(/\s+/g, " ").trim();
}

function applyLabelChoice(node: { label: string; label_rank?: number }, label: string, source: LabelSource) {
  const trimmed = String(label ?? "").trim();
  if (!trimmed) return;
  const nextRank = LABEL_SOURCE_RANK[source] ?? LABEL_SOURCE_RANK.raw;
  const currentRank = typeof node.label_rank === "number" ? node.label_rank : LABEL_SOURCE_RANK.raw;

  if (node.label_rank === undefined || nextRank < currentRank) {
    node.label = trimmed;
    node.label_rank = nextRank;
    return;
  }

  if (nextRank === currentRank && trimmed.localeCompare(node.label) < 0) {
    node.label = trimmed;
  }
}

type ArchetypeIndex = {
  canonicalByDomain: Map<DreamMapArchetypeDomain, Map<string, DreamMapArchetypeTerm[]>>;
  aliasByDomain: Map<DreamMapArchetypeDomain, Map<string, DreamMapArchetypeTerm[]>>;
};

function buildArchetypeIndex(terms: DreamMapArchetypeTerm[] | null | undefined): ArchetypeIndex {
  const canonicalByDomain = new Map<DreamMapArchetypeDomain, Map<string, DreamMapArchetypeTerm[]>>();
  const aliasByDomain = new Map<DreamMapArchetypeDomain, Map<string, DreamMapArchetypeTerm[]>>();
  const rows = Array.isArray(terms) ? terms : [];

  const ensure = (map: Map<DreamMapArchetypeDomain, Map<string, DreamMapArchetypeTerm[]>>, domain: DreamMapArchetypeDomain) => {
    let bucket = map.get(domain);
    if (!bucket) {
      bucket = new Map<string, DreamMapArchetypeTerm[]>();
      map.set(domain, bucket);
    }
    return bucket;
  };

  for (const row of rows) {
    if (!row?.domain || row.status === "deprecated") continue;
    const domain = row.domain as DreamMapArchetypeDomain;
    const canonicalKey = normalizeBaseKey(row.canonical_key);
    if (!canonicalKey) continue;

    const canonicalBucket = ensure(canonicalByDomain, domain);
    const canonicalList = canonicalBucket.get(canonicalKey) ?? [];
    canonicalList.push(row);
    canonicalBucket.set(canonicalKey, canonicalList);

    const aliasKeys = Array.isArray(row.alias_keys) ? row.alias_keys : [];
    for (const alias of aliasKeys) {
      const aliasKey = normalizeBaseKey(alias);
      if (!aliasKey) continue;
      const aliasBucket = ensure(aliasByDomain, domain);
      const aliasList = aliasBucket.get(aliasKey) ?? [];
      aliasList.push(row);
      aliasBucket.set(aliasKey, aliasList);
    }
  }

  return { canonicalByDomain, aliasByDomain };
}

function pickBestArchetypeTerm(terms: DreamMapArchetypeTerm[]): DreamMapArchetypeTerm {
  const statusRank: Record<DreamMapArchetypeTerm["status"], number> = {
    verified: 0,
    proposed: 1,
    deprecated: 2,
  };

  return terms
    .slice()
    .sort((a, b) => {
      const rankDiff = statusRank[a.status] - statusRank[b.status];
      if (rankDiff !== 0) return rankDiff;
      if (a.canonical_key !== b.canonical_key) return a.canonical_key.localeCompare(b.canonical_key);
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    })[0];
}

type GlossaryCanonicalKeyMap = Map<
  string,
  {
    canonical_key: string;
    occurrence: number;
  }
>;

function buildGlossaryCanonicalKeyMap(
  glossaryRecurrence: DreamMapGlossaryRecurrence[] | null | undefined,
  glossaryOccurrences: DreamMapGlossaryOccurrence[] | null | undefined
): GlossaryCanonicalKeyMap {
  const map: GlossaryCanonicalKeyMap = new Map();

  const add = (aliasLabel: string | null, canonicalLabel: string | null, occurrence: number) => {
    if (!aliasLabel || !canonicalLabel) return;
    const aliasKey = normalizeBaseKey(aliasLabel);
    const canonicalKey = normalizeBaseKey(canonicalLabel);
    if (!aliasKey || !canonicalKey) return;

    const existing = map.get(aliasKey);
    if (!existing) {
      map.set(aliasKey, { canonical_key: canonicalKey, occurrence });
      return;
    }

    if (occurrence > existing.occurrence) {
      map.set(aliasKey, { canonical_key: canonicalKey, occurrence });
      return;
    }

    if (occurrence === existing.occurrence && canonicalKey.localeCompare(existing.canonical_key) < 0) {
      map.set(aliasKey, { canonical_key: canonicalKey, occurrence });
    }
  };

  const recurrenceRows = Array.isArray(glossaryRecurrence) ? glossaryRecurrence : [];
  for (const row of recurrenceRows) {
    const canonicalLabel = pickFirstString(
      row.canonical_key,
      row.anchor_key,
      row.canonical_name,
      row.canonical,
      row.name,
      row.term
    );
    const occurrence = Number(row.occurrence_count ?? row.session_count ?? 1);
    const occValue = Number.isFinite(occurrence) && occurrence > 0 ? occurrence : 1;

    add(row.canonical_key ?? null, canonicalLabel, occValue);
    add(row.anchor_key ?? null, canonicalLabel, occValue);
    add(row.canonical_name ?? null, canonicalLabel, occValue);
  }

  const occRows = Array.isArray(glossaryOccurrences) ? glossaryOccurrences : [];
  for (const row of occRows) {
    const canonicalLabel = typeof row?.canonical_key === "string" ? row.canonical_key.trim() : "";
    if (!canonicalLabel) continue;
    const occValue = Number(row?.occurrences ?? 1);
    add(canonicalLabel, canonicalLabel, Number.isFinite(occValue) && occValue > 0 ? occValue : 1);
  }

  return map;
}

type ResolvedNodeIdentity = {
  nodeKey: string;
  raw_base_key: string;
  domain: DreamMapArchetypeDomain;
  canonical?: DreamMapNode["canonical"];
  match_source: "archetype" | "glossary" | "raw";
};

function resolveNodeIdentity(params: {
  baseKey: string;
  kind: DreamMapNodeKind;
  label: string;
  archetypeIndex: ArchetypeIndex;
  glossaryKeyMap: GlossaryCanonicalKeyMap;
}): ResolvedNodeIdentity | null {
  const baseKey = normalizeBaseKey(params.baseKey);
  if (!baseKey) return null;
  const domain = DOMAIN_BY_KIND[params.kind];

  const canonicalBucket = params.archetypeIndex.canonicalByDomain.get(domain);
  const aliasBucket = params.archetypeIndex.aliasByDomain.get(domain);

  const canonicalMatch = canonicalBucket?.get(baseKey);
  if (canonicalMatch && canonicalMatch.length > 0) {
    const term = pickBestArchetypeTerm(canonicalMatch);
    const canonicalLabel = String(term.canonical_label ?? term.canonical_key ?? params.label).trim();
    const canonicalKey = normalizeBaseKey(term.canonical_key);
    return {
      nodeKey: `arch:${domain}:${canonicalKey}`,
      raw_base_key: baseKey,
      domain,
      canonical: {
        archetype_id: term.id ?? null,
        canonical_key: canonicalKey,
        canonical_label: canonicalLabel || canonicalKey,
        match_source: "archetype",
      },
      match_source: "archetype",
    };
  }

  const aliasMatch = aliasBucket?.get(baseKey);
  if (aliasMatch && aliasMatch.length > 0) {
    const term = pickBestArchetypeTerm(aliasMatch);
    const canonicalLabel = String(term.canonical_label ?? term.canonical_key ?? params.label).trim();
    const canonicalKey = normalizeBaseKey(term.canonical_key);
    return {
      nodeKey: `arch:${domain}:${canonicalKey}`,
      raw_base_key: baseKey,
      domain,
      canonical: {
        archetype_id: term.id ?? null,
        canonical_key: canonicalKey,
        canonical_label: canonicalLabel || canonicalKey,
        match_source: "archetype",
      },
      match_source: "archetype",
    };
  }

  const glossaryKey = params.glossaryKeyMap.get(baseKey)?.canonical_key ?? null;
  if (glossaryKey && canonicalBucket) {
    const glossaryMatch = canonicalBucket.get(glossaryKey);
    if (glossaryMatch && glossaryMatch.length > 0) {
      const term = pickBestArchetypeTerm(glossaryMatch);
      const canonicalLabel = String(term.canonical_label ?? term.canonical_key ?? params.label).trim();
      const canonicalKey = normalizeBaseKey(term.canonical_key);
      return {
        nodeKey: `arch:${domain}:${canonicalKey}`,
        raw_base_key: baseKey,
        domain,
        canonical: {
          archetype_id: term.id ?? null,
          canonical_key: canonicalKey,
          canonical_label: canonicalLabel || canonicalKey,
          match_source: "glossary",
        },
        match_source: "glossary",
      };
    }
  }

  return {
    nodeKey: `${baseKey}:${params.kind}`,
    raw_base_key: baseKey,
    domain,
    match_source: "raw",
  };
}

const MATCH_SOURCE_RANK: Record<ResolvedNodeIdentity["match_source"], number> = {
  archetype: 0,
  glossary: 1,
  raw: 2,
};

function pushEvidenceSpanSample(list: DreamMapNodeEvidenceSpan[], span: DreamMapNodeEvidenceSpan) {
  if (list.length >= NODE_EVIDENCE_SPAN_LIMIT) return;
  if (
    list.some(
      (ev) =>
        ev.source === span.source &&
        ev.entry_id === span.entry_id &&
        ev.start === span.start &&
        ev.end === span.end &&
        ev.entry_start === span.entry_start &&
        ev.entry_end === span.entry_end
    )
  ) {
    return;
  }
  list.push(span);
}

function updateCanonicalizerStat(
  stats: Map<string, CanonicalizerStat>,
  params: {
    domain: DreamMapArchetypeDomain;
    baseKey: string;
    label: string;
    labelSource: LabelSource;
    occurrence: number;
    match_source: ResolvedNodeIdentity["match_source"];
    evidence_span?: DreamMapNodeEvidenceSpan;
  }
) {
  const key = `${params.domain}::${params.baseKey}`;
  const labelValue = String(params.label ?? "").trim() || params.baseKey;
  const existing = stats.get(key);
  const nextLabelRank = LABEL_SOURCE_RANK[params.labelSource] ?? LABEL_SOURCE_RANK.raw;
  const nextMatchRank = MATCH_SOURCE_RANK[params.match_source] ?? MATCH_SOURCE_RANK.raw;

  if (!existing) {
    const entry: CanonicalizerStat = {
      domain: params.domain,
      baseKey: params.baseKey,
      label: labelValue,
      label_rank: nextLabelRank,
      occurrence: Math.max(0, params.occurrence),
      match_source: params.match_source,
      evidence_spans: [],
    };
    if (params.match_source === "raw" && params.evidence_span) {
      pushEvidenceSpanSample(entry.evidence_spans, params.evidence_span);
    }
    stats.set(key, entry);
    return;
  }

  existing.occurrence += Math.max(0, params.occurrence);

  if (nextLabelRank < existing.label_rank || (nextLabelRank === existing.label_rank && labelValue < existing.label)) {
    existing.label = labelValue;
    existing.label_rank = nextLabelRank;
  }

  if (nextMatchRank < MATCH_SOURCE_RANK[existing.match_source]) {
    existing.match_source = params.match_source;
  }

  if (params.match_source === "raw" && params.evidence_span) {
    pushEvidenceSpanSample(existing.evidence_spans, params.evidence_span);
  }
}

function buildCanonicalizerDebug(
  nodes: DreamMapNode[],
  stats: Map<string, CanonicalizerStat>
): DreamMapPayloadV0["meta"]["debug"]["canonicalizer"] {
  const matchedBySource = { archetype: 0, glossary: 0, raw: 0 };

  for (const node of nodes) {
    const matchSource = node.canonical?.match_source ?? "raw";
    if (matchSource === "archetype") matchedBySource.archetype += 1;
    else if (matchSource === "glossary") matchedBySource.glossary += 1;
    else matchedBySource.raw += 1;
  }

  const total = nodes.length;
  const matched = matchedBySource.archetype + matchedBySource.glossary;
  const proposals = Array.from(stats.values())
    .filter((row) => row.match_source === "raw" && row.occurrence > 0)
    .sort((a, b) => {
      if (b.occurrence !== a.occurrence) return b.occurrence - a.occurrence;
      if (a.baseKey !== b.baseKey) return a.baseKey.localeCompare(b.baseKey);
      return a.domain.localeCompare(b.domain);
    })
    .slice(0, CANONICALIZER_PROPOSAL_LIMIT)
    .map((row) => {
      const evidence = row.evidence_spans
        .slice()
        .sort((a, b) => {
          const aEntry = String(a.entry_id ?? "");
          const bEntry = String(b.entry_id ?? "");
          if (aEntry !== bEntry) return aEntry.localeCompare(bEntry);
          if (a.start !== b.start) return a.start - b.start;
          return a.end - b.end;
        })
        .slice(0, CANONICALIZER_EVIDENCE_LIMIT);

      return {
        domain: row.domain,
        baseKey: row.baseKey,
        label: row.label,
        occurrence: row.occurrence,
        suggested_canonical_key: row.baseKey,
        evidence_spans_sample: evidence.length > 0 ? evidence : undefined,
      };
    });

  return {
    coverage: {
      total_nodes: total,
      matched_nodes: matched,
      matched_ratio: total > 0 ? matched / total : 0,
    },
    matched_by_source: matchedBySource,
    proposals_sample: proposals,
  };
}

export function materializeSessionText(entries: DreamMapSessionEntry[] | null | undefined): MaterializedSession {
  const rows = (Array.isArray(entries) ? entries.slice() : []).filter(
    (row) => typeof row?.content === "string" && row.content.length > 0
  );
  rows.sort((a, b) => {
    const at = a.created_at ?? "";
    const bt = b.created_at ?? "";
    if (at !== bt) return at.localeCompare(bt);
    return String(a.id ?? "").localeCompare(String(b.id ?? ""));
  });

  let fullText = "";
  let cursor = 0;
  const entrySpans: DreamMapEntrySpan[] = [];
  const countsByKind: Record<string, number> = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const content = row.content;

    const start = cursor;
    fullText += content;
    cursor += content.length;
    const end = cursor;

    entrySpans.push({
      entry_id: row.id,
      kind: row.kind ?? null,
      start,
      end,
    });

    const kindKey = row.kind ?? "unknown";
    countsByKind[kindKey] = (countsByKind[kindKey] ?? 0) + 1;

    if (i < rows.length - 1) {
      fullText += "\n\n";
      cursor += 2;
    }
  }

  return { full_text: fullText, entry_spans: entrySpans, entries_count_by_kind: countsByKind };
}

function trimSpan(text: string, start: number, end: number): { start: number; end: number } | null {
  let s = Math.max(0, start);
  let e = Math.max(s, end);
  while (s < e && /\s/.test(text[s])) s++;
  while (e > s && /\s/.test(text[e - 1])) e--;
  if (e <= s) return null;
  return { start: s, end: e };
}

export function extractParagraphSpans(text: string, maxUnits: number): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  if (!text) return spans;

  const regex = /\n\s*\n+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(text)) !== null) {
    if (spans.length >= maxUnits) break;
    const rawStart = lastIndex;
    const rawEnd = match.index;
    const trimmed = trimSpan(text, rawStart, rawEnd);
    if (trimmed) spans.push(trimmed);
    lastIndex = regex.lastIndex;
  }

  if (spans.length < maxUnits && lastIndex < text.length) {
    const trimmed = trimSpan(text, lastIndex, text.length);
    if (trimmed) spans.push(trimmed);
  }

  return spans;
}

export function extractSentenceSpans(text: string, maxUnits: number): Array<{ start: number; end: number }> {
  const spans: Array<{ start: number; end: number }> = [];
  if (!text) return spans;

  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    const next = text[i + 1] ?? "";
    if (next && !/\s/.test(next)) continue;
    const rawEnd = i + 1;
    const trimmed = trimSpan(text, start, rawEnd);
    if (trimmed) spans.push(trimmed);
    start = rawEnd;
    if (spans.length >= maxUnits) break;
  }

  if (spans.length < maxUnits && start < text.length) {
    const trimmed = trimSpan(text, start, text.length);
    if (trimmed) spans.push(trimmed);
  }

  return spans;
}

function addEvidence<T extends { source: string; path: string }>(list: T[], entry: T) {
  if (!entry?.source || !entry?.path) return;
  if (list.some((e) => e.source === entry.source && e.path === entry.path)) return;
  list.push(entry);
}

function addNodeKindEvidence(
  node: { evidence: Array<{ source: "observation" | "anchors" | "glossary" | "highlight"; path: string }> },
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

function anchorKindFromCategory(category: unknown, fallbackLabel: string): DreamMapNodeKind {
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
    default: {
      const hasSpace = fallbackLabel.includes(" ");
      return hasSpace ? "themes_words" : "objects";
    }
  }
}

function isRecurrenceBetter(
  next: { session_count: number; occurrence_count: number; last_seen_at: string | null },
  existing: { session_count: number; occurrence_count: number; last_seen_at: string | null }
): boolean {
  if (next.session_count !== existing.session_count) return next.session_count > existing.session_count;
  if (next.occurrence_count !== existing.occurrence_count) return next.occurrence_count > existing.occurrence_count;
  const nextSeen = next.last_seen_at;
  const existingSeen = existing.last_seen_at;
  if (nextSeen === existingSeen) return false;
  if (nextSeen && !existingSeen) return true;
  if (!nextSeen && existingSeen) return false;
  return String(nextSeen) > String(existingSeen);
}

function termIdToBaseKey(row: DreamMapGlossaryRecurrence): string | null {
  const direct = pickFirstString(row.canonical_key, row.anchor_key);
  let baseKey = "";
  if (direct) {
    baseKey = normalizeBaseKey(direct);
  } else {
    const canonicalName = pickFirstString(row.canonical_name);
    if (canonicalName) {
      baseKey = normalizeBaseKey(anchorKey(canonicalName));
    } else {
      const fallbackName = pickFirstString(row.canonical, row.name, row.term);
      if (fallbackName) baseKey = normalizeBaseKey(anchorKey(fallbackName));
    }
  }

  return baseKey || null;
}

function sortGlossaryRecurrence(rows: DreamMapGlossaryRecurrence[] | null | undefined): DreamMapGlossaryRecurrence[] {
  const out = Array.isArray(rows) ? rows.slice() : [];
  out.sort((a, b) => String(a.term_id ?? "").localeCompare(String(b.term_id ?? "")));
  return out;
}

function isHighlightPrimary(row: { category?: string | null; note?: string | null }): boolean {
  const hay = `${row?.category ?? ""} ${row?.note ?? ""}`.toLowerCase();
  return hay.includes("core") || hay.includes("very important") || hay.includes("very_important");
}

function nodeKeyFor(params: {
  kind: DreamMapNodeKind;
  label: string;
  resolvedByKindBase: Map<string, ResolvedNodeIdentity>;
  archetypeIndex: ArchetypeIndex;
  glossaryKeyMap: GlossaryCanonicalKeyMap;
}): { key: string; baseKey: string; canonical?: DreamMapNode["canonical"]; match_source: ResolvedNodeIdentity["match_source"]; domain: DreamMapArchetypeDomain } | null {
  const baseKey = normalizeBaseKey(params.label);
  if (!baseKey) return null;

  const kindBase = `${params.kind}::${baseKey}`;
  const existing = params.resolvedByKindBase.get(kindBase);
  if (existing) {
    return {
      key: existing.nodeKey,
      baseKey: existing.raw_base_key,
      canonical: existing.canonical,
      match_source: existing.match_source,
      domain: existing.domain,
    };
  }

  const resolved = resolveNodeIdentity({
    baseKey,
    kind: params.kind,
    label: params.label,
    archetypeIndex: params.archetypeIndex,
    glossaryKeyMap: params.glossaryKeyMap,
  });
  if (!resolved) return null;

  params.resolvedByKindBase.set(kindBase, resolved);
  return {
    key: resolved.nodeKey,
    baseKey: resolved.raw_base_key,
    canonical: resolved.canonical,
    match_source: resolved.match_source,
    domain: resolved.domain,
  };
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

function buildGlossaryRecurrenceMap(glossaryRecurrence: DreamMapGlossaryRecurrence[]) {
  const occByBaseKey = new Map<string, number>();
  for (const row of glossaryRecurrence) {
    const baseKey = termIdToBaseKey(row);
    if (!baseKey) continue;
    const count = Number(row?.session_count ?? 0);
    const occ = Number.isFinite(count) && count > 0 ? count : 0;
    const existing = occByBaseKey.get(baseKey) ?? 0;
    occByBaseKey.set(baseKey, Math.max(existing, occ));
  }
  return occByBaseKey;
}

function buildGlossaryCandidatesFromRecurrence(glossaryRecurrence: DreamMapGlossaryRecurrence[]) {
  const out: Array<{ baseKey: string; label: string; occ: number }> = [];
  for (const row of glossaryRecurrence) {
    const label = pickFirstString(
      row.canonical_key,
      row.anchor_key,
      row.canonical_name,
      row.canonical,
      row.name,
      row.term
    );
    if (!label) continue;
    const baseKey = normalizeBaseKey(label);
    if (!baseKey) continue;
    const occ = Number(row?.occurrence_count ?? row?.session_count ?? 1);
    out.push({
      baseKey,
      label,
      occ: Number.isFinite(occ) && occ > 0 ? occ : 1,
    });
  }
  return out;
}

function buildCandidatePool(params: {
  anchorPayload: any | null | undefined;
  glossaryOccurrences: Array<{ canonical_key: string; occurrences?: number | null }> | null | undefined;
  glossaryRecurrence: DreamMapGlossaryRecurrence[] | null | undefined;
  highlights: Array<{ text: string; category?: string | null }> | null | undefined;
}): CandidateInfo[] {
  const byKey = new Map<string, CandidateInfo>();

  const addCandidate = (baseKey: string, label: string, kind: DreamMapNodeKind, score: number, source: CandidateInfo["sources"][number]) => {
    if (!baseKey) return;
    const existing = byKey.get(baseKey);
    if (!existing) {
      byKey.set(baseKey, {
        baseKey,
        label,
        kind,
        baseScore: score,
        normKey: normalizeForMatch(baseKey),
        sources: [source],
      });
      return;
    }

    existing.baseScore = Math.max(existing.baseScore, score);
    if (!existing.sources.includes(source)) existing.sources.push(source);

    const sourceRank: Record<CandidateInfo["sources"][number], number> = {
      anchors: 3,
      highlight: 2,
      glossary: 1,
    };

    if (sourceRank[source] > sourceRank[existing.sources[0]]) {
      existing.label = label || existing.label;
      existing.kind = kind;
      existing.sources = [source, ...existing.sources.filter((s) => s !== source)];
    }
  };

  const anchors = Array.isArray(params.anchorPayload?.anchors) ? params.anchorPayload.anchors : [];
  const anchorRows = anchors
    .map((row: any) => {
      const name = typeof row?.name === "string" ? row.name.trim() : "";
      if (!name) return null;
      const baseKey = normalizeBaseKey(name);
      if (!baseKey) return null;
      const score = Number(row?.score ?? 0);
      return {
        baseKey,
        label: name,
        kind: anchorKindFromCategory(row?.category, name),
        score: Number.isFinite(score) ? score : 0,
      };
    })
    .filter(Boolean) as Array<{ baseKey: string; label: string; kind: DreamMapNodeKind; score: number }>;

  anchorRows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.label.localeCompare(b.label);
  });

  for (const row of anchorRows.slice(0, CANDIDATE_ANCHORS_MAX)) {
    addCandidate(row.baseKey, row.label, row.kind, row.score, "anchors");
  }

  const recurrenceRows = Array.isArray(params.glossaryRecurrence) ? params.glossaryRecurrence : [];
  const glossaryRows =
    recurrenceRows.length > 0 ? buildGlossaryCandidatesFromRecurrence(recurrenceRows) : params.glossaryOccurrences ?? [];

  const glossarySorted = glossaryRows
    .map((row: any) => {
      const raw = typeof row?.canonical_key === "string" ? row.canonical_key.trim() : "";
      const label = raw || (typeof row?.label === "string" ? row.label.trim() : "");
      const baseKey = normalizeBaseKey(label || row?.baseKey || "");
      if (!baseKey) return null;
      const occ = Number(row?.occurrences ?? row?.occ ?? 1);
      return {
        baseKey,
        label: label || baseKey,
        occ: Number.isFinite(occ) ? occ : 1,
      };
    })
    .filter(Boolean) as Array<{ baseKey: string; label: string; occ: number }>;

  glossarySorted.sort((a, b) => {
    if (b.occ !== a.occ) return b.occ - a.occ;
    return a.label.localeCompare(b.label);
  });

  for (const row of glossarySorted.slice(0, CANDIDATE_GLOSSARY_MAX)) {
    addCandidate(row.baseKey, row.label, "themes_words", row.occ, "glossary");
  }

  const highlightRows = Array.isArray(params.highlights) ? params.highlights : [];
  const highlightSorted = highlightRows
    .map((row) => {
      const label = normalizeHighlightLabel(row?.text);
      if (!label) return null;
      const baseKey = normalizeBaseKey(label);
      if (!baseKey) return null;
      return { baseKey, label, kind: highlightKindFromCategory(row?.category, label) };
    })
    .filter(Boolean) as Array<{ baseKey: string; label: string; kind: DreamMapNodeKind }>;

  highlightSorted.sort((a, b) => a.label.localeCompare(b.label));

  for (const row of highlightSorted.slice(0, CANDIDATE_HIGHLIGHT_MAX)) {
    addCandidate(row.baseKey, row.label, row.kind, 1.5, "highlight");
  }

  const out = Array.from(byKey.values());
  out.sort((a, b) => {
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    return a.baseKey.localeCompare(b.baseKey);
  });
  return out;
}

function countOccurrencesInNormalizedText(normalizedText: string, normalizedKey: string): number {
  if (!normalizedKey) return 0;
  const hay = ` ${normalizedText} `;
  const needle = ` ${normalizedKey} `;
  let count = 0;
  let idx = hay.indexOf(needle);
  while (idx >= 0) {
    count++;
    idx = hay.indexOf(needle, idx + needle.length);
  }
  return count;
}

function selectUnitCandidates(
  unitText: string,
  pool: CandidateInfo[],
  forcedKeys: Set<string> | null,
  maxNodes: number
): UnitCandidate[] {
  if (!unitText || pool.length === 0) return [];
  const normalizedText = normalizeForMatch(unitText);
  if (!normalizedText) return [];

  const out: UnitCandidate[] = [];
  for (const cand of pool) {
    const occ = countOccurrencesInNormalizedText(normalizedText, cand.normKey);
    if (occ <= 0 && (!forcedKeys || !forcedKeys.has(cand.baseKey))) continue;
    out.push({
      baseKey: cand.baseKey,
      label: cand.label,
      kind: cand.kind,
      occ,
      score: cand.baseScore + occ * OCCURRENCE_BOOST,
    });
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.baseKey.localeCompare(b.baseKey);
  });

  return out.slice(0, maxNodes);
}

function buildDreamMapV1SpanCooc(input: DreamMapBuilderInput): DreamMapPayloadV0 {
  const observation = input.observationPayloadV0 as ObservationPayloadV0;
  const meta = input.meta;
  const computedAt = meta.computed_at ?? new Date().toISOString();

  const material = materializeSessionText(input.sessionEntries);
  const fullText = material.full_text;
  const entrySpans = material.entry_spans;
  const entrySpanById = new Map(entrySpans.map((span) => [span.entry_id, span]));

  const candidatePool = buildCandidatePool({
    anchorPayload: input.anchorPayload ?? null,
    glossaryOccurrences: input.glossaryOccurrences ?? null,
    glossaryRecurrence: input.glossaryRecurrence ?? null,
    highlights: input.highlights ?? null,
  });
  const candidateByBaseKey = new Map(candidatePool.map((c) => [c.baseKey, c]));
  const archetypeIndex = buildArchetypeIndex(input.archetypeTerms);
  const glossaryKeyMap = buildGlossaryCanonicalKeyMap(input.glossaryRecurrence, input.glossaryOccurrences);
  const resolvedByKindBase = new Map<string, ResolvedNodeIdentity>();
  const canonicalizerStats = new Map<string, CanonicalizerStat>();

  const nodes = new Map<string, CoocNodeAccumulator>();
  const occByBaseKey = new Map<string, number>();
  type NodePair = { nodeKey: string; baseKey: string };

  const labelSourceForBaseKey = (baseKey: string): LabelSource => {
    const pool = candidateByBaseKey.get(baseKey);
    const source = pool?.sources?.[0];
    if (source === "anchors") return "anchors";
    if (source === "glossary") return "glossary";
    if (source === "highlight") return "highlight";
    return "raw";
  };

  const resolveCandidateIdentity = (candidate: UnitCandidate): ResolvedNodeIdentity | null => {
    const cacheKey = `${candidate.kind}::${candidate.baseKey}`;
    const cached = resolvedByKindBase.get(cacheKey);
    if (cached) return cached;
    const resolved = resolveNodeIdentity({
      baseKey: candidate.baseKey,
      kind: candidate.kind,
      label: candidate.label,
      archetypeIndex,
      glossaryKeyMap,
    });
    if (resolved) resolvedByKindBase.set(cacheKey, resolved);
    return resolved;
  };

  const unitNodePairs = (candidates: UnitCandidate[]): NodePair[] => {
    const map = new Map<string, string>();
    for (const cand of candidates) {
      const resolved = resolveCandidateIdentity(cand);
      if (!resolved) continue;
      if (!map.has(resolved.nodeKey)) map.set(resolved.nodeKey, resolved.raw_base_key);
    }
    return Array.from(map.entries())
      .map(([nodeKey, baseKey]) => ({ nodeKey, baseKey }))
      .sort((a, b) => a.nodeKey.localeCompare(b.nodeKey));
  };

  const addNodeEvidenceSpan = (node: CoocNodeAccumulator, span: DreamMapNodeEvidenceSpan) => {
    if (node.evidence_spans.length >= NODE_EVIDENCE_SPAN_LIMIT) return;
    if (
      node.evidence_spans.some(
        (ev) =>
          ev.source === span.source &&
          ev.entry_id === span.entry_id &&
          ev.start === span.start &&
          ev.end === span.end &&
          ev.entry_start === span.entry_start &&
          ev.entry_end === span.entry_end
      )
    ) {
      return;
    }
    node.evidence_spans.push(span);
  };

  const addNodeFromCandidate = (
    candidate: UnitCandidate,
    source: DreamMapEdgeTrace["source"],
    span: DreamMapEdgeTrace,
    labelSourceOverride?: LabelSource
  ) => {
    const resolved = resolveCandidateIdentity(candidate);
    if (!resolved) return;
    const baseKey = resolved.raw_base_key;
    const kind = candidate.kind;
    const key = resolved.nodeKey;
    const occurrence = Math.max(1, candidate.occ || 0) + (source === "highlight_span" ? HIGHLIGHT_OCC_BOOST : 0);
    const labelSource = labelSourceOverride ?? labelSourceForBaseKey(baseKey);

    let node = nodes.get(key);
    if (!node) {
      node = {
        key,
        baseKey,
        label: candidate.label,
        label_rank: LABEL_SOURCE_RANK[labelSource],
        kind,
        canonical: resolved.canonical,
        occurrence: 0,
        evidence: [],
        evidence_spans: [],
      };

      const pool = candidateByBaseKey.get(baseKey);
      if (pool?.sources.includes("anchors")) addNodeKindEvidence(node, "anchors", "anchors.payload.anchors");
      if (pool?.sources.includes("glossary")) addNodeKindEvidence(node, "glossary", "glossary_occurrences");
      if (pool?.sources.includes("highlight")) addNodeKindEvidence(node, "highlight", "session_highlights");

      nodes.set(key, node);
    }

    applyLabelChoice(node, candidate.label, labelSource);
    if (resolved.canonical?.canonical_label) {
      applyLabelChoice(node, resolved.canonical.canonical_label, "archetype");
    }

    node.occurrence += occurrence;
    occByBaseKey.set(baseKey, (occByBaseKey.get(baseKey) ?? 0) + occurrence);

    const evidenceSpan: DreamMapNodeEvidenceSpan = {
      source,
      entry_id: span.entry_id,
      start: span.start,
      end: span.end,
      entry_start: span.entry_start,
      entry_end: span.entry_end,
    };
    addNodeEvidenceSpan(node, evidenceSpan);
    updateCanonicalizerStat(canonicalizerStats, {
      domain: resolved.domain,
      baseKey,
      label: candidate.label,
      labelSource,
      occurrence,
      match_source: resolved.match_source,
      evidence_span: evidenceSpan,
    });
  };

  const events: DreamMapCoocEvent[] = [];
  const eventsBySource: Record<string, number> = {
    highlight_span: 0,
    raw_sentence: 0,
    raw_paragraph: 0,
  };

  let highlightSpanCharsTotal = 0;
  const entryHighlights = Array.isArray(input.entryHighlights) ? input.entryHighlights : [];

  for (const row of entryHighlights) {
    const entrySpan = entrySpanById.get(row.entry_id);
    if (!entrySpan) continue;
    const entryLen = entrySpan.end - entrySpan.start;
    if (entryLen <= 0) continue;

    const localStart = Math.max(0, Math.min(row.start, entryLen));
    const localEnd = Math.max(localStart, Math.min(row.end, entryLen));
    if (localEnd <= localStart) continue;

    const sessionStart = entrySpan.start + localStart;
    const sessionEnd = entrySpan.start + localEnd;
    if (sessionEnd <= sessionStart) continue;

    highlightSpanCharsTotal += sessionEnd - sessionStart;
    const spanText = fullText.slice(sessionStart, sessionEnd);

    const forcedKeys = new Set<string>();
    const anchorKeyRaw = typeof row.anchor_key === "string" ? row.anchor_key.trim() : "";
    if (anchorKeyRaw) {
      const baseKey = normalizeBaseKey(anchorKeyRaw);
      if (baseKey) forcedKeys.add(baseKey);
    }

    let unitCandidates = selectUnitCandidates(spanText, candidatePool, forcedKeys, COOC_MAX_UNIT_NODES);

    if (forcedKeys.size > 0) {
      for (const baseKey of forcedKeys) {
        if (unitCandidates.some((c) => c.baseKey === baseKey)) continue;
        const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : baseKey;
        unitCandidates = [
          ...unitCandidates,
          {
            baseKey,
            label,
            kind: highlightKindFromCategory(row.category, label),
            occ: 0,
            score: 0,
          },
        ];
      }
    }

    const spanMeta: DreamMapEdgeTrace = {
      source: "highlight_span",
      entry_id: row.entry_id,
      start: sessionStart,
      end: sessionEnd,
      unit: "span",
      proximity_bucket: "same_span",
      entry_start: localStart,
      entry_end: localEnd,
    };

    for (const candidate of unitCandidates) {
      const override =
        forcedKeys.has(candidate.baseKey) && !candidateByBaseKey.has(candidate.baseKey) ? "highlight" : undefined;
      addNodeFromCandidate(candidate, "highlight_span", spanMeta, override);
    }

    const unitNodes = unitNodePairs(unitCandidates);
    if (unitNodes.length < 2) continue;
    for (let i = 0; i < unitNodes.length; i++) {
      for (let j = i + 1; j < unitNodes.length; j++) {
        const aNode = unitNodes[i].nodeKey;
        const bNode = unitNodes[j].nodeKey;
        const aKey = unitNodes[i].baseKey;
        const bKey = unitNodes[j].baseKey;
        events.push({
          source: "highlight_span",
          span: {
            entry_id: row.entry_id,
            start: sessionStart,
            end: sessionEnd,
            entry_start: localStart,
            entry_end: localEnd,
          },
          unit: "span",
          a_key: aKey,
          b_key: bKey,
          a_node: aNode,
          b_node: bNode,
          count: 1,
          proximity_bucket: "same_span",
        });
      }
    }
  }

  eventsBySource.highlight_span = events.filter((e) => e.source === "highlight_span").length;

  const highlightCoverageRatio = fullText.length > 0 ? highlightSpanCharsTotal / fullText.length : 0;

  const shouldFallback = eventsBySource.highlight_span === 0;
  if (shouldFallback && fullText.length > 0) {
    const sentenceSpans = extractSentenceSpans(fullText, COOC_MAX_SENTENCES);
    for (const span of sentenceSpans) {
      const text = fullText.slice(span.start, span.end);
      const unitCandidates = selectUnitCandidates(text, candidatePool, null, COOC_MAX_UNIT_NODES);
      const spanMeta: DreamMapEdgeTrace = {
        source: "raw_sentence",
        start: span.start,
        end: span.end,
        unit: "sentence",
        proximity_bucket: "same_sentence",
      };

      for (const candidate of unitCandidates) {
        addNodeFromCandidate(candidate, "raw_sentence", spanMeta);
      }

      const unitNodes = unitNodePairs(unitCandidates);
      if (unitNodes.length < 2) continue;
      for (let i = 0; i < unitNodes.length; i++) {
        for (let j = i + 1; j < unitNodes.length; j++) {
          const aNode = unitNodes[i].nodeKey;
          const bNode = unitNodes[j].nodeKey;
          const aKey = unitNodes[i].baseKey;
          const bKey = unitNodes[j].baseKey;
          events.push({
            source: "raw_sentence",
            span: { start: span.start, end: span.end },
            unit: "sentence",
            a_key: aKey,
            b_key: bKey,
            a_node: aNode,
            b_node: bNode,
            count: 1,
            proximity_bucket: "same_sentence",
          });
        }
      }
    }

    const paragraphSpans = extractParagraphSpans(fullText, COOC_MAX_PARAGRAPHS);
    for (const span of paragraphSpans) {
      const text = fullText.slice(span.start, span.end);
      const unitCandidates = selectUnitCandidates(text, candidatePool, null, COOC_MAX_UNIT_NODES);
      const spanMeta: DreamMapEdgeTrace = {
        source: "raw_paragraph",
        start: span.start,
        end: span.end,
        unit: "paragraph",
        proximity_bucket: "same_paragraph",
      };

      for (const candidate of unitCandidates) {
        addNodeFromCandidate(candidate, "raw_paragraph", spanMeta);
      }

      const unitNodes = unitNodePairs(unitCandidates);
      if (unitNodes.length < 2) continue;
      for (let i = 0; i < unitNodes.length; i++) {
        for (let j = i + 1; j < unitNodes.length; j++) {
          const aNode = unitNodes[i].nodeKey;
          const bNode = unitNodes[j].nodeKey;
          const aKey = unitNodes[i].baseKey;
          const bKey = unitNodes[j].baseKey;
          events.push({
            source: "raw_paragraph",
            span: { start: span.start, end: span.end },
            unit: "paragraph",
            a_key: aKey,
            b_key: bKey,
            a_node: aNode,
            b_node: bNode,
            count: 1,
            proximity_bucket: "same_paragraph",
          });
        }
      }
    }
  }

  eventsBySource.raw_sentence = events.filter((e) => e.source === "raw_sentence").length;
  eventsBySource.raw_paragraph = events.filter((e) => e.source === "raw_paragraph").length;

  const edges = new Map<string, CoocEdgeAccumulator>();
  for (const event of events) {
    const baseWeight = COOC_WEIGHT_BY_BUCKET[event.proximity_bucket] ?? 0;
    if (baseWeight <= 0) continue;

    const fromKey = event.a_node ?? `${event.a_key}:themes_words`;
    const toKey = event.b_node ?? `${event.b_key}:themes_words`;
    if (fromKey === toKey) continue;
    const [from, to] = fromKey < toKey ? [fromKey, toKey] : [toKey, fromKey];
    const edgeKey = `${from}::${to}`;

    const trace: DreamMapEdgeTrace = {
      source: event.source,
      entry_id: event.span.entry_id,
      start: event.span.start,
      end: event.span.end,
      unit: event.unit,
      proximity_bucket: event.proximity_bucket,
      entry_start: event.span.entry_start,
      entry_end: event.span.entry_end,
    };

    const existing = edges.get(edgeKey);
    if (existing) {
      existing.weight_raw += baseWeight * event.count;
      if (existing.trace.length < EDGE_TRACE_LIMIT) existing.trace.push(trace);
    } else {
      edges.set(edgeKey, {
        from,
        to,
        weight_raw: baseWeight * event.count,
        trace: [trace],
      });
    }
  }

  const edgeArray = Array.from(edges.values());
  edgeArray.sort((a, b) => {
    if (b.weight_raw !== a.weight_raw) return b.weight_raw - a.weight_raw;
    return `${a.from}::${a.to}`.localeCompare(`${b.from}::${b.to}`);
  });

  const uniqueEdgesBeforePrune = edgeArray.length;
  const prunedEdges = edgeArray.slice(0, COOC_MAX_EDGES);
  const maxEdgeWeight = prunedEdges.reduce((max, e) => Math.max(max, e.weight_raw), 0);

  const degreeByNode = new Map<string, number>();
  for (const edge of prunedEdges) {
    degreeByNode.set(edge.from, (degreeByNode.get(edge.from) ?? 0) + edge.weight_raw);
    degreeByNode.set(edge.to, (degreeByNode.get(edge.to) ?? 0) + edge.weight_raw);
  }

  const maxDegree = Math.max(0, ...Array.from(degreeByNode.values()));
  const glossaryRecurrenceSorted = sortGlossaryRecurrence(input.glossaryRecurrence);
  const glossaryProvided = Array.isArray(input.glossaryOccurrences) || glossaryRecurrenceSorted.length > 0;
  const glossaryMap =
    glossaryRecurrenceSorted.length > 0
      ? buildGlossaryRecurrenceMap(glossaryRecurrenceSorted)
      : buildGlossaryMap(input.glossaryOccurrences ?? []);
  const maxGlossaryOcc = Math.max(0, ...Array.from(glossaryMap.values()));

  const nodeArray: DreamMapNode[] = [];
  const zRawByKey = new Map<string, number>();
  const glossaryNormByKey = new Map<string, number>();
  const recurrenceByBaseKey = new Map<
    string,
    {
      occurrence_count: number;
      session_count: number;
      first_seen_at: string | null;
      last_seen_at: string | null;
    }
  >();

  for (const row of glossaryRecurrenceSorted) {
    const baseKey = termIdToBaseKey(row);
    if (!baseKey) continue;
    const existing = recurrenceByBaseKey.get(baseKey);
    const next = {
      occurrence_count: Number(row.occurrence_count ?? 0),
      session_count: Number(row.session_count ?? 0),
      first_seen_at: row.first_seen_at ?? null,
      last_seen_at: row.last_seen_at ?? null,
    };

    if (!existing || isRecurrenceBetter(next, existing)) {
      recurrenceByBaseKey.set(baseKey, next);
    }
  }

  const maxSessionCount = Math.max(
    0,
    ...Array.from(recurrenceByBaseKey.values()).map((row) => Number(row.session_count ?? 0))
  );

  const nodesSorted = Array.from(nodes.values()).sort((a, b) => a.key.localeCompare(b.key));
  for (const node of nodesSorted) {
    const centrality = maxDegree > 0 ? (degreeByNode.get(node.key) ?? 0) / maxDegree : 0;
    const effectiveBaseKey = node.canonical?.canonical_key ?? node.baseKey;
    const glossaryOcc = glossaryMap.get(effectiveBaseKey) ?? 0;
    const glossaryNorm = maxGlossaryOcc > 0 ? glossaryOcc / maxGlossaryOcc : 0;
    glossaryNormByKey.set(node.key, glossaryNorm);

    const kindWeight = KIND_WEIGHTS[node.kind] ?? 1;
    const zRaw = kindWeight * node.occurrence + W_CENT * centrality;
    zRawByKey.set(node.key, zRaw);

    const recurrence = recurrenceByBaseKey.get(effectiveBaseKey);
    const recurrenceScore =
      recurrence && maxSessionCount > 0
        ? Math.log1p(Math.max(0, recurrence.session_count)) / Math.log1p(maxSessionCount)
        : 0;

    nodeArray.push({
      key: node.key,
      base_key: node.baseKey,
      label: node.label,
      kind: node.kind,
      canonical: node.canonical,
      x: null,
      y: null,
      axis_source: "none",
      axis_evidence_scene_index: null,
      z: 0,
      centrality,
      occurrence: node.occurrence,
      size: 0,
      opacity: 0,
      porosity: null,
      scene_presence_count: 0,
      primary_scene_count: 0,
      scene_indices: [],
      recurrence: recurrence
        ? {
            occurrence_count: Math.max(0, Number(recurrence.occurrence_count ?? 0)),
            session_count: Math.max(0, Number(recurrence.session_count ?? 0)),
            first_seen_at: recurrence.first_seen_at ?? null,
            last_seen_at: recurrence.last_seen_at ?? null,
            score: Number.isFinite(recurrenceScore) ? recurrenceScore : 0,
          }
        : undefined,
      evidence: node.evidence,
      evidence_spans: node.evidence_spans,
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
    } else {
      node.porosity = null;
    }
  }

  const edgesOut: DreamMapEdge[] = prunedEdges.map((edge) => {
    const norm = maxEdgeWeight > 0 ? edge.weight_raw / maxEdgeWeight : 0;
    return {
      from: edge.from,
      to: edge.to,
      weight: norm,
      weight_raw: edge.weight_raw,
      weight_norm: norm,
      directed: false,
      evidence: [{ source: "cooc_event", path: "cooc_events" }],
      trace: edge.trace,
    };
  });

  const traceSamples = edgesOut.slice(0, TRACE_SAMPLE_LIMIT).map((edge) => ({
    edge: { from: edge.from, to: edge.to },
    trace: (edge.trace ?? []).slice(0, EDGE_TRACE_LIMIT),
  }));

  const scenes = Array.isArray(observation?.scenes) ? observation.scenes : [];
  const sceneAxisOut: DreamMapSceneAxis[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i] ?? ({} as ObservationPayloadV0["scenes"][number]);
    const axis = computeSceneAxisFromTokens({
      mood_words: parseStringList(scene?.mood_words),
      sensations: parseStringList(scene?.sensations),
      themes_words: parseStringList((scene as any)?.themes_words),
      lexicon: AXIS_LEXICON_V1,
    });
    sceneAxisOut.push({
      scene_index: i,
      x: axis.x,
      y: axis.y,
      confidence: axis.confidence,
      lexicon_version: axis.lexicon_version,
      evidence: axis.evidence,
    });
  }

  const warnings: DreamMapPayloadV0["meta"]["warnings"] = [];
  if (!input.anchorPayload) warnings.push({ code: "anchors_missing" });
  if (!glossaryProvided) warnings.push({ code: "glossary_missing" });

  const anchorMaps = buildAnchorMaps(input.anchorPayload ?? null);
  for (const [baseKey, anchorOccRaw] of anchorMaps.occByBaseKey.entries()) {
    const computedOcc = occByBaseKey.get(baseKey);
    if (typeof computedOcc !== "number") continue;

    const anchorOcc = Number(anchorOccRaw);
    if (!Number.isFinite(anchorOcc)) continue;
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
        primary_nodes_count: 0,
      },
      warnings,
      axis: {
        lexicon_version: AXIS_LEXICON_V1.version,
        scene_axis: sceneAxisOut,
      },
      debug: {
        algo_version: "dream_map_v1_span_cooc_mvp",
        material: {
          full_text_len: fullText.length,
          entry_spans_count: entrySpans.length,
          entries_count_by_kind: material.entries_count_by_kind,
        },
        coverage: {
          highlights_count: entryHighlights.length,
          highlight_span_chars_total: highlightSpanCharsTotal,
          highlight_coverage_ratio: highlightCoverageRatio,
        },
        cooc_stats: {
          events_by_source: eventsBySource,
          unique_edges_before_prune: uniqueEdgesBeforePrune,
          edges_after_prune: edgesOut.length,
          nodes_count: nodeArray.length,
        },
        trace_samples: traceSamples,
        determinism_hash: meta.determinism_hash,
        canonicalizer: buildCanonicalizerDebug(nodeArray, canonicalizerStats),
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

function buildDreamMapV0ScenePairs(input: DreamMapBuilderInput): DreamMapPayloadV0 {
  const observation = input.observationPayloadV0 as ObservationPayloadV0;
  const meta = input.meta;

  const computedAt = meta.computed_at ?? new Date().toISOString();
  const nodes = new Map<string, NodeAccumulator>();
  const archetypeIndex = buildArchetypeIndex(input.archetypeTerms);
  const glossaryKeyMap = buildGlossaryCanonicalKeyMap(input.glossaryRecurrence, input.glossaryOccurrences);
  const resolvedByKindBase = new Map<string, ResolvedNodeIdentity>();
  const canonicalizerStats = new Map<string, CanonicalizerStat>();

  const addNode = (kind: DreamMapNodeKind, label: string, path: string) => {
    const keyInfo = nodeKeyFor({
      kind,
      label,
      resolvedByKindBase,
      archetypeIndex,
      glossaryKeyMap,
    });
    if (!keyInfo) return null;
    const { key, baseKey } = keyInfo;
    const existing = nodes.get(key);
    if (existing) {
      existing.occurrence += 1;
      addNodeKindEvidence(existing, "observation", path);
      applyLabelChoice(existing, label, "raw");
      if (keyInfo.canonical?.canonical_label) {
        applyLabelChoice(existing, keyInfo.canonical.canonical_label, "archetype");
      }
      updateCanonicalizerStat(canonicalizerStats, {
        domain: keyInfo.domain,
        baseKey,
        label,
        labelSource: "raw",
        occurrence: 1,
        match_source: keyInfo.match_source,
      });
      return key;
    }

    const node: NodeAccumulator = {
      key,
      baseKey,
      label,
      label_rank: LABEL_SOURCE_RANK.raw,
      kind,
      canonical: keyInfo.canonical,
      occurrence: 1,
      evidence: [],
    };
    addNodeKindEvidence(node, "observation", path);
    applyLabelChoice(node, label, "raw");
    if (keyInfo.canonical?.canonical_label) {
      applyLabelChoice(node, keyInfo.canonical.canonical_label, "archetype");
    }
    nodes.set(key, node);
    updateCanonicalizerStat(canonicalizerStats, {
      domain: keyInfo.domain,
      baseKey,
      label,
      labelSource: "raw",
      occurrence: 1,
      match_source: keyInfo.match_source,
    });
    return key;
  };

  const addHighlightNode = (kind: DreamMapNodeKind, label: string, path: string) => {
    const keyInfo = nodeKeyFor({
      kind,
      label,
      resolvedByKindBase,
      archetypeIndex,
      glossaryKeyMap,
    });
    if (!keyInfo) return null;
    const { key, baseKey } = keyInfo;
    const existing = nodes.get(key);
    if (existing) {
      existing.occurrence += HIGHLIGHT_OCC_BOOST;
      addNodeKindEvidence(existing, "highlight", path);
      applyLabelChoice(existing, label, "highlight");
      if (keyInfo.canonical?.canonical_label) {
        applyLabelChoice(existing, keyInfo.canonical.canonical_label, "archetype");
      }
      updateCanonicalizerStat(canonicalizerStats, {
        domain: keyInfo.domain,
        baseKey,
        label,
        labelSource: "highlight",
        occurrence: HIGHLIGHT_OCC_BOOST,
        match_source: keyInfo.match_source,
      });
      return key;
    }

    const node: NodeAccumulator = {
      key,
      baseKey,
      label,
      label_rank: LABEL_SOURCE_RANK.highlight,
      kind,
      canonical: keyInfo.canonical,
      occurrence: HIGHLIGHT_OCC_BOOST,
      evidence: [],
    };
    addNodeKindEvidence(node, "highlight", path);
    applyLabelChoice(node, label, "highlight");
    if (keyInfo.canonical?.canonical_label) {
      applyLabelChoice(node, keyInfo.canonical.canonical_label, "archetype");
    }
    nodes.set(key, node);
    updateCanonicalizerStat(canonicalizerStats, {
      domain: keyInfo.domain,
      baseKey,
      label,
      labelSource: "highlight",
      occurrence: HIGHLIGHT_OCC_BOOST,
      match_source: keyInfo.match_source,
    });
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
  const glossaryRecurrenceSorted = sortGlossaryRecurrence(input.glossaryRecurrence);
  const glossaryProvided = Array.isArray(input.glossaryOccurrences) || glossaryRecurrenceSorted.length > 0;
  const glossaryMap =
    glossaryRecurrenceSorted.length > 0
      ? buildGlossaryRecurrenceMap(glossaryRecurrenceSorted)
      : buildGlossaryMap(input.glossaryOccurrences ?? []);

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

  const recurrenceByBaseKey = new Map<
    string,
    {
      occurrence_count: number;
      session_count: number;
      first_seen_at: string | null;
      last_seen_at: string | null;
    }
  >();

  for (const row of glossaryRecurrenceSorted) {
    const baseKey = termIdToBaseKey(row);
    if (!baseKey) continue;
    const existing = recurrenceByBaseKey.get(baseKey);
    const next = {
      occurrence_count: Number(row.occurrence_count ?? 0),
      session_count: Number(row.session_count ?? 0),
      first_seen_at: row.first_seen_at ?? null,
      last_seen_at: row.last_seen_at ?? null,
    };

    if (!existing || isRecurrenceBetter(next, existing)) {
      recurrenceByBaseKey.set(baseKey, next);
    }
  }

  const maxSessionCount = Math.max(
    0,
    ...Array.from(recurrenceByBaseKey.values()).map((row) => Number(row.session_count ?? 0))
  );

  const nodeArray: DreamMapNode[] = [];
  const zRawByKey = new Map<string, number>();
  const glossaryNormByKey = new Map<string, number>();

  for (const node of nodes.values()) {
    const centrality = maxDegree > 0 ? (degreeByNode.get(node.key) ?? 0) / maxDegree : 0;
    const anchorScore = anchorMaps.scoreByBaseKey.get(node.baseKey) ?? 0;
    const effectiveBaseKey = node.canonical?.canonical_key ?? node.baseKey;
    const glossaryOcc = glossaryMap.get(effectiveBaseKey) ?? 0;
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

    const recurrence = recurrenceByBaseKey.get(effectiveBaseKey);
    const recurrenceScore =
      recurrence && maxSessionCount > 0
        ? Math.log1p(Math.max(0, recurrence.session_count)) / Math.log1p(maxSessionCount)
        : 0;

    nodeArray.push({
      key: node.key,
      base_key: node.baseKey,
      label: node.label,
      kind: node.kind,
      canonical: node.canonical,
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
      recurrence: recurrence
        ? {
            occurrence_count: Math.max(0, Number(recurrence.occurrence_count ?? 0)),
            session_count: Math.max(0, Number(recurrence.session_count ?? 0)),
            first_seen_at: recurrence.first_seen_at ?? null,
            last_seen_at: recurrence.last_seen_at ?? null,
            score: Number.isFinite(recurrenceScore) ? recurrenceScore : 0,
          }
        : undefined,
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
      debug: {
        determinism_hash: meta.determinism_hash,
        canonicalizer: buildCanonicalizerDebug(nodeArray, canonicalizerStats),
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

export function buildDreamMapV0(input: DreamMapBuilderInput): DreamMapPayloadV0 {
  const algo = (input.meta?.algo_version ?? "").trim();
  if (algo === "v0_scenePairs" || algo === "dream_map_v0_scenePairs") {
    return buildDreamMapV0ScenePairs(input);
  }
  return buildDreamMapV1SpanCooc(input);
}
