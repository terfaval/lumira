import { supabase } from "@/src/lib/supabase/client";

export type StartDirectionResult = {
  success: boolean;
  alreadySelected?: boolean;
  error?: string;
};

export async function startDirection(
  sessionId: string,
  directionSlug: string
): Promise<StartDirectionResult> {
  const { data: existing, error: existingError } = await supabase
    .from("morning_direction_choices")
    .select("direction_slug")
    .eq("session_id", sessionId);

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  const alreadySelected = (existing ?? []).some(
    (row) => row.direction_slug === directionSlug
  );
  if (alreadySelected) {
    return { success: true, alreadySelected: true };
  }

  const { error: insertError } = await supabase
    .from("morning_direction_choices")
    .insert({
      session_id: sessionId,
      direction_slug: directionSlug,
    });

  if (insertError) {
    return { success: false, error: insertError.message };
  }

  return { success: true };
}