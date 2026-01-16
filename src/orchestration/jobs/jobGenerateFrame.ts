// src/orchestration/jobs/jobGenerateFrame.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { fetchDirectionCatalog } from "@/src/db/repositories/catalogRepo";
import {
  fetchLatentLatestWithPayloadAndId,
  fetchObservationLatestWithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { recommendDirectionsFromLatent } from "@/src/domain/directions/recommendDirectionsFromLatent";
import { generateFrameFromLatent } from "@/src/domain/frame/generateFrameFromLatent";
import { insertFrameVersionIfMissing, upsertFrameLatest } from "@/src/db/repositories/frameRepo";

export async function jobGenerateFrame(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
  allowFallbackWithoutLatent?: boolean; // default false (v0)
}): Promise<{
  frame_version_id: string | null;
  skipped: boolean;
  ok: boolean;
  recommended_directions: Array<{ slug: string; title: string; why: string }>;
}> {
  const { supabase, event, material_hash } = args;

  const obs = await fetchObservationLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  const idx = await fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!obs || !idx) {
    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }

  const latentLatest = await fetchLatentLatestWithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!latentLatest && !args.allowFallbackWithoutLatent) {
    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }

  // NOTE: v0 fallback is OFF, so dummy UUID is safe.
  // TODO(if allowFallbackWithoutLatent becomes true):
  // Do NOT use a constant dummy latent id, or you'll get false idempotency collisions.
  // Use e.g. `no_latent:${obs.observation_version_id}:${idx.session_index_version_id}` in the input hash.
  const latent_version_id = latentLatest?.latent_version_id ?? "00000000-0000-0000-0000-000000000000";

  const input_hash = sha256("frame:" + material_hash + ":" + latent_version_id);
  const idempotency_key = jobIdempotencyKeyV0("generate_frame", event.session_id, material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "generate_frame",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    const recs = started.job.output_ref?.recommended_directions ?? [];
    return {
      frame_version_id: started.job.output_ref?.frame_version_id ?? null,
      skipped: true,
      ok: started.job.status === "success",
      recommended_directions: Array.isArray(recs) ? recs : [],
    };
  }

  try {
    const catalog = await fetchDirectionCatalog(supabase);
    const recommended = recommendDirectionsFromLatent({
      latent: (latentLatest?.payload ?? null) as any,
      catalog,
    });

    const { payload, model } = await generateFrameFromLatent({
      observation: obs.payload,
      sessionIndex: idx.payload,
      latent: latentLatest?.payload ?? null,
      recommended,
      sourceIds: {
        observation_version_id: obs.observation_version_id,
        latent_version_id,
        session_index_version_id: idx.session_index_version_id,
      },
    });

    // Hard stability rule:
    // recommended list is deterministic "source of truth" (slugs/titles)
    // LLM may only provide why/framing/title; we overwrite list to prevent UI break.
    payload.recommended_directions = recommended;

    const frame = await insertFrameVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      model,
      payload,
    });

    await upsertFrameLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      frame_version_id: frame.id,
    });

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: {
        frame_version_id: frame.id,
        recommended_directions: payload.recommended_directions,
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
        latent_version_id: latentLatest?.latent_version_id ?? null,
      },
      error: null,
    });

    return {
      frame_version_id: frame.id,
      skipped: false,
      ok: true,
      recommended_directions: payload.recommended_directions,
    };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
        latent_version_id: latentLatest?.latent_version_id ?? null,
      },
      error: err?.message ?? "jobGenerateFrame failed",
    });

    return { frame_version_id: null, skipped: false, ok: false, recommended_directions: [] };
  }
}
