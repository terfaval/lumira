// src/orchestration/jobs/jobBuildDreamMapV0.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { beginJobRun, finishJobRun } from "@/src/db/repositories/jobRepo";
import { jobIdempotencyKeyV0 } from "@/src/orchestration/idempotency/jobKey";
import { materialHashFromPayload, sha256 } from "@/src/orchestration/idempotency/materialHash";
import { fetchGlossaryRecurrence } from "@/src/db/repositories/glossaryRepo";
import { fetchArchetypeTerms } from "@/src/db/repositories/archetypeRepo";
import {
  fetchAnchorLatestWithPayloadAndId,
  fetchObservationLatestV0WithPayloadAndId,
  fetchSessionIndexLatestWithPayloadAndId,
} from "@/src/db/repositories/latestRepo";
import { insertDreamMapVersionIfMissing, upsertDreamMapLatest } from "@/src/db/repositories/dreamMapRepo";
import { buildDreamMapV0 } from "@/src/domain/dreammap/buildDreamMapV0";
import type {
  DreamMapArchetypeTerm,
  DreamMapEntryHighlight,
  DreamMapGlossaryOccurrence,
  DreamMapGlossaryRecurrence,
  DreamMapHighlightRow,
  DreamMapSessionEntry,
} from "@/src/domain/dreammap/types";

const DEFAULT_ALGO_VERSION = "dream_map_v1_span_cooc_mvp";
const ALGO_VERSION = process.env.DREAM_MAP_ALGO_VERSION || DEFAULT_ALGO_VERSION;
const CANONICALIZER_ENABLED = (process.env.DREAM_MAP_CANONICALIZER || "").toLowerCase() !== "off";

function pickFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function glossaryLabelForRecurrence(row: DreamMapGlossaryRecurrence): string | null {
  return pickFirstString(row.canonical_key, row.anchor_key, row.canonical_name, row.canonical, row.name, row.term);
}

function glossaryOccurrencesFromRecurrence(rows: DreamMapGlossaryRecurrence[] | null): DreamMapGlossaryOccurrence[] | null {
  if (!Array.isArray(rows)) return null;
  const out: DreamMapGlossaryOccurrence[] = [];
  for (const row of rows) {
    const label = glossaryLabelForRecurrence(row);
    if (!label) continue;
    out.push({
      canonical_key: label,
      occurrences: row.occurrence_count ?? 1,
    });
  }
  return out;
}

async function fetchGlossaryRecurrenceRows(
  supabase: SupabaseClient,
  args: { user_id: string }
): Promise<DreamMapGlossaryRecurrence[] | null> {
  try {
    return await fetchGlossaryRecurrence(supabase, { user_id: args.user_id });
  } catch {
    return null;
  }
}

async function fetchArchetypeTermRows(
  supabase: SupabaseClient,
  args: { user_id: string }
): Promise<DreamMapArchetypeTerm[] | null> {
  try {
    return await fetchArchetypeTerms(supabase, { user_id: args.user_id, statuses: ["verified", "proposed"] });
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

function glossaryRecurrenceHash(glossary: DreamMapGlossaryRecurrence[] | null): string {
  if (!glossary) return "none";
  const sorted = glossary
    .map((row) => ({
      term_id: row.term_id,
      session_count: row.session_count ?? 0,
      occurrence_count: row.occurrence_count ?? 0,
      last_seen_at: row.last_seen_at ?? null,
    }))
    .sort((a, b) => a.term_id.localeCompare(b.term_id));
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

function lexiconMaterialHash(terms: DreamMapArchetypeTerm[] | null): string {
  if (!terms) return "none";
  const sorted = terms
    .map((row) => {
      const aliasKeys = Array.isArray(row.alias_keys) ? row.alias_keys.filter(Boolean).slice().sort() : [];
      return {
        domain: row.domain,
        canonical_key: row.canonical_key,
        status: row.status,
        canonical_label: row.canonical_label,
        alias_keys: aliasKeys,
      };
    })
    .sort((a, b) => {
      if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
      return a.canonical_key.localeCompare(b.canonical_key);
    });
  return materialHashFromPayload(sorted);
}

function determinismHash(params: {
  entries: DreamMapSessionEntry[] | null;
  entryHighlights: DreamMapEntryHighlight[] | null;
  glossaryRecurrence: DreamMapGlossaryRecurrence[] | null;
  archetypeTerms: DreamMapArchetypeTerm[] | null;
}): string {
  return sha256(
    materialHashFromPayload({
      glossary_recurrence: (params.glossaryRecurrence ?? [])
        .map((row) => ({
          term_id: row.term_id,
          session_count: row.session_count ?? 0,
          occurrence_count: row.occurrence_count ?? 0,
          last_seen_at: row.last_seen_at ?? null,
        }))
        .sort((a, b) => a.term_id.localeCompare(b.term_id)),
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
      archetype_lexicon: lexiconMaterialHash(params.archetypeTerms),
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

  const [
    anchorLatest,
    sessionIndexLatest,
    glossaryRecurrenceRows,
    highlightRows,
    sessionEntries,
    entryHighlights,
    archetypeRows,
  ] = await Promise.all([
    fetchAnchorLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchSessionIndexLatestWithPayloadAndId(supabase, event.user_id, event.session_id),
    fetchGlossaryRecurrenceRows(supabase, { user_id: event.user_id }),
    fetchHighlightRows(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchSessionEntries(supabase, { user_id: event.user_id, session_id: event.session_id }),
    fetchEntryHighlights(supabase, { user_id: event.user_id, session_id: event.session_id }),
    CANONICALIZER_ENABLED ? fetchArchetypeTermRows(supabase, { user_id: event.user_id }) : Promise.resolve(null),
  ]);

  const glossaryRecurrence = glossaryRecurrenceRows ?? null;
  const glossaryOccurrencesCompat = glossaryOccurrencesFromRecurrence(glossaryRecurrence) ?? null;
  const gh = glossaryRecurrenceHash(glossaryRecurrence);
  const hh = highlightHash(highlightRows);
  const sh = sessionEntriesHash(sessionEntries);
  const eh = entryHighlightsHash(entryHighlights);
  const archetypeTerms =
    CANONICALIZER_ENABLED && Array.isArray(archetypeRows)
      ? archetypeRows.slice().sort((a, b) => {
          if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
          return a.canonical_key.localeCompare(b.canonical_key);
        })
      : null;
  const lexiconHash = CANONICALIZER_ENABLED ? lexiconMaterialHash(archetypeTerms) : "off";
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
      lexiconHash,
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
      glossaryRecurrence: glossaryRecurrence ?? null,
      archetypeTerms,
    });

    const payload = buildDreamMapV0({
      observationPayloadV0: obsLatest.payload,
      anchorPayload: anchorLatest?.payload ?? null,
      glossaryOccurrences: glossaryOccurrencesCompat ?? null,
      glossaryRecurrence: glossaryRecurrence ?? null,
      archetypeTerms,
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

export const __test_only_glossaryRecurrenceHash = glossaryRecurrenceHash;
export const __test_only_determinismHash = determinismHash;
