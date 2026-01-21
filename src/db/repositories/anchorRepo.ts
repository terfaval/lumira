// src/db/repositories/anchorRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type AnchorVersion = {
  id: string;
  session_id: string;
  user_id: string;
  input_hash: string;
  payload: any;
  created_at: string;
};

export async function insertAnchorVersionIfMissing(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; input_hash: string; payload: any }
): Promise<AnchorVersion> {
  // IMPORTANT: under RLS, always scope reads by user_id as well.
  const existing = await supabase
    .from("dream_anchor_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .maybeSingle();

  // If found, return immediately.
  if (!existing.error && existing.data) {
    return existing.data as AnchorVersion;
  }

  // If "no rows", proceed. Anything else is a real error.
  if (existing.error) {
    const code = (existing.error as any)?.code;
    // PGRST116 = "Results contain 0 rows" (common for .single()) — maybeSingle often avoids this,
    // but we keep the guard for safety.
    if (code && code !== "PGRST116") throw existing.error;
  }

  const ins = await supabase
    .from("dream_anchor_versions")
    .insert({
      session_id: params.session_id,
      user_id: params.user_id,
      input_hash: params.input_hash,
      payload: params.payload,
    })
    .select("*")
    .single();

  if (!ins.error) return ins.data as AnchorVersion;

  // 23505 = unique violation (race). Re-read and return.
  const code = (ins.error as any)?.code;
  if (code !== "23505") throw ins.error;

  const again = await supabase
    .from("dream_anchor_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .maybeSingle();

  if (again.error) throw again.error;
  if (!again.data) throw new Error("dream_anchor_versions upsert race: row still missing after 23505");
  return again.data as AnchorVersion;
}

export async function upsertAnchorLatest(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; anchor_version_id: string; payload: any }
) {
  const { error } = await supabase.from("dream_anchor_latest").upsert(
    {
      session_id: params.session_id,
      user_id: params.user_id,
      version_id: params.anchor_version_id,
      payload: params.payload,
      updated_at: new Date().toISOString(),
    },
    // IMPORTANT: prefer (session_id, user_id) uniqueness in v0.
    { onConflict: "session_id,user_id" }
  );

  if (error) throw error;
}
