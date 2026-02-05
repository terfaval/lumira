import type { ObservationPayloadV0 } from "@/src/domain/observe/types";

export type DreamMapNodeKind =
  | "people"
  | "places"
  | "objects"
  | "actions"
  | "sensations"
  | "mood_words"
  | "themes_words";

export type DreamMapArchetypeDomain =
  | "people"
  | "places"
  | "objects"
  | "actions"
  | "sensations"
  | "mood_words"
  | "themes_words";

export type DreamMapArchetypeTerm = {
  id: string;
  user_id: string;
  domain: DreamMapArchetypeDomain;
  canonical_key: string;
  canonical_label: string;
  aliases?: string[] | null;
  alias_keys?: string[] | null;
  status: "proposed" | "verified" | "deprecated";
  provenance?: "auto" | "admin" | "user";
  created_at?: string;
  updated_at?: string;
};

export type DreamMapEvidence = {
  source: "observation" | "anchors" | "glossary" | "highlight";
  path: string;
};

export type DreamMapEdgeEvidence = {
  source: "observation" | "cooc_event";
  path: string;
  explicit?: boolean;
};

export type DreamMapEdgeTrace = {
  source: "highlight_span" | "raw_sentence" | "raw_paragraph";
  entry_id?: string;
  start: number;
  end: number;
  unit: "span" | "sentence" | "paragraph";
  proximity_bucket: "same_span" | "same_sentence" | "same_paragraph";
  entry_start?: number;
  entry_end?: number;
};

export type DreamMapNodeEvidenceSpan = {
  source: "highlight_span" | "raw_sentence" | "raw_paragraph";
  entry_id?: string;
  start: number;
  end: number;
  entry_start?: number;
  entry_end?: number;
};

export type DreamMapNode = {
  key: string;
  base_key?: string;
  motif_key?: string;
  motif_label?: string;
  motif_domain?: DreamMapArchetypeDomain;
  label: string;
  kind: DreamMapNodeKind;
  x: number | null;
  y: number | null;

  canonical?: {
    archetype_id?: string | null;
    canonical_key: string;
    canonical_label: string;
    match_source: "archetype" | "glossary";
  };

  axis_source?: "scene_inherited" | "none";
  axis_evidence_scene_index?: number | null;

  z: number;
  centrality: number;
  occurrence: number;
  size: number;
  opacity: number;
  porosity: number | null;
  scene_presence_count?: number;
  primary_scene_count?: number;
  scene_indices?: number[];
  primary_scene_indices?: number[];
  recurrence?: {
    occurrence_count: number;
    session_count: number;
    first_seen_at: string | null;
    last_seen_at: string | null;
    score: number;
  };
  evidence: DreamMapEvidence[];
  evidence_spans?: DreamMapNodeEvidenceSpan[];
};

export type DreamMapEdge = {
  from: string;
  to: string;
  weight: number;
  weight_raw?: number;
  weight_norm?: number;
  directed: boolean;
  evidence: DreamMapEdgeEvidence[];
  trace?: DreamMapEdgeTrace[];
};

export type DreamMapPayloadV0 = {
  schema_version: "dream_map_v0";
  algo_version: string;
  nodes: DreamMapNode[];
  edges: DreamMapEdge[];
  meta: {
    session_id: string;
    user_id: string;
    computed_at: string;
    source_version_ids: {
      observation_version_id: string;
      anchor_version_id?: string;
      session_index_version_id?: string;
    };
    counts: {
      node_count: number;
      edge_count: number;
      scene_count: number;
      primary_nodes_count?: number;
    };
    warnings: Array<
      | { code: "anchors_missing" }
      | { code: "occurrence_mismatch"; key: string; anchor_occ: number; computed_occ: number }
      | { code: "glossary_missing" }
    >;

    // NEW (additív)
    axis?: {
      lexicon_version: string;
      scene_axis: DreamMapSceneAxis[];
    };

    debug?: {
      algo_version?: string;
      material?: {
        full_text_len: number;
        entry_spans_count: number;
        entries_count_by_kind: Record<string, number>;
      };
      coverage?: {
        highlights_count: number;
        highlight_span_chars_total: number;
        highlight_coverage_ratio: number;
      };
      cooc_stats?: {
        events_by_source: Record<string, number>;
        unique_edges_before_prune: number;
        edges_after_prune: number;
        nodes_count: number;
      };
      trace_samples?: Array<{ edge: { from: string; to: string }; trace: DreamMapEdgeTrace[] }>;
      determinism_hash?: string;
      canonicalizer?: {
        coverage: {
          total_nodes: number;
          matched_nodes: number;
          matched_ratio: number;
        };
        matched_by_source: {
          archetype: number;
          glossary: number;
          raw: number;
        };
        proposals_sample?: Array<{
          domain: DreamMapArchetypeDomain;
          baseKey: string;
          label: string;
          occurrence: number;
          suggested_canonical_key: string;
          evidence_spans_sample?: DreamMapNodeEvidenceSpan[];
        }>;
      };
    };

    weights?: {
      w_cent?: number;
      w_occ?: number;
      w_anchor?: number;
      w_glossary?: number;
      highlight_occ_boost?: number;
      w_kind_people?: number;
      w_kind_places?: number;
      w_kind_objects?: number;
      w_kind_themes?: number;
      w_kind_sensations?: number;
      w_kind_mood_words?: number;
      w_kind_actions?: number;
      porosity_z: number;
      porosity_recurrence: number;
    };
  };
};

export type DreamMapGlossaryOccurrence = {
  canonical_key: string;
  occurrences?: number | null;
};

export type DreamMapGlossaryRecurrence = {
  term_id: string;
  occurrence_count: number;
  session_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_session_id?: string | null;
  canonical_key?: string | null;
  anchor_key?: string | null;
  canonical_name?: string | null;
  canonical?: string | null;
  name?: string | null;
  term?: string | null;
  category?: string | null;
};

export type DreamMapHighlightRow = {
  id: string;
  text: string;
  category?: string | null;
  note?: string | null;
};

export type DreamMapSessionEntry = {
  id: string;
  content: string;
  kind?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DreamMapEntrySpan = {
  entry_id: string;
  kind?: string | null;
  start: number;
  end: number;
};

export type DreamMapEntryHighlight = {
  id: string;
  entry_id: string;
  start: number;
  end: number;
  anchor_key?: string | null;
  label?: string | null;
  category?: string | null;
  glossary_term_id?: string | null;
};

export type DreamMapCoocEvent = {
  source: "highlight_span" | "raw_sentence" | "raw_paragraph";
  span: {
    entry_id?: string;
    start: number;
    end: number;
    entry_start?: number;
    entry_end?: number;
  };
  unit: "span" | "sentence" | "paragraph";
  a_key: string;
  b_key: string;
  a_node?: string;
  b_node?: string;
  count: number;
  proximity_bucket: "same_span" | "same_sentence" | "same_paragraph";
};

export type DreamMapSceneAxisEvidence = {
  token: string;
  lex_key: string;
  x: number;
  y: number;
  weight: number;
  contrib_x: number;
  contrib_y: number;
};

export type DreamMapSceneAxis = {
  scene_index: number;
  x: number | null;
  y: number | null;
  confidence: number; // 0..1
  lexicon_version: string;
  evidence: DreamMapSceneAxisEvidence[];
};

export type DreamMapBuilderInput = {
  observationPayloadV0: ObservationPayloadV0;
  anchorPayload?: any | null;
  glossaryOccurrences?: DreamMapGlossaryOccurrence[] | null;
  glossaryRecurrence?: DreamMapGlossaryRecurrence[] | null;
  archetypeTerms?: DreamMapArchetypeTerm[] | null;
  highlights?: DreamMapHighlightRow[] | null;
  sessionEntries?: DreamMapSessionEntry[] | null;
  entryHighlights?: DreamMapEntryHighlight[] | null;
  meta: {
    observation_version_id: string;
    anchor_version_id?: string;
    session_index_version_id?: string;
    algo_version: string;
    session_id: string;
    user_id: string;
    computed_at?: string;
    determinism_hash?: string;
  };
};
