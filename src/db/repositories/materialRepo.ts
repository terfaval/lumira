// src/db/repositories/materialRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type MaterialSnapshot = {
  id: string;
  session_id: string;
  user_id: string;
  hash: string;
  payload: any;
  created_at: string;
};

/**
 * Insert-if-missing for material snapshots.
 *
 * Critical: ONLY treat Postgres unique violation (23505) as conflict.
 * Any other insert error must be thrown to avoid masking RLS/schema/network issues.
 */
export async function insertMaterialSnapshotIfMissing(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; hash: string; payload: any }
): Promise<MaterialSnapshot> {
  const ins = await supabase
    .from("material_snapshots")
    .insert({
      session_id: params.session_id,
      user_id: params.user_id,
      hash: params.hash,
      payload: params.payload,
    })
    .select("*")
    .single();

  if (!ins.error) return ins.data as MaterialSnapshot;

  const code = (ins.error as any)?.code;
  if (code !== "23505") {
    throw ins.error;
  }

  // Conflict only: fetch existing
  const sel = await supabase
    .from("material_snapshots")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("hash", params.hash)
    .single();

  if (sel.error) throw sel.error;
  return sel.data as MaterialSnapshot;
}
