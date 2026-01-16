// src/db/repositories/eventRepo.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type DomainEvent = {
  id: string;
  user_id: string;
  session_id: string | null;
  type: string;
  payload: any;
  created_at: string;
};

export async function createDomainEvent(
  supabase: SupabaseClient,
  params: { user_id: string; session_id?: string; type: string; payload?: any }
): Promise<DomainEvent> {
  const { data, error } = await supabase
    .from("domain_events")
    .insert({
      user_id: params.user_id,
      session_id: params.session_id ?? null,
      type: params.type,
      payload: params.payload ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as DomainEvent;
}
