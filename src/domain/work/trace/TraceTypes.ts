export type TracePayload = {
  request: {
    request_id: string;
    client_request_id?: string | null;
    ts: string;
  };
  inputs: {
    session_id: string;
    direction_slug?: string | null;
    seed_kind?: "frame" | "work" | null;
    prefs_blocked_group_tags?: string[];
    intent_hint?: string | null;
    latent_source?: "latent_latest" | "summary" | "none";
    latent_payload_type?: "object" | "string" | "null";
  };
  selection: {
    material_type: "anchor" | "event" | "seed" | "intent";
    material_id: string;
    anchor_keys?: string[];
    intent_key?: string;
    intent_kind?: "open_loop" | "hypothesis";
    intent_label?: string;
    direction_slug: string | null;
    group_tags: string[];
    intent_candidates_count?: number;
    anchor_candidates_count?: number;
    event_candidates_count?: number;
    seed_candidates_count?: number;
    intent_ruled_out_count?: number;
    scores?: {
      novelty?: number;
      similarity_max?: number;
      coverage_gap?: number;
    };
    ruled_out?: Array<{ why: string; candidate: string }>;
  };
  model: {
    name: string;
    temperature?: number;
    retries?: number;
    parse_fail?: boolean;
  };
  stop?: {
    reason_code?: string;
    triggered_by?: string;
  };
};
