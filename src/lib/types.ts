export type JsonValue = Record<string, unknown>;

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
  title: string;
  description: string;
  is_active: boolean;
  content: JsonValue; // jsonb
};

export type MorningDirectionChoice = {
  id: string;
  session_id: string;
  chosen_direction_slugs: string[] | null;
  ai_recommendations: JsonValue; // jsonb (wireframe: [])
  choice_source: "ai_only" | "catalog_only" | "ai_plus_catalog";
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
