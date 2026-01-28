// src/domain/image/pipeline/generateImage.ts

import type { ImageStylePreset } from "@/src/domain/image/presets/types";
import { assemblePrompt } from "./PromptAssembler";
import { computeSeed } from "./SeedManager";
import type { ImageRenderer } from "@/src/domain/image/render/types";
import { insertImageJob, markImageJobFailed, markImageJobRunning, markImageJobSucceeded } from "@/src/db/repositories/imageJobRepo";
import { supabaseServerService } from "@/src/lib/supabase/serverService";

export async function generateImage(params: {
  preset: ImageStylePreset;
  variant: string;
  user_id: string | null;
  user_text?: string;
  renderer: ImageRenderer;
}) {
  const { prompt, negative_prompt } = assemblePrompt(params.preset, params.variant, params.user_text);
  const { seed, input_hash } = computeSeed({
    presetId: params.preset.id,
    presetVersion: params.preset.version,
    variant: params.variant,
    userText: params.user_text,
  });

  const width = params.preset.canvas.width;
  const height = params.preset.canvas.height;

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
    });

    // Upload to Supabase Storage
    const supabase = supabaseServerService();
    const bucket = "backgrounds";
    const path = `presets/${params.preset.id}/v${params.preset.version}/${params.variant}/${job.id}.png`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, rendered.bytes, {
        contentType: rendered.contentType,
        upsert: true,
      });

    if (uploadError) throw new Error(`storage upload failed: ${uploadError.message}`);

    await markImageJobSucceeded(job.id, [`${bucket}/${path}`]);

    return { job_id: job.id, status: "succeeded" as const, result_paths: [`${bucket}/${path}`] };
  } catch (e: any) {
    const msg = e?.message ? String(e.message) : "Unknown error";
    await markImageJobFailed(job.id, msg);
    return { job_id: job.id, status: "failed" as const, error: msg };
  }
}
