// src/orchestration/jobs/jobBackfillArchetype.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { createDomainEvent } from "@/src/db/repositories/eventRepo";
import { listDreamMapLatestWithPayload } from "@/src/db/repositories/dreamMapRepo";
import { sha256 } from "@/src/orchestration/idempotency/materialHash";
import { jobBuildDreamMapV0 } from "@/src/orchestration/jobs/jobBuildDreamMapV0";

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
const BACKFILL_MATERIAL_PREFIX = "backfill_archetype:v1";

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

export async function jobBackfillArchetypeMissing(args: {
  supabase: SupabaseClient;
  options: ArchetypeBackfillOptions;
}): Promise<ArchetypeBackfillResult> {
  const { supabase, options } = args;
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_LIMIT, 1), 200);
  const offset = Math.max(options.offset ?? 0, 0);
  const dryRun = Boolean(options.dry_run);

  const filters = resolveScopeFilters(options.scope);
  const rows = await listDreamMapLatestWithPayload(supabase, {
    ...filters,
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

    try {
      const event = await createDomainEvent(supabase, {
        user_id: row.user_id,
        session_id: row.session_id,
        type: "backfill_archetype",
        payload: { source: "backfill_archetype", dream_map_version_id: row.dream_map_version_id },
      });

      const material_hash = sha256(`${BACKFILL_MATERIAL_PREFIX}:${row.dream_map_version_id}`);

      const run = await jobBuildDreamMapV0({
        supabase,
        event: { id: event.id, user_id: row.user_id, session_id: row.session_id },
        material_hash,
        algo_version_override: options.algo_version_override,
      });

      if (run.skipped) result.skipped += 1;
      else result.ran += 1;
    } catch (err: any) {
      result.errors += 1;
      if (result.error_samples.length < 10) {
        result.error_samples.push({
          session_id: row.session_id,
          user_id: row.user_id,
          message: err?.message ?? "backfill_archetype_failed",
        });
      }
    }
  }

  return result;
}

export const __test_only_hasMissingArchetype = hasMissingArchetype;
