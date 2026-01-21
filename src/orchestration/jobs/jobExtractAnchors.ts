// src/orchestration/jobs/jobExtractAnchors.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { ensureAnchorsRanked } from "@/src/orchestration/ensureAnchorsRanked";

export async function jobExtractAnchors(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
}): Promise<{ anchor_version_id: string | null; skipped: boolean; ok: boolean }> {
  const { supabase, event, material_hash } = args;

  const obsLatest = await supabase
    .from("observation_latest")
    .select("observation_version_id")
    .eq("session_id", event.session_id)
    .eq("user_id", event.user_id)
    .single();

  if (obsLatest.error) {
    return { anchor_version_id: null, skipped: false, ok: false };
  }

  const obsVersion = await supabase
    .from("observation_versions")
    .select("id,payload,input_hash")
    .eq("id", obsLatest.data.observation_version_id)
    .eq("user_id", event.user_id)
    .single();

  if (obsVersion.error) {
    return { anchor_version_id: null, skipped: false, ok: false };
  }

  const input_hash = String(obsVersion.data.input_hash ?? "");
  if (!input_hash) return { anchor_version_id: null, skipped: false, ok: false };

  const idempotency_key = jobIdempotencyKeyV0("extract_anchors", event.session_id, material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "extract_anchors",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    return {
      anchor_version_id: started.job.output_ref?.anchor_version_id ?? null,
      skipped: true,
      ok: started.job.status === "success",
    };
  }

  try {
    const ensured = await ensureAnchorsRanked(supabase, {
      user_id: event.user_id,
      session_id: event.session_id,
    });
    if (!ensured.anchor_version_id) {
      throw new Error("ensureAnchorsRanked returned no anchor_version_id");
    }

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: {
        anchor_version_id: ensured.anchor_version_id,
        observation_version_id: obsVersion.data.id,
      },
      error: null,
    });

    return { anchor_version_id: ensured.anchor_version_id, skipped: false, ok: true };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {
        observation_version_id: obsVersion.data.id,
      },
      error: err?.message ?? "jobExtractAnchors failed",
    });

    return { anchor_version_id: null, skipped: false, ok: false };
  }
}
