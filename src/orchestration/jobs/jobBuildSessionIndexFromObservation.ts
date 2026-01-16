// src/orchestration/jobs/jobBuildSessionIndexFromObservation.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { fetchObservationLatestWithPayload } from "@/src/db/repositories/observationRepo";
import { buildSessionIndexFromObservation } from "@/src/domain/index/buildSessionIndexFromObservation";
import { insertSessionIndexVersionIfMissing, upsertSessionIndexLatest } from "@/src/db/repositories/sessionIndexRepo";

export async function jobBuildSessionIndexFromObservationJob(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
}): Promise<{ session_index_version_id: string | null; skipped: boolean }> {
  const { supabase, event, material_hash } = args;

  const idempotency_key = jobIdempotencyKeyV0("build_session_index", event.session_id, material_hash);

  const obsLatest = await fetchObservationLatestWithPayload(supabase, event.session_id);
  if (!obsLatest) {
    // No observation yet: cannot build index
    return { session_index_version_id: null, skipped: false };
  }

  const input_hash = sha256("index:" + material_hash + ":" + obsLatest.latest_id);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "build_session_index",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    const existingId = started.job.output_ref?.session_index_version_id ?? null;
    return { session_index_version_id: existingId, skipped: true };
  }

  try {
    const { payload, embedding, embedding_model } = await buildSessionIndexFromObservation({
      observation: obsLatest.payload,
    });

    const idx = await insertSessionIndexVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      payload,
      embedding,
      embedding_model,
    });

    await upsertSessionIndexLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      session_index_version_id: idx.id,
    });

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: { session_index_version_id: idx.id, observation_version_id: obsLatest.latest_id },
      error: null,
    });

    return { session_index_version_id: idx.id, skipped: false };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: { observation_version_id: obsLatest.latest_id },
      error: err?.message ?? "jobBuildSessionIndexFromObservation failed",
    });

    // DO NOT update latest pointer on error (we didn't)
    return { session_index_version_id: null, skipped: false };
  }
}
