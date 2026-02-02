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
import type {
  DreamMapEntryHighlight,
  DreamMapGlossaryOccurrence,
  DreamMapHighlightRow,
  DreamMapSessionEntry,
} from "@/src/domain/dreammap/types";

const DEFAULT_ALGO_VERSION = "dream_map_v1_span_cooc_mvp";
const ALGO_VERSION = process.env.DREAM_MAP_ALGO_VERSION || DEFAULT_ALGO_VERSION;

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

async function fetchSessionEntries(
  supabase: SupabaseClient,
  args: { user_id: string; session_id: string }
): Promise<DreamMapSessionEntry[] | null> {
  try {
    const res = await supabase
      .from("dream_entries")
      .select("id,content,kind,created_at,updated_at")
      .eq("user_id", args.user_id)
      .eq("session_id", args.session_id)
      .in("kind", ["raw", "dictation", "edit", "note"])
      .order("created_at", { ascending: true });

    if (res.error) return null;

    return (res.data ?? [])
      .map((row: any) => ({
        id: typeof row?.id === "string" ? row.id : "",
        content: typeof row?.content === "string" ? row.content : "",
        kind: typeof row?.kind === "string" ? row.kind : null,
        created_at: typeof row?.created_at === "string" ? row.created_at : null,
        updated_at: typeof row?.updated_at === "string" ? row.updated_at : null,
      }))
      .filter((row: DreamMapSessionEntry) => row.id && row.content);
  } catch {
    return null;
  }
}

async function fetchEntryHighlights(
  supabase: SupabaseClient,
  args: { user_id: string; session_id: string }
): Promise<DreamMapEntryHighlight[] | null> {
  try {
    const res = await supabase
      .from("dream_entry_highlights")
      .select("*")
      .eq("user_id", args.user_id)
      .eq("session_id", args.session_id);

    if (res.error) return null;

    return (res.data ?? [])
      .map((row: any) => {
        const entryId =
          typeof row?.entry_id === "string"
            ? row.entry_id
            : typeof row?.dream_entry_id === "string"
              ? row.dream_entry_id
              : "";
        const start =
          typeof row?.start_offset === "number"
            ? row.start_offset
            : typeof row?.start === "number"
              ? row.start
              : 0;
        const end =
          typeof row?.end_offset === "number" ? row.end_offset : typeof row?.end === "number" ? row.end : 0;

        return {
          id: typeof row?.id === "string" ? row.id : "",
          entry_id: entryId,
          start,
          end,
          anchor_key: typeof row?.anchor_key === "string" ? row.anchor_key : null,
          label: typeof row?.label === "string" ? row.label : null,
          category: typeof row?.category === "string" ? row.category : null,
        } as DreamMapEntryHighlight;
      })
      .filter((row: DreamMapEntryHighlight) => row.id && row.entry_id && row.end > row.start);
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

function sessionEntriesHash(entries: DreamMapSessionEntry[] | null): string {
  if (!entries) return "none";
  const sorted = entries
    .map((row) => ({
      id: row.id,
      kind: row.kind ?? null,
      created_at: row.created_at ?? null,
      updated_at: row.updated_at ?? null,
      content_hash: sha256(row.content ?? ""),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return materialHashFromPayload(sorted);
}

function entryHighlightsHash(highlights: DreamMapEntryHighlight[] | null): string {
  if (!highlights) return "none";
  const sorted = highlights
    .map((row) => ({
      id: row.id,
      entry_id: row.entry_id,
      start: row.start,
      end: row.end,
      anchor_key: row.anchor_key ?? null,
      label: row.label ?? null,
      category: row.category ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  return materialHashFromPayload(sorted);
}

function determinismHash(params: {
  entries: DreamMapSessionEntry[] | null;
  entryHighlights: DreamMapEntryHighlight[] | null;
}): string {
  return sha256(
    materialHashFromPayload({
      entries: (params.entries ?? [])
        .map((row) => ({
          id: row.id,
          created_at: row.created_at ?? null,
          updated_at: row.updated_at ?? null,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      entry_highlights: (params.entryHighlights ?? [])
        .map((row) => ({
          id: row.id,
          entry_id: row.entry_id,
          start: row.start,
          end: row.end,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    })
  );
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

  const [anchorLatest, sessionIndexLatest, glossaryOccurrences, highlightRows, sessionEntries, entryHighlights] =
    await Promise.all([
    fetchAnchorLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchGlossaryOccurrences(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchHighlightRows(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchSessionEntries(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchEntryHighlights(supabase, { user_id: event.user_id, session_id: event.session_id }),
  ]);

  const gh = glossaryHash(glossaryOccurrences);
  const hh = highlightHash(highlightRows);
  const sh = sessionEntriesHash(sessionEntries);
  const eh = entryHighlightsHash(entryHighlights);
  const input_hash = sha256(
    [
      "dream_map_v0",
      obsLatest.observation_version_id,
      anchorLatest?.anchor_version_id ?? "none",
      sessionIndexLatest?.session_index_version_id ?? "none",
      gh,
      hh,
      sh,
      eh,
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
    const determinism_hash = determinismHash({
      entries: sessionEntries ?? null,
      entryHighlights: entryHighlights ?? null,
    });

    const payload = buildDreamMapV0({
      observationPayloadV0: obsLatest.payload,
      anchorPayload: anchorLatest?.payload ?? null,
      glossaryOccurrences: glossaryOccurrences ?? null,
      highlights: highlightRows ?? null,
      sessionEntries: sessionEntries ?? null,
      entryHighlights: entryHighlights ?? null,
      meta: {
        observation_version_id: obsLatest.observation_version_id,
        anchor_version_id: anchorLatest?.anchor_version_id,
        session_index_version_id: sessionIndexLatest?.session_index_version_id,
        algo_version: algoVersion,
        session_id: event.session_id,
        user_id: event.user_id,
        computed_at: new Date().toISOString(),
        determinism_hash,
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
