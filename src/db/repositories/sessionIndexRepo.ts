// src/db/repositories/sessionIndexRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type SessionIndexVersion = {
  id: string;
  session_id: string;
  user_id: string;
  version: number;
  input_hash: string;
  payload: any;
  embedding_model: string | null;
  embedding: number[] | null;
  created_at: string;
};

export async function getNextSessionIndexVersionNumber(
  supabase: SupabaseClient,
  session_id: string
): Promise<number> {
  const { data, error } = await supabase
    .from("session_index_versions")
    .select("version")
    .eq("session_id", session_id)
    .order("version", { ascending: false })
    .limit(1);

  if (error) throw error;
  const last = data?.[0]?.version ?? 0;
  return last + 1;
}

export async function insertSessionIndexVersionIfMissing(
  supabase: SupabaseClient,
  params: {
    session_id: string;
    user_id: string;
    input_hash: string;
    payload: any;
    embedding_model?: string | null;
    embedding?: number[] | null;
  }
): Promise<SessionIndexVersion> {
  const existing = await supabase
    .from("session_index_versions")
    .select("*")
    .eq("session_id", params.session_id)
    .eq("input_hash", params.input_hash)
    .single();

  if (!existing.error) return existing.data as SessionIndexVersion;

  const version = await getNextSessionIndexVersionNumber(supabase, params.session_id);

  const ins = await supabase
    .from("session_index_versions")
    .insert({
      session_id: params.session_id,
      user_id: params.user_id,
      version,
      input_hash: params.input_hash,
      payload: params.payload,
      embedding_model: params.embedding_model ?? null,
      embedding: params.embedding ?? null,
    })
    .select("*")
    .single();

  if (ins.error) {
    const again = await supabase
      .from("session_index_versions")
      .select("*")
      .eq("session_id", params.session_id)
      .eq("input_hash", params.input_hash)
      .single();
    if (again.error) throw ins.error;
    return again.data as SessionIndexVersion;
  }

  return ins.data as SessionIndexVersion;
}

export async function upsertSessionIndexLatest(
  supabase: SupabaseClient,
  params: { session_id: string; user_id: string; session_index_version_id: string }
) {
  const { error } = await supabase
    .from("session_index_latest")
    .upsert(
      {
        session_id: params.session_id,
        user_id: params.user_id,
        session_index_version_id: params.session_index_version_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

  if (error) throw error;
}
