// src/db/repositories/archetypeRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type ArchetypeTermRow = {
  id: string;
  user_id: string;
  domain: string;
  canonical_key: string;
  canonical_label: string;
  aliases?: string[] | null;
  alias_keys?: string[] | null;
  status: "proposed" | "verified" | "deprecated";
  provenance?: "auto" | "admin" | "user";
  created_at?: string;
  updated_at?: string;
};

export async function fetchArchetypeTerms(
  supabase: SupabaseClient,
  args: { user_id: string; statuses?: Array<"proposed" | "verified" | "deprecated"> }
): Promise<ArchetypeTermRow[]> {
  const statuses = Array.isArray(args.statuses) && args.statuses.length > 0 ? args.statuses : ["verified", "proposed"];

  const res = await supabase
    .from("archetype_terms")
    .select(
      "id,user_id,domain,canonical_key,canonical_label,aliases,alias_keys,status,provenance,created_at,updated_at"
    )
    .eq("user_id", args.user_id)
    .in("status", statuses);

  if (res.error) throw res.error;
  return (res.data ?? []) as ArchetypeTermRow[];
}
