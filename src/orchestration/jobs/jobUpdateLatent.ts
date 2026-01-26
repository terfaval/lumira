// src/orchestration/jobs/jobUpdateLatent.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { fetchDirectionCatalog } from "@/src/db/repositories/catalogRepo";
import {
  fetchObservationLatestV0WithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { insertLatentVersionIfMissing, upsertLatentLatest } from "@/src/db/repositories/latentRepo";
import { updateLatentFromMaterial } from "@/src/domain/latent/updateLatentFromMaterial";
import { normalizeLatentPayload } from "@/src/domain/latent/normalizeLatentPayload";
import { extractSalientElements } from "@/src/domain/latent/extractSalientElements";

export async function jobUpdateLatent(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
}): Promise<{ latent_version_id: string | null; skipped: boolean; ok: boolean }> {
  const { supabase, event, material_hash } = args;

  const obs = await fetchObservationLatestV0WithPayloadAndId(supabase, event.user_id, event.session_id);
  const idx = await fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id);

  if (!obs || !idx) return { latent_version_id: null, skipped: false, ok: false };

  const input_hash = sha256(
    "latent:" + material_hash + ":" + obs.observation_version_id + ":" + idx.session_index_version_id
  );
  const idempotency_key = jobIdempotencyKeyV0("update_latent", event.session_id, material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "update_latent",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    return {
      latent_version_id: started.job.output_ref?.latent_version_id ?? null,
      skipped: true,
      ok: started.job.status === "success",
    };
  }

  try {
    const catalog = await fetchDirectionCatalog(supabase);
    const allowedSlugs = catalog.map((c) => c.slug);

    const prefsRes = await supabase
      .from("user_prefs")
      .select("tone,depth_level,pace,updated_at")
      .eq("user_id", event.user_id)
      .single();
    const userPrefs = prefsRes.error ? null : prefsRes.data;

    const entryRes = await supabase
  .from("dream_entries")
  .select("content,created_at,kind")
  .eq("session_id", event.session_id)
  .in("kind", ["raw", "dictation", "edit"])
  .order("created_at", { ascending: true })
  .limit(1)
  .maybeSingle();
    const excerpt = entryRes.error || !entryRes.data ? "" : String(entryRes.data.content ?? "").slice(0, 500);

    const { payload, model } = await updateLatentFromMaterial({
      observation: obs.payload,
      sessionIndex: idx.payload,
      allowedSlugs,
      userPrefs,
      dreamTextExcerpt: excerpt,
    });

    const salient_elements = extractSalientElements({ observation: obs.payload });
    const normalizedPayload = normalizeLatentPayload({ ...payload, salient_elements });

    const latent = await insertLatentVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      model,
      payload: normalizedPayload,
    });

    await upsertLatentLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      latent_version_id: latent.id,
    });

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: {
        latent_version_id: latent.id,
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
      },
      error: null,
    });

    return { latent_version_id: latent.id, skipped: false, ok: true };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {
        observation_version_id: obs.observation_version_id,
        session_index_version_id: idx.session_index_version_id,
      },
      error: err?.message ?? "latent_job_failed",
    });

    return { latent_version_id: null, skipped: false, ok: false };
  }
}
