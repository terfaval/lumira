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

export type DreamMapLatestPayloadRow = {
  session_id: string;
  user_id: string;
  dream_map_version_id: string;
  updated_at: string;
  payload: any;
  algo_version: string;
};

export async function listDreamMapLatestWithPayload(
  supabase: SupabaseClient,
  args: {
    user_id?: string;
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
  }
): Promise<DreamMapLatestPayloadRow[]> {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const offset = Math.max(args.offset ?? 0, 0);

  let query = supabase
    .from("dream_map_latest")
    .select("session_id,user_id,dream_map_version_id,updated_at")
    .order("updated_at", { ascending: true })
    .order("user_id", { ascending: true })
    .order("session_id", { ascending: true });

  if (args.user_id) query = query.eq("user_id", args.user_id);
  if (args.since) query = query.gte("updated_at", args.since);
  if (args.until) query = query.lte("updated_at", args.until);

  const latestRes = await query.range(offset, offset + limit - 1);
  if (latestRes.error) throw latestRes.error;

  const latestRows = (latestRes.data ?? []) as Array<{
    session_id: string;
    user_id: string;
    dream_map_version_id: string;
    updated_at: string;
  }>;

  if (latestRows.length === 0) return [];

  const versionIds = latestRows.map((row) => row.dream_map_version_id).filter(Boolean);
  if (versionIds.length === 0) return [];

  const versionsRes = await supabase
    .from("dream_map_versions")
    .select("id,payload,algo_version")
    .in("id", versionIds);

  if (versionsRes.error) throw versionsRes.error;

  const byId = new Map<string, { payload: any; algo_version: string }>();
  for (const row of versionsRes.data ?? []) {
    if (!row?.id) continue;
    byId.set(row.id, { payload: (row as any).payload, algo_version: (row as any).algo_version });
  }

  const out: DreamMapLatestPayloadRow[] = [];
  for (const row of latestRows) {
    const ver = byId.get(row.dream_map_version_id);
    if (!ver) continue;
    out.push({
      session_id: row.session_id,
      user_id: row.user_id,
      dream_map_version_id: row.dream_map_version_id,
      updated_at: row.updated_at,
      payload: ver.payload,
      algo_version: ver.algo_version,
    });
  }

  return out;
}
