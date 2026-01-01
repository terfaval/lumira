import { supabase } from "./supabase/client";

export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error("No authenticated user");
  return data.user.id;
}
