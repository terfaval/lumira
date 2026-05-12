// src/db/repositories/archetypeRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeBaseKey } from "@/src/domain/archetypes/normalizeBaseKey";

export type ArchetypeDomain = "people" | "places" | "objects" | "symbols" | "actions" | "states" | "unknown";

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

export async function upsertArchetypeTerm(
  supabase: SupabaseClient,
  args: {
    user_id: string;
    domain: ArchetypeDomain;
    canonical_key: string;
    canonical_label: string;
    alias_keys?: string[] | null;
    status?: "proposed" | "verified" | "deprecated";
    provenance?: "auto" | "admin" | "user";
  }
) {
  const canonical_key = normalizeBaseKey(args.canonical_key);
  if (!canonical_key) return null;

  const alias_keys = Array.from(
    new Set((Array.isArray(args.alias_keys) ? args.alias_keys : []).map(normalizeBaseKey).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const row = {
    user_id: args.user_id,
    domain: args.domain,
    canonical_key,
    canonical_label: String(args.canonical_label ?? canonical_key).trim() || canonical_key,
    alias_keys,
    status: args.status ?? "verified",
    provenance: args.provenance ?? "admin",
    updated_at: new Date().toISOString(),
  };

  const res = await supabase
    .from("archetype_terms")
    .upsert(row, { onConflict: "user_id,domain,canonical_key" })
    .select("*")
    .single();

  if (res.error) return null;
  return res.data as any;
}

export async function mergeAliasIntoArchetypeTerm(
  supabase: SupabaseClient,
  args: { user_id: string; domain: ArchetypeDomain; canonical_key: string; alias_key: string }
) {
  const canonical_key = normalizeBaseKey(args.canonical_key);
  const alias_key = normalizeBaseKey(args.alias_key);
  if (!canonical_key || !alias_key) return null;

  const existing = await supabase
    .from("archetype_terms")
    .select("id,alias_keys")
    .eq("user_id", args.user_id)
    .eq("domain", args.domain)
    .eq("canonical_key", canonical_key)
    .single();

  if (existing.error || !existing.data) return null;

  const cur = Array.isArray((existing.data as any).alias_keys) ? (existing.data as any).alias_keys : [];
  const next = Array.from(new Set([alias_key, ...cur].map(normalizeBaseKey).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );

  const upd = await supabase
    .from("archetype_terms")
    .update({ alias_keys: next, updated_at: new Date().toISOString() })
    .eq("id", (existing.data as any).id)
    .select("*")
    .single();

  if (upd.error) return null;
  return upd.data as any;
}
