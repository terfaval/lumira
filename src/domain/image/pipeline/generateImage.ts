import type { ImageStylePreset } from "@/src/domain/image/presets/types";
import { assemblePrompt } from "./PromptAssembler";
import { computeSeed } from "./SeedManager";
import { inputHash } from "./hash";
import type { ImageRenderer } from "@/src/domain/image/render/types";
import {
  insertImageJob,
  markImageJobFailed,
  markImageJobRunning,
  markImageJobSucceeded,
} from "@/src/db/repositories/imageJobRepo";
import { supabaseServerService } from "@/src/lib/supabase/serverService";

export async function generateImage(params: {
  preset: ImageStylePreset;
  variant: string;
  user_id: string | null;
  user_text?: string;
  renderer: ImageRenderer;
  renderer_name?: string;
  debug?: boolean;
  reference_image?: { bytes: Uint8Array; mime: string; filename?: string };
}) {
  // ✅ FULL prompt (includes variant light)
  const { prompt, negative_prompt } = assemblePrompt(
    params.preset,
    params.variant,
    params.user_text,
    { includeVariantLight: true }
  );

  // ✅ COMPOSITION prompt (excludes variant light)
  const { prompt: composition_prompt, negative_prompt: composition_negative } = assemblePrompt(
    params.preset,
    params.variant,
    params.user_text,
    { includeVariantLight: false }
  );

  const width = params.preset.canvas.width;
  const height = params.preset.canvas.height;

  // Full prompt hash (variant-dependent)
  const prompt_hash = inputHash(
    `${prompt}\n---\n${negative_prompt}\n---\n${width}x${height}`
  );

  // Composition hash (variant-independent)
  const composition_hash = inputHash(
    `${composition_prompt}\n---\n${composition_negative}\n---\n${width}x${height}`
  );

  // ✅ seed is stable across variants; input_hash remains variant-specific
  const { seed, input_hash } = computeSeed({
    presetId: params.preset.id,
    presetVersion: params.preset.version,
    variant: params.variant,
    userText: params.user_text,
    compositionHash: composition_hash,
    promptHash: prompt_hash,
    width,
    height,
  });

  const job = await insertImageJob({
    user_id: params.user_id,
    preset_id: params.preset.id,
    preset_version: params.preset.version,
    variant: params.variant,
    input_hash,
    seed,
    prompt,
    negative_prompt,
    width,
    height,
  });

  try {
    await markImageJobRunning(job.id);

    const rendered = await params.renderer.render({
      prompt,
      negative_prompt,
      width,
      height,
      seed,
      reference_image: params.reference_image,
    });

    const supabase = supabaseServerService();
    const bucket = "backgrounds";

    // NOTE: you probably want core_space to go into a stable folder name like:
    // `core_space/${job.id}/${params.variant}.png` (not `gate/...`)
    // I keep your original logic, but you may want to rename gate->core_space later.
    const path =
      params.preset.id === "lumira_core_space"
        ? `gate/${job.id}/${params.variant}.png`
        : `${job.id}.png`;

    const bytes_length = rendered.bytes.length;

    const { error: uploadError } = await supabase.storage.from(bucket).upload(path, rendered.bytes, {
      contentType: rendered.contentType,
      upsert: true,
    });

    if (uploadError) throw new Error(`storage upload failed: ${uploadError.message}`);

    await markImageJobSucceeded(job.id, [`${bucket}/${path}`]);

    const debug = params.debug
      ? {
          renderer: params.renderer_name ?? "unknown",
          preset_id: params.preset.id,
          preset_version: params.preset.version,
          variant: params.variant,
          width,
          height,
          input_hash,
          prompt_hash,
          composition_hash, // ✅ NEW
          seed: seed.toString(),
          supabase_path: `${bucket}/${path}`,
          bytes_length,
          ...(rendered.meta ?? {}),
        }
      : undefined;

    return {
      job_id: job.id,
      status: "succeeded" as const,
      result_paths: [`${bucket}/${path}`],
      debug,
    };
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Unknown error";
    await markImageJobFailed(job.id, msg);

    const meta =
      e?.meta && typeof e.meta === "object" && !Array.isArray(e.meta)
        ? (e.meta as Record<string, unknown>)
        : undefined;

    const debug = params.debug
      ? {
          renderer: params.renderer_name ?? "unknown",
          preset_id: params.preset.id,
          preset_version: params.preset.version,
          variant: params.variant,
          width,
          height,
          input_hash,
          prompt_hash,
          composition_hash, // ✅ NEW
          seed: seed.toString(),
          supabase_path: null,
          bytes_length: null,
          ...(meta ?? {}),
        }
      : undefined;

    return { job_id: job.id, status: "failed" as const, error: msg, debug };
  }
}
