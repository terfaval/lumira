// src/db/repositories/latentRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type LatentVersion = {
  id: string;
  session_id: string;
  user_id: string;
  version: number;
  input_hash: string;
  model: string | null;
  payload: any;
  created_at: string;
};

async function getNextLatentVersionNumber(supabase: SupabaseClient, session_id: string): Promise<number> {
  const { data, error } = await supabase
    .from("latent_versions")
    .select("version")
    .eq("session_id", session_id)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw error;
  const last = data?.[0]?.version ?? 0;
  return last + 1;
}

export async function insertLatentVersionIfMissing(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; input_hash: string; model?: string | null; payload: any }
): Promise<LatentVersion> {
  const existing = await supabase
    .from("latent_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("input_hash", params.input_hash)
    .single();

  if (!existing.error) return existing.data as LatentVersion;

  const version = await getNextLatentVersionNumber(supabase, params.session_id);

  const ins = await supabase
    .from("latent_versions")
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

  if (!ins.error) return ins.data as LatentVersion;

  // Only treat 23505 as race; otherwise throw
  const code = (ins.error as any)?.code;
  if (code !== "23505") throw ins.error;

  const again = await supabase
    .from("latent_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("input_hash", params.input_hash)
    .single();

  if (again.error) throw again.error;
  return again.data as LatentVersion;
}

export async function upsertLatentLatest(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; latent_version_id: string }
) {
  const { error } = await supabase
    .from("latent_latest")
    .upsert(
      {
        session_id: params.session_id,
        user_id: params.user_id,
        latent_version_id: params.latent_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (error) throw error;
}
