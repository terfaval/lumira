// src/orchestration/jobs/jobBuildDreamMapV0.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { materialHashFromPayload, sha256 } from "@/src/orchestration/idempotency/materialHash";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchObservationLatestV0WithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { insertDreamMapVersionIfMissing, upsertDreamMapLatest } from "@/src/db/repositories/dreamMapRepo";
import { buildDreamMapV0 } from "@/src/domain/dreammap/buildDreamMapV0";
import type { DreamMapGlossaryOccurrence } from "@/src/domain/dreammap/types";

const ALGO_VERSION = "dream_map_v0.2";

async function fetchGlossaryOccurrences(
  supabase: SupabaseClient,
  args: { user_id: string; session_id: string }
): Promise<DreamMapGlossaryOccurrence[] | null> {
  try {
    const occRes = await supabase
      .from("glossary_occurrences")
      .select("term_id")
      .eq("user_id", args.user_id)
      .eq("session_id", args.session_id);

    if (occRes.error) return null;

    const termIds = (occRes.data ?? []).map((row: any) => row?.term_id).filter(Boolean);
    if (termIds.length === 0) return [];

    const termRes = await supabase
      .from("glossary_terms")
      .select("id,canonical_key")
      .eq("user_id", args.user_id)
      .in("id", termIds);

    if (termRes.error) return null;

    const out: DreamMapGlossaryOccurrence[] = [];
    for (const row of termRes.data ?? []) {
      const key = typeof (row as any)?.canonical_key === "string" ? (row as any).canonical_key.trim() : "";
      if (!key) continue;
      out.push({ canonical_key: key, occurrences: 1 });
    }
    return out;
  } catch {
    return null;
  }
}

function glossaryHash(glossary: DreamMapGlossaryOccurrence[] | null): string {
  if (!glossary) return "none";
  const sorted = glossary
    .map((row) => ({
      canonical_key: row.canonical_key,
      occurrences: row.occurrences ?? 1,
    }))
    .sort((a, b) => a.canonical_key.localeCompare(b.canonical_key));
  return materialHashFromPayload(sorted);
}

export async function jobBuildDreamMapV0(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
}): Promise<{ dream_map_version_id: string | null; skipped: boolean }> {
  const { supabase, event, material_hash } = args;

  const obsLatest = await fetchObservationLatestV0WithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!obsLatest) {
    return { dream_map_version_id: null, skipped: false };
  }

  const [anchorLatest, sessionIndexLatest, glossaryOccurrences] = await Promise.all([
    fetchAnchorLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchGlossaryOccurrences(supabase, { user_id: event.user_id, session_id: event.session_id }),
  ]);

  const gh = glossaryHash(glossaryOccurrences);
  const input_hash = sha256(
    [
      "dream_map_v0",
      obsLatest.observation_version_id,
      anchorLatest?.anchor_version_id ?? "none",
      sessionIndexLatest?.session_index_version_id ?? "none",
      gh,
      ALGO_VERSION,
    ].join(":")
  );

  const idempotency_key = jobIdempotencyKeyV0("build_dream_map_v0", event.session_id, material_hash);

  const started = await beginJobRun(supabase, {
    user_id: event.user_id,
    session_id: event.session_id,
    event_id: event.id,
    job_type: "build_dream_map_v0",
    idempotency_key,
    input_hash,
  });

  if (started.kind === "skipped") {
    const existingId = started.job.output_ref?.dream_map_version_id ?? null;
    return { dream_map_version_id: existingId, skipped: true };
  }

  try {
    const payload = buildDreamMapV0({
      observationPayloadV0: obsLatest.payload,
      anchorPayload: anchorLatest?.payload ?? null,
      glossaryOccurrences: glossaryOccurrences ?? null,
      meta: {
        observation_version_id: obsLatest.observation_version_id,
        anchor_version_id: anchorLatest?.anchor_version_id,
        session_index_version_id: sessionIndexLatest?.session_index_version_id,
        algo_version: ALGO_VERSION,
        session_id: event.session_id,
        user_id: event.user_id,
        computed_at: new Date().toISOString(),
      },
    });

    const saved = await insertDreamMapVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      algo_version: ALGO_VERSION,
      payload,
    });

    await upsertDreamMapLatest(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      dream_map_version_id: saved.id,
    });

    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "success",
      output_ref: {
        dream_map_version_id: saved.id,
        observation_version_id: obsLatest.observation_version_id,
        anchor_version_id: anchorLatest?.anchor_version_id ?? null,
        session_index_version_id: sessionIndexLatest?.session_index_version_id ?? null,
      },
      error: null,
    });

    return { dream_map_version_id: saved.id, skipped: false };
  } catch (err: any) {
    await finishJobRun(supabase, {
      job_id: started.job.id,
      status: "error",
      output_ref: {
        observation_version_id: obsLatest.observation_version_id,
        anchor_version_id: anchorLatest?.anchor_version_id ?? null,
        session_index_version_id: sessionIndexLatest?.session_index_version_id ?? null,
      },
      error: err?.message ?? "jobBuildDreamMapV0 failed",
    });

    return { dream_map_version_id: null, skipped: false };
  }
}
