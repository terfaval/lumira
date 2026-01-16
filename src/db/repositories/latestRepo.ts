// src/db/repositories/latestRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

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
  return { observation_version_id: ver.data.id, payload: ver.data.payload };
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
    payload: ver.data.payload,
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
  return { latent_version_id: ver.data.id, payload: ver.data.payload };
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
  return { frame_version_id: ver.data.id, payload: ver.data.payload };
}
