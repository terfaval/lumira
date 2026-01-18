import { supabase } from "@/src/lib/supabase/client";
import { requireUserId } from "@/src/lib/db";

export type StartDirectionResult = {
  success: boolean;
  alreadySelected?: boolean;
  error?: string;
};

export async function startDirection(
  sessionId: string,
  directionSlug: string,
  source: "frame" | "direction_modal" | "work" | "import" | "system" = "direction_modal"
): Promise<StartDirectionResult> {
  const userId = await requireUserId();

  const { error: insertError } = await supabase.from("session_directions").insert({
    session_id: sessionId,
    user_id: userId,
    direction_slug: directionSlug,
    source,
  });

  if (insertError) {
    const code = (insertError as any)?.code;
    if (code === "23505") {
      return { success: true, alreadySelected: true };
    }
    return { success: false, error: insertError.message };
  }

  return { success: true };
}
