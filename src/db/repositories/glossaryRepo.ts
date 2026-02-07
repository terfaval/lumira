// src/db/repositories/glossaryRepo.ts
import { PostgrestSingleResponse, SupabaseClient } from "@supabase/supabase-js";

export type GlossaryTermRow = {
  id: string;
  canonical_key: string;
  anchor_key?: string | null;
  canonical_name?: string | null;
  canonical?: string | null;
  name?: string | null;
  term?: string | null;
  category?: string | null;
};

export async function fetchGlossaryTermsByCanonicalKeys(
  supabase: SupabaseClient,
  args: { user_id: string; canonical_keys: string[] }
): Promise<GlossaryTermRow[]> {
  const keys = Array.from(new Set(args.canonical_keys)).filter(Boolean);
  if (keys.length === 0) return [];

  const res = await supabase
    .from("glossary_terms")
    .select("id,canonical_key")
    .eq("user_id", args.user_id)
    .in("canonical_key", keys);

  if (res.error) throw res.error;
  return (res.data ?? []) as GlossaryTermRow[];
}

export type GlossaryRecurrenceRow = {
  term_id: string;
  occurrence_count: number;
  session_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_session_id?: string | null;
  canonical_key?: string | null;
  anchor_key?: string | null;
  canonical_name?: string | null;
  canonical?: string | null;
  name?: string | null;
  term?: string | null;
  category?: string | null;
};

type GlossaryOccurrenceRaw = {
  term_id: string;
  session_id?: string | null;
  created_at?: string | null;
  count?: number | null;
};

function isMissingColumnError(error: unknown, column: string): boolean {
  const msg = String((error as any)?.message ?? "").toLowerCase();
  return msg.includes("column") && msg.includes(column.toLowerCase()) && msg.includes("does not exist");
}

async function fetchGlossaryTermsByIds(
  supabase: SupabaseClient,
  args: { user_id: string; term_ids: string[] }
): Promise<GlossaryTermRow[]> {
  const ids = Array.from(new Set(args.term_ids)).filter(Boolean);
  if (ids.length === 0) return [];

  const baseCols = ["id", "canonical_key", "category"];
  let columns = [...baseCols, "anchor_key", "canonical_name", "canonical", "name", "term"];

  // Retry if optional columns are missing.
  while (true) {
    const res = await supabase
      .from("glossary_terms")
      .select(columns.join(","))
      .eq("user_id", args.user_id)
      .in("id", ids);

    if (!res.error) return (res.data ?? []) as unknown as GlossaryTermRow[];

    let removed = false;
    for (const col of ["anchor_key", "canonical_name", "canonical", "name", "term"]) {
      if (columns.includes(col) && isMissingColumnError(res.error, col)) {
        columns = columns.filter((c) => c !== col);
        removed = true;
        break;
      }
    }

    if (!removed) throw res.error;
  }
}

export async function fetchGlossaryRecurrence(
  supabase: SupabaseClient,
  args: { user_id: string }
): Promise<GlossaryRecurrenceRow[]> {
  let occRes: PostgrestSingleResponse<GlossaryOccurrenceRaw[]> = await supabase
    .from("glossary_occurrences")
    .select("term_id,session_id,created_at,count")
    .eq("user_id", args.user_id);

  if (occRes.error && isMissingColumnError(occRes.error, "count")) {
    occRes = await supabase
      .from("glossary_occurrences")
      .select("term_id,session_id,created_at")
      .eq("user_id", args.user_id);
  }

  if (occRes.error && isMissingColumnError(occRes.error, "created_at")) {
    occRes = await supabase
      .from("glossary_occurrences")
      .select("term_id,session_id")
      .eq("user_id", args.user_id);
  }

  if (occRes.error) throw occRes.error;

  const occRows = (occRes.data ?? []) as GlossaryOccurrenceRaw[];
  if (occRows.length === 0) return [];

  const agg = new Map<
    string,
    {
      occurrence_count: number;
      sessions: Set<string>;
      first_seen_at: string | null;
      last_seen_at: string | null;
      last_session_id: string | null;
    }
  >();

  for (const row of occRows) {
    const termId = typeof row?.term_id === "string" ? row.term_id : "";
    if (!termId) continue;
    const count = Number(row?.count ?? 1);
    const increment = Number.isFinite(count) && count > 0 ? count : 1;
    const sessionId = typeof row?.session_id === "string" ? row.session_id : null;
    const createdAt = typeof row?.created_at === "string" ? row.created_at : null;

    const existing =
      agg.get(termId) ?? ({
        occurrence_count: 0,
        sessions: new Set<string>(),
        first_seen_at: null,
        last_seen_at: null,
        last_session_id: null,
      } as {
        occurrence_count: number;
        sessions: Set<string>;
        first_seen_at: string | null;
        last_seen_at: string | null;
        last_session_id: string | null;
      });

    const next = {
      occurrence_count: existing.occurrence_count + increment,
      sessions: existing.sessions,
      first_seen_at: existing.first_seen_at,
      last_seen_at: existing.last_seen_at,
      last_session_id: existing.last_session_id,
    };

    if (sessionId) next.sessions.add(sessionId);

    if (createdAt) {
      if (!next.first_seen_at || createdAt < next.first_seen_at) next.first_seen_at = createdAt;

      if (!next.last_seen_at || createdAt > next.last_seen_at) {
        next.last_seen_at = createdAt;
        next.last_session_id = sessionId ?? null;
      } else if (createdAt === next.last_seen_at && sessionId) {
        if (!next.last_session_id || sessionId < next.last_session_id) {
          next.last_session_id = sessionId;
        }
      }
    }

    agg.set(termId, next);
  }

  const termIds = Array.from(agg.keys());
  const terms = await fetchGlossaryTermsByIds(supabase, { user_id: args.user_id, term_ids: termIds });
  const termById = new Map<string, GlossaryTermRow>();
  for (const term of terms) {
    if (term?.id) termById.set(term.id, term);
  }

  const out: GlossaryRecurrenceRow[] = [];
  for (const [termId, row] of agg.entries()) {
    const term = termById.get(termId);
    out.push({
      term_id: termId,
      occurrence_count: row.occurrence_count,
      session_count: row.sessions.size,
      first_seen_at: row.first_seen_at,
      last_seen_at: row.last_seen_at,
      last_session_id: row.last_session_id ?? null,
      canonical_key: term?.canonical_key ?? null,
      anchor_key: term?.anchor_key ?? null,
      canonical_name: term?.canonical_name ?? null,
      canonical: term?.canonical ?? null,
      name: term?.name ?? null,
      term: term?.term ?? null,
      category: term?.category ?? null,
    });
  }

  out.sort((a, b) => a.term_id.localeCompare(b.term_id));
  return out;
}

export async function upsertGlossaryOccurrences(
  supabase: SupabaseClient,
  args: {
    user_id: string;
    session_id: string;
    rows: Array<{ term_id: string; source: "observation" | "user_note" | "import"; count?: number | null }>;
  }
): Promise<void> {
  if (args.rows.length === 0) return;

  const payload = args.rows.map((r) => {
    const count = Number(r.count);
    const normalizedCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : null;
    return {
      term_id: r.term_id,
      session_id: args.session_id,
      user_id: args.user_id,
      source: r.source,
      ...(normalizedCount ? { count: normalizedCount } : {}),
    };
  });

  let res = await supabase
    .from("glossary_occurrences")
    .upsert(payload, { onConflict: "user_id,term_id,session_id" });

  if (res.error && isMissingColumnError(res.error, "count")) {
    const fallback = payload.map(({ count, ...rest }) => rest);
    res = await supabase
      .from("glossary_occurrences")
      .upsert(fallback, { onConflict: "user_id,term_id,session_id" });
  }

  if (res.error) throw res.error;
}

/**
 * NOTE: PostgREST upsert cannot do atomic "count = count + 1" expressions.
 * We therefore:
 * 1) fetch existing rows
 * 2) compute new counts in app
 * 3) upsert full rows
 *
 * This is “good enough” for v0; if you want race-safety later,
 * we should replace this with an RPC that increments in SQL.
 */
export async function bumpTermCandidates(
  supabase: SupabaseClient,
  args: { user_id: string; terms: string[]; nowISO?: string; displayLabels?: Record<string, string> }
): Promise<void> {
  const terms = Array.from(new Set(args.terms)).filter(Boolean);
  if (terms.length === 0) return;

  const nowISO = args.nowISO ?? new Date().toISOString();

  const existingRes = await supabase
    .from("term_candidates")
    .select("term,count,display_label")
    .eq("user_id", args.user_id)
    .in("term", terms);

  if (existingRes.error) throw existingRes.error;

  const existingMap = new Map<string, number>();
  const existingLabels = new Map<string, string>();
  for (const row of existingRes.data ?? []) {
    const term = (row as any).term;
    if (!term) continue;
    existingMap.set(term, Number((row as any).count ?? 0));
    const label = typeof (row as any).display_label === "string" ? (row as any).display_label.trim() : "";
    if (label) existingLabels.set(term, label);
  }

  const upserts = terms.map((t) => ({
    user_id: args.user_id,
    term: t,
    display_label: existingLabels.get(t) ?? args.displayLabels?.[t] ?? t,
    count: (existingMap.get(t) ?? 0) + 1,
    last_seen_at: nowISO,
  }));

  const upsertRes = await supabase.from("term_candidates").upsert(upserts, { onConflict: "user_id,term" });
  if (upsertRes.error) throw upsertRes.error;
}
