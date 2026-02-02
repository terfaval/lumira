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
import type { DreamMapGlossaryOccurrence, DreamMapHighlightRow } from "@/src/domain/dreammap/types";

const ALGO_VERSION = "dream_map_v0.4";

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

async function fetchHighlightRows(
  supabase: SupabaseClient,
  args: { user_id: string; session_id: string }
): Promise<DreamMapHighlightRow[] | null> {
  try {
    const res = await supabase
      .from("dream_session_highlights")
      .select("id,label,kind,note")
      .eq("user_id", args.user_id)
      .eq("session_id", args.session_id)
      .eq("status", "active");

    if (res.error) return null;

    return (res.data ?? [])
      .map((row: any) => ({
        id: typeof row?.id === "string" ? row.id : "",
        text: typeof row?.label === "string" ? row.label : "",
        category: typeof row?.kind === "string" ? row.kind : null,
        note: typeof row?.note === "string" ? row.note : null,
      }))
      .filter((row: DreamMapHighlightRow) => row.id && row.text.trim());
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

function highlightHash(highlights: DreamMapHighlightRow[] | null): string {
  if (!highlights) return "none";
  const sorted = highlights
    .map((row) => ({
      id: row.id,
      text: row.text,
      category: row.category ?? null,
      note: row.note ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return materialHashFromPayload(sorted);
}

export async function jobBuildDreamMapV0(args: {
  supabase: SupabaseClient;
  event: { id: string; user_id: string; session_id: string };
  material_hash: string;
  algo_version_override?: string;
}): Promise<{ dream_map_version_id: string | null; skipped: boolean }> {
  const { supabase, event, material_hash } = args;
  const algoVersion =
    typeof args.algo_version_override === "string" && args.algo_version_override.trim().length > 0
      ? args.algo_version_override.trim()
      : ALGO_VERSION;

  const obsLatest = await fetchObservationLatestV0WithPayloadAndId(supabase, event.user_id, event.session_id);
  if (!obsLatest) {
    return { dream_map_version_id: null, skipped: false };
  }

  const [anchorLatest, sessionIndexLatest, glossaryOccurrences, highlightRows] = await Promise.all([
    fetchAnchorLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchGlossaryOccurrences(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchHighlightRows(supabase, { user_id: event.user_id, session_id: event.session_id }),
  ]);

  const gh = glossaryHash(glossaryOccurrences);
  const hh = highlightHash(highlightRows);
  const input_hash = sha256(
    [
      "dream_map_v0",
      obsLatest.observation_version_id,
      anchorLatest?.anchor_version_id ?? "none",
      sessionIndexLatest?.session_index_version_id ?? "none",
      gh,
      hh,
      algoVersion,
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
      highlights: highlightRows ?? null,
      meta: {
        observation_version_id: obsLatest.observation_version_id,
        anchor_version_id: anchorLatest?.anchor_version_id,
        session_index_version_id: sessionIndexLatest?.session_index_version_id,
        algo_version: algoVersion,
        session_id: event.session_id,
        user_id: event.user_id,
        computed_at: new Date().toISOString(),
      },
    });

    const saved = await insertDreamMapVersionIfMissing(supabase, {
      session_id: event.session_id,
      user_id: event.user_id,
      input_hash,
      algo_version: algoVersion,
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
