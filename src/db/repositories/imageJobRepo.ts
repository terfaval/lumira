// src/db/repositories/imageJobRepo.ts

import { supabaseServerService } from "@/src/lib/supabase/serverService";

export type ImageJobRow = {
  id: string;
  user_id: string | null;
  preset_id: string;
  preset_version: number;
  variant: string;
  input_hash: string;
  seed: string; // supabase returns bigint as string sometimes
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  status: "queued" | "running" | "succeeded" | "failed";
  result_paths: string[];
  error: string | null;
  created_at: string;
  finished_at: string | null;
};

export async function insertImageJob(params: {
  user_id: string | null;
  preset_id: string;
  preset_version: number;
  variant: string;
  input_hash: string;
  seed: bigint;
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
}) {
  const supabase = supabaseServerService();

  const { data, error } = await supabase
    .from("image_jobs")
    .insert({
      user_id: params.user_id,
      preset_id: params.preset_id,
      preset_version: params.preset_version,
      variant: params.variant,
      input_hash: params.input_hash,
      seed: params.seed.toString(),
      prompt: params.prompt,
      negative_prompt: params.negative_prompt,
      width: params.width,
      height: params.height,
      status: "queued",
    })
    .select("*")
    .single();

  if (error) throw new Error(`insertImageJob failed: ${error.message}`);
  return data as ImageJobRow;
}

export async function markImageJobRunning(jobId: string) {
  const supabase = supabaseServerService();
  const { error } = await supabase.from("image_jobs").update({ status: "running" }).eq("id", jobId);
  if (error) throw new Error(`markImageJobRunning failed: ${error.message}`);
}

export async function markImageJobSucceeded(jobId: string, result_paths: string[]) {
  const supabase = supabaseServerService();
  const { error } = await supabase
    .from("image_jobs")
    .update({ status: "succeeded", result_paths, finished_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(`markImageJobSucceeded failed: ${error.message}`);
}

export async function markImageJobFailed(jobId: string, errorMessage: string) {
  const supabase = supabaseServerService();
  const { error } = await supabase
    .from("image_jobs")
    .update({ status: "failed", error: errorMessage, finished_at: new Date().toISOString() })
    .eq("id", jobId);

  if (error) throw new Error(`markImageJobFailed failed: ${error.message}`);
}

export async function getImageJob(jobId: string) {
  const supabase = supabaseServerService();
  const { data, error } = await supabase.from("image_jobs").select("*").eq("id", jobId).single();
  if (error) throw new Error(`getImageJob failed: ${error.message}`);
  return data as ImageJobRow;
}
