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
  source: "observation" | "anchors" | "glossary";
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
    };
    warnings: Array<
      | { code: "anchors_missing" }
      | { code: "occurrence_mismatch"; key: string; anchor_occ: number; computed_occ: number }
      | { code: "glossary_missing" }
    >;
    weights?: {
      w_occ: number;
      w_cent: number;
      w_anchor: number;
      w_glossary: number;
      porosity_z: number;
      porosity_recurrence: number;
    };
  };
};

export type DreamMapGlossaryOccurrence = {
  canonical_key: string;
  occurrences?: number | null;
};

export type DreamMapBuilderInput = {
  observationPayloadV0: ObservationPayloadV0;
  anchorPayload?: any | null;
  glossaryOccurrences?: DreamMapGlossaryOccurrence[] | null;
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
