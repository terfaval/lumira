import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasDreamObservation(params: {
  supabase: SupabaseClient;
  sessionId: string;
  userId: string;
}): Promise<boolean> {
  const { supabase, sessionId, userId } = params;
  const { data, error } = await supabase
    .from("observation_latest")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("observe: failed to check observation_latest", error.message);
    return false;
  }

  return Boolean(data?.session_id);
}
