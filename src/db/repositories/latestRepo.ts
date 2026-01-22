// src/db/repositories/latestRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

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

export async function fetchObservationLatestWithPayloadAndId(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<{ observation_version_id: string; payload: any } | null> {
  const latest = await supabase
    .from("observation_latest")
    .select("observation_version_id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();

  if (latest.error) return null;

  const ver = await supabase
    .from("observation_versions")
    .select("id,payload")
    .eq("id", latest.data.observation_version_id)
    .eq("user_id", user_id)
    .single();

  if (ver.error) throw ver.error;
  return { observation_version_id: ver.data.id, payload: coerceJsonPayload(ver.data.payload) };
}

/**
 * v0 clean: dream_anchor_latest only points to dream_anchor_versions.
 * We fetch the pointer then join payload from dream_anchor_versions.
 */
export async function fetchAnchorLatestWithPayloadAndId(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<{ anchor_version_id: string; payload: any } | null> {
  const latest = await supabase
    .from("dream_anchor_latest")
    .select("version_id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();

  if (latest.error) return null;

  const ver = await supabase
    .from("dream_anchor_versions")
    .select("id,payload")
    .eq("id", latest.data.version_id)
    .eq("user_id", user_id)
    .single();

  if (ver.error) throw ver.error;

  return { anchor_version_id: ver.data.id, payload: coerceJsonPayload(ver.data.payload) };
}

export async function fetchSessionIndexLatestWithPayloadAndId(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<{ session_index_version_id: string; payload: any; embedding?: number[] | null } | null> {
  const latest = await supabase
    .from("session_index_latest")
    .select("session_index_version_id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();

  if (latest.error) return null;

  const ver = await supabase
    .from("session_index_versions")
    .select("id,payload,embedding")
    .eq("id", latest.data.session_index_version_id)
    .eq("user_id", user_id)
    .single();

  if (ver.error) throw ver.error;

  return {
    session_index_version_id: ver.data.id,
    payload: coerceJsonPayload(ver.data.payload),
    embedding: ver.data.embedding ?? null,
  };
}

export async function fetchLatentLatestWithPayloadAndId(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<{ latent_version_id: string; payload: any } | null> {
  const latest = await supabase
    .from("latent_latest")
    .select("latent_version_id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();

  if (latest.error) return null;

  const ver = await supabase
    .from("latent_versions")
    .select("id,payload")
    .eq("id", latest.data.latent_version_id)
    .eq("user_id", user_id)
    .single();

  if (ver.error) throw ver.error;
  return { latent_version_id: ver.data.id, payload: coerceJsonPayload(ver.data.payload) };
}

export async function fetchFrameLatestWithPayloadAndId(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<{ frame_version_id: string; payload: any } | null> {
  const latest = await supabase
    .from("frame_latest")
    .select("frame_version_id")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .single();

  if (latest.error) return null;

  const ver = await supabase
    .from("frame_versions")
    .select("id,payload")
    .eq("id", latest.data.frame_version_id)
    .eq("user_id", user_id)
    .single();

  if (ver.error) throw ver.error;
  return { frame_version_id: ver.data.id, payload: coerceJsonPayload(ver.data.payload) };
}

export async function fetchLatestRawDreamEntry(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("dream_entries")
    .select("content,created_at")
    .eq("session_id", session_id)
    .eq("user_id", user_id)
    .eq("kind", "raw")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  const content = typeof (data as any)?.content === "string" ? (data as any).content : "";
  return content || null;
}

export async function fetchFramePayloadLatest(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<any | null> {
  const latest = await fetchFrameLatestWithPayloadAndId(supabase, user_id, session_id);
  return latest?.payload ?? null;
}

export async function fetchLatentPayloadLatest(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<any | null> {
  const latest = await fetchLatentLatestWithPayloadAndId(supabase, user_id, session_id);
  return latest?.payload ?? null;
}

export async function fetchSessionIndexPayloadLatest(
  supabase: SupabaseClient,
  user_id: string,
  session_id: string
): Promise<any | null> {
  const latest = await fetchSessionIndexLatestWithPayloadAndId(supabase, user_id, session_id);
  return latest?.payload ?? null;
}
