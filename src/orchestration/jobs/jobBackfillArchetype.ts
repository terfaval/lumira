// src/orchestration/jobs/jobBackfillArchetype.ts
import { SupabaseClient } from "@supabase/supabase-js";

export type ArchetypeBackfillScope =
  | { mode: "all" }
  | { mode: "user"; user_id: string }
  | { mode: "window"; since?: string; until?: string; user_id?: string };

export type ArchetypeBackfillOptions = {
  scope: ArchetypeBackfillScope;
  limit?: number;
  offset?: number;
  dry_run?: boolean;
  algo_version_override?: string;
};

export type ArchetypeBackfillResult = {
  scanned: number;
  eligible: number;
  not_eligible: number;
  ran: number;
  skipped: number;
  errors: number;
  dry_run: boolean;
  next_offset: number | null;
  error_samples: Array<{ session_id: string; user_id: string; message: string }>;
};

const DEFAULT_LIMIT = 50;
function normalizeKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function hasMissingArchetype(payload: any): boolean {
  const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
  if (nodes.length === 0) return false;

  return nodes.some((node: Record<string, unknown>) => {
    const canonical = (node as any)?.canonical;
    if (!canonical) return true;
    const key = normalizeKey((canonical as any).canonical_key);
    return !key;
  });
}

function resolveScopeFilters(scope: ArchetypeBackfillScope): {
  user_id?: string;
  since?: string;
  until?: string;
} {
  if (scope.mode === "user") return { user_id: scope.user_id };
  if (scope.mode === "window") return { user_id: scope.user_id, since: scope.since, until: scope.until };
  return {};
}

type DreamMapLatestRow = {
  session_id: string;
  user_id: string;
  dream_map_version_id: string;
  updated_at: string;
  payload: unknown;
};

async function listDreamMapLatestRows(
  supabase: SupabaseClient,
  args: {
    user_id?: string;
    since?: string;
    until?: string;
    limit: number;
    offset: number;
  }
): Promise<DreamMapLatestRow[]> {
  let latestQ = supabase
    .from("dream_map_latest")
    .select("session_id,user_id,dream_map_version_id,updated_at")
    .order("updated_at", { ascending: false })
    .range(args.offset, args.offset + args.limit - 1);

  if (args.user_id) latestQ = latestQ.eq("user_id", args.user_id);
  if (args.since) latestQ = latestQ.gte("updated_at", args.since);
  if (args.until) latestQ = latestQ.lte("updated_at", args.until);

  const latest = await latestQ;
  if (latest.error) throw latest.error;

  const latestRows = (latest.data ?? []) as Array<{
    session_id: string;
    user_id: string;
    dream_map_version_id: string;
    updated_at: string;
  }>;
  if (latestRows.length === 0) return [];

  const versionIds = latestRows.map((row) => row.dream_map_version_id).filter(Boolean);
  if (versionIds.length === 0) return [];

  const versions = await supabase.from("dream_map_versions").select("id,payload").in("id", versionIds);
  if (versions.error) throw versions.error;

  const payloadById = new Map<string, unknown>();
  for (const row of versions.data ?? []) {
    if (row?.id) payloadById.set(String(row.id), (row as any).payload ?? null);
  }

  const out: DreamMapLatestRow[] = [];
  for (const row of latestRows) {
    out.push({
      session_id: row.session_id,
      user_id: row.user_id,
      dream_map_version_id: row.dream_map_version_id,
      updated_at: row.updated_at,
      payload: payloadById.get(row.dream_map_version_id) ?? null,
    });
  }
  return out;
}

export async function jobBackfillArchetypeMissing(args: {
  supabase: SupabaseClient;
  options: ArchetypeBackfillOptions;
}): Promise<ArchetypeBackfillResult> {
  const { supabase, options } = args;
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const dryRun = Boolean(options.dry_run);

  const filters = resolveScopeFilters(options.scope);
  const rows = await listDreamMapLatestRows(supabase, {
    user_id: filters.user_id,
    since: filters.since,
    until: filters.until,
    limit,
    offset,
  });

  const result: ArchetypeBackfillResult = {
    scanned: rows.length,
    eligible: 0,
    not_eligible: 0,
    ran: 0,
    skipped: 0,
    errors: 0,
    dry_run: dryRun,
    next_offset: rows.length < limit ? null : offset + rows.length,
    error_samples: [],
  };

  for (const row of rows) {
    if (!hasMissingArchetype(row.payload)) {
      result.not_eligible += 1;
      continue;
    }

    result.eligible += 1;
    if (dryRun) continue;

    // Dream-map build runtime is removed; keep archetype backfill callable while
    // explicitly treating each eligible row as skipped in this transitional phase.
    result.skipped += 1;
    if (result.error_samples.length < 10) {
      result.error_samples.push({
        session_id: row.session_id,
        user_id: row.user_id,
        message: "dream_map_runtime_removed",
      });
    }
  }

  return result;
}

export const __test_only_hasMissingArchetype = hasMissingArchetype;
