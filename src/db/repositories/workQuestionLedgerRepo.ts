// src/db/repositories/workQuestionLedgerRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

type LedgerInsertParams = {
  user_id: string;
  session_id: string;
  work_block_id?: string | null;
  anchor_keys: string[];
  question_hash: string;
};

function normalizeAnchorKeys(keys: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys ?? []) {
    if (typeof raw !== "string") continue;
    const k = raw.trim();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export async function insertLedgerEntry(supabase: SupabaseClient, params: LedgerInsertParams): Promise<void> {
  const anchor_keys = normalizeAnchorKeys(params.anchor_keys ?? []);
  const payload = {
    user_id: params.user_id,
    session_id: params.session_id,
    work_block_id: params.work_block_id ?? null,
    anchor_keys,
    question_hash: params.question_hash,
  };

  const { error } = await supabase.from("work_question_ledger").insert(payload);
  if (error) throw error;
}

export async function listRecentAnchorKeys(
  supabase: SupabaseClient,
  params: { user_id: string; session_id: string; limit?: number }
): Promise<string[]> {
  const { data, error } = await supabase
    .from("work_question_ledger")
    .select("anchor_keys, created_at")
    .eq("session_id", params.session_id)
    .eq("user_id", params.user_id)
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 80);

  if (error || !Array.isArray(data)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const row of data) {
    const keys = (row as any)?.anchor_keys;
    if (!Array.isArray(keys)) continue;
    for (const raw of keys) {
      if (typeof raw !== "string") continue;
      const k = raw.trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
  }

  return out;
}
