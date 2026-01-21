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
  };
  selection: {
    material_type: "anchor" | "event" | "seed";
    material_id: string;
    anchor_keys?: string[];
    direction_slug: string | null;
    group_tags: string[];
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
