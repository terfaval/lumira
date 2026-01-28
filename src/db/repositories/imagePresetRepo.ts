import { supabaseServerAuthed } from "@/src/lib/supabase/serverAuthed";
import type { ImageStylePreset } from "@/src/domain/image/presets/types";

export async function upsertImagePreset(preset: ImageStylePreset) {
  const supabase = await supabaseServerAuthed();

  const { error } = await supabase
    .from("image_style_presets")
    .upsert({
      id: preset.id,
      version: preset.version,
      name: preset.name,
      payload: preset,
    });

  if (error) {
    throw new Error(`Failed to upsert image preset: ${error.message}`);
  }
}

export async function getImagePreset(
  presetId: string,
  version?: number
): Promise<ImageStylePreset | null> {
  const supabase = await supabaseServerAuthed();

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
    throw new Error(`Failed to fetch image preset: ${error.message}`);
  }

  return data?.payload ?? null;
}
