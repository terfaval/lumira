// src/db/repositories/observationRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type ObservationVersion = {
  id: string;
  session_id: string;
  user_id: string;
  version: number;
  input_hash: string;
  model: string | null;
  payload: any;
  created_at: string;
};

export type ObservationSchemaVersion = "dream_v1" | "v0";

function coerceJsonPayload(raw: any): any {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

export async function getNextObservationVersionNumber(
  supabase: SupabaseClient,
  session_id: string
): Promise<number> {
  const { data, error } = await supabase
    .from("observation_versions")
    .select("version")
    .eq("session_id", session_id)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw error;
  const last = data?.[0]?.version ?? 0;
  return last + 1;
}

export async function insertObservationVersionIfMissing(
  supabase: SupabaseClient,
  params: {
    session_id: string;
    user_id: string;
    input_hash: string;
    model?: string;
    payload: any;
  }
): Promise<ObservationVersion> {
  // First try reuse by (session_id, input_hash)
  const existing = await supabase
    .from("observation_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("input_hash", params.input_hash)
    .single();

  if (!existing.error) return existing.data as ObservationVersion;

  // Insert with next version
  const version = await getNextObservationVersionNumber(supabase, params.session_id);

  const ins = await supabase
    .from("observation_versions")
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

  if (ins.error) {
    // race: someone inserted same input_hash after our check
    const again = await supabase
      .from("observation_versions")
      .select("*")
      .eq("session_id", params.session_id)
      .eq("input_hash", params.input_hash)
      .single();
    if (again.error) throw ins.error;
    return again.data as ObservationVersion;
  }

  return ins.data as ObservationVersion;
}

export async function upsertObservationLatest(
  supabase: SupabaseClient,
  params: {
    session_id: string;
    user_id: string;
    observation_version_id: string;
    schema_version: ObservationSchemaVersion;
  }
) {
  // latest pointers move only when new version exists (we call this only after insert/reuse success)
  const latestUpdate: {
    session_id: string;
    user_id: string;
    updated_at: string;
    latest_dream_id?: string;
    latest_v0_id?: string;
    observation_version_id?: string;
  } = {
    session_id: params.session_id,
    user_id: params.user_id,
    updated_at: new Date().toISOString(),
  };

  if (params.schema_version === "dream_v1") {
    latestUpdate.latest_dream_id = params.observation_version_id;
  } else {
    latestUpdate.latest_v0_id = params.observation_version_id;
    // Keep legacy column synced for v0-only consumers.
    latestUpdate.observation_version_id = params.observation_version_id;
  }

  const { error } = await supabase
    .from("observation_latest")
    .upsert(latestUpdate, { onConflict: "session_id" });
  if (error) throw error;
}

export async function fetchObservationLatestV0WithPayload(
  supabase: SupabaseClient,
  session_id: string
): Promise<{ latest_id: string; payload: any } | null> {
  const latest = await supabase
    .from("observation_latest")
    .select("latest_v0_id")
    .eq("session_id", session_id)
    .single();

  if (latest.error) return null;
  const latestId = (latest.data as any)?.latest_v0_id;
  if (!latestId) return null;

  const ver = await supabase
    .from("observation_versions")
    .select("id,payload")
    .eq("id", latestId)
    .single();

  if (ver.error) throw ver.error;
  return { latest_id: ver.data.id, payload: coerceJsonPayload(ver.data.payload) };
}
