// src/db/repositories/dreamMapRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export async function getNextDreamMapVersionNumber(
  supabase: SupabaseClient,
  args: { session_id: string; user_id?: string }
): Promise<number> {
  let query = supabase
    .from("dream_map_versions")
    .select("version")
    .eq("session_id", args.session_id)
    .order("version", { ascending: false })
    .limit(1);

  if (args.user_id) {
    query = query.eq("user_id", args.user_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  const last = data?.[0]?.version ?? 0;
  return last + 1;
}

export async function insertDreamMapVersionIfMissing(
  supabase: SupabaseClient,
  params: {
    session_id: string;
    user_id: string;
    input_hash: string;
    algo_version: string;
    payload: any;
  }
): Promise<{ id: string; inserted: boolean }> {
  const existing = await supabase
    .from("dream_map_versions")
    .select("id")
    .eq("session_id", params.session_id)
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .eq("algo_version", params.algo_version)
    .maybeSingle();

  if (!existing.error && existing.data) {
    return { id: existing.data.id, inserted: false };
  }

  if (existing.error) {
    const code = (existing.error as any)?.code;
    if (code && code !== "PGRST116") throw existing.error;
  }

  const version = await getNextDreamMapVersionNumber(supabase, {
    session_id: params.session_id,
    user_id: params.user_id,
  });

  const ins = await supabase
    .from("dream_map_versions")
    .insert({
      session_id: params.session_id,
      user_id: params.user_id,
      version,
      input_hash: params.input_hash,
      algo_version: params.algo_version,
      payload: params.payload,
    })
    .select("id")
    .single();

  if (!ins.error) return { id: ins.data.id, inserted: true };

  const code = (ins.error as any)?.code;
  if (code !== "23505") throw ins.error;

  const again = await supabase
    .from("dream_map_versions")
    .select("id")
    .eq("session_id", params.session_id)
    .eq("user_id", params.user_id)
    .eq("input_hash", params.input_hash)
    .eq("algo_version", params.algo_version)
    .maybeSingle();

  if (again.error || !again.data) {
    throw ins.error;
  }

  return { id: again.data.id, inserted: false };
}

export async function upsertDreamMapLatest(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; dream_map_version_id: string }
) {
  const { error } = await supabase
    .from("dream_map_latest")
    .upsert(
      {
        session_id: params.session_id,
        user_id: params.user_id,
        dream_map_version_id: params.dream_map_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,session_id" }
    );

  if (error) throw error;
}

export async function fetchDreamMapLatest(
  supabase: SupabaseClient,
  args: { session_id: string; user_id?: string }
): Promise<{ dream_map_version_id: string; payload: any; algo_version: string } | null> {
  let latestQuery = supabase
    .from("dream_map_latest")
    .select("dream_map_version_id")
    .eq("session_id", args.session_id)
    .limit(1);

  if (args.user_id) {
    latestQuery = latestQuery.eq("user_id", args.user_id);
  }

  const latest = await latestQuery.maybeSingle();
  if (latest.error || !latest.data?.dream_map_version_id) return null;

  let verQuery = supabase
    .from("dream_map_versions")
    .select("id,payload,algo_version")
    .eq("id", latest.data.dream_map_version_id)
    .limit(1);

  if (args.user_id) {
    verQuery = verQuery.eq("user_id", args.user_id);
  }

  const ver = await verQuery.maybeSingle();
  if (ver.error || !ver.data) return null;

  return {
    dream_map_version_id: ver.data.id,
    payload: ver.data.payload,
    algo_version: ver.data.algo_version,
  };
}
