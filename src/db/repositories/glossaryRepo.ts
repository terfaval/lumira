// src/db/repositories/glossaryRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type GlossaryTermRow = {
  id: string;
  canonical_key: string;
};

export async function fetchGlossaryTermsByCanonicalKeys(
  supabase: SupabaseClient,
  args: { user_id: string; canonical_keys: string[] }
): Promise<GlossaryTermRow[]> {
  const keys = Array.from(new Set(args.canonical_keys)).filter(Boolean);
  if (keys.length === 0) return [];

  const res = await supabase
    .from("glossary_terms")
    .select("id,canonical_key")
    .eq("user_id", args.user_id)
    .in("canonical_key", keys);

  if (res.error) throw res.error;
  return (res.data ?? []) as GlossaryTermRow[];
}

export async function upsertGlossaryOccurrences(
  supabase: SupabaseClient,
  args: {
    user_id: string;
    session_id: string;
    rows: Array<{ term_id: string; source: "observation" | "user_note" | "import" }>;
  }
): Promise<void> {
  if (args.rows.length === 0) return;

  const payload = args.rows.map((r) => ({
    term_id: r.term_id,
    session_id: args.session_id,
    user_id: args.user_id,
    source: r.source,
  }));

  const res = await supabase
    .from("glossary_occurrences")
    .upsert(payload, { onConflict: "term_id,session_id" });

  if (res.error) throw res.error;
}

/**
 * NOTE: PostgREST upsert cannot do atomic "count = count + 1" expressions.
 * We therefore:
 * 1) fetch existing rows
 * 2) compute new counts in app
 * 3) upsert full rows
 *
 * This is “good enough” for v0; if you want race-safety later,
 * we should replace this with an RPC that increments in SQL.
 */
export async function bumpTermCandidates(
  supabase: SupabaseClient,
  args: { user_id: string; terms: string[]; nowISO?: string; displayLabels?: Record<string, string> }
): Promise<void> {
  const terms = Array.from(new Set(args.terms)).filter(Boolean);
  if (terms.length === 0) return;

  const nowISO = args.nowISO ?? new Date().toISOString();

  const existingRes = await supabase
    .from("term_candidates")
    .select("term,count,display_label")
    .eq("user_id", args.user_id)
    .in("term", terms);

  if (existingRes.error) throw existingRes.error;

  const existingMap = new Map<string, number>();
  const existingLabels = new Map<string, string>();
  for (const row of existingRes.data ?? []) {
    const term = (row as any).term;
    if (!term) continue;
    existingMap.set(term, Number((row as any).count ?? 0));
    const label = typeof (row as any).display_label === "string" ? (row as any).display_label.trim() : "";
    if (label) existingLabels.set(term, label);
  }

  const upserts = terms.map((t) => ({
    user_id: args.user_id,
    term: t,
    display_label: existingLabels.get(t) ?? args.displayLabels?.[t] ?? t,
    count: (existingMap.get(t) ?? 0) + 1,
    last_seen_at: nowISO,
  }));

  const upsertRes = await supabase.from("term_candidates").upsert(upserts, { onConflict: "user_id,term" });
  if (upsertRes.error) throw upsertRes.error;
}
