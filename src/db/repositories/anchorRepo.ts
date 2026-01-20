// src/db/repositories/anchorRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type AnchorVersion = {
  id: string;
  session_id: string;
  user_id: string;
  version: number;
  input_hash: string;
  model: string | null;
  payload: any;
  created_at: string;
};

async function getNextAnchorVersionNumber(supabase: SupabaseClient, session_id: string): Promise<number> {
  const { data, error } = await supabase
    .from("anchor_versions")
    .select("version")
    .eq("session_id", session_id)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw error;
  const last = data?.[0]?.version ?? 0;
  return last + 1;
}

export async function insertAnchorVersionIfMissing(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; input_hash: string; model?: string | null; payload: any }
): Promise<AnchorVersion> {
  const existing = await supabase
  .from("anchor_versions")
  .select("*")
  .eq("session_id", params.session_id)
  .eq("input_hash", params.input_hash)
  .single();

// Ha van találat, visszaadjuk.
// Ha nincs találat, a PostgREST tipikusan PGRST116-ot ad.
// Minden más hiba: valódi hiba (RLS, auth, network, stb.)
if (!existing.error) {
  return existing.data as AnchorVersion;
} else {
  const code = (existing.error as any)?.code;
  if (code !== "PGRST116") throw existing.error;
}


  const version = await getNextAnchorVersionNumber(supabase, params.session_id);

  const ins = await supabase
    .from("anchor_versions")
    .insert({
      session_id: params.session_id,
      user_id: params.user_id,
      version,
      input_hash: params.input_hash,
      model: params.model ?? null,
      payload: params.payload,
    })
    .select("*")
    .single();

  if (!ins.error) return ins.data as AnchorVersion;

  const code = (ins.error as any)?.code;
  if (code !== "23505") throw ins.error;

  const again = await supabase
    .from("anchor_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("input_hash", params.input_hash)
    .single();

  if (again.error) throw again.error;
  return again.data as AnchorVersion;
}

export async function upsertAnchorLatest(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; anchor_version_id: string }
) {
  const { error } = await supabase
    .from("anchor_latest")
    .upsert(
      {
        session_id: params.session_id,
        user_id: params.user_id,
        anchor_version_id: params.anchor_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (error) throw error;
}
