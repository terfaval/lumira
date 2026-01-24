// src/orchestration/jobs/jobExtractObservation.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { insertObservationVersionIfMissing, upsertObservationLatest } from "@/src/db/repositories/observationRepo";
import { extractObservationFromEntries } from "@/src/domain/observe/extractObservationFromEntries";
import { indexGlossaryFromObservation } from "@/src/domain/glossary/indexGlossaryFromObservation";

export async function jobExtractObservation(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
}): Promise<{ observation_version_id: string | null; skipped: boolean }> {
  const { supabase, event, material_hash } = args;

  const idempotency_key = jobIdempotencyKeyV0("extract_observation", event.session_id, material_hash);
  const input_hash = sha256("observe:" + material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "extract_observation",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    const existingId = started.job.output_ref?.observation_version_id ?? null;
    return { observation_version_id: existingId, skipped: true };
  }

  try {
    // Fetch entries (all)
    const entriesRes = await supabase
      .from("dream_entries")
      .select("content,created_at")
      .eq("session_id", event.session_id)
      .order("created_at", { ascending: true });

    if (entriesRes.error) throw entriesRes.error;

    const dreamText = (entriesRes.data ?? []).map((e) => e.content).join("\n\n---\n\n");

    // Fetch prefs (optional)
    const prefsRes = await supabase.from("user_prefs").select("tone,depth_level,pace,updated_at").eq("user_id", event.user_id).single();
    const userPrefs = prefsRes.error ? null : prefsRes.data;

    const { payload, model } = await extractObservationFromEntries({ dreamText, userPrefs });

    const obs = await insertObservationVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      model,
      payload,
    });

    await upsertObservationLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      observation_version_id: obs.id,
    });

    // Best-effort: index non-interpretive memory (term_candidates + occurrences)
    // Should never fail the observation job.
    try {
      await indexGlossaryFromObservation({
        supabase,
        userId: event.user_id,
        sessionId: event.session_id,
        observationPayload: payload,
        source: "observation",
      });
    } catch (e) {
      // Intentionally swallow; if needed later, we can add a domain_event log.
      // console.warn("indexObservationIntoGlossary failed", e);
    }

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: { observation_version_id: obs.id },
      error: null,
    });

    return { observation_version_id: obs.id, skipped: false };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {},
      error: err?.message ?? "jobExtractObservation failed",
    });
    return { observation_version_id: null, skipped: false };
  }
}
