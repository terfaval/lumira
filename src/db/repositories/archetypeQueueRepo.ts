import { SupabaseClient } from "@supabase/supabase-js";
import { normalizeBaseKey } from "@/src/domain/archetypes/normalizeBaseKey";

export type ArchetypeQueueStatus = "new" | "approved" | "merged" | "rejected" | "pending";

export type ArchetypeQueueRow = {
  id: string;
  user_id: string;
  domain: string;
  base_key: string | null;
  canonical_key: string;
  canonical_label: string;
  aliases: string[] | null;
  occurrence: number | null;
  suggested_canonical_key: string | null;
  evidence_spans_sample: any | null;
  source: string | null;
  dream_map_version_id: string | null;
  note: string | null;
  status: ArchetypeQueueStatus;
  created_at: string;
  updated_at: string;
};

export async function upsertArchetypeQueueProposal(
  supabase: SupabaseClient,
  args: {
    user_id: string;
    domain: string;
    base_key: string;
    canonical_label: string;
    occurrence: number;
    suggested_canonical_key: string;
    evidence_spans_sample?: any | null;
    dream_map_version_id?: string | null;
    source?: string | null;
  }
): Promise<ArchetypeQueueRow | null> {
  const baseKey = normalizeBaseKey(args.base_key);
  if (!baseKey) return null;

  const canonicalKey = baseKey;
  const row = {
    user_id: args.user_id,
    domain: args.domain,
    base_key: baseKey,
    canonical_key: canonicalKey,
    canonical_label: String(args.canonical_label ?? baseKey).trim() || baseKey,
    occurrence: Math.max(0, Number(args.occurrence ?? 0)),
    suggested_canonical_key: normalizeBaseKey(args.suggested_canonical_key || baseKey) || baseKey,
    evidence_spans_sample: args.evidence_spans_sample ?? null,
    dream_map_version_id: args.dream_map_version_id ?? null,
    source: args.source ?? "dream_map_canonicalizer",
    status: "new" as const,
  };

  const res = await supabase
    .from("archetype_term_queue")
    .upsert(row, { onConflict: "user_id,domain,base_key" })
    .select("*")
    .single();

  if (res.error) return null;
  return res.data as ArchetypeQueueRow;
}

export async function listArchetypeQueue(
  supabase: SupabaseClient,
  args: {
    user_id?: string;
    status?: ArchetypeQueueStatus | "open";
    domain?: string;
    q?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ rows: ArchetypeQueueRow[]; total: number }> {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const offset = Math.max(args.offset ?? 0, 0);

  let query = supabase
    .from("archetype_term_queue")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false });

  if (args.user_id) query = query.eq("user_id", args.user_id);
  if (args.domain) query = query.eq("domain", args.domain);

  if (args.status === "open") {
    query = query.in("status", ["new", "pending"]);
  } else if (args.status) {
    query = query.eq("status", args.status);
  }

  if (args.q && args.q.trim()) {
    const needle = args.q.trim();
    query = query.or(`base_key.ilike.%${needle}%,canonical_label.ilike.%${needle}%`);
  }

  const res = await query.range(offset, offset + limit - 1);
  const rows = (res.data ?? []) as ArchetypeQueueRow[];
  return { rows, total: res.count ?? rows.length };
}

export async function setArchetypeQueueStatus(
  supabase: SupabaseClient,
  args: { id: string; status: ArchetypeQueueStatus; note?: string | null }
): Promise<ArchetypeQueueRow | null> {
  const res = await supabase
    .from("archetype_term_queue")
    .update({ status: args.status, note: args.note ?? null, updated_at: new Date().toISOString() })
    .eq("id", args.id)
    .select("*")
    .single();

  if (res.error) return null;
  return res.data as ArchetypeQueueRow;
}
