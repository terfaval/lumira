// src/domain/dreammap/types_v2.ts
import type { AxisSourceV2 } from "@/src/domain/dreammap/axis/computeTermAxisV2";

export type DreamMapV2NodeEvidence =
  | {
      source: "highlight";
      highlight_id: string;
      session_id: string;
      entry_id: string;
      snippet?: string | null;
    }
  | {
      source: "occurrence";
      session_id: string;
    };

export type DreamMapV2Node = {
  id: string; // glossary_terms.id
  term_id: string;
  canonical: string | null;
  canonical_key: string | null;
  category: string | null;
  archetype_term_id: string | null;
  x: number;
  y: number;
  axis_source: AxisSourceV2;
  occurrence: number;
  degree: number;
  evidence: DreamMapV2NodeEvidence[];
};

export type DreamMapV2EdgeEvidence =
  | {
      source: "highlight";
      session_id: string;
      entry_id?: string | null;
      entry_ids?: [string, string];
      highlight_ids: [string, string];
      snippets?: [string | null, string | null];
      proximity: "same_span_window" | "same_entry" | "same_session";
    }
  | {
      source: "occurrence";
      session_id: string;
      term_ids: [string, string];
    };

export type DreamMapV2Edge = {
  from: string;
  to: string;
  weight: number;
  weight_raw: number;
  bucket: "same_span_window" | "same_entry" | "same_session" | "occurrence";
  evidence: DreamMapV2EdgeEvidence[];
};

export type DreamMapV2Payload = {
  schema_version: "dream_map_v2";
  algo_version: string;
  nodes: DreamMapV2Node[];
  edges: DreamMapV2Edge[];
  meta: {
    user_id: string;
    computed_at: string;
    input_hash: string;
    counts: {
      node_count: number;
      edge_count: number;
    };
    reason?: "insufficient_evidence";
    debug?: {
      unmapped_keys?: string[];
      determinism_hash?: string;
      evidence_stats?: {
        highlight_terms: number;
        occurrence_terms: number;
        highlight_edges: number;
        occurrence_edges: number;
      };
    };
  };
};
