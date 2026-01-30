import { supabaseServerService } from "@/src/lib/supabase/serverService";
import type { ImageStylePreset } from "@/src/domain/image/presets/types";

export async function getImagePresetService(
  presetId: string,
  version?: number
): Promise<ImageStylePreset | null> {
  const supabase = supabaseServerService();

  let query = supabase
    .from("image_style_presets")
    .select("payload")
    .eq("id", presetId)
    .order("version", { ascending: false })
    .limit(1);

  if (version !== undefined) {
    query = query.eq("version", version);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch image preset (service): ${error.message}`);
  }

  return data?.payload ?? null;
}
