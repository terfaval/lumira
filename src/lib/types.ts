export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export type DirectionStopCriteria = {
  max_cards?: number;
  stop_if_user_brief_streak?: number;
  stop_if_repetition_detected?: boolean;
  stop_if_emotional_overload?: boolean;
};

export type DirectionMethodSpec = {
  aim?: string;
  do?: string[];
  dont?: string[];
  question_style?: string;
  max_steps?: number;
  max_steps_source?: string;
  stop_rule?: string;
};

export type DirectionAiContract = {
  role?: string;
  stance?: string[];
  tone_tags?: string[];
  pacing?: {
    card_granularity?: string;
    max_steps?: number;
    max_steps_source?: string;
    max_depth?: number;
  };
};

export type DirectionFocusModel = {
  primary?: string[];
  secondary?: string[];
  priority_logic?: string;
};

export type DirectionOutputFormat = {
  body_md_style?: string;
  use_bullets?: boolean;
  question_count?: number;
  include_opt_out?: boolean;
  never_claim_meaning?: boolean;
};

export type DirectionOutputSpec = {
  card_types?: string[];
  allowed_moves?: string[];
  avoid_moves?: string[];
  format?: DirectionOutputFormat;
};

export type DirectionSelectionHints = {
  when_user_is_brief?: string[];
  when_user_is_emotional?: string[];
  when_user_wants_meaning?: string[];
  when_user_is_stuck?: string[];
};

export type DirectionSafety = {
  flags?: string[];
  fallback_direction_slugs?: string[];
  boundaries_md?: string;
};

export type DirectionConstraints = {
  max_prior_sessions?: number;
  compare_style?: string;
  max_reference_items?: number;
  match_policy?: string;
};

export type DirectionContentV2 = ({
  type: "direction";
  group: string;
  goal_md: string;
  micro_description: string;
  stop_criteria?: DirectionStopCriteria;
  method_spec?: DirectionMethodSpec;
  ai_contract?: DirectionAiContract;
  focus_model?: DirectionFocusModel;
  output_spec?: DirectionOutputSpec;
  selection_hints?: DirectionSelectionHints;
  safety?: DirectionSafety;
  constraints?: DirectionConstraints;
}) & Record<string, Json>;

export function isDirectionContentV2(x: unknown): x is DirectionContentV2 {
  if (!x || typeof x !== "object") return false;
  const c = x as Record<string, unknown>;
  return (
    c.type === "direction" &&
    typeof c.group === "string" &&
    typeof c.goal_md === "string" &&
    typeof c.micro_description === "string"
  );
}

export type DreamSession = {
  id: string;
  raw_dream_text: string;
  ai_framing_text: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type DirectionCatalogItem = {
  slug: string;
  version?: string | null;
  title: string;
  description: string;
  tags?: string[] | null;
  sort_order?: number | null;
  is_active: boolean;
  content: DirectionContentV2; // jsonb
};

export type MorningDirectionChoice = {
  id?: string;
  session_id: string;
  direction_slug: string;
  created_at?: string;
};

export type WorkBlock = {
  id: string;
  session_id: string;
  direction_slug: string | null;
  sequence: number;
  ai_context: string;
  ai_question: string;
  user_answer: string | null;
  block_state: "open" | "answered" | "skipped" | "archived";
};

export type EveningCardCatalogItem = {
  slug: string;
  title: string;
  is_active: boolean;
  version?: string | number | null;
  sort_order?: number | null;
  content: any; // jsonb
};
