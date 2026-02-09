// src/db/repositories/dreamMapV2Repo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export async function insertDreamMapV2VersionIfMissing(
  supabase: SupabaseClient,
  params: { user_id: string; input_hash: string; schema_version: string; algo_version: string; payload: any }
): Promise<{ id: string; inserted: boolean }> {
  const existing = await supabase
    .from("dream_map_v2_versions")
    .select("id")
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .eq("schema_version", params.schema_version)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return { id: existing.data.id, inserted: false };
  }

  if (existing.error) {
    const code = (existing.error as any)?.code;
    if (code && code !== "PGRST116") throw existing.error;
  }

  const ins = await supabase
    .from("dream_map_v2_versions")
    .insert({
      user_id: params.user_id,
      input_hash: params.input_hash,
      schema_version: params.schema_version,
      algo_version: params.algo_version,
      payload: params.payload,
    })
    .select("id")
    .single();

  if (!ins.error) return { id: ins.data.id, inserted: true };

  const code = (ins.error as any)?.code;
  if (code !== "23505") throw ins.error;

  const again = await supabase
    .from("dream_map_v2_versions")
    .select("id")
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .eq("schema_version", params.schema_version)
    .maybeSingle();

  if (again.error || !again.data) throw ins.error;
  return { id: again.data.id, inserted: false };
}

export async function upsertDreamMapV2Latest(
  supabase: SupabaseClient,
  params: { user_id: string; dream_map_v2_version_id: string }
) {
  const { error } = await supabase
    .from("dream_map_v2_latest")
    .upsert(
      {
        user_id: params.user_id,
        dream_map_v2_version_id: params.dream_map_v2_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

export async function fetchDreamMapV2Latest(
  supabase: SupabaseClient,
  args: { user_id: string }
): Promise<{ dream_map_v2_version_id: string; payload: any; algo_version: string } | null> {
  const latest = await supabase
    .from("dream_map_v2_latest")
    .select("dream_map_v2_version_id")
    .eq("user_id", args.user_id)
    .maybeSingle();

  if (latest.error || !latest.data?.dream_map_v2_version_id) return null;

  const ver = await supabase
    .from("dream_map_v2_versions")
    .select("id,payload,algo_version")
    .eq("id", latest.data.dream_map_v2_version_id)
    .eq("user_id", args.user_id)
    .maybeSingle();

  if (ver.error || !ver.data) return null;

  return {
    dream_map_v2_version_id: ver.data.id,
    payload: ver.data.payload,
    algo_version: ver.data.algo_version,
  };
}
