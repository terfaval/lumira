import type { ObservationPayloadV0 } from "@/src/domain/observe/types";

export type DreamMapNodeKind =
  | "people"
  | "places"
  | "objects"
  | "actions"
  | "sensations"
  | "mood_words"
  | "themes_words";

export type DreamMapEvidence = {
  source: "observation" | "anchors" | "glossary" | "highlight";
  path: string;
};

export type DreamMapEdgeEvidence = {
  source: "observation";
  path: string;
  explicit?: boolean;
};

export type DreamMapNode = {
  key: string;
  label: string;
  kind: DreamMapNodeKind;
  x: number | null;
  y: number | null;
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
  evidence: DreamMapEvidence[];
};

export type DreamMapEdge = {
  from: string;
  to: string;
  weight: number;
  directed: boolean;
  evidence: DreamMapEdgeEvidence[];
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

export type DreamMapHighlightRow = {
  id: string;
  text: string;
  category?: string | null;
  note?: string | null;
};

export type DreamMapBuilderInput = {
  observationPayloadV0: ObservationPayloadV0;
  anchorPayload?: any | null;
  glossaryOccurrences?: DreamMapGlossaryOccurrence[] | null;
  highlights?: DreamMapHighlightRow[] | null;
  meta: {
    observation_version_id: string;
    anchor_version_id?: string;
    session_index_version_id?: string;
    algo_version: string;
    session_id: string;
    user_id: string;
    computed_at?: string;
  };
};
